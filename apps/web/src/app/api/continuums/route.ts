import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { nanoid } from "@/lib/nanoid";
import bcrypt from "bcryptjs";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import { canCreateContinuum } from "@/lib/plans";
import { enqueueForModeration } from "@/lib/moderation";

const AVATAR_PARTS = ["hair","head","face","neck","arms","body","pants","legs","shoes"] as const;
const BOT_BLUE = "#0083FF";

// ─── synthetic avatar generation ──────────────────────────────────────────────

function seededInt(seed: number, salt: number, max: number): number {
  const h = ((seed * 1664525 + salt * 1013904223) >>> 0) % max;
  return h;
}

async function syntheticBotAvatar(botIndex: number) {
  const colors = Object.fromEntries(AVATAR_PARTS.map((p) => [p, BOT_BLUE]));
  let variants: Record<string, number> = Object.fromEntries(AVATAR_PARTS.map((p) => [p, 0]));

  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".avatar-library.json"), "utf-8");
    const library = JSON.parse(raw).library ?? JSON.parse(raw);
    variants = Object.fromEntries(
      AVATAR_PARTS.map((p, partIdx) => {
        const count = Array.isArray(library[p]) ? library[p].length : 1;
        return [p, seededInt(botIndex + 1, partIdx + 1, count)];
      })
    );
  } catch {
    // library not found — fall back to all variant 0
  }

  return { format: "v2", colors, variants };
}

// ─── synthetic participant generation ─────────────────────────────────────────

const POSITIONS = [10, 30, 50, 70, 90]; // 0–100 scale matching ContinuumParticipant.position

interface SyntheticPersona {
  name: string;
  comment: string;
}

async function generatePersonas(
  title: string,
  leftLabel: string,
  rightLabel: string
): Promise<SyntheticPersona[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content[0]?.type === "text" ? response.content[0].text.trim() : "[]";
  const raw = rawText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
  const parsed: SyntheticPersona[] = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length !== 5) {
    throw new Error("Unexpected response shape from Anthropic");
  }
  return parsed;
}

async function createSyntheticParticipants(
  continuumId: string,
  title: string,
  leftLabel: string,
  rightLabel: string
) {
  const personas = await generatePersonas(title, leftLabel, rightLabel);

  await Promise.all(
    personas.map(async (persona, i) => {
      const user = await prisma.user.create({
        data: {
          name: persona.name,
          email: `synthetic.${continuumId}.${i}@communiculture.bot`,
          isSynthetic: true,
          avatarConfig: await syntheticBotAvatar(i),
          onboardingComplete: true,
        },
      });

      await prisma.continuumParticipant.create({
        data: {
          continuumId,
          userId: user.id,
          position: POSITIONS[i],
          comment: persona.comment,
        },
      });
    })
  );
}

// ─── POST /api/continuums ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [user, totalOwned] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { lifetimeContinuums: true, continuumCredits: true },
    }),
    prisma.continuum.count({ where: { ownerId: userId } }),
  ]);

  if (!canCreateContinuum({ lifetimeContinuums: user?.lifetimeContinuums ?? false, continuumCredits: user?.continuumCredits ?? 0, totalOwned })) {
    return NextResponse.json(
      { error: "limit_reached", message: "You've used all your continuums — buy a pack to create more" },
      { status: 402 }
    );
  }

  const { title, leftLabel, rightLabel, description, teamId, visibility, category, password, prepopulate } =
    await req.json();

  if (!title?.trim() || !leftLabel?.trim() || !rightLabel?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (visibility === "PUBLIC" && !category?.trim()) {
    return NextResponse.json({ error: "category_required" }, { status: 400 });
  }
  if (visibility === "PASSWORD" && !password?.trim()) {
    return NextResponse.json({ error: "password_required" }, { status: 400 });
  }

  const needsShareToken = visibility === "PUBLIC_LINK" || visibility === "PASSWORD";
  const shareToken = needsShareToken ? nanoid() : null;
  const passwordHash = password ? await bcrypt.hash(password.trim(), 10) : null;

  const continuum = await prisma.continuum.create({
    data: {
      title: title.trim(),
      leftLabel: leftLabel.trim(),
      rightLabel: rightLabel.trim(),
      description: description?.trim() || null,
      ownerId: userId,
      teamId: teamId || null,
      visibility: visibility ?? "PUBLIC_LINK",
      shareToken,
      category: category?.trim() || null,
      passwordHash,
    },
  });

  // Moderate continuum content (title + labels + description) asynchronously
  const moderationContent = [
    `Title: ${continuum.title}`,
    `Left label: ${continuum.leftLabel}`,
    `Right label: ${continuum.rightLabel}`,
    continuum.description ? `Description: ${continuum.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  enqueueForModeration({
    id: `continuum:${continuum.id}`,
    type: "continuum",
    entityId: continuum.id,
    content: moderationContent,
  });

  const isSeeding = !!(prepopulate && process.env.ANTHROPIC_API_KEY);
  if (isSeeding) {
    // Fire async — don't block the response
    createSyntheticParticipants(continuum.id, continuum.title, continuum.leftLabel, continuum.rightLabel)
      .catch(err => console.error("Synthetic participant generation failed:", err));
  }

  return NextResponse.json({ ...continuum, seeding: isSeeding }, { status: 201 });
}

// ─── GET /api/continuums ──────────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const continuums = await prisma.continuum.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { participants: { some: { userId } } },
        { team: { members: { some: { userId } } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(continuums);
}
