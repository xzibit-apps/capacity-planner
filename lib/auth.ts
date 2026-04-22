import { NextRequest } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';

export type AuthResult =
  | { ok: true; payload: JWTPayload }
  | { ok: false; status: number; error: string };

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || '');

/**
 * Verifies the auth_token cookie and returns the decoded JWT payload.
 *
 * Fail-closed semantics:
 *   - 500 if JWT_SECRET is not configured (misconfiguration, not a client error)
 *   - 401 if the cookie is absent or the token fails jwtVerify
 *
 * Dev bypass: when NODE_ENV === 'development', skips verification entirely and
 * returns a mock admin payload so local development works without a signed token.
 * This bypass is ONLY active locally — production always verifies.
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  if (process.env.NODE_ENV === 'development') {
    return { ok: true, payload: { role: 'admin', userId: 'dev-user' } as unknown as JWTPayload };
  }
  if (!process.env.JWT_SECRET) {
    return { ok: false, status: 500, error: 'JWT_SECRET not configured' };
  }
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return { ok: false, status: 401, error: 'Missing auth token' };
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { ok: true, payload };
  } catch {
    return { ok: false, status: 401, error: 'Invalid or expired token' };
  }
}

/**
 * Like verifyAuth, but additionally requires role === 'admin'.
 * Returns 403 if the token is valid but role is not admin.
 */
export async function verifyAdmin(request: NextRequest): Promise<AuthResult> {
  const auth = await verifyAuth(request);
  if (!auth.ok) return auth;
  const role = (auth.payload as Record<string, unknown>).role;
  if (role !== 'admin') return { ok: false, status: 403, error: 'Admin required' };
  return auth;
}
