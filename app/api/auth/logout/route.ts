import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value;

  if (refreshToken) {
    try {
      await pool.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
    } catch (err) {
      console.error('Logout session delete error:', err);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}
