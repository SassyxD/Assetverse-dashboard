'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export const Providers = ({ children }: { children: ReactNode }) => {
  // สร้างใน state ไม่ใช่ module scope — ไม่งั้น cache รั่วข้าม request ตอน SSR
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // รอบทำงานเป็นรายเดือน ไม่ใช่ realtime — ไม่ต้อง refetch ถี่
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  );
};
