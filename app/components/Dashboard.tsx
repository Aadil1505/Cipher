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

      <footer className="border-t py-5 px-5">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <span className="font-semibold text-foreground">Cipher Trading</span>
            <span className="text-muted-foreground">
              Built by{" "}
              <a href="https://github.com/Aadil1505" target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
                Aadil1505
              </a>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/Aadil1505/Cipher" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>
              Frontend
            </a>
            <a href="https://github.com/Aadil1505/Cipher-Backend" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" /></svg>
              Backend
            </a>
          </div>
        </div>
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
