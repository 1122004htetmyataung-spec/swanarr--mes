"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShellStrings } from "@/lib/hooks/use-shell-strings";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { useLocaleStore, type AppLocale } from "@/stores/locale-store";

export function TopBar() {
  const router = useRouter();
  const t = useShellStrings();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const clearCart = useCartStore((s) => s.clearCart);
  const setCartBranch = useCartStore((s) => s.setBranchId);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  if (!user) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/50 px-3 md:px-4",
        "bg-white/70 shadow-sm backdrop-blur-md"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:inline">
          {t.top_branch}
        </span>
        <Select value={user.branchId} disabled>
          <SelectTrigger
            className="h-9 max-w-[200px] rounded-2xl border-input bg-white/80 text-left text-sm shadow-sm md:max-w-[240px]"
            title="Branch is tied to your account for now."
          >
            <SelectValue placeholder={user.branchName} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value={user.branchId}>{user.branchName}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5">
        <div
          className="flex rounded-2xl border border-input bg-white/70 p-0.5 shadow-sm"
          role="group"
          aria-label="Language"
        >
          {(["en", "mm"] as const satisfies readonly AppLocale[]).map((code) => (
            <Button
              key={code}
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 rounded-xl px-2.5 text-xs font-semibold",
                locale === code
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                  : "text-muted-foreground"
              )}
              onClick={() => setLocale(code)}
            >
              {code === "en" ? t.lang_en : t.lang_mm}
            </Button>
          ))}
        </div>

        <div className="relative" ref={menuRef}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-2xl border-input bg-white/80 px-2 shadow-sm"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <User className="size-4 shrink-0" aria-hidden />
            <span className="hidden max-w-[100px] truncate text-xs font-medium sm:inline">
              {user.username}
            </span>
          </Button>
          {menuOpen ? (
            <div
              className={cn(
                "absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-2xl border border-white/60",
                "bg-white/95 p-1 shadow-glass-lg backdrop-blur-md"
              )}
              role="menu"
            >
              <div className="border-b border-border px-3 py-2">
                <p className="truncate text-xs font-semibold">{user.username}</p>
                <Badge variant="secondary" className="mt-1 rounded-lg text-[10px]">
                  {user.role}
                </Badge>
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                  clearCart();
                  setCartBranch(null);
                  router.push("/login");
                  router.refresh();
                }}
              >
                <LogOut className="size-4" aria-hidden />
                {t.top_logout}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
