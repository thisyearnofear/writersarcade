'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  base,
  baseSepolia,
} from 'wagmi/chains';
import { defineChain } from 'viem';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  ledgerWallet,
  trustWallet,
  phantomWallet,
  okxWallet,
} from '@rainbow-me/rainbowkit/wallets';
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query';

/**
 * Story Protocol Aeneid Testnet
 * Used for IP registration - users switch to this chain to sign IP transactions
 * Docs: https://docs.story.foundation/
 */
export const storyAeneid = defineChain({
  id: 1315,
  name: 'Story Aeneid',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://aeneid.storyrpc.io'] },
  },
  blockExplorers: {
    default: {
      name: 'Story Explorer',
      url: 'https://aeneid.storyscan.xyz'
    },
  },
  testnet: true,
});

const config = getDefaultConfig({
  appName: 'WritArcade',
  projectId: 'YOUR_PROJECT_ID', // TODO: Get a project ID from WalletConnect
  chains: [base, baseSepolia, storyAeneid],
  ssr: true,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        rainbowWallet,
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
    {
      groupName: 'Others',
      wallets: [
        phantomWallet,
        trustWallet,
        ledgerWallet,
        okxWallet,
      ],
    },
  ],
});

const queryClient = new QueryClient();

import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import {
  createAuthenticationAdapter,
  RainbowKitAuthenticationProvider,
  AuthenticationStatus,
} from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';

interface Web3AuthContextType {
  status: AuthenticationStatus;
}
const Web3AuthContext = createContext<Web3AuthContextType>({ status: 'loading' });

export const useWeb3Auth = () => useContext(Web3AuthContext);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>('loading');

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        setAuthStatus(data.success ? 'authenticated' : 'unauthenticated');
      } catch (error) {
        setAuthStatus('unauthenticated');
      }
    }
    checkAuth();
  }, []);

  const authenticationAdapter = useMemo(() => {
    return createAuthenticationAdapter({
      getNonce: async () => {
        const response = await fetch('/api/auth/nonce');
        const data = await response.json();
        return data.nonce;
      },

      createMessage: ({ nonce, address, chainId }) => {
        return new SiweMessage({
          domain: window.location.host,
          address,
          statement: 'Sign in with WritArcade to prove you own this wallet.',
          uri: window.location.origin,
          version: '1',
          chainId,
          nonce,
        });
      },

      verify: async ({ message, signature }) => {
        const verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, signature }),
        });

        const success = Boolean(verifyRes.ok);
        if (success) {
          setAuthStatus('authenticated');
        }
        return success;
      },

      signOut: async () => {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to logout');
        setAuthStatus('unauthenticated');
      },
    });
  }, []);

  return (
    <Web3AuthContext.Provider value={{ status: authStatus }}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitAuthenticationProvider
            adapter={authenticationAdapter}
            status={authStatus}
          >
            <RainbowKitProvider
              theme={darkTheme()}
              modalSize="compact"
            >
              {children}
            </RainbowKitProvider>
          </RainbowKitAuthenticationProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Web3AuthContext.Provider>
  );
}
