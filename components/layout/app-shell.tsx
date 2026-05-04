"use client";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { LocaleHtmlAttrs } from "@/components/layout/locale-html";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LocaleHtmlAttrs />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/25 to-slate-100">
        <Sidebar />
        <div className="flex min-h-screen flex-col md:pl-64">
          <TopBar />
          <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
          <MobileBottomNav />
        </div>
      </div>
    </>
  );
}
