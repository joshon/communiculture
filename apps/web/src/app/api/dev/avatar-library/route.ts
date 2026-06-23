import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';

const LIBRARY_PATH = path.join(process.cwd(), '.avatar-library.json');

// GET stays open — the user-facing avatar editor, continuum scene, and
// onboarding all read the library to render avatars.
export async function GET() {
  try {
    const data = await fs.readFile(LIBRARY_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json(null);
  }
}

// Saving the library (the part-builder) is admin-only.
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    await fs.writeFile(LIBRARY_PATH, JSON.stringify(body, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[avatar-library] save failed:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
