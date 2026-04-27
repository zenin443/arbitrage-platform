import { NextRequest, NextResponse } from 'next/server';
import { generateWalletNonce } from '@/lib/auth/wallet-nonces';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json(
      { error: 'Valid EVM wallet address required (?address=0x...)' },
      { status: 400 }
    );
  }

  const nonce = generateWalletNonce(address);

  return NextResponse.json({ nonce });
}
