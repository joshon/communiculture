import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Only owner or admin can invite
  const myMembership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: params.id } },
  });
  if (!myMembership || myMembership.role === "MEMBER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { email } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "missing_email" }, { status: 400 });

  const invitee = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!invitee) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const existing = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: invitee.id, teamId: params.id } },
  });
  if (existing) return NextResponse.json({ error: "already_member" }, { status: 409 });

  const member = await prisma.teamMember.create({
    data: { userId: invitee.id, teamId: params.id, role: "MEMBER" },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { userId } = await req.json();

  const myMembership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: params.id } },
  });
  if (!myMembership || myMembership.role === "MEMBER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.teamMember.delete({
    where: { userId_teamId: { userId, teamId: params.id } },
  });

  return NextResponse.json({ ok: true });
}
