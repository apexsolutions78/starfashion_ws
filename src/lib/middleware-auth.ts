import { NextRequest } from 'next/server';
import { AuthUtils, UserSessionPayload } from './auth';

export async function getAuthSession(req: NextRequest): Promise<UserSessionPayload | null> {
  // 1. Check Cookie
  const cookieToken = req.cookies.get('auth_token')?.value;
  if (cookieToken) {
    const session = AuthUtils.verifyToken(cookieToken);
    if (session) return session;
  }

  // 2. Check Authorization Header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = AuthUtils.verifyToken(token);
    if (session) return session;
  }

  return null;
}
