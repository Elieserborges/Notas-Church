"use client";

import { AppShell } from "@/components/app-shell";
import { DailyDevotionalCard } from "@/components/daily-devotional-card";
import { Editor } from "@/components/editor";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const { user } = useAuth();

  // Extract name from email if displayName is not set
  const displayName = user?.displayName || user?.email?.split('@')[0] || "Visitante";

  return (
    <AppShell>
      <div className="flex-1 p-8 space-y-8 max-w-5xl mx-auto w-full">
        <header className="flex items-center justify-between pb-8 border-b">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Bom dia, {displayName}</h1>
            <p className="text-muted-foreground mt-1">Que a graça e a paz estejam com você hoje.</p>
          </div>
          <Button size="lg" className="shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Nota
          </Button>
        </header>

        <section>
          <DailyDevotionalCard />
        </section>

        <section className="min-h-[500px] border rounded-xl bg-card p-4 shadow-sm">
          <Editor />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder for Recent Notes */}
          <div className="h-40 rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer">
            <h3 className="font-semibold">Estudo de Romanos 8</h3>
            <p className="text-xs text-muted-foreground">Editado há 2 horas</p>
          </div>
          <div className="h-40 rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer">
            <h3 className="font-semibold">Sermão de Domingo</h3>
            <p className="text-xs text-muted-foreground">Editado ontem</p>
          </div>
          <div className="h-40 rounded-xl border border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
            <span className="flex items-center text-sm"><PlusCircle className="mr-2 h-4 w-4" /> Criar nova página</span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
