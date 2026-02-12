"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Props {
  symbols: string[];
  engineRunning: boolean;
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onStart: (symbols: string[]) => void;
  onStop: () => void;
  starting: boolean;
  stopping: boolean;
  addingSymbols: Set<string>;
  removingSymbols: Set<string>;
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("animate-spin", className)} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
    </svg>
  );
}

export default function TickerManager({
  symbols,
  engineRunning,
  onAdd,
  onRemove,
  onStart,
  onStop,
  starting,
  stopping,
  addingSymbols,
  removingSymbols,
}: Props) {
  const [input, setInput] = useState("");

  const isLoading = starting || stopping || addingSymbols.size > 0;

  const handleAdd = useCallback(() => {
    const raw = input.trim().toUpperCase();
    if (!raw) return;
    const parts = raw.split(/[,\s]+/).filter(Boolean);
    for (const s of parts) {
      if (!symbols.includes(s)) onAdd(s);
    }
    setInput("");
  }, [input, symbols, onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="border-b bg-muted/50">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-5 py-3 flex-wrap">
        {/* Input */}
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="AAPL, TSLA..."
            disabled={starting || stopping}
            className="h-8 w-44 font-mono text-xs tracking-wider"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={!input.trim() || starting || stopping}
            className="text-xs font-medium tracking-wide"
          >
            {addingSymbols.size > 0 ? (
              <Spinner className="size-3" />
            ) : (
              <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="3" x2="8" y2="13" />
                <line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            )}
            ADD
          </Button>
        </div>

        {/* Divider */}
        <Separator orientation="vertical" className="!h-5" />

        {/* Symbol Chips */}
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {symbols.length === 0 && !isLoading && (
            <span className="text-xs text-muted-foreground italic">
              No symbols added
            </span>
          )}
          {symbols.length === 0 && isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Spinner className="size-3" />
              {starting ? "Starting engine..." : "Updating..."}
            </span>
          )}
          {symbols.map((s) => {
            const isRemoving = removingSymbols.has(s);
            const isAdding = addingSymbols.has(s);
            return (
              <Badge
                key={s}
                variant="secondary"
                className={cn(
                  "gap-1 rounded-md border border-border px-2 py-1 font-mono text-xs font-medium tracking-wider animate-in fade-in-0 duration-200",
                  (isRemoving || isAdding) && "opacity-50"
                )}
              >
                <span className="text-foreground">{s}</span>
                {isRemoving ? (
                  <Spinner className="ml-0.5 size-2.5" />
                ) : (
                  <button
                    onClick={() => onRemove(s)}
                    disabled={isRemoving || starting || stopping}
                    className="ml-0.5 rounded p-0.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30 disabled:pointer-events-none"
                    aria-label={`Remove ${s}`}
                  >
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="3" x2="9" y2="9" />
                      <line x1="9" y1="3" x2="3" y2="9" />
                    </svg>
                  </button>
                )}
              </Badge>
            );
          })}
        </div>

        {/* Engine Control */}
        {engineRunning ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            disabled={stopping}
            className="border-red-500/30 bg-red-500/5 text-xs font-semibold uppercase tracking-widest text-red-500 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500"
          >
            {stopping ? (
              <Spinner className="size-3 text-red-500" />
            ) : (
              <span className="inline-block h-2 w-2 rounded-sm bg-red-500" />
            )}
            {stopping ? "Stopping" : "Stop"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStart(symbols)}
            disabled={symbols.length === 0 || starting}
            className="border-green-500/30 bg-green-500/5 text-xs font-semibold uppercase tracking-widest text-green-500 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-500"
          >
            {starting ? (
              <Spinner className="size-3 text-green-500" />
            ) : (
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
                <polygon points="2,0 12,6 2,12" />
              </svg>
            )}
            {starting ? "Starting" : "Start"}
          </Button>
        )}
      </div>
    </div>
  );
}
