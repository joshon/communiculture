/**
 * Deletes synthetic participants from a named continuum and re-generates them
 * with the updated position-aware comment prompt.
 *
 * Usage: pnpm tsx scripts/reseed-bots.ts "Spindrift or La Croix?"
 */
import { PrismaClient } from "../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const AVATAR_PARTS = ["hair","head","face","neck","arms","body","pants","legs","shoes"] as const;
const BOT_BLUE = "#0083FF";
const POSITIONS = [0.1, 0.3, 0.5, 0.7, 0.9];

function seededInt(seed: number, salt: number, max: number): number {
  return ((seed * 1664525 + salt * 1013904223) >>> 0) % max;
}

async function syntheticBotAvatar(botIndex: number) {
  const colors = Object.fromEntries(AVATAR_PARTS.map((p) => [p, BOT_BLUE]));
  let variants: Record<string, number> = Object.fromEntries(AVATAR_PARTS.map((p) => [p, 0]));
  try {
    const raw = await fs.readFile(
      path.join(__dirname, "../apps/web/.avatar-library.json"), "utf-8"
    );
    const lib = JSON.parse(raw).library ?? JSON.parse(raw);
    variants = Object.fromEntries(
      AVATAR_PARTS.map((p, pi) => {
        const count = Array.isArray(lib[p]) ? lib[p].length : 1;
        return [p, seededInt(botIndex + 1, pi + 1, count)];
      })
    );
  } catch { /* fall back to all-zero variants */ }
  return { format: "v2", colors, variants };
}

async function generatePersonas(title: string, leftLabel: string, rightLabel: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `Generate 5 short opinion comments for an interactive spectrum tool about: "${title}"

Left end (0%): "${leftLabel}"
Right end (100%): "${rightLabel}"

Each comment must directly reference the topic and clearly match the speaker's position. No names, ages, or job titles — just the opinion.

1. Position 10%: Strongly prefers "${leftLabel}". Give a vivid, specific reason why they love it.
2. Position 30%: Leans toward "${leftLabel}" but isn't extreme. A mild preference with a reason.
3. Position 50%: Genuinely torn, sees real value in both, or has very mixed feelings. Don't favour either side.
4. Position 70%: Leans toward "${rightLabel}" with a specific reason.
5. Position 90%: Strongly prefers "${rightLabel}". Give a vivid, specific reason why they love it.

Each comment: 1–2 natural sentences. Distinct voices. Must be clearly about the topic.

Return ONLY valid JSON (no markdown):
[{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."}]`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.85,
    max_tokens: 600,
  });

  const raw = res.choices[0]?.message?.content?.trim() ?? "[]";
  return JSON.parse(raw) as { name: string; comment: string }[];
}

async function main() {
  const title = process.argv[2];
  if (!title) { console.error("Usage: tsx scripts/reseed-bots.ts <continuum title>"); process.exit(1); }

  const continuum = await prisma.continuum.findFirst({ where: { title } });
  if (!continuum) { console.error(`Continuum not found: "${title}"`); process.exit(1); }

  console.log(`Found continuum: ${continuum.id} — "${continuum.title}"`);

  // Delete existing synthetic participants (cascade deletes the participant row too)
  const syntheticUsers = await prisma.user.findMany({
    where: { isSynthetic: true, participations: { some: { continuumId: continuum.id } } },
    select: { id: true, email: true },
  });
  console.log(`Deleting ${syntheticUsers.length} synthetic users:`, syntheticUsers.map(u => u.email));
  await prisma.user.deleteMany({ where: { id: { in: syntheticUsers.map(u => u.id) } } });

  // Re-generate
  console.log("Generating new personas via OpenAI…");
  const personas = await generatePersonas(continuum.title, continuum.leftLabel, continuum.rightLabel);
  console.log("Got personas:", personas.map(p => p.comment));

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    const avatarConfig = await syntheticBotAvatar(i);
    const user = await prisma.user.create({
      data: {
        name: persona.name,
        email: `synthetic.${continuum.id}.${i}@communiculture.bot`,
        isSynthetic: true,
        avatarConfig,
        onboardingComplete: true,
      },
    });
    await prisma.continuumParticipant.create({
      data: { continuumId: continuum.id, userId: user.id, position: POSITIONS[i], comment: persona.comment },
    });
    console.log(`Created bot ${i + 1}/5 at ${POSITIONS[i] * 100}%: "${persona.comment}"`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
