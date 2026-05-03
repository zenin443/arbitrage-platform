import pool from '@/lib/db';

export interface AdminAuditEntry {
  userId: string;
  email: string;
  method: string;
  path: string;
  statusCode: number;
  requestBody?: Record<string, unknown> | null;
  ip: string;
  userAgent: string;
}

/**
 * Persist an admin action to the audit log.
 * Fire-and-forget — never throws, never blocks the response.
 * All admin route handlers call this after resolving their response status.
 */
export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log
         (user_id, email, method, path, status_code, request_body, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)`,
      [
        entry.userId,
        entry.email,
        entry.method,
        entry.path,
        entry.statusCode,
        entry.requestBody ? JSON.stringify(entry.requestBody) : null,
        entry.ip || null,
        entry.userAgent || null,
      ]
    );
  } catch (err) {
    // Log to stderr — never surface to client, never block response
    console.error('[admin/audit] Failed to write audit log entry:', err);
  }
}

export function getClientIp(req: { headers: { get?: (name: string) => string | null } }): string {
  return (
    (req.headers as any).get?.('x-forwarded-for')?.split(',')[0].trim() ||
    (req.headers as any).get?.('x-real-ip') ||
    'unknown'
  );
}
