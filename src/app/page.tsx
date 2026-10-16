"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import AppShell from "@/components/app/AppShell";

export default function Page() {
  const [qc] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <main className="min-h-dvh w-full flex items-center justify-center bg-gradient-to-b from-[#e3efe6] via-[#ebf3ed] to-[#dcebe0] dark:from-[#0c1611] dark:via-[#0f1b15] dark:to-[#12241b] sm:py-8">
          {/* App frame — full screen on phones, centered device mockup on tablet/desktop */}
          <div className="w-full h-dvh sm:w-[430px] sm:max-w-full sm:h-[min(900px,94dvh)] sm:rounded-[2.6rem] sm:border sm:border-border/70 sm:shadow-2xl sm:shadow-black/15 overflow-hidden bg-background flex flex-col relative">
            <AppShell />
          </div>
        </main>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
