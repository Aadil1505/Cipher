"use client";

import { useState, useCallback } from "react";
import { useCipher } from "@/app/hooks/useCipher";
import { Card } from "@/components/ui/card";
import StatusBar from "./StatusBar";
import TickerManager from "./TickerManager";
import SetupCard, { SetupCardSkeleton } from "./SetupCard";

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

  const [pendingSymbols, setPendingSymbols] = useState<string[]>([]);
  const displayedSymbols = engineRunning ? trackedSymbols : pendingSymbols;

  // Loading states
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [addingSymbols, setAddingSymbols] = useState<Set<string>>(new Set());
  const [removingSymbols, setRemovingSymbols] = useState<Set<string>>(new Set());

  const handleAdd = useCallback(
    async (symbol: string) => {
      if (engineRunning) {
        setAddingSymbols((prev) => new Set(prev).add(symbol));
        try {
          await addSymbols([symbol]);
        } finally {
          setAddingSymbols((prev) => {
            const next = new Set(prev);
            next.delete(symbol);
            return next;
          });
        }
      } else {
        setPendingSymbols((prev) =>
          prev.includes(symbol) ? prev : [...prev, symbol]
        );
      }
    },
    [engineRunning, addSymbols]
  );

  const handleRemove = useCallback(
    async (symbol: string) => {
      if (engineRunning) {
        setRemovingSymbols((prev) => new Set(prev).add(symbol));
        try {
          await removeSymbols([symbol]);
        } finally {
          setRemovingSymbols((prev) => {
            const next = new Set(prev);
            next.delete(symbol);
            return next;
          });
        }
      } else {
        setPendingSymbols((prev) => prev.filter((s) => s !== symbol));
      }
    },
    [engineRunning, removeSymbols]
  );

  const handleStart = useCallback(
    async (symbols: string[]) => {
      if (symbols.length === 0) return;
      setStarting(true);
      try {
        await startEngine(symbols);
        setPendingSymbols([]);
      } finally {
        setStarting(false);
      }
    },
    [startEngine]
  );

  const handleStop = useCallback(async () => {
    setStopping(true);
    try {
      await stopEngine();
    } finally {
      setStopping(false);
    }
  }, [stopEngine]);

  const handleAnalyze = useCallback(
    async (symbol: string) => {
      await analyzeSymbol(symbol);
    },
    [analyzeSymbol]
  );

  const setupList = Object.values(setups).sort((a, b) => b.score - a.score);

  // Symbols that are tracked but haven't received data yet
  const loadingSymbols = trackedSymbols.filter((s) => !setups[s]);
  const hasCards = setupList.length > 0 || loadingSymbols.length > 0;

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
        starting={starting}
        stopping={stopping}
        addingSymbols={addingSymbols}
        removingSymbols={removingSymbols}
      />

      <main className="flex-1 p-5">
        <div className="mx-auto max-w-[1600px]">
          {hasCards ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {setupList.map((s) => (
                <SetupCard
                  key={s.symbol}
                  setup={s}
                  onAnalyze={handleAnalyze}
                />
              ))}
              {loadingSymbols.map((s) => (
                <SetupCardSkeleton key={s} symbol={s} />
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

      <footer className="border-t py-3 text-center">
        <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
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
      <div className="flex flex-col items-center justify-center py-32 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
        <Card className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border-red-500/20 bg-red-500/5 shadow-none py-0">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </Card>
        <h2 className="text-lg font-semibold text-foreground">Backend Offline</h2>
        <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
          Start the Cipher backend server on port 8000 to connect.
        </p>
        <code className="mt-4 rounded-md border bg-muted px-4 py-2 font-mono text-xs text-primary">
          python3 main.py
        </code>
      </div>
    );
  }

  if (!engineRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
        <Card className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border-primary/20 bg-primary/5 shadow-none py-0">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </Card>
        <h2 className="text-lg font-semibold text-foreground">Engine Idle</h2>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          {symbolCount === 0
            ? "Add stock symbols above, then press Start to begin monitoring."
            : `${symbolCount} symbol${symbolCount > 1 ? "s" : ""} ready. Press Start to begin.`}
        </p>
      </div>
    );
  }

  if (symbolCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
        <Card className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border-primary/20 bg-primary/5 shadow-none py-0">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </Card>
        <h2 className="text-lg font-semibold text-foreground">No Symbols</h2>
        <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
          Add symbols above to start analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-32 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <Card className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border-blue-400/20 bg-blue-400/5 shadow-none py-0">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-blue-400 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" strokeDasharray="50" strokeDashoffset="15" />
        </svg>
      </Card>
      <h2 className="text-lg font-semibold text-foreground">Awaiting Data</h2>
      <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
        Fetching historical bars and streaming live data...
      </p>
      <div className="mt-4 h-1 w-48 rounded-full bg-muted animate-pulse" />
    </div>
  );
}
