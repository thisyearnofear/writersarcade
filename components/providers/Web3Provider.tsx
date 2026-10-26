'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { http, fallback } from 'wagmi';
import type { Transport } from 'viem';
import {
  mezoTestnet,
  mezoMainnet,
  unisatWalletMezoTestnet,
  okxWalletMezoTestnet,
  xverseWalletMezoTestnet,
  unisatWalletMezoMainnet,
  okxWalletMezoMainnet,
  xverseWalletMezoMainnet,
  PassportProvider
} from '@mezo-org/passport';
import { walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider } from 'wagmi';
import {
  base,
  baseSepolia,
  mainnet,
} from 'wagmi/chains';
import { baseRpcTransport } from '@/lib/base-rpc';
import { MEZO_NETWORK } from '@/lib/wallet/chains';

import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query';

// WalletConnect guard: only include WC wallet if a valid projectId is provided
const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
const HAS_WC = Boolean(WALLET_CONNECT_PROJECT_ID && WALLET_CONNECT_PROJECT_ID !== 'YOUR_PROJECT_ID');

// Lazy load config to avoid SSR issues
let config: ReturnType<typeof getDefaultConfig> | null = null;
let queryClient: QueryClient | null = null;

function getWagmiConfig() {
  if (!config) {
    const chains = [
      base,
      baseSepolia,
      // mainnet is included for ENS name/avatar resolution only — wallets stay on Base.
      mainnet,
      mezoTestnet,
      mezoMainnet,
    ] as const;

    const transports: Record<number, Transport> = {
      [base.id]: baseRpcTransport(),
      // CORS-friendly mainnet RPCs for ENS resolution — the viem default
      // (eth.merkle.io) doesn't send Access-Control-Allow-Origin and spams CORS errors.
      [mainnet.id]: fallback([
        http('https://ethereum-rpc.publicnode.com'),
        http('https://eth.drpc.org'),
        http('https://cloudflare-eth.com'),
      ]),
      [baseSepolia.id]: http(),
      [mezoTestnet.id]: http((mezoTestnet.rpcUrls.default.http as string[])[0]),
      [mezoMainnet.id]: http((mezoMainnet.rpcUrls.default.http as string[])[0]),
    }

    config = getDefaultConfig({
      appName: 'writersarcade',
      projectId: WALLET_CONNECT_PROJECT_ID || 'disabled-walletconnect',
      chains,
      transports,
      wallets: [
        {
          groupName: 'Bitcoin',
          wallets: MEZO_NETWORK === 'mainnet'
            ? [unisatWalletMezoMainnet, okxWalletMezoMainnet, xverseWalletMezoMainnet]
            : [unisatWalletMezoTestnet, okxWalletMezoTestnet, xverseWalletMezoTestnet],
        },
        {
          groupName: 'Ethereum',
          wallets: [({ projectId }) => walletConnectWallet({ projectId })],
        },
      ],
      multiInjectedProviderDiscovery: true,
      ssr: true,
    });
  }
  return config;
}

function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient();
  }
  return queryClient;
}

import { useState, useEffect, useMemo } from 'react';
import {
  createAuthenticationAdapter,
  RainbowKitAuthenticationProvider,
  useConnectModal,
  AuthenticationStatus,
} from '@rainbow-me/rainbowkit';
import { Web3AuthContext, OPEN_CONNECT_MODAL_EVENT } from './web3-auth-context';
import { SiweMessage } from 'siwe';
import { logger } from '@/lib/config';
import { installIpfsGatewayShim } from '@/lib/ipfs-gateway-shim';

export { useWeb3Auth } from './web3-auth-context';

// RainbowKit resolves the connected wallet's ENS avatar via ipfs.io (no CORS
// headers → console spam). Rewrite to a CORS-friendly gateway once, globally.
installIpfsGatewayShim();

// Lives inside RainbowKitProvider so useConnectModal is available; translates
// the dependency-free OPEN_CONNECT_MODAL_EVENT into the real modal.
function ConnectModalListener() {
  const { openConnectModal } = useConnectModal();
  useEffect(() => {
    const handler = () => openConnectModal?.();
    window.addEventListener(OPEN_CONNECT_MODAL_EVENT, handler);
    return () => window.removeEventListener(OPEN_CONNECT_MODAL_EVENT, handler);
  }, [openConnectModal]);
  return null;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>('loading');

  // Create adapter synchronously via useMemo — no tree-changing useEffect needed.
  // The adapter only references window inside its callbacks (which run later), so
  // it's safe to create during render. This avoids the conditional branch that
  // previously caused "Rendered more hooks than during the previous render" (React #310).
  const authAdapter = useMemo(() => createAuthenticationAdapter({
    getNonce: async () => {
      try {
        const response = await fetch('/api/auth/nonce');
        const data = await response.json();
        logger.info('[SIWE] Nonce fetched:', { nonce: data.nonce });
        return data.nonce;
      } catch (e) {
        logger.error('[SIWE] Failed to fetch nonce:', e);
        throw e;
      }
    },

    createMessage: ({ nonce, address, chainId }) => {
      logger.info('[SIWE] Creating message for:', { address, chainId, nonce });
      const domain = typeof window !== 'undefined' ? window.location.host : '';
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const message = new SiweMessage({
        domain,
        address,
        statement: 'Sign in to writersarcade.',
        uri: origin,
        version: '1',
        chainId,
        nonce,
      });
      return message.prepareMessage();
    },

    verify: async ({ message, signature }) => {
      logger.info('[SIWE] Verifying signature...');
      try {
        const messageContent = typeof message === 'object' && message !== null && 'prepareMessage' in message && typeof (message as { prepareMessage?: () => string }).prepareMessage === 'function'
          ? (message as { prepareMessage?: () => string }).prepareMessage?.()
          : String(message);

        const verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageContent, signature }),
        });

        const success = verifyRes.ok;
        logger.info('[SIWE] Verification result:', { success });

        if (success) {
          setAuthStatus('authenticated');
        }
        return success;
      } catch (e) {
        logger.error('[SIWE] Verification error:', e);
        return false;
      }
    },

    signOut: async () => {
      setAuthStatus('unauthenticated');
      await fetch('/api/auth/logout', { method: 'POST' });
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }), []) as any;

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        const data = await res.json();
        setAuthStatus(data.success && data.user?.walletAddress ? 'authenticated' : 'unauthenticated');
      } catch {
        setAuthStatus('unauthenticated');
      }
    }
    checkAuth();
  }, []);

  return (
    <Web3AuthContext.Provider value={{ status: authStatus }}>
      {!HAS_WC && (
        <div className="fixed bottom-2 left-2 z-50 rounded-md bg-yellow-900/80 text-yellow-100 border border-yellow-600/60 px-3 py-2 text-xs shadow">
          WalletConnect disabled: set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID to enable.
        </div>
      )}
      <WagmiProvider config={getWagmiConfig()}>
        <QueryClientProvider client={getQueryClient()}>
          <PassportProvider environment="testnet">
            <RainbowKitAuthenticationProvider
              adapter={authAdapter}
              status={authStatus}
            >
              <RainbowKitProvider
                theme={darkTheme()}
                modalSize="compact"
                initialChain={base}
              >
                <ConnectModalListener />
                {children}
              </RainbowKitProvider>
            </RainbowKitAuthenticationProvider>
          </PassportProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Web3AuthContext.Provider>
  );
}
