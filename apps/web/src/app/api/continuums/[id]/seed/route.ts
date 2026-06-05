import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import Anthropic from "@anthropic-ai/sdk";

const POSITIONS = [10, 30, 50, 70, 90];
const AVATAR_PARTS = ["hair","head","face","neck","arms","body","pants","legs","shoes"] as const;
const BOT_BLUE = "#0083FF";

function seededInt(seed: number, salt: number, max: number): number {
  return ((seed * 1664525 + salt * 1013904223) >>> 0) % max;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const continuum = await prisma.continuum.findUnique({ where: { id: params.id } });
  if (!continuum || continuum.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Idempotent — skip if bots already exist
  const existing = await prisma.continuumParticipant.count({
    where: { continuumId: params.id, user: { isSynthetic: true } },
  });
  if (existing >= 5) return NextResponse.json({ ok: true, skipped: true });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Generate 5 short opinion comments for an interactive spectrum tool about: "${continuum.title}"

Left end (0%): "${continuum.leftLabel}"
Right end (100%): "${continuum.rightLabel}"

1. Position 10%: Strongly prefers "${continuum.leftLabel}". Give a vivid, specific reason.
2. Position 30%: Leans toward "${continuum.leftLabel}" but isn't extreme.
3. Position 50%: Genuinely torn, sees real value in both.
4. Position 70%: Leans toward "${continuum.rightLabel}" with a specific reason.
5. Position 90%: Strongly prefers "${continuum.rightLabel}". Give a vivid, specific reason.

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
  const personas: Array<{ name: string; comment: string }> = JSON.parse(raw);

  await Promise.all(
    personas.map(async (persona, i) => {
      let library: Record<string, unknown[]> = {};
      try {
        const libRes = await fetch(`${process.env.NEXTAUTH_URL}/api/dev/avatar-library`);
        const libData = await libRes.json();
        library = libData.library ?? {};
      } catch { /* fall back to variant 0 */ }

      const variants = Object.fromEntries(
        AVATAR_PARTS.map((p, pi) => {
          const count = Array.isArray(library[p]) ? library[p].length : 1;
          return [p, seededInt(i + 1, pi + 1, count)];
        })
      );
      const colors = Object.fromEntries(AVATAR_PARTS.map(p => [p, BOT_BLUE]));

      const user = await prisma.user.create({
        data: {
          name: persona.name,
          email: `synthetic.${params.id}.${i}@communiculture.bot`,
          isSynthetic: true,
          avatarConfig: { format: "v2", colors, variants },
          onboardingComplete: true,
        },
      });

      await prisma.continuumParticipant.create({
        data: {
          continuumId: params.id,
          userId: user.id,
          position: POSITIONS[i],
          comment: persona.comment,
        },
      });
    })
  );

  return NextResponse.json({ ok: true });
}
