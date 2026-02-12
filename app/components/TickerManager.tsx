"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
  symbols: string[];
  engineRunning: boolean;
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onStart: (symbols: string[]) => void;
  onStop: () => void;
}

export default function TickerManager({
  symbols,
  engineRunning,
  onAdd,
  onRemove,
  onStart,
  onStop,
}: Props) {
  const [input, setInput] = useState("");

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
    <div className="border-b border-border bg-abyss/50">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-5 py-3 flex-wrap">
        {/* Input */}
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="AAPL, TSLA..."
            className="h-8 w-44 bg-surface text-xs tracking-wider text-txt placeholder:text-txt-3 focus-visible:border-amber/50 focus-visible:ring-amber/20"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={!input.trim()}
            className="text-xs font-medium tracking-wide text-txt-2 hover:border-amber/40 hover:text-amber"
          >
            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            ADD
          </Button>
        </div>

        {/* Divider */}
        <Separator orientation="vertical" className="!h-5" />

        {/* Symbol Chips */}
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {symbols.length === 0 && (
            <span className="text-xs text-txt-3 italic">
              No symbols added
            </span>
          )}
          {symbols.map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium tracking-wider animate-fade-in"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <span className="text-txt">{s}</span>
              <button
                onClick={() => onRemove(s)}
                className="ml-0.5 rounded p-0.5 text-txt-3 transition-colors hover:bg-bear/10 hover:text-bear"
                aria-label={`Remove ${s}`}
              >
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="3" x2="9" y2="9" />
                  <line x1="9" y1="3" x2="3" y2="9" />
                </svg>
              </button>
            </Badge>
          ))}
        </div>

        {/* Engine Control */}
        {engineRunning ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            className="border-bear/30 bg-bear/5 text-xs font-semibold uppercase tracking-widest text-bear hover:bg-bear/10 hover:border-bear/50 hover:text-bear"
          >
            <span className="inline-block h-2 w-2 rounded-sm bg-bear" />
            Stop
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStart(symbols)}
            disabled={symbols.length === 0}
            className="border-bull/30 bg-bull/5 text-xs font-semibold uppercase tracking-widest text-bull hover:bg-bull/10 hover:border-bull/50 hover:text-bull"
          >
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
              <polygon points="2,0 12,6 2,12" />
            </svg>
            Start
          </Button>
        )}
      </div>
    </div>
  );
}
