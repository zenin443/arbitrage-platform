import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { logAdminAction, getClientIp } from '@/lib/admin/audit';

/**
 * GET /api/admin/whitelabel
 * Retrieve all whitelabel tenant configs.
 */
export async function GET(req: NextRequest) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { rows } = await pool.query(`
      SELECT * FROM whitelabel_tenants ORDER BY created_at DESC
    `);
    return NextResponse.json({ tenants: rows });
  } catch {
    return NextResponse.json({ tenants: [] });
  }
}

/**
 * POST /api/admin/whitelabel
 * Create a new whitelabel tenant config.
 */
export async function POST(req: NextRequest) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const admin = authResult;

  try {
    const body = await req.json();
    const { slug, name, domain, primary_color, logo_url, support_email, owner_user_id } = body;

    if (!slug || !name) {
      return NextResponse.json({ error: 'slug and name are required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO whitelabel_tenants
         (slug, name, domain, primary_color, logo_url, support_email, owner_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [slug, name, domain || null, primary_color || '#10b981', logo_url || null, support_email || null, owner_user_id || null]
    );

    logAdminAction({
      userId: admin.userId, email: admin.email, method: 'POST',
      path: req.nextUrl.pathname, statusCode: 201,
      requestBody: { slug, name, domain },
      ip: getClientIp(req), userAgent: req.headers.get('user-agent') || '',
    });

    return NextResponse.json({ tenant: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      return NextResponse.json({ error: 'Tenant slug already exists' }, { status: 409 });
    }
    if (pgErr.code === '42P01') {
      return NextResponse.json({ error: 'Whitelabel table not yet created. Run migrations.' }, { status: 500 });
    }
    console.error('[api/admin/whitelabel]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
