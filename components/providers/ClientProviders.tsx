'use client';

import { ToastProvider } from '@/components/ui/use-toast';
import { DarkModeProvider } from './DarkModeProvider';
import { AuthProvider } from '@/domains/users/components/auth-provider';
import { VisualConfigProvider } from '@/contexts/visual-config.context';
import { PageTransition } from './PageTransition';
import { Toaster } from '@/components/ui/toaster';
import { MotionConfig } from 'framer-motion';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DarkModeProvider>
        <AuthProvider>
          <VisualConfigProvider>
            <MotionConfig reducedMotion="user">
            <PageTransition>
              {children}
            </PageTransition>
            </MotionConfig>
            <Toaster />
          </VisualConfigProvider>
        </AuthProvider>
      </DarkModeProvider>
    </ToastProvider>
  );
}
