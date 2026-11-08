import { NextResponse } from 'next/server';
import { adminCookie, clearedCookie, credentialsConfigured, credentialsMatch, isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export async function GET(request: Request) { return NextResponse.json({ configured: credentialsConfigured(), authenticated: isAdmin(request) }); }
export async function POST(request: Request) {
  if (!credentialsConfigured()) return NextResponse.json({ error: 'Chưa cấu hình ADMIN_USERNAME và ADMIN_PASSWORD trên máy chủ.' }, { status: 503 });
  const { username, password } = await request.json();
  if (!credentialsMatch(String(username || ''), String(password || ''))) return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, { status: 401 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminCookie());
  return response;
}
export async function DELETE() { const response = NextResponse.json({ authenticated: false }); response.cookies.set(clearedCookie()); return response; }
