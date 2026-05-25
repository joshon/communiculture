import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { nanoid } from "@/lib/nanoid";
import bcrypt from "bcryptjs";
import OpenAI from "openai";

const FREE_LIMIT = 3;

// ─── blue avatar palette ──────────────────────────────────────────────────────

const BLUE_SHADES = [
  "#0033CC", "#0055BB", "#0083FF", "#4499DD",
  "#1166BB", "#003399", "#2266AA", "#335599",
];

function randomBlueAvatar(seed: number) {
  const pick = (offset: number) => BLUE_SHADES[(seed + offset) % BLUE_SHADES.length];
  return {
    hair:  pick(0),
    head:  pick(1),
    face:  "#000033",   // dark blue for eyes/face texture
    neck:  pick(2),
    arms:  pick(3),
    body:  pick(4),
    pants: pick(5),
    legs:  pick(6),
    shoes: pick(7),
  };
}

// ─── synthetic participant generation ─────────────────────────────────────────

const POSITIONS = [0.1, 0.3, 0.5, 0.7, 0.9];

interface SyntheticPersona {
  name: string;
  comment: string;
}

async function generatePersonas(
  title: string,
  leftLabel: string,
  rightLabel: string
): Promise<SyntheticPersona[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `You are generating 5 synthetic participant voices for an interactive opinion spectrum tool.

The question/topic is: "${title}"
The two ends of the spectrum are:
  - 0% (left end): "${leftLabel}"
  - 100% (right end): "${rightLabel}"

Generate exactly 5 people at these positions:
1. 10% — strongly favours "${leftLabel}"
2. 30% — leans toward "${leftLabel}"
3. 50% — genuinely neutral or sees merit in both
4. 70% — leans toward "${rightLabel}"
5. 90% — strongly favours "${rightLabel}"

Each person should have a distinct voice and a short, natural 1–2 sentence comment that authentically reflects their position. Vary tone, age, and background.

Return ONLY a valid JSON array (no markdown, no explanation):
[{"name":"...","comment":"..."},{"name":"...","comment":"..."},{"name":"...","comment":"..."},{"name":"...","comment":"..."},{"name":"...","comment":"..."}]`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.85,
    max_tokens: 600,
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
  const parsed: SyntheticPersona[] = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length !== 5) {
    throw new Error("Unexpected OpenAI response shape");
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
          avatarConfig: randomBlueAvatar(i * 3),
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, _count: { select: { continuums: true } } },
  });

  if (user?.plan === "FREE" && (user._count?.continuums ?? 0) >= FREE_LIMIT) {
    return NextResponse.json(
      { error: "free_limit_reached", message: "Upgrade to create more continuums" },
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

  if (prepopulate && process.env.OPENAI_API_KEY) {
    try {
      await createSyntheticParticipants(continuum.id, continuum.title, continuum.leftLabel, continuum.rightLabel);
    } catch (err) {
      console.error("Synthetic participant generation failed:", err);
      // Non-fatal — continuum was created, just without synthetic participants
    }
  }

  return NextResponse.json(continuum, { status: 201 });
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
