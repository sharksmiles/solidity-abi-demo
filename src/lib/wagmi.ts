import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Web3 Wallet App',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a558ae685fbe11469013845274331a2e', // 从 WalletConnect Cloud 获取
  chains: [mainnet, polygon, optimism, arbitrum, base, sepolia],
  ssr: true, // 如果你的 dApp 使用服务端渲染 (SSR)
});