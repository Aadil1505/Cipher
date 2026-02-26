"use client";

import { useState } from "react";
import type { TradePosition } from "@/app/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Props {
  activeTrades: Record<string, TradePosition>;
  tradeHistory: TradePosition[];
  livePrices: Record<string, { last_price: number }>;
  onConfirmEntry: (symbol: string, price: number) => void;
  onClose: (symbol: string, price: number) => void;
  onCancel: (symbol: string) => void;
}

function fmtPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDiff(diff: number) {
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function exitReasonLabel(r: string | null | undefined) {
  if (!r) return "—";
  return ({ hit_target: "Target", hit_stop: "Stop", manual: "Manual", cancelled: "Cancelled" } as Record<string, string>)[r] ?? r;
}

/* ── Live P&L with distances ─────────────────────────────────────────── */

function ActiveRowDetails({ pos, livePrice }: { pos: TradePosition; livePrice: number | null }) {
  const price = livePrice ?? pos.actual_entry;
  if (!pos.actual_entry || !price) return null;

  const pnl = pos.direction === "Bullish" ? price - pos.actual_entry : pos.actual_entry - price;
  const pct = (pnl / pos.actual_entry) * 100;
  const isPos = pnl >= 0;

  // Distance from current price to target and stop
  const toTarget = Math.abs(pos.target - price);
  const toStop = Math.abs(price - pos.stop);

  // How far along the trade is (0-1 between stop and target)
  const range = Math.abs(pos.target - pos.stop);
  const progress = range > 0
    ? Math.min(1, Math.max(0,
        pos.direction === "Bullish"
          ? (price - pos.stop) / range
          : (pos.stop - price) / range
      ))
    : 0;

  return (
    <div className="mt-2 space-y-2">
      {/* P&L */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Live P&L</span>
        <span className={cn("font-mono text-sm font-bold", isPos ? "text-green-500" : "text-red-500")}>
          {fmtDiff(pnl)} ({fmtPct(pct)})
        </span>
      </div>

      {/* Progress bar: stop → current → target */}
      <div className="space-y-1">
        <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", isPos ? "bg-green-500" : "bg-red-500")}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-red-500">Stop {fmtPrice(pos.stop)}</span>
          <span className="text-muted-foreground">{fmtPrice(price)}</span>
          <span className="text-green-500">Target {fmtPrice(pos.target)}</span>
        </div>
      </div>

      {/* Distance indicators */}
      <div className="flex gap-3 text-[10px] font-mono">
        <span className="text-green-500/80">↑ {fmtPrice(toTarget)} to target</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-red-500/80">↓ {fmtPrice(toStop)} to stop</span>
      </div>
    </div>
  );
}

/* ── Watching row details ────────────────────────────────────────────── */

function WatchingRowDetails({ pos, livePrice }: { pos: TradePosition; livePrice: number | null }) {
  if (!livePrice) return null;

  const distToEntry = pos.watch_entry - livePrice;
  const pctToEntry = (Math.abs(distToEntry) / livePrice) * 100;
  const approaching = pos.trigger_above ? livePrice < pos.watch_entry : livePrice > pos.watch_entry;

  return (
    <div className="mt-1.5 flex items-center gap-3 text-[11px] font-mono">
      <span className="text-muted-foreground">
        Now: <span className="text-foreground">{fmtPrice(livePrice)}</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className={cn(approaching ? "text-yellow-500" : "text-muted-foreground")}>
        {approaching ? "▶ " : ""}
        {fmtPrice(Math.abs(distToEntry))} ({pctToEntry.toFixed(2)}%) {pos.trigger_above ? "below entry" : "above entry"}
      </span>
    </div>
  );
}

/* ── Active row ─────────────────────────────────────────────────────── */

function ActiveRow({
  pos,
  livePrice,
  onConfirmEntry,
  onClose,
  onCancel,
}: {
  pos: TradePosition;
  livePrice: number | null;
  onConfirmEntry: () => void;
  onClose: () => void;
  onCancel: () => void;
}) {
  const isWatching = pos.status === "watching";
  const isActive = pos.status === "active";

  return (
    <div className="py-3">
      {/* Top row: symbol + status + actions */}
      <div className="flex items-center gap-3">
        {/* Symbol + direction */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            "inline-block h-2 w-2 rounded-full flex-shrink-0",
            isWatching ? (pos.entry_alerted ? "bg-yellow-500" : "bg-yellow-500/50 animate-pulse") : "bg-blue-500 animate-pulse"
          )} />
          <span className="font-mono text-sm font-bold text-foreground">{pos.symbol}</span>
          <Badge
            variant="outline"
            className={cn(
              "rounded px-1 py-0 text-[9px] font-semibold uppercase tracking-wider flex-shrink-0",
              pos.direction === "Bullish"
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20"
            )}
          >
            {pos.direction === "Bullish" ? "↑" : "↓"} {pos.direction}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "rounded px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider flex-shrink-0",
              isWatching
                ? pos.entry_alerted
                  ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
                  : "bg-yellow-500/10 text-yellow-500/70 border-yellow-500/20"
                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
            )}
          >
            {isWatching ? (pos.entry_alerted ? "Alert Fired" : "Watching") : "Active"}
          </Badge>
        </div>

        {/* Entry label */}
        <div className="hidden sm:block flex-1 text-xs font-mono text-muted-foreground">
          {isActive
            ? <>Entered @ <span className="text-foreground">{fmtPrice(pos.actual_entry)}</span></>
            : <>Watching <span className="text-foreground">{fmtPrice(pos.watch_entry)}</span></>
          }
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 flex-shrink-0 ml-auto">
          {isWatching && pos.entry_alerted && (
            <Button
              size="xs"
              className="bg-yellow-500 text-black hover:bg-yellow-400 font-semibold text-[10px]"
              onClick={onConfirmEntry}
            >
              Confirm Entry
            </Button>
          )}
          {isActive && (
            <Button
              size="xs"
              variant="outline"
              className="border-red-500/40 text-red-500 hover:bg-red-500/10 text-[10px]"
              onClick={onClose}
            >
              Close
            </Button>
          )}
          {isWatching && (
            <Button
              size="xs"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground text-[10px]"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Detail rows */}
      {isActive && <ActiveRowDetails pos={pos} livePrice={livePrice} />}
      {isWatching && <WatchingRowDetails pos={pos} livePrice={livePrice} />}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */

export default function TradesPanel({
  activeTrades,
  tradeHistory,
  livePrices,
  onConfirmEntry,
  onClose,
  onCancel,
}: Props) {
  const [open, setOpen] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const activeList = Object.values(activeTrades);
  if (activeList.length === 0 && tradeHistory.length === 0) return null;

  return (
    <Card className="mt-4 gap-0 py-0 rounded-lg overflow-hidden">
      {/* Header */}
      <CardHeader
        className="flex-row items-center justify-between px-5 py-3 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="size-4 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 12h12M2 8h8M2 4h5" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-semibold">Active Trades</span>
          {activeList.length > 0 && (
            <Badge variant="outline" className="rounded px-1.5 py-0 text-[10px] bg-primary/10 text-primary border-primary/20">
              {activeList.length}
            </Badge>
          )}
        </div>
        <svg
          viewBox="0 0 16 16"
          className={cn("size-4 text-muted-foreground transition-transform duration-200", open ? "rotate-180" : "")}
          fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </CardHeader>

      {open && (
        <>
          <Separator />
          <CardContent className="px-5 py-1">
            {activeList.length === 0 ? (
              <p className="py-3 text-xs italic text-muted-foreground">No active or watching trades.</p>
            ) : (
              <div className="divide-y divide-border">
                {activeList.map((pos) => {
                  const lp = livePrices[pos.symbol]?.last_price ?? null;
                  return (
                    <ActiveRow
                      key={pos.id}
                      pos={pos}
                      livePrice={lp}
                      onConfirmEntry={() => onConfirmEntry(pos.symbol, lp ?? pos.watch_entry)}
                      onClose={() => onClose(pos.symbol, lp ?? pos.watch_entry)}
                      onCancel={() => onCancel(pos.symbol)}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>

          {/* Recent history (last 5) */}
          {tradeHistory.length > 0 && (
            <>
              <Separator />
              <CardContent className="px-5 py-3">
                <button
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowHistory((v) => !v)}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className={cn("size-3 transition-transform duration-200", showHistory ? "rotate-90" : "")}
                    fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Recent History ({tradeHistory.length})
                </button>

                {showHistory && (
                  <div className="mt-3 space-y-1.5">
                    {tradeHistory.slice(0, 10).map((pos) => {
                      const isPos = (pos.pnl ?? 0) >= 0;
                      const wasEntered = pos.actual_entry != null;
                      return (
                        <div key={pos.id} className="flex items-center gap-3 text-xs font-mono py-1">
                          <span className="w-12 font-bold text-foreground">{pos.symbol}</span>
                          <span className={pos.direction === "Bullish" ? "text-green-500" : "text-red-500"}>
                            {pos.direction === "Bullish" ? "↑" : "↓"}
                          </span>
                          {wasEntered ? (
                            <>
                              <span className="text-muted-foreground">{fmtPrice(pos.actual_entry)} → {fmtPrice(pos.exit_price)}</span>
                              <span className={cn("font-semibold", isPos ? "text-green-500" : "text-red-500")}>
                                {pos.pnl != null ? (pos.pnl >= 0 ? "+" : "") + fmtPrice(pos.pnl) : "—"}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">Never entered</span>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded px-1 py-0 text-[9px] ml-auto flex-shrink-0",
                              pos.exit_reason === "hit_target"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : pos.exit_reason === "hit_stop"
                                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            {exitReasonLabel(pos.exit_reason)}
                          </Badge>
                        </div>
                      );
                    })}
                    <a
                      href="/trades"
                      className="mt-2 block text-center text-[10px] font-medium text-primary hover:underline"
                    >
                      View full journal →
                    </a>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </>
      )}
    </Card>
  );
}
