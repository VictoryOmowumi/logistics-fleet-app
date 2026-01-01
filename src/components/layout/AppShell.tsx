'use client'

import React from "react";
import { AppNavbar } from "./AppNavbar";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,106,26,0.18),_transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-160px] right-[-120px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.18),_transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(13,15,17,0.04),_transparent_40%,_rgba(13,15,17,0.02))] dark:bg-[linear-gradient(120deg,_rgba(255,255,255,0.06),_transparent_40%,_rgba(255,255,255,0.03))]" />
      </div>
      {/* Top Navigation - Fixed height */}
      <AppNavbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden px-4 pb-10 pt-6 sm:px-6 lg:px-8 space-y-6">
        {children}
      </main>
    </div>
  );
};
