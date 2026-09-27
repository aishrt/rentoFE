import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { MotionProvider } from '@/components/motion/motion-provider';
import { createQueryClient } from '@/lib/query-client';
import { useRealtimeConnection } from './use-realtime-connection';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeConnection />
      <MotionProvider>{children}</MotionProvider>
    </QueryClientProvider>
  );
}

function RealtimeConnection() {
  useRealtimeConnection();
  return null;
}
