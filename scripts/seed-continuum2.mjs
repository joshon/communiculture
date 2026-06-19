// Run from repo root: node scripts/seed-continuum2.mjs <continuumId>
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const { PrismaClient } = require("./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/index.js");

const continuumId = process.argv[2];
if (!continuumId) { console.error("Usage: node scripts/seed-continuum2.mjs <continuumId>"); process.exit(1); }

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

const continuum = await prisma.continuum.findUnique({ where: { id: continuumId } });
if (!continuum) { console.error("Continuum not found:", continuumId); process.exit(1); }

// Remove existing synthetic participants
const existing = await prisma.continuumParticipant.findMany({
  where: { continuumId, user: { isSynthetic: true } },
  select: { userId: true },
});
if (existing.length) {
  await prisma.continuumParticipant.deleteMany({ where: { continuumId, user: { isSynthetic: true } } });
  await prisma.user.deleteMany({ where: { id: { in: existing.map(e => e.userId) }, isSynthetic: true } });
  console.log(`Removed ${existing.length} existing bots`);
}

console.log(`Seeding "${continuum.title}" (${continuum.leftLabel} ↔ ${continuum.rightLabel})...`);

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
  body: JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `Generate 5 short opinion comments for a spectrum about: "${continuum.title}"
Left (0%): "${continuum.leftLabel}" | Right (100%): "${continuum.rightLabel}"

1. Position 10%: Strongly prefers left. Vivid reason.
2. Position 30%: Leans left. Mild preference with reason.
3. Position 50%: Genuinely torn.
4. Position 70%: Leans right with specific reason.
5. Position 90%: Strongly prefers right. Vivid reason.

1-2 sentences each. Return ONLY valid JSON, no markdown:
[{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."}]`
    }],
  }),
});

const json = await res.json();
const raw = json.content[0].text.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
const personas = JSON.parse(raw);

const POSITIONS = [0.1, 0.3, 0.5, 0.7, 0.9];
const PARTS = ["hair","head","face","neck","arms","body","pants","legs","shoes"];

for (let i = 0; i < 5; i++) {
  const colors = Object.fromEntries(PARTS.map(p => [p, "#0083FF"]));
  const variants = Object.fromEntries(PARTS.map((p, pi) => {
    const h = (((i+1) * 1664525 + (pi+1) * 1013904223) >>> 0) % 3;
    return [p, h];
  }));

  const user = await prisma.user.create({
    data: {
      name: personas[i].name,
      email: `synthetic.${continuumId}.${i}.${Date.now()}@communiculture.bot`,
      isSynthetic: true,
      avatarConfig: { format: "v2", colors, variants },
      onboardingComplete: true,
    },
  });

  await prisma.continuumParticipant.create({
    data: { continuumId, userId: user.id, position: POSITIONS[i], comment: personas[i].comment },
  });

  console.log(`  [${Math.round(POSITIONS[i]*100)}%] ${personas[i].comment}`);
}

console.log("\n✓ Done — reload the continuum page to see the bots");
await prisma.$disconnect();
