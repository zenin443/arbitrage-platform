import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth/middleware';
import { transformSimulatorResponse } from '@/lib/simulator-transformer';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  const plan = authUser?.plan ?? 'anonymous';

  try {
    const res = await fetch(`${BACKEND_URL}/simulators`, { cache: 'no-store' });
    const raw = await res.json();

    if (!raw || typeof raw !== 'object') {
      return Response.json(null, { status: 503 });
    }

    const filtered = transformSimulatorResponse(raw, plan as any);
    return Response.json(filtered, {
      headers: { 'X-Data-Tier': plan },
    });
  } catch {
    return Response.json(null, { status: 503 });
  }
}
