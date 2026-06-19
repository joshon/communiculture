import { prisma } from "../packages/db/src/index";

const continuumId = process.argv[2];
if (!continuumId) { console.error("Usage: tsx scripts/seed-continuum.ts <continuumId>"); process.exit(1); }

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

const continuum = await prisma.continuum.findUnique({ where: { id: continuumId } });
if (!continuum) { console.error("Continuum not found:", continuumId); process.exit(1); }

const existing = await prisma.continuumParticipant.findMany({
  where: { continuumId, user: { isSynthetic: true } },
  select: { userId: true },
});
if (existing.length) {
  await prisma.continuumParticipant.deleteMany({ where: { continuumId, user: { isSynthetic: true } } });
  await prisma.user.deleteMany({ where: { id: { in: existing.map(e => e.userId) }, isSynthetic: true } });
  console.log(`Removed ${existing.length} existing bots`);
}

console.log(`Seeding "${continuum.title}"...`);

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
  body: JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: `Generate 5 short opinion comments for a spectrum about: "${continuum.title}"\nLeft (0%): "${continuum.leftLabel}" | Right (100%): "${continuum.rightLabel}"\n\n1. Position 10%: Strongly prefers left.\n2. Position 30%: Leans left.\n3. Position 50%: Genuinely torn.\n4. Position 70%: Leans right.\n5. Position 90%: Strongly prefers right.\n\n1-2 sentences each. Return ONLY valid JSON:\n[{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."},{"name":"participant","comment":"..."}]` }],
  }),
});
const data = await res.json() as any;
const raw = data.content[0].text.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
const personas = JSON.parse(raw) as Array<{ name: string; comment: string }>;

const POSITIONS = [0.1, 0.3, 0.5, 0.7, 0.9];
const PARTS = ["hair","head","face","neck","arms","body","pants","legs","shoes"];

for (let i = 0; i < 5; i++) {
  const colors = Object.fromEntries(PARTS.map(p => [p, "#0083FF"]));
  const variants = Object.fromEntries(PARTS.map((_, pi) => {
    const h = (((i+1) * 1664525 + (pi+1) * 1013904223) >>> 0) % 3;
    return [PARTS[pi], h];
  }));
  const user = await prisma.user.create({
    data: { name: personas[i].name, email: `synthetic.${continuumId}.${i}.v2@communiculture.bot`, isSynthetic: true, avatarConfig: { format: "v2", colors, variants }, onboardingComplete: true },
  });
  await prisma.continuumParticipant.create({
    data: { continuumId, userId: user.id, position: POSITIONS[i], comment: personas[i].comment },
  });
  console.log(`  [${Math.round(POSITIONS[i]*100)}%] ${personas[i].comment}`);
}

console.log("\n✓ Done — reload the continuum page");
await prisma.$disconnect();
