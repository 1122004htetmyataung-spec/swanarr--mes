"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useShellStrings } from "@/lib/hooks/use-shell-strings";

import { MAIN_NAV } from "./nav-config";

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useShellStrings();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex border-t border-white/50 bg-white/85 backdrop-blur-md md:hidden",
        "shadow-[0_-8px_30px_-10px_rgba(30,58,138,0.12)]"
      )}
      aria-label="Mobile main"
    >
      {MAIN_NAV.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-200 active:scale-95",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("size-5", active && "scale-105")} aria-hidden />
            <span className="max-w-full truncate px-0.5 font-mm">{t[labelKey]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
