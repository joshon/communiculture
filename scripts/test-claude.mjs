import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";

const MODERATION_SYSTEM = `You are a content moderation system for Communiculture, a community opinion platform where people discuss diverse topics and share positions on spectrums.

Review each submitted item and determine APPROVED or REJECTED.

ALWAYS APPROVE:
- Opinions, disagreements, debates, criticism of governments/institutions/ideologies/public figures
- Profanity and swearing (this is explicitly permitted)
- Strong, provocative, or inflammatory language that does not target a protected group
- Uncomfortable or controversial political positions

REJECT only if content clearly contains:
- RACISM: content that demeans, dehumanises, or attacks people on the basis of race or ethnicity
- SEXISM: content that demeans or attacks people on the basis of gender
- LGBT+ HATRED: content targeting sexual orientation or gender identity
- DISABILITY HATRED: content mocking people on the basis of disability
- ANTISEMITISM: hatred targeting Jewish people as an ethnic or religious group
- DEATH THREATS: explicit threats to kill or cause serious physical harm
- TARGETED HARASSMENT: content designed to intimidate a specific named private individual
- INAPPROPRIATE USERNAMES: names that are slurs, hate speech, or clearly intended to harass

When in doubt, APPROVE. This platform values free expression and open debate.

Respond ONLY with a valid JSON array, no markdown, no explanation:
[{"id":"<id>","status":"approved"|"rejected","reason":"<brief reason if rejected, null if approved>"}]`;

function stripFences(text) {
  return text.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
}

async function moderate(items) {
  const itemsJson = items.map(i => JSON.stringify({ id: i.id, content: i.content })).join("\n");
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: MODERATION_SYSTEM,
    messages: [{ role: "user", content: `Moderate these items:\n${itemsJson}` }],
  });
  return JSON.parse(stripFences(res.content[0].text));
}

async function generatePersonas(title, leftLabel, rightLabel) {
  const prompt = `Generate 5 short opinion comments for an interactive spectrum tool about: "${title}"

Left end (0%): "${leftLabel}"
Right end (100%): "${rightLabel}"

Each comment must directly reference the topic and clearly match the speaker's position. No names, ages, or job titles — just the opinion.

1. Position 10%: Strongly prefers "${leftLabel}". Give a vivid, specific reason why they love it.
2. Position 30%: Leans toward "${leftLabel}" but isn't extreme. A mild preference with a reason.
3. Position 50%: Genuinely torn, sees real value in both, or has very mixed feelings.
4. Position 70%: Leans toward "${rightLabel}" with a specific reason.
5. Position 90%: Strongly prefers "${rightLabel}". Give a vivid, specific reason why they love it.

Each comment: 1–2 natural sentences. Distinct voices. Must be clearly about the topic.

Return ONLY valid JSON (no markdown):
[{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."}]`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });
  return JSON.parse(stripFences(res.content[0].text));
}

// ─── Test 1: Synthetic user seeding ──────────────────────────────────────────
console.log("\n━━━ TEST 1: Synthetic user seeding ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log('Continuum: "Dogs vs Cats" | Left: "Dogs" | Right: "Cats"\n');
const personas = await generatePersonas("Dogs vs Cats", "Dogs", "Cats");
personas.forEach((p, i) => {
  const positions = [10, 30, 50, 70, 90];
  console.log(`  [${positions[i]}%] ${p.comment}`);
});

// ─── Test 2: Comment moderation ───────────────────────────────────────────────
console.log("\n━━━ TEST 2: Comment moderation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const commentResults = await moderate([
  { id: "c1", content: "I think dogs are objectively better companions than cats, sorry not sorry." },
  { id: "c2", content: "Cats are independent which I love, though dogs have their charm too." },
  { id: "c3", content: "All [slur] people should be banned from this platform." },
]);
commentResults.forEach(r => {
  const icon = r.status === "approved" ? "✅" : "❌";
  console.log(`  ${icon} [${r.id}] ${r.status.toUpperCase()}${r.reason ? ` — ${r.reason}` : ""}`);
});

// ─── Test 3: Continuum question/position moderation ───────────────────────────
console.log("\n━━━ TEST 3: Continuum question & position moderation ━━━━━━━━━━━━━━━━━━━━━");
const continuumResults = await moderate([
  { id: "cont1", content: "Title: Should weed be legal?\nLeft label: Fully illegal\nRight label: Fully legal" },
  { id: "cont2", content: "Title: Kill all [ethnic group]\nLeft label: Less\nRight label: More" },
  { id: "cont3", content: "Title: Pineapple on pizza\nLeft label: Absolutely not\nRight label: Always yes" },
]);
continuumResults.forEach(r => {
  const icon = r.status === "approved" ? "✅" : "❌";
  console.log(`  ${icon} [${r.id}] ${r.status.toUpperCase()}${r.reason ? ` — ${r.reason}` : ""}`);
});

// ─── Test 4: Username moderation ─────────────────────────────────────────────
console.log("\n━━━ TEST 4: Username moderation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const usernameResults = await moderate([
  { id: "u1", content: "Username: JoshOnion" },
  { id: "u2", content: "Username: DebateLord99" },
  { id: "u3", content: "Username: [racial slur]Killer" },
  { id: "u4", content: "Username: FuckTheTories" },
]);
usernameResults.forEach(r => {
  const icon = r.status === "approved" ? "✅" : "❌";
  console.log(`  ${icon} [${r.id}] ${r.status.toUpperCase()}${r.reason ? ` — ${r.reason}` : ""}`);
});

console.log("\n✓ All tests complete\n");
