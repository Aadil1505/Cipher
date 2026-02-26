"use client";

import { useEffect, useRef } from "react";
import type { TradeAlertMsg } from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  alerts: TradeAlertMsg[];
  livePrices: Record<string, { last_price: number }>;
  onConfirmEntry: (symbol: string, price: number) => void;
  onCancelWatch: (symbol: string) => void;
  onDismiss: (tradeId: string) => void;
}

const EXIT_AUTO_DISMISS_MS = 10_000;

function fmtPrice(n: number | undefined | null) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function EntryToast({
  alert,
  livePrice,
  onConfirm,
  onCancel,
  onDismiss,
}: {
  alert: TradeAlertMsg;
  livePrice: number | null;
  onConfirm: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const displayPrice = livePrice ?? alert.price;

  // R:R at current price
  const rrLabel = (() => {
    if (!alert.target || !alert.stop || !displayPrice) return null;
    const reward = Math.abs(alert.target - displayPrice);
    const risk = Math.abs(displayPrice - alert.stop);
    if (risk === 0) return null;
    return `${(reward / risk).toFixed(1)}:1`;
  })();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 shadow-lg animate-in slide-in-from-right-4 duration-300 w-[300px]">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-yellow-500">Entry Alert</p>
            <p className="font-mono text-sm font-bold text-foreground">
              {alert.symbol} · {alert.direction}
            </p>
          </div>
        </div>
        <button onClick={onDismiss} className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" aria-label="Dismiss">
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4 4 12M4 4l8 8" /></svg>
        </button>
      </div>

      {/* Price levels */}
      <div className="grid grid-cols-3 gap-1 rounded-md border bg-background/40 px-2 py-1.5 font-mono text-center">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Entry</p>
          <p className="text-xs font-semibold text-yellow-500">{fmtPrice(alert.entry ?? alert.price)}</p>
        </div>
        <div className="border-x">
          <p className="text-[9px] uppercase tracking-wider text-green-500">Target</p>
          <p className="text-xs font-semibold text-green-500">{fmtPrice(alert.target)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-red-500">Stop</p>
          <p className="text-xs font-semibold text-red-500">{fmtPrice(alert.stop)}</p>
        </div>
      </div>

      {/* Current price + R:R */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Now: <span className="font-mono font-medium text-foreground">{fmtPrice(displayPrice)}</span></span>
        {rrLabel && <span className="font-mono font-medium text-foreground">R:R {rrLabel}</span>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="xs"
          className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400 font-semibold"
          onClick={onConfirm}
        >
          Confirm Entry
        </Button>
        <Button
          size="xs"
          variant="outline"
          className="flex-1 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
          onClick={onCancel}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

function ExitToast({
  alert,
  onDismiss,
}: {
  alert: TradeAlertMsg;
  onDismiss: () => void;
}) {
  const isProfit = (alert.pnl ?? 0) >= 0;
  const isTarget = alert.reason === "hit_target";
  const isStop = alert.reason === "hit_stop";

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, EXIT_AUTO_DISMISS_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onDismiss]);

  return (
    <div className={cn(
      "flex flex-col gap-2 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right-4 duration-300 w-[300px]",
      isProfit ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cn("text-[10px] font-semibold uppercase tracking-wider", isProfit ? "text-green-500" : "text-red-500")}>
            {isTarget ? "Target Hit" : isStop ? "Stop Hit" : "Trade Closed"}
          </p>
          <p className="font-mono text-sm font-bold text-foreground">
            {alert.symbol} at {fmtPrice(alert.price)}
          </p>
          {alert.pnl !== undefined && alert.pnl_pct !== undefined && (
            <p className={cn("font-mono text-base font-bold", isProfit ? "text-green-500" : "text-red-500")}>
              {alert.pnl >= 0 ? "+" : ""}{fmtPrice(alert.pnl)}
              <span className="ml-1.5 text-sm font-semibold opacity-80">
                ({fmtPct(alert.pnl_pct)})
              </span>
            </p>
          )}
        </div>
        <button onClick={onDismiss} className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" aria-label="Dismiss">
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4 4 12M4 4l8 8" /></svg>
        </button>
      </div>
      {/* Auto-dismiss progress bar */}
      <div className="h-0.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full origin-left", isProfit ? "bg-green-500" : "bg-red-500")}
          style={{ animation: `shrink ${EXIT_AUTO_DISMISS_MS}ms linear forwards` }}
        />
      </div>
    </div>
  );
}

export default function TradeAlertToast({ alerts, livePrices, onConfirmEntry, onCancelWatch, onDismiss }: Props) {
  if (alerts.length === 0) return null;

  return (
    <>
      <style>{`@keyframes shrink { from { transform: scaleX(1) } to { transform: scaleX(0) } }`}</style>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 items-end">
        {alerts.map((alert) => {
          if (alert.alert_type === "entry_alert") {
            return (
              <EntryToast
                key={alert.trade_id}
                alert={alert}
                livePrice={livePrices[alert.symbol]?.last_price ?? null}
                onConfirm={() => {
                  const price = livePrices[alert.symbol]?.last_price ?? alert.price;
                  onConfirmEntry(alert.symbol, price);
                  onDismiss(alert.trade_id);
                }}
                onCancel={() => {
                  onCancelWatch(alert.symbol);
                  onDismiss(alert.trade_id);
                }}
                onDismiss={() => onDismiss(alert.trade_id)}
              />
            );
          }
          return (
            <ExitToast
              key={alert.trade_id + (alert.reason ?? "")}
              alert={alert}
              onDismiss={() => onDismiss(alert.trade_id)}
            />
          );
        })}
      </div>
    </>
  );
}
