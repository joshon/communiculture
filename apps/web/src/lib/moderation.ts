import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@communiculture/db";

const MODERATION_SYSTEM_PROMPT = `You are a content moderation system for Communiculture, a community opinion platform where people discuss diverse topics and share positions on spectrums.

Review each submitted item and determine APPROVED or REJECTED.

ALWAYS APPROVE:
- Opinions, disagreements, debates, criticism of governments/institutions/ideologies/public figures
- Profanity and swearing (this is explicitly permitted)
- Pro-Palestinian sentiment, solidarity with Palestinian people
- Anti-Zionist political commentary (Zionism as a political ideology may be criticised freely)
- Strong, provocative, or inflammatory language that does not target a protected group
- Uncomfortable or controversial political positions

REJECT only if content clearly contains:
- RACISM: content that demeans, dehumanises, or attacks people on the basis of race or ethnicity
- SEXISM: content that demeans or attacks people on the basis of gender
- LGBT+ HATRED: content that demeans, dehumanises, or attacks people on the basis of sexual orientation or gender identity, including but not limited to: transphobia (denying trans identities, deadnaming, misgendering as an attack), homophobia, biphobia, or hostility toward non-binary or intersex people
- DISABILITY HATRED: content that demeans, mocks, or attacks people on the basis of physical or mental disability or neurodivergence
- ANTISEMITISM: hatred targeting Jewish people as an ethnic or religious group. CRITICAL DISTINCTION — the following are NOT antisemitic and must be APPROVED: criticism of Israel, criticism of Israeli government policy, opposition to Zionism as a political movement, pro-Palestinian content. ONLY reject content that uses classic antisemitic tropes: conspiracy theories about Jewish world domination, blood libel, claims that Jewish people as a group secretly control media/banks/governments/world events
- DEATH THREATS: explicit threats to kill or cause serious physical harm to a specific person or named group
- TARGETED HARASSMENT: content clearly designed to intimidate or harass a specific named private individual

When in doubt, APPROVE. This platform values free expression and open debate.

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"id":"<id>","status":"approved"|"rejected","reason":"<brief reason if rejected, null if approved>"}]`;

export type ModerationItemType = "continuum" | "comment" | "message" | "username";

interface QueueItem {
  id: string;
  type: ModerationItemType;
  entityId: string;
  content: string;
}

interface ModerationResult {
  id: string;
  status: "approved" | "rejected";
  reason: string | null;
}

const MAX_BATCH = 10;
const DEBOUNCE_MS = 60_000;

let queue: QueueItem[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export function enqueueForModeration(item: QueueItem) {
  if (!process.env.ANTHROPIC_API_KEY) return;
  queue.push(item);
  if (queue.length >= MAX_BATCH) {
    void flush();
  } else if (!timer) {
    timer = setTimeout(() => void flush(), DEBOUNCE_MS);
  }
}

async function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_BATCH);
  try {
    await processBatch(batch);
  } catch (err) {
    console.error("[moderation] batch failed:", err);
  }

  if (queue.length > 0 && !timer) {
    timer = setTimeout(() => void flush(), DEBOUNCE_MS);
  }
}

async function processBatch(items: QueueItem[]) {
  const itemsJson = items
    .map((item) => JSON.stringify({ id: item.id, content: item.content }))
    .join("\n");

  const response = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: MODERATION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Moderate these items:\n${itemsJson}` }],
  });

  const rawText = response.content[0]?.type === "text" ? response.content[0].text.trim() : "[]";
  const raw = rawText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
  let results: ModerationResult[];
  try {
    results = JSON.parse(raw);
  } catch {
    console.error("[moderation] failed to parse response:", raw);
    return;
  }

  await applyResults(items, results);
}

async function applyResults(items: QueueItem[], results: ModerationResult[]) {
  for (const result of results) {
    if (result.status !== "rejected") continue;

    const item = items.find((i) => i.id === result.id);
    if (!item) continue;

    console.warn(`[moderation] rejected ${item.type}:${item.entityId} — ${result.reason}`);

    try {
      if (item.type === "continuum") {
        await prisma.continuum.update({
          where: { id: item.entityId },
          data: { moderationStatus: "REJECTED" },
        });
      } else if (item.type === "comment") {
        await prisma.continuumParticipant.update({
          where: { id: item.entityId },
          data: { comment: null },
        });
      } else if (item.type === "username") {
        await prisma.user.update({
          where: { id: item.entityId },
          data: { name: null },
        });
      }
    } catch (err) {
      console.error(`[moderation] failed to apply rejection for ${item.entityId}:`, err);
    }
  }
}
