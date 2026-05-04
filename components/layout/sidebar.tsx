"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu } from "lucide-react";

import { cn } from "@/lib/utils";
import { useShellStrings } from "@/lib/hooks/use-shell-strings";

import { MAIN_NAV } from "./nav-config";

export function Sidebar() {
  const pathname = usePathname();
  const t = useShellStrings();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/40",
        "bg-white/75 shadow-glass backdrop-blur-md md:flex"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-white/40 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-md">
          <Cpu className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-foreground">
            SwanAar II
          </p>
          <p className="truncate font-mm text-xs text-muted-foreground">MES</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
        {MAIN_NAV.map(({ href, labelKey, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:scale-[1.02] hover:bg-white/60 hover:text-foreground"
              )}
            >
              <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
              <span className={cn(labelKey.startsWith("nav_") && "tracking-tight")}>
                {t[labelKey]}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
