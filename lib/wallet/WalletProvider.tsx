'use client';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { walletConfig } from './config';
import '@rainbow-me/rainbowkit/styles.css';
import type { ReactNode } from 'react';

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={walletConfig}>
      {children}
    </WagmiProvider>
  );
}

export function RainbowKitWrapper({ children }: { children: ReactNode }) {
  return (
    <RainbowKitProvider
      theme={darkTheme({
        accentColor: '#238636',
        accentColorForeground: 'white',
        borderRadius: 'small',
        fontStack: 'system',
        overlayBlur: 'small',
      })}
      modalSize="compact"
    >
      {children}
    </RainbowKitProvider>
  );
}
