"use client";

import { useState, useCallback } from "react";
import { useCipher } from "@/app/hooks/useCipher";
import StatusBar from "./StatusBar";
import TickerManager from "./TickerManager";
import SetupCard from "./SetupCard";

export default function Dashboard() {
  const {
    setups,
    health,
    wsStatus,
    startEngine,
    stopEngine,
    addSymbols,
    removeSymbols,
    analyzeSymbol,
  } = useCipher();

  const engineRunning = health?.engine_running ?? false;
  const trackedSymbols = health?.tracked_symbols ?? [];

  // When engine is off, we accumulate symbols locally
  const [pendingSymbols, setPendingSymbols] = useState<string[]>([]);
  const displayedSymbols = engineRunning ? trackedSymbols : pendingSymbols;

  const handleAdd = useCallback(
    (symbol: string) => {
      if (engineRunning) {
        addSymbols([symbol]);
      } else {
        setPendingSymbols((prev) =>
          prev.includes(symbol) ? prev : [...prev, symbol]
        );
      }
    },
    [engineRunning, addSymbols]
  );

  const handleRemove = useCallback(
    (symbol: string) => {
      if (engineRunning) {
        removeSymbols([symbol]);
      } else {
        setPendingSymbols((prev) => prev.filter((s) => s !== symbol));
      }
    },
    [engineRunning, removeSymbols]
  );

  const handleStart = useCallback(
    async (symbols: string[]) => {
      if (symbols.length === 0) return;
      await startEngine(symbols);
      setPendingSymbols([]);
    },
    [startEngine]
  );

  const handleStop = useCallback(async () => {
    await stopEngine();
  }, [stopEngine]);

  const handleAnalyze = useCallback(
    async (symbol: string) => {
      await analyzeSymbol(symbol);
    },
    [analyzeSymbol]
  );

  const setupList = Object.values(setups).sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-dvh flex flex-col">
      <StatusBar health={health} wsStatus={wsStatus} />

      <TickerManager
        symbols={displayedSymbols}
        engineRunning={engineRunning}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onStart={handleStart}
        onStop={handleStop}
      />

      <main className="flex-1 p-5">
        <div className="mx-auto max-w-[1600px]">
          {setupList.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {setupList.map((s) => (
                <SetupCard
                  key={s.symbol}
                  setup={s}
                  onAnalyze={handleAnalyze}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              backendOnline={health !== null}
              engineRunning={engineRunning}
              symbolCount={displayedSymbols.length}
            />
          )}
        </div>
      </main>

      {/* Ambient footer line */}
      <footer className="border-t border-border/40 py-3 text-center">
        <p className="text-[10px] tracking-[0.25em] uppercase text-txt-3">
          Cipher Trading Engine
        </p>
      </footer>
    </div>
  );
}

/* ── Empty State ───────────────────────────────── */

function EmptyState({
  backendOnline,
  engineRunning,
  symbolCount,
}: {
  backendOnline: boolean;
  engineRunning: boolean;
  symbolCount: number;
}) {
  if (!backendOnline) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-bear/20 bg-bear/5">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-bear" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-txt">Backend Offline</h2>
        <p className="mt-2 max-w-xs text-center text-sm text-txt-3">
          Start the Cipher backend server on port 8000 to connect.
        </p>
        <code
          className="mt-4 rounded-md border border-border bg-elevated px-4 py-2 text-xs text-amber"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          python main.py
        </code>
      </div>
    );
  }

  if (!engineRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-amber/20 bg-amber/5">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-txt">Engine Idle</h2>
        <p className="mt-2 max-w-sm text-center text-sm text-txt-3">
          {symbolCount === 0
            ? "Add stock symbols above, then press Start to begin monitoring."
            : `${symbolCount} symbol${symbolCount > 1 ? "s" : ""} ready. Press Start to begin.`}
        </p>
      </div>
    );
  }

  // Engine running but no setups yet (waiting for data)
  return (
    <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-sky/20 bg-sky/5">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-sky animate-spin-slow" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" strokeDasharray="50" strokeDashoffset="15" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-txt">Awaiting Data</h2>
      <p className="mt-2 max-w-xs text-center text-sm text-txt-3">
        Fetching historical bars and streaming live data...
      </p>
      <div className="mt-4 shimmer-bg h-1 w-48 rounded-full" />
    </div>
  );
}
