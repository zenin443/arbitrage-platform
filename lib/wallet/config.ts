import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, base, arbitrum } from 'wagmi/chains';

export const walletConfig = getDefaultConfig({
  appName: 'Arbitrance Terminal',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, polygon, base, arbitrum],
  ssr: true,
});
