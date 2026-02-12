"use client";

import type { HealthData, WsStatus } from "@/app/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import GuideDialog from "./GuideDialog";

interface Props {
  health: HealthData | null;
  wsStatus: WsStatus;
}

function Dot({ on, colorClass }: { on: boolean; colorClass: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full transition-colors duration-300",
        on ? [colorClass, "animate-pulse"] : "bg-muted-foreground/30"
      )}
    />
  );
}

function StatusChip({
  label,
  on,
  colorClass,
}: {
  label: string;
  on: boolean;
  colorClass: string;
}) {
  return (
    <Badge variant="outline" className="gap-2 rounded-md bg-card px-3 py-1.5 text-xs tracking-wide">
      <Dot on={on} colorClass={colorClass} />
      <span className={on ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </Badge>
  );
}

export default function StatusBar({ health, wsStatus }: Props) {
  const schwab = health?.schwab_authenticated ?? false;
  const ollama = health?.ollama_healthy ?? false;
  const engine = health?.engine_running ?? false;
  const backendOnline = health !== null;

  const wsColorClass =
    wsStatus === "connected"
      ? "bg-blue-400"
      : wsStatus === "connecting"
        ? "bg-yellow-500"
        : "bg-muted-foreground/30";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-primary"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            CIPHER
          </h1>
          <GuideDialog />
          {!backendOnline && (
            <Badge variant="destructive" className="ml-2 rounded-md text-[10px] font-medium uppercase tracking-widest">
              Backend Offline
            </Badge>
          )}
        </div>

        {/* Health Chips */}
        <div className="hidden items-center gap-2 sm:flex">
          <StatusChip label="Schwab" on={schwab} colorClass="bg-green-500" />
          <StatusChip label="Ollama" on={ollama} colorClass="bg-violet-400" />
          <StatusChip
            label={engine ? "Engine On" : "Engine Off"}
            on={engine}
            colorClass="bg-yellow-500"
          />
        </div>

        {/* WebSocket Status */}
        <Badge variant="outline" className="gap-2 rounded-md bg-card px-3 py-1.5 text-xs tracking-wide">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              wsColorClass,
              wsStatus === "connecting" ? "animate-spin" : wsStatus === "connected" ? "animate-pulse" : ""
            )}
          />
          <span className="font-mono text-muted-foreground">
            WS {wsStatus === "connected" ? "Live" : wsStatus === "connecting" ? "Connecting" : "Offline"}
          </span>
        </Badge>
      </div>
    </header>
  );
}
