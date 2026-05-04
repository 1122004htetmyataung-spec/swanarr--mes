import Link from "next/link";
import { Cpu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center gap-8 p-6",
        "bg-gradient-to-br from-slate-100 via-blue-50/50 to-slate-200"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,58,138,0.12),transparent_60%)]"
      />

      <Card
        className={cn(
          "relative z-10 max-w-lg animate-fade-in border-white/50 text-center shadow-glass-lg",
          "rounded-3xl bg-white/80 backdrop-blur-md"
        )}
      >
        <CardHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-lg">
            <Cpu className="h-7 w-7" aria-hidden />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            SwanAar II Electronics
          </CardTitle>
          <CardDescription className="font-mm text-base">
            စီမံခန့်ခွဲမှု နှင့် ဝန်ဆောင်မှု စနစ် (MES)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="h-11 rounded-2xl px-8">
            <Link href="/login">Staff login</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-2xl px-8">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
