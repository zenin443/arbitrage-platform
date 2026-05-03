import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { logAdminAction, getClientIp } from '@/lib/admin/audit';

/**
 * DELETE /api/admin/users/[id]/sessions
 * Force-logout a user by destroying all their sessions.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const admin = authResult;
  const { id } = await params;

  try {
    const result = await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]);

    logAdminAction({
      userId: admin.userId, email: admin.email, method: 'DELETE',
      path: req.nextUrl.pathname, statusCode: 200,
      requestBody: { target_user: id, sessions_deleted: result.rowCount },
      ip: getClientIp(req), userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      message: `Destroyed ${result.rowCount} session(s)`,
      sessionsDeleted: result.rowCount,
    });
  } catch (err) {
    console.error('[api/admin/users/[id]/sessions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
