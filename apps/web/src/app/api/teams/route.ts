import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "missing_name" }, { status: 400 });

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      ownerId: session.user.id,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });

  return NextResponse.json(team, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const memberships = await prisma.teamMember.findMany({
    where: { userId: session.user.id },
    include: {
      team: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
          _count: { select: { continuums: true } },
        },
      },
    },
  });

  return NextResponse.json(memberships.map((m) => m.team));
}
