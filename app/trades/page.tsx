"use client";

import { useState, useEffect, useCallback } from "react";
import type { TradePosition, HealthData, WsStatus } from "@/app/lib/types";
import { api } from "@/app/lib/api";
import StatusBar from "@/app/components/StatusBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ── helpers ──────────────────────────────────────────────────────────── */

function fmtPrice(n: number | null | undefined) {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const decimals = abs !== 0 && abs < 0.01 ? 4 : 2;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function exitLabel(r: string | null | undefined) {
  if (!r) return "—";
  return ({ hit_target: "Target", hit_stop: "Stop", manual: "Manual", cancelled: "Cancelled" } as Record<string, string>)[r] ?? r;
}

/* ── Stats ────────────────────────────────────────────────────────────── */

interface Stats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestPnl: number;
  worstPnl: number;
  avgHoldMins: number;
}

function calcStats(trades: TradePosition[]): Stats {
  const entered = trades.filter((t) => t.actual_entry != null && t.pnl != null);
  const wins = entered.filter((t) => (t.pnl ?? 0) > 0);
  const losses = entered.filter((t) => (t.pnl ?? 0) < 0);
  const pnls = entered.map((t) => t.pnl ?? 0);
  const totalPnl = pnls.reduce((a, b) => a + b, 0);

  const holdTimes = entered
    .filter((t) => t.entered_at && t.closed_at)
    .map((t) => (new Date(t.closed_at!).getTime() - new Date(t.entered_at!).getTime()) / 60_000);

  return {
    total: entered.length,
    wins: wins.length,
    losses: losses.length,
    winRate: entered.length > 0 ? (wins.length / entered.length) * 100 : 0,
    totalPnl,
    avgPnl: entered.length > 0 ? totalPnl / entered.length : 0,
    bestPnl: pnls.length > 0 ? Math.max(...pnls) : 0,
    worstPnl: pnls.length > 0 ? Math.min(...pnls) : 0,
    avgHoldMins: holdTimes.length > 0 ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length : 0,
  };
}

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className={cn("mt-1 font-mono text-xl font-bold", positive === true ? "text-green-500" : positive === false ? "text-red-500" : "text-foreground")}>
          {value}
        </p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Filter bar ───────────────────────────────────────────────────────── */

type FilterDir = "all" | "bullish" | "bearish";
type FilterReason = "all" | "hit_target" | "hit_stop" | "manual" | "cancelled";

/* ── Main page ────────────────────────────────────────────────────────── */

export default function TradesPage() {
  const [history, setHistory] = useState<TradePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [filterDir, setFilterDir] = useState<FilterDir>("all");
  const [filterReason, setFilterReason] = useState<FilterReason>("all");
  const [sortKey, setSortKey] = useState<"date" | "pnl" | "pnl_pct">("date");
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try {
      const [hist, h] = await Promise.all([
        api.getTradeHistory(),
        api.getHealth().catch(() => null),
      ]);
      setHistory(hist);
      setHealth(h);
    } catch {
      // backend may not be running
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = history
    .filter((t) => t.actual_entry != null) // only actually-entered trades
    .filter((t) => filterDir === "all" || t.direction.toLowerCase() === filterDir)
    .filter((t) => filterReason === "all" || t.exit_reason === filterReason);

  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortKey === "date") {
      diff = new Date(a.closed_at ?? a.opened_at).getTime() - new Date(b.closed_at ?? b.opened_at).getTime();
    } else if (sortKey === "pnl") {
      diff = (a.pnl ?? 0) - (b.pnl ?? 0);
    } else {
      diff = (a.pnl_pct ?? 0) - (b.pnl_pct ?? 0);
    }
    return sortAsc ? diff : -diff;
  });

  const stats = calcStats(history);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ k }: { k: typeof sortKey }) {
    if (sortKey !== k) return <span className="text-muted-foreground/30 ml-1">↕</span>;
    return <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>;
  }

  const wsStatus: WsStatus = "disconnected"; // journal page doesn't maintain WS

  return (
    <div className="min-h-dvh flex flex-col">
      <StatusBar health={health} wsStatus={wsStatus} />

      <main className="flex-1 p-5">
        <div className="mx-auto max-w-[1400px] space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Trade Journal</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                All closed positions with P&L history
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={load} className="gap-2">
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 8A6 6 0 1 1 8 2" />
                <path d="M14 2v4h-4" />
              </svg>
              Refresh
            </Button>
          </div>

          {/* ── Stats row ── */}
          {stats.total > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              <StatCard label="Trades" value={String(stats.total)} />
              <StatCard
                label="Win Rate"
                value={`${stats.winRate.toFixed(0)}%`}
                sub={`${stats.wins}W / ${stats.losses}L`}
                positive={stats.winRate >= 50}
              />
              <StatCard
                label="Total P&L"
                value={fmtPrice(stats.totalPnl)}
                positive={stats.totalPnl >= 0}
              />
              <StatCard
                label="Avg P&L"
                value={fmtPrice(stats.avgPnl)}
                positive={stats.avgPnl >= 0}
              />
              <StatCard
                label="Best Trade"
                value={fmtPrice(stats.bestPnl)}
                positive={true}
              />
              <StatCard
                label="Worst Trade"
                value={fmtPrice(stats.worstPnl)}
                positive={false}
              />
              <StatCard
                label="Avg Hold"
                value={stats.avgHoldMins < 60 ? `${Math.round(stats.avgHoldMins)}m` : `${(stats.avgHoldMins / 60).toFixed(1)}h`}
              />
              <StatCard
                label="Profit Factor"
                value={(() => {
                  const grossWin = filtered.filter(t => (t.pnl ?? 0) > 0).reduce((a, t) => a + (t.pnl ?? 0), 0);
                  const grossLoss = Math.abs(filtered.filter(t => (t.pnl ?? 0) < 0).reduce((a, t) => a + (t.pnl ?? 0), 0));
                  return grossLoss === 0 ? "∞" : (grossWin / grossLoss).toFixed(2);
                })()}
                positive={stats.totalPnl >= 0}
              />
            </div>
          )}

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Filter:</span>
            {(["all", "bullish", "bearish"] as FilterDir[]).map((d) => (
              <button
                key={d}
                onClick={() => setFilterDir(d)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  filterDir === d
                    ? d === "bullish" ? "border-green-500/40 bg-green-500/10 text-green-500"
                      : d === "bearish" ? "border-red-500/40 bg-red-500/10 text-red-500"
                      : "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {d}
              </button>
            ))}
            <span className="mx-1 text-border">|</span>
            {(["all", "hit_target", "hit_stop", "manual", "cancelled"] as FilterReason[]).map((r) => (
              <button
                key={r}
                onClick={() => setFilterReason(r)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  filterReason === r
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {r === "all" ? "All Reasons" : exitLabel(r)}
              </button>
            ))}
            {(filterDir !== "all" || filterReason !== "all") && (
              <button
                onClick={() => { setFilterDir("all"); setFilterReason("all"); }}
                className="ml-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {sorted.length} trade{sorted.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── Table ── */}
          <Card className="gap-0 py-0 overflow-hidden">
            {loading ? (
              <CardContent className="py-16 text-center">
                <svg viewBox="0 0 24 24" className="mx-auto size-6 animate-spin text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="50" strokeDashoffset="15" />
                </svg>
                <p className="mt-3 text-sm text-muted-foreground">Loading trade history...</p>
              </CardContent>
            ) : sorted.length === 0 ? (
              <CardContent className="py-16 text-center">
                <p className="text-sm font-medium text-foreground">No trades yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {history.length === 0
                    ? "Close your first trade and it will appear here."
                    : "No trades match the current filters."}
                </p>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px]">Symbol</th>
                      <th className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px]">Direction</th>
                      <th className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px]">Entry</th>
                      <th className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px]">Exit</th>
                      <th className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px]">Target</th>
                      <th className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px]">Stop</th>
                      <th
                        className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px] cursor-pointer hover:text-foreground select-none"
                        onClick={() => toggleSort("pnl")}
                      >
                        P&L <SortIcon k="pnl" />
                      </th>
                      <th
                        className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px] cursor-pointer hover:text-foreground select-none"
                        onClick={() => toggleSort("pnl_pct")}
                      >
                        % <SortIcon k="pnl_pct" />
                      </th>
                      <th className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px]">Result</th>
                      <th className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px]">Hold</th>
                      <th
                        className="px-4 py-2.5 font-semibold text-muted-foreground tracking-wider uppercase text-[10px] cursor-pointer hover:text-foreground select-none"
                        onClick={() => toggleSort("date")}
                      >
                        Date <SortIcon k="date" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sorted.map((t) => {
                      const isWin = (t.pnl ?? 0) > 0;
                      const isLoss = (t.pnl ?? 0) < 0;
                      return (
                        <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">{t.symbol}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide",
                                t.direction === "Bullish"
                                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20"
                              )}
                            >
                              {t.direction === "Bullish" ? "↑ Long" : "↓ Short"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-foreground">{fmtPrice(t.actual_entry)}</td>
                          <td className="px-4 py-3 font-mono text-foreground">{fmtPrice(t.exit_price)}</td>
                          <td className="px-4 py-3 font-mono text-green-500/70">{fmtPrice(t.target)}</td>
                          <td className="px-4 py-3 font-mono text-red-500/70">{fmtPrice(t.stop)}</td>
                          <td className={cn("px-4 py-3 font-mono font-semibold", isWin ? "text-green-500" : isLoss ? "text-red-500" : "text-muted-foreground")}>
                            {t.pnl != null ? (t.pnl >= 0 ? "+" : "") + fmtPrice(t.pnl) : "—"}
                          </td>
                          <td className={cn("px-4 py-3 font-mono font-semibold", isWin ? "text-green-500" : isLoss ? "text-red-500" : "text-muted-foreground")}>
                            {fmtPct(t.pnl_pct)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded px-1.5 py-0 text-[10px] font-medium",
                                t.exit_reason === "hit_target"
                                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                                  : t.exit_reason === "hit_stop"
                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                    : t.exit_reason === "cancelled"
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              )}
                            >
                              {exitLabel(t.exit_reason)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {fmtDuration(t.entered_at, t.closed_at)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {fmtDate(t.closed_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ── Breakdown by symbol ── */}
          {stats.total >= 3 && (
            <SymbolBreakdown trades={filtered} />
          )}
        </div>
      </main>
    </div>
  );
}

/* ── Symbol breakdown card ────────────────────────────────────────────── */

function SymbolBreakdown({ trades }: { trades: TradePosition[] }) {
  const bySymbol = trades.reduce((acc, t) => {
    const s = t.symbol;
    if (!acc[s]) acc[s] = [];
    acc[s].push(t);
    return acc;
  }, {} as Record<string, TradePosition[]>);

  const rows = Object.entries(bySymbol)
    .map(([symbol, ts]) => {
      const pnls = ts.map((t) => t.pnl ?? 0);
      const total = pnls.reduce((a, b) => a + b, 0);
      const wins = ts.filter((t) => (t.pnl ?? 0) > 0).length;
      return { symbol, count: ts.length, total, wins, winRate: (wins / ts.length) * 100 };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">By Symbol</p>
      </CardHeader>
      <Separator />
      <CardContent className="px-5 py-3">
        <div className="space-y-2">
          {rows.map(({ symbol, count, total, wins, winRate }) => {
            const isPos = total >= 0;
            return (
              <div key={symbol} className="flex items-center gap-4">
                <span className="w-16 font-mono font-bold text-sm">{symbol}</span>
                <span className="w-12 text-xs text-muted-foreground">{count} trades</span>
                <span className="w-20 text-xs text-muted-foreground">{winRate.toFixed(0)}% WR ({wins}W)</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", isPos ? "bg-green-500" : "bg-red-500")}
                    style={{ width: `${Math.min(100, Math.abs(winRate))}%` }}
                  />
                </div>
                <span className={cn("w-20 text-right font-mono text-sm font-semibold", isPos ? "text-green-500" : "text-red-500")}>
                  {total >= 0 ? "+" : ""}{total.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
