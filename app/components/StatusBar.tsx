"use client";

import type { HealthData, WsStatus } from "@/app/lib/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  health: HealthData | null;
  wsStatus: WsStatus;
}

function Dot({ on, color }: { on: boolean; color: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full transition-colors duration-300 ${
        on ? "animate-pulse-dot" : ""
      }`}
      style={{ backgroundColor: on ? color : "#4a5470" }}
    />
  );
}

function StatusChip({
  label,
  on,
  color,
}: {
  label: string;
  on: boolean;
  color: string;
}) {
  return (
    <Badge variant="outline" className="gap-2 rounded-md px-3 py-1.5 text-xs tracking-wide bg-surface">
      <Dot on={on} color={color} />
      <span className={on ? "text-txt" : "text-txt-3"}>{label}</span>
    </Badge>
  );
}

export default function StatusBar({ health, wsStatus }: Props) {
  const schwab = health?.schwab_authenticated ?? false;
  const ollama = health?.ollama_healthy ?? false;
  const engine = health?.engine_running ?? false;
  const backendOnline = health !== null;

  const wsColor =
    wsStatus === "connected"
      ? "#38bdf8"
      : wsStatus === "connecting"
        ? "#d4a017"
        : "#4a5470";
  const wsLabel =
    wsStatus === "connected"
      ? "Live"
      : wsStatus === "connecting"
        ? "Connecting"
        : "Offline";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-abyss/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber/10 border border-amber/20">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-amber"
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
          <h1 className="text-base font-semibold tracking-tight text-txt">
            CIPHER
          </h1>
          {!backendOnline && (
            <Badge variant="destructive" className="ml-2 rounded-md text-[10px] font-medium uppercase tracking-widest">
              Backend Offline
            </Badge>
          )}
        </div>

        {/* Health Chips */}
        <div className="hidden items-center gap-2 sm:flex">
          <StatusChip label="Schwab" on={schwab} color="#22c55e" />
          <StatusChip label="Ollama" on={ollama} color="#a78bfa" />
          <StatusChip
            label={engine ? "Engine On" : "Engine Off"}
            on={engine}
            color="#d4a017"
          />
        </div>

        {/* WebSocket Status */}
        <Badge variant="outline" className="gap-2 rounded-md bg-surface px-3 py-1.5 text-xs tracking-wide">
          <span
            className={`inline-block h-2 w-2 rounded-full ${wsStatus === "connecting" ? "animate-spin-slow" : wsStatus === "connected" ? "animate-pulse-dot" : ""}`}
            style={{ backgroundColor: wsColor }}
          />
          <span className="font-mono text-txt-2" style={{ fontFamily: "var(--font-mono)" }}>
            WS {wsLabel}
          </span>
        </Badge>
      </div>
    </header>
  );
}
