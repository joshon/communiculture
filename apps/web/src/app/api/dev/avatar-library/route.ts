import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const LIBRARY_PATH = path.join(process.cwd(), '.avatar-library.json');

export async function GET() {
  try {
    const data = await fs.readFile(LIBRARY_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    await fs.writeFile(LIBRARY_PATH, JSON.stringify(body, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[avatar-library] save failed:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
