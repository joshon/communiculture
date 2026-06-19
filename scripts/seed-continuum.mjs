// Usage: CONTINUUM_ID=xxx node scripts/seed-continuum.mjs
import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const continuumId = process.env.CONTINUUM_ID;
if (!continuumId) { console.error("Set CONTINUUM_ID"); process.exit(1); }
if (!process.env.ANTHROPIC_API_KEY) { console.error("Set ANTHROPIC_API_KEY"); process.exit(1); }

const continuum = await prisma.continuum.findUnique({ where: { id: continuumId } });
if (!continuum) { console.error("Continuum not found"); process.exit(1); }

// Remove any existing synthetic participants for this continuum
const existing = await prisma.continuumParticipant.findMany({
  where: { continuumId, user: { isSynthetic: true } },
  select: { userId: true, id: true },
});
if (existing.length > 0) {
  console.log(`Removing ${existing.length} existing synthetic participants...`);
  await prisma.continuumParticipant.deleteMany({ where: { continuumId, user: { isSynthetic: true } } });
  await prisma.user.deleteMany({ where: { id: { in: existing.map(e => e.userId) }, isSynthetic: true } });
}

console.log(`Seeding "${continuum.title}"...`);

const prompt = `Generate 5 short opinion comments for an interactive spectrum tool about: "${continuum.title}"

Left end (0%): "${continuum.leftLabel}"
Right end (100%): "${continuum.rightLabel}"

1. Position 10%: Strongly prefers "${continuum.leftLabel}". Give a vivid, specific reason.
2. Position 30%: Leans toward "${continuum.leftLabel}" with a mild preference.
3. Position 50%: Genuinely torn, sees value in both.
4. Position 70%: Leans toward "${continuum.rightLabel}" with a specific reason.
5. Position 90%: Strongly prefers "${continuum.rightLabel}". Give a vivid, specific reason.

Each comment: 1–2 natural sentences. Return ONLY valid JSON (no markdown):
[{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."}]`;

const res = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 600,
  messages: [{ role: "user", content: prompt }],
});

const raw = res.content[0].text.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
const personas = JSON.parse(raw);

const POSITIONS = [0.1, 0.3, 0.5, 0.7, 0.9];
const BOT_BLUE = "#0083FF";
const AVATAR_PARTS = ["hair","head","face","neck","arms","body","pants","legs","shoes"];

for (let i = 0; i < 5; i++) {
  const p = personas[i];
  const colors = Object.fromEntries(AVATAR_PARTS.map(part => [part, BOT_BLUE]));
  const variants = Object.fromEntries(AVATAR_PARTS.map((part, pi) => {
    const seed = i + 1;
    const h = ((seed * 1664525 + (pi + 1) * 1013904223) >>> 0) % 3;
    return [part, h];
  }));

  const user = await prisma.user.create({
    data: {
      name: p.name,
      email: `synthetic.${continuumId}.${i}@communiculture.bot`,
      isSynthetic: true,
      avatarConfig: { format: "v2", colors, variants },
      onboardingComplete: true,
    },
  });

  await prisma.continuumParticipant.create({
    data: { continuumId, userId: user.id, position: POSITIONS[i], comment: p.comment },
  });

  console.log(`  [${Math.round(POSITIONS[i]*100)}%] ${p.comment}`);
}

console.log("\n✓ Done");
await prisma.$disconnect();
