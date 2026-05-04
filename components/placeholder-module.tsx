"use client";

import { Construction } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useShellStrings } from "@/lib/hooks/use-shell-strings";
import { cn } from "@/lib/utils";

export function PlaceholderModule({ title }: { title: string }) {
  const t = useShellStrings();

  return (
    <Card
      className={cn(
        "mx-auto max-w-lg rounded-3xl border-white/50 bg-white/80 shadow-glass-lg backdrop-blur-md"
      )}
    >
      <CardHeader className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
          <Construction className="size-8" aria-hidden />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight">{title}</CardTitle>
        <CardDescription className="font-mm text-base">{t.placeholder_title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm text-muted-foreground">{t.placeholder_body}</p>
      </CardContent>
    </Card>
  );
}
