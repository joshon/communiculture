/**
 * Seeds 100 fake users and 25 continuums with realistic populations.
 * Five continuums also get OpenAI-generated synthetic bot participants.
 *
 * Usage: OPENAI_API_KEY=sk-... pnpm tsx scripts/seed-fake-data.ts
 * Dry-run (no DB writes): pnpm tsx scripts/seed-fake-data.ts --dry-run
 */

import { PrismaClient } from "../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run");

// ─── constants ────────────────────────────────────────────────────────────────

const AVATAR_PARTS = ["hair","head","face","neck","arms","body","pants","legs","shoes"] as const;
type AvatarPart = typeof AVATAR_PARTS[number];

const BOT_BLUE = "#0083FF";
const BOT_POSITIONS = [10, 30, 50, 70, 90] as const;

// Palette drawn from the AvatarEditor colour grid
const COLOR_PALETTE = [
  "#E8D5B0","#C8A882","#A07850","#6B4226","#3D1F0A",
  "#F4C2C2","#E88080","#CC3333","#8B1A1A","#FF6B35",
  "#FFB347","#FFD700","#C8E6C9","#66BB6A","#2E7D32",
  "#80DEEA","#29B6F6","#1565C0","#9C27B0","#E91E63",
  "#FFFFFF","#BDBDBD","#757575","#424242","#1A1A1A",
];
const SKIN_TONES = ["#FDDBB4","#E8B88A","#C68642","#8D5524","#5C3317"];
const SKIN_PARTS: AvatarPart[] = ["head","neck","arms","legs"];

// Variant counts per part (from .avatar-library.json)
const VARIANT_COUNTS: Record<AvatarPart, number> = {
  hair: 21, head: 1, face: 5, neck: 1, arms: 1,
  body: 7, pants: 7, legs: 1, shoes: 7,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function seededInt(seed: number, salt: number, max: number): number {
  // Avalanche mix to avoid the period-1 collapse that the plain LCG produces
  // when max divides the seed multiplier (e.g. 1664525 % 25 = 0).
  let h = ((seed + 1) * 2654435761 ^ (salt + 1) * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h % max;
}

function seededFloat(seed: number, salt: number): number {
  return seededInt(seed, salt, 100000) / 100000;
}

function pickColor(seed: number, salt: number): string {
  return COLOR_PALETTE[seededInt(seed, salt, COLOR_PALETTE.length)];
}

function pickSkin(seed: number): string {
  return SKIN_TONES[seededInt(seed, 999, SKIN_TONES.length)];
}

function buildAvatarConfig(userIndex: number): object {
  const skin = pickSkin(userIndex);
  const colors: Record<AvatarPart, string> = {} as any;
  const variants: Record<AvatarPart, number> = {} as any;

  for (let pi = 0; pi < AVATAR_PARTS.length; pi++) {
    const part = AVATAR_PARTS[pi];
    colors[part] = SKIN_PARTS.includes(part)
      ? skin
      : pickColor(userIndex, pi + 100);
    variants[part] = seededInt(userIndex, pi + 200, VARIANT_COUNTS[part]);
  }
  return { format: "v2", colors, variants };
}

async function syntheticBotAvatar(botIndex: number): Promise<object> {
  const colors: Record<AvatarPart, string> = Object.fromEntries(
    AVATAR_PARTS.map((p) => [p, BOT_BLUE])
  ) as any;
  let variants: Record<AvatarPart, number> = Object.fromEntries(
    AVATAR_PARTS.map((p) => [p, 0])
  ) as any;
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
    ) as any;
  } catch { /* fall back to all-zero variants */ }
  return { format: "v2", colors, variants };
}

async function generateBotPersonas(
  title: string, leftLabel: string, rightLabel: string
): Promise<{ comment: string }[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
[{"comment":"..."},{"comment":"..."},{"comment":"..."},{"comment":"..."},{"comment":"..."}]`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.85,
    max_tokens: 600,
  });
  const raw = res.choices[0]?.message?.content?.trim() ?? "[]";
  return JSON.parse(raw);
}

// ─── pre-written fallback bot personas ───────────────────────────────────────
// Used when OPENAI_API_KEY is not set. Keyed by continuum title.
const FALLBACK_PERSONAS: Record<string, { comment: string }[]> = {
  "Mustang the horse or Mustang the car?": [
    { comment: "Nothing beats the warm nuzzle of a real Mustang — wild, untameable, and alive." },
    { comment: "I lean toward the horse. There's something irreplaceable about that connection with a living animal." },
    { comment: "Both Mustangs have their own kind of power and beauty. I genuinely can't choose one." },
    { comment: "The sound of a Mustang engine on an open road hits completely different to anything else." },
    { comment: "Give me a 5.0 V8 and an empty highway. That's the only Mustang I need." },
  ],
  "Remote work or office?": [
    { comment: "My home office is perfectly tuned to my brain. I'd never voluntarily go back." },
    { comment: "I prefer home — fewer interruptions and I can actually think deeply." },
    { comment: "Both have real value. I do deep work at home and collaboration at the office." },
    { comment: "The office keeps me sharp. I need that ambient energy and the social pulse around me." },
    { comment: "I simply cannot function at home. The office is where I come fully alive." },
  ],
  "Cats or dogs?": [
    { comment: "My cat and I have an understanding that requires no words. That's everything." },
    { comment: "Cats are just quietly there for you when you need them. That's more than enough." },
    { comment: "I've loved both deeply at different points. It really depends on where you are in life." },
    { comment: "Dogs just make everything better instantly. The joy is completely contagious." },
    { comment: "A dog's love is unconditional and relentless in the best possible way. Nothing else comes close." },
  ],
  "Pineapple on pizza: yes or no?": [
    { comment: "Putting fruit on pizza violates something fundamental about the concept of dinner." },
    { comment: "I don't hate pineapple in theory — just absolutely not on my pizza." },
    { comment: "I've had genuinely good pineapple pizza and genuinely bad. Execution is everything." },
    { comment: "The sweetness against the saltiness of the ham is actually inspired pairing." },
    { comment: "Hawaiian pizza is the peak of the form. I will defend this position forever." },
  ],
};

// ─── data definitions ─────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Aiden","Amara","Blake","Camille","Darius","Elara","Finn","Greta","Hassan","Isla",
  "Juno","Kai","Layla","Marcus","Nina","Omar","Priya","Quinn","Rosa","Soren",
  "Tara","Ulrich","Vivi","Wren","Xara","Yuki","Zara","Abel","Bea","Cleo",
  "Diego","Ember","Fox","Gemma","Hugo","Ines","Jasper","Kira","Luca","Mira",
  "Nash","Opal","Pax","Remy","Sage","Theo","Uma","Vale","Wilder","Yael",
  "Azra","Beckett","Cosmo","Dex","Esme","Flint","Greer","Halo","Imani","Jules",
  "Koda","Lior","Marlo","Neve","Oberon","Petra","Reed","Sable","Tove","Ula",
  "Vesper","Wynn","Xiomara","Yarrow","Zelda","Arlo","Bren","Cove","Dash","Evie",
  "Fern","Grove","Haze","Iris","Jett","Kleo","Leif","Mabel","Niko","Orla",
  "Penn","Rook","Sloane","Tide","Uri","Vex","Willa","Xen","York","Zeal",
];

const LAST_NAMES = [
  "Adeyemi","Bergmann","Castillo","Dahl","Eriksen","Fontaine","Gruber","Holt",
  "Ito","Jensen","Kim","Laurent","Moreau","Nakamura","Okonkwo","Park",
  "Qureshi","Reyes","Santos","Tanaka","Ueda","Vasquez","Walsh","Xu","Yamamoto","Zhang",
];

const CONTINUUMS: {
  title: string;
  leftLabel: string;
  rightLabel: string;
  // number of real fake-user participants to assign
  count: number;
  // whether to add OpenAI bots
  bots: boolean;
}[] = [
  // ~100 participants (full)
  { title: "Mustang the horse or Mustang the car?", leftLabel: "Horse all the way", rightLabel: "Ford Mustang forever", count: 98, bots: true },
  { title: "Sparkling water or still water?", leftLabel: "Still, always still", rightLabel: "The bubblier the better", count: 95, bots: false },
  { title: "Remote work or office?", leftLabel: "Home is where the work is", rightLabel: "I need the office energy", count: 100, bots: true },

  // ~50 participants
  { title: "Coffee or tea?", leftLabel: "Espresso first, questions later", rightLabel: "Tea is civilization", count: 52, bots: false },
  { title: "Cats or dogs?", leftLabel: "Cats understand me", rightLabel: "Dogs are life", count: 48, bots: true },
  { title: "Mountains or beach?", leftLabel: "Alpine everything", rightLabel: "Sand between my toes", count: 55, bots: false },
  { title: "Reading or watching?", leftLabel: "Books, always books", rightLabel: "Cinema is the highest art", count: 44, bots: false },
  { title: "City living or countryside?", leftLabel: "Urban jungle suits me", rightLabel: "Peace and open skies", count: 50, bots: false },

  // ~25 participants
  { title: "Pineapple on pizza: yes or no?", leftLabel: "Absolutely not", rightLabel: "Sweet and savoury is genius", count: 26, bots: true },
  { title: "Early bird or night owl?", leftLabel: "5am club forever", rightLabel: "Midnight is when I thrive", count: 24, bots: false },
  { title: "Analog or digital?", leftLabel: "Paper, film, vinyl", rightLabel: "Everything digital", count: 27, bots: false },
  { title: "Introvert or extrovert?", leftLabel: "Recharge alone", rightLabel: "Energy from people", count: 23, bots: false },
  { title: "Fast fashion or slow fashion?", leftLabel: "Thrift and mend", rightLabel: "New season, new me", count: 25, bots: false },

  // ~10 participants
  { title: "Tabs or spaces?", leftLabel: "Tabs, obviously", rightLabel: "Spaces are the only way", count: 11, bots: false },
  { title: "Minimalism or maximalism?", leftLabel: "Less is more", rightLabel: "More is more", count: 9, bots: false },
  { title: "Sweet or savoury breakfast?", leftLabel: "Pancakes and syrup", rightLabel: "Eggs and avocado", count: 10, bots: false },
  { title: "Cycling or driving?", leftLabel: "Bike everywhere", rightLabel: "Car is freedom", count: 12, bots: false },
  { title: "Planning vs winging it?", leftLabel: "Spreadsheet life", rightLabel: "I improvise everything", count: 8, bots: false },

  // sparse (~3)
  { title: "Oxford comma: yes or no?", leftLabel: "Never needed", rightLabel: "Always required", count: 3, bots: false },
  { title: "Crunchy or smooth peanut butter?", leftLabel: "Smooth only", rightLabel: "Crunch is essential", count: 4, bots: false },
  { title: "Loud music or silence while working?", leftLabel: "Complete silence", rightLabel: "Loud music helps me focus", count: 3, bots: false },
  { title: "Serif or sans-serif?", leftLabel: "Serif is timeless", rightLabel: "Sans-serif is clarity", count: 4, bots: false },

  // empty / near-empty
  { title: "Physical keys or smart locks?", leftLabel: "Old-fashioned key", rightLabel: "App-controlled everything", count: 1, bots: false },
  { title: "Printed maps or GPS?", leftLabel: "Paper map master", rightLabel: "GPS is superior", count: 0, bots: false },
  { title: "Cursive or print handwriting?", leftLabel: "Cursive is elegant", rightLabel: "Print is clearer", count: 0, bots: false },
];

// Position-appropriate comment templates (keyed by rough band)
function commentForPosition(pos: number, title: string, leftLabel: string, rightLabel: string): string | null {
  // ~40% get no comment
  if (Math.random() < 0.4) return null;

  if (pos < 20) {
    const opts = [
      `Firmly on the "${leftLabel}" side — no contest.`,
      `"${leftLabel}" is the only answer for me.`,
      `I've always believed in ${leftLabel.toLowerCase()}, ever since I can remember.`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  if (pos < 40) {
    const opts = [
      `I lean "${leftLabel}" but I can see the appeal of the other side.`,
      `Mostly a ${leftLabel.toLowerCase()} person, with occasional exceptions.`,
      `Probably ${leftLabel.toLowerCase()}, though context matters.`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  if (pos < 60) {
    const opts = [
      `Honestly torn — both have real merit.`,
      `Depends on the day. Both "${leftLabel}" and "${rightLabel}" have their moments.`,
      `I'm genuinely in the middle on this one.`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  if (pos < 80) {
    const opts = [
      `Leaning toward "${rightLabel}", though it's not black and white.`,
      `Mostly ${rightLabel.toLowerCase()} for me, with a few caveats.`,
      `"${rightLabel}" usually wins when I stop and think about it.`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  const opts = [
    `"${rightLabel}" without a shadow of a doubt.`,
    `Couldn't be more on the ${rightLabel.toLowerCase()} end of this.`,
    `I'm about as ${rightLabel.toLowerCase()} as it gets.`,
  ];
  return opts[Math.floor(Math.random() * opts.length)];
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY ? "DRY RUN — no DB writes\n" : "");

  // ── 1. Create 100 fake users ──────────────────────────────────────────────

  console.log("Creating 100 fake users…");
  const userIds: string[] = [];

  for (let i = 0; i < 100; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[seededInt(i, 777, LAST_NAMES.length)];
    const name = `${firstName} ${lastName}`;
    const email = `fake.user.${i}@communiculture.test`;
    const avatarConfig = buildAvatarConfig(i);

    if (DRY) {
      console.log(`  [${i}] ${name} <${email}>`);
      userIds.push(`dry-user-${i}`);
      continue;
    }

    // Upsert so re-runs are safe
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, avatarConfig: avatarConfig as any },
      create: {
        name,
        email,
        avatarConfig: avatarConfig as any,
        isSynthetic: false,
        onboardingComplete: true,
      },
    });
    userIds.push(user.id);
    if (i % 10 === 9) console.log(`  …${i + 1} users created`);
  }

  console.log(`Users ready: ${userIds.length}\n`);

  // Shuffle for random assignment
  const shuffled = [...userIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = seededInt(i, 42, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // ── 2. Create owner for all continuums (first fake user) ──────────────────

  const ownerId = userIds[0];

  // ── 3. Create continuums and populate them ────────────────────────────────

  let userCursor = 0;
  let botContinuumsRun = 0;

  for (let ci = 0; ci < CONTINUUMS.length; ci++) {
    const def = CONTINUUMS[ci];
    console.log(`Continuum [${ci + 1}/${CONTINUUMS.length}]: "${def.title}" (${def.count} participants)`);

    let continuumId: string;
    if (DRY) {
      continuumId = `dry-continuum-${ci}`;
    } else {
      // Upsert by title+owner
      const existing = await prisma.continuum.findFirst({ where: { title: def.title, ownerId } });
      if (existing) {
        continuumId = existing.id;
        // Clear existing real participants so re-runs are idempotent
        await prisma.continuumParticipant.deleteMany({
          where: { continuumId, user: { isSynthetic: false } },
        });
      } else {
        const created = await prisma.continuum.create({
          data: {
            title: def.title,
            leftLabel: def.leftLabel,
            rightLabel: def.rightLabel,
            ownerId,
            visibility: "PUBLIC_LINK",
            shareToken: `share-${ci}-${Date.now()}`,
          },
        });
        continuumId = created.id;
      }
    }

    // Assign fake users as participants
    const participants = shuffled.slice(userCursor, userCursor + def.count);
    userCursor = (userCursor + def.count) % shuffled.length;

    for (let pi = 0; pi < participants.length; pi++) {
      const uid = participants[pi];
      // Spread across the spectrum with some natural clustering
      const baseFrac = seededFloat(pi, ci * 100);
      const jitter = (seededFloat(pi, ci * 100 + 7) - 0.5) * 20;
      const posX = Math.max(2, Math.min(98, baseFrac * 100 + jitter));
      const posZ = 5 + seededFloat(pi, ci * 100 + 13) * 90; // 5–95

      const comment = commentForPosition(posX, def.title, def.leftLabel, def.rightLabel);

      if (!DRY) {
        await prisma.continuumParticipant.upsert({
          where: { continuumId_userId: { continuumId, userId: uid } },
          update: { position: posX, positionZ: posZ, comment },
          create: { continuumId, userId: uid, position: posX, positionZ: posZ, comment },
        });
      } else if (pi < 3 || pi === participants.length - 1) {
        console.log(`  participant[${pi}] x=${posX.toFixed(1)} z=${posZ.toFixed(1)} comment=${comment?.slice(0, 40) ?? "null"}`);
      }
    }

    // Add bots if requested
    if (def.bots) {
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      const hasFallback = !!FALLBACK_PERSONAS[def.title];
      const source = hasOpenAI ? "OpenAI" : hasFallback ? "pre-written" : null;

      if (!source) {
        console.log(`  ⚠ Skipping bots — no OPENAI_API_KEY and no fallback personas for "${def.title}"`);
      } else {
        console.log(`  → Adding 5 ${source} bots for "${def.title}"…`);
        if (!DRY) {
          // Remove old bots for this continuum
          const oldBots = await prisma.user.findMany({
            where: { isSynthetic: true, participations: { some: { continuumId } } },
            select: { id: true },
          });
          if (oldBots.length > 0) {
            await prisma.user.deleteMany({ where: { id: { in: oldBots.map(u => u.id) } } });
          }

          try {
            const personas = hasOpenAI
              ? await generateBotPersonas(def.title, def.leftLabel, def.rightLabel)
              : FALLBACK_PERSONAS[def.title];

            for (let bi = 0; bi < personas.length; bi++) {
              const avatarConfig = await syntheticBotAvatar(bi + botContinuumsRun * 5);
              const botUser = await prisma.user.create({
                data: {
                  name: `participant`,
                  email: `synthetic.${continuumId}.${bi}@communiculture.bot`,
                  isSynthetic: true,
                  avatarConfig: avatarConfig as any,
                  onboardingComplete: true,
                },
              });
              const posZ = 20 + seededInt(bi + 7, bi * 3 + 11, 60);
              await prisma.continuumParticipant.create({
                data: {
                  continuumId,
                  userId: botUser.id,
                  position: BOT_POSITIONS[bi],
                  positionZ: posZ,
                  comment: personas[bi].comment,
                },
              });
              console.log(`    bot ${bi + 1}/5 x=${BOT_POSITIONS[bi]} z=${posZ}: "${personas[bi].comment.slice(0, 60)}"`);
            }
            botContinuumsRun++;
          } catch (e) {
            console.warn("  ⚠ Bot creation failed:", (e as Error).message);
          }
        } else {
          const personas = FALLBACK_PERSONAS[def.title] ?? [];
          personas.forEach((p, bi) => console.log(`  [dry] bot ${bi + 1}/5: "${p.comment.slice(0, 50)}"`));
        }
      }
    }

    console.log(`  ✓ done`);
  }

  console.log("\nAll done.");
  if (!DRY) await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  if (!DRY) await prisma.$disconnect();
  process.exit(1);
});
