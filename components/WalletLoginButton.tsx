'use client';

import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState, useRef } from 'react';

interface WalletLoginButtonProps {
  onSuccess: (user: WalletUser, accessToken: string) => void;
}

interface WalletUser {
  id: string;
  email: string | null;
  name: string;
  walletAddress: string;
  plan: string;
}

export function WalletLoginButton({ onSuccess }: WalletLoginButtonProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const authAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (isConnected && address && !isAuthenticating) {
      if (authAttemptRef.current === address) return;
      authAttemptRef.current = address;
      authenticateWithWallet(address);
    }
    if (!isConnected) {
      authAttemptRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  async function authenticateWithWallet(addr: string) {
    setIsAuthenticating(true);
    setError('');

    try {
      // Step 1: Get a server-issued nonce to prevent signature replay attacks
      const nonceRes = await fetch(`/api/auth/wallet/nonce?address=${encodeURIComponent(addr)}`);
      if (!nonceRes.ok) {
        throw new Error('Failed to retrieve authentication nonce. Please try again.');
      }
      const { nonce } = await nonceRes.json() as { nonce: string };

      // Step 2: Build the message with the nonce embedded
      const message = [
        'Sign in to Arbitrance Terminal',
        '',
        `Wallet: ${addr}`,
        `Nonce: ${nonce}`,
        `Timestamp: ${Date.now()}`,
      ].join('\n');

      // Step 3: Sign the message
      const signature = await signMessageAsync({ message });

      // Step 4: Authenticate with the server
      const res = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, signature, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Wallet authentication failed');
      }

      onSuccess(data.user, data.accessToken);
    } catch (err: unknown) {
      authAttemptRef.current = null;
      const msg = err instanceof Error ? err.message : 'Failed to authenticate';
      if (!msg.toLowerCase().includes('user rejected') && !msg.toLowerCase().includes('user denied')) {
        setError(msg);
      }
      disconnect();
    } finally {
      setIsAuthenticating(false);
    }
  }

  return (
    <div>
      {error && (
        <p className="text-red-400 text-[11px] font-mono mb-2">{error}</p>
      )}
      {isAuthenticating ? (
        <div className="w-full py-2.5 text-center text-[11px] font-mono text-[#484F58] animate-pulse">
          Verifying wallet signature...
        </div>
      ) : (
        <ConnectButton.Custom>
          {({ openConnectModal, account, mounted }) => {
            if (!mounted) return null;
            if (account) return (
              <div className="w-full py-2.5 text-center text-[11px] font-mono text-[#484F58] animate-pulse">
                Connecting...
              </div>
            );

            return (
              <button
                onClick={openConnectModal}
                type="button"
                className="w-full py-2.5 bg-[#161B22] border border-[#21262D] rounded text-[12px] font-mono text-[#C9D1D9] uppercase tracking-wider hover:bg-[#1C2128] hover:border-[#30363D] transition-colors"
              >
                Connect Wallet
              </button>
            );
          }}
        </ConnectButton.Custom>
      )}
    </div>
  );
}
