"use client";

import { useState, useEffect, useRef } from "react";
import type { SetupData } from "@/app/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ── Pattern name mapping ──────────────────────── */

const PATTERN_LABEL: Record<string, string> = {
  CDLENGULFING: "Engulfing",
  CDLHAMMER: "Hammer",
  CDLMORNINGSTAR: "Morning Star",
  CDLDOJI: "Doji",
  CDLHARAMI: "Harami",
  CDLPIERCING: "Piercing",
  CDLMARUBOZU: "Marubozu",
  CDLINVERTEDHAMMER: "Inv. Hammer",
  CDLMORNINGDOJISTAR: "Morning Doji",
  CDL3WHITESOLDIERS: "3 Soldiers",
  CDLKICKING: "Kicking",
  CDLDRAGONFLYDOJI: "Dragonfly",
  CDLHANGINGMAN: "Hanging Man",
  CDLEVENINGSTAR: "Evening Star",
  CDLSHOOTINGSTAR: "Shooting Star",
  CDL3BLACKCROWS: "3 Crows",
  CDLEVENINGDOJISTAR: "Eve. Doji",
};

function patternName(raw: string) {
  return PATTERN_LABEL[raw] || raw.replace("CDL", "");
}

/* ── Formatting helpers ────────────────────────── */

function fmtPrice(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function fmtVol(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtRatio(n: number) {
  return `${n.toFixed(1)}x`;
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

/* ── Score color ───────────────────────────────── */

function scoreColor(score: number) {
  if (score >= 9) return "#22c55e";
  if (score >= 7) return "#4ade80";
  if (score >= 5) return "#eab308";
  if (score >= 3) return "#f97316";
  return "#ef4444";
}

function scoreBorderGlow(score: number) {
  if (score >= 9)
    return "inset 0 0 0 1px rgba(34,197,94,0.25), 0 0 24px rgba(34,197,94,0.08)";
  if (score >= 7)
    return "inset 0 0 0 1px rgba(74,222,128,0.2), 0 0 16px rgba(74,222,128,0.05)";
  return undefined;
}

/* ── Score Gauge (SVG ring) ────────────────────── */

function ScoreGauge({ score }: { score: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const filled = (score / 10) * circ;
  const offset = circ - filled;
  const color = scoreColor(score);

  return (
    <svg viewBox="0 0 52 52" className="h-14 w-14" aria-label={`Score ${score} out of 10`}>
      <circle
        cx="26" cy="26" r={r}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="3"
      />
      <circle
        cx="26" cy="26" r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 26 26)"
        className="score-ring"
        style={{ filter: score >= 7 ? `drop-shadow(0 0 4px ${color}50)` : "none" }}
      />
      <text
        x="26" y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="15"
        fontWeight="700"
        fontFamily="var(--font-mono)"
      >
        {score}
      </text>
      <text
        x="26" y="36"
        textAnchor="middle"
        fill="var(--color-muted-foreground)"
        fontSize="7"
        fontFamily="var(--font-mono)"
      >
        /10
      </text>
    </svg>
  );
}

/* ── Criteria row ──────────────────────────────── */

function Criterion({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold",
          met ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
        )}
      >
        {met ? "\u2713" : "\u00B7"}
      </span>
      <span className={met ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

/* ── Main card ─────────────────────────────────── */

interface Props {
  setup: SetupData;
  onAnalyze: (symbol: string) => Promise<unknown>;
}

export default function SetupCard({ setup, onAnalyze }: Props) {
  const { symbol, score, indicators, patterns, breakdown, llm_analysis } = setup;
  const [analyzing, setAnalyzing] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevUpdate = useRef(setup._updatedAt);

  useEffect(() => {
    if (setup._updatedAt && setup._updatedAt !== prevUpdate.current) {
      prevUpdate.current = setup._updatedAt;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
  }, [setup._updatedAt]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await onAnalyze(symbol);
    } finally {
      setAnalyzing(false);
    }
  };

  const allPatterns = [
    ...patterns.bullish_patterns.map((p) => ({ name: p, type: "bull" as const })),
    ...patterns.bearish_patterns.map((p) => ({ name: p, type: "bear" as const })),
  ];

  return (
    <Card
      className={cn(
        "gap-0 py-0 rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-0.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-300",
        flash && "ring-2 ring-primary/30 shadow-lg"
      )}
      style={{ boxShadow: scoreBorderGlow(score) }}
    >
      {/* ── Header ─────────────────────────────── */}
      <CardHeader className="flex-row items-center justify-between px-5 pt-4 pb-3 gap-0">
        <div>
          <h3 className="font-mono text-lg font-bold tracking-wider text-foreground">
            {symbol}
          </h3>
          <p
            className={cn(
              "mt-0.5 font-mono text-2xl font-semibold tracking-tight",
              indicators.price_above_vwap ? "text-green-500" : "text-red-500"
            )}
          >
            {fmtPrice(indicators.price)}
          </p>
        </div>
        <ScoreGauge score={score} />
      </CardHeader>

      {/* ── Indicators ─────────────────────────── */}
      <Separator />
      <CardContent className="px-5 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Indicators
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono">
          <Row label="VWAP" value={fmtPrice(indicators.vwap)} signal={indicators.price_above_vwap} />
          <Row label="SMA 8" value={fmtPrice(indicators.sma_8)} />
          <Row label="SMA 21" value={fmtPrice(indicators.sma_21)} signal={indicators.sma_bullish_cross} />
          <Row label="Vol" value={fmtVol(indicators.volume)} />
          <Row label="Vol Ratio" value={fmtRatio(indicators.volume_ratio)} signal={indicators.volume_surge} />
          <Row label="Momentum" value={fmtPct(indicators.sma_separation_pct)} signal={indicators.strong_momentum} />
        </div>
      </CardContent>

      {/* ── Patterns ───────────────────────────── */}
      <Separator />
      <CardContent className="px-5 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Patterns
        </p>
        {allPatterns.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allPatterns.map(({ name, type }, i) => (
              <Badge
                key={name}
                variant="outline"
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide animate-in fade-in-0",
                  type === "bull"
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {patternName(name)}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">None detected</p>
        )}
      </CardContent>

      {/* ── Score Breakdown ─────────────────────── */}
      <Separator />
      <CardContent className="px-5 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Breakdown
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <Criterion label="Price > VWAP" met={breakdown.price_above_vwap} />
          <Criterion label="SMA Bullish" met={breakdown.sma_bullish} />
          <Criterion label="Volume Surge" met={breakdown.volume_surge} />
          <Criterion label="Bullish Pattern" met={breakdown.bullish_pattern} />
          <Criterion label="Momentum" met={breakdown.strong_momentum} />
        </div>
      </CardContent>

      {/* ── LLM Analysis ───────────────────────── */}
      <Separator />
      <CardContent className="px-5 py-3 pb-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            AI Analysis
          </p>
          <Button
            variant="outline"
            size="xs"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <svg viewBox="0 0 16 16" className="size-3 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
                </svg>
                Analyzing
              </>
            ) : (
              <>
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v3l2 1.5" />
                </svg>
                Analyze
              </>
            )}
          </Button>
        </div>
        {llm_analysis ? (
          <Card className="gap-2.5 rounded-md border-primary/10 bg-primary/[0.03] px-3 py-2.5 shadow-none animate-in fade-in-0 duration-500">
            {/* Bias tag */}
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                  llm_analysis.bias.toLowerCase() === "bullish"
                    ? "bg-green-500/15 text-green-500 border-green-500/20"
                    : "bg-red-500/15 text-red-500 border-red-500/20"
                )}
              >
                {llm_analysis.bias}
              </Badge>
            </div>

            {/* Entry / Target / Stop row */}
            <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/60 px-2.5 py-2 font-mono">
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Entry</p>
                <p className="text-sm font-medium text-foreground">{fmtPrice(llm_analysis.entry)}</p>
              </div>
              <div className="text-center border-x">
                <p className="text-[9px] uppercase tracking-widest text-green-500">Target</p>
                <p className="text-sm font-medium text-green-500">{fmtPrice(llm_analysis.target)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-widest text-red-500">Stop</p>
                <p className="text-sm font-medium text-red-500">{fmtPrice(llm_analysis.stop)}</p>
              </div>
            </div>

            {/* Reasoning */}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {llm_analysis.reasoning}
            </p>
          </Card>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            {score >= 7
              ? "Awaiting AI analysis..."
              : "Score below threshold. Click Analyze to force."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Indicator Row ─────────────────────────────── */

function Row({
  label,
  value,
  signal,
}: {
  label: string;
  value: string;
  signal?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="text-foreground">{value}</span>
        {signal !== undefined && (
          <span className={signal ? "text-green-500" : "text-red-500"}>
            {signal ? "\u25B2" : "\u25BC"}
          </span>
        )}
      </span>
    </div>
  );
}

/* ── Skeleton placeholder bar ─────────────────── */

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

/* ── Skeleton Card ─────────────────────────────── */

export function SetupCardSkeleton({ symbol }: { symbol: string }) {
  return (
    <Card className="gap-0 py-0 rounded-lg overflow-hidden animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      {/* Header */}
      <CardHeader className="flex-row items-center justify-between px-5 pt-4 pb-3 gap-0">
        <div>
          <h3 className="font-mono text-lg font-bold tracking-wider text-foreground">
            {symbol}
          </h3>
          <Bone className="mt-2 h-7 w-28" />
        </div>
        {/* Score ring placeholder */}
        <div className="h-14 w-14 rounded-full border-3 border-muted animate-pulse" />
      </CardHeader>

      {/* Indicators */}
      <Separator />
      <CardContent className="px-5 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Indicators
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Bone className="h-3 w-10" />
              <Bone className="h-3 w-16" />
            </div>
          ))}
        </div>
      </CardContent>

      {/* Patterns */}
      <Separator />
      <CardContent className="px-5 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Patterns
        </p>
        <div className="flex gap-1.5">
          <Bone className="h-5 w-16 rounded-md" />
          <Bone className="h-5 w-20 rounded-md" />
        </div>
      </CardContent>

      {/* Breakdown */}
      <Separator />
      <CardContent className="px-5 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Breakdown
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Bone className="h-4 w-4 rounded" />
              <Bone className="h-3 w-20" />
            </div>
          ))}
        </div>
      </CardContent>

      {/* AI Analysis */}
      <Separator />
      <CardContent className="px-5 py-3 pb-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          AI Analysis
        </p>
        <p className="text-xs italic text-muted-foreground">Waiting for data...</p>
      </CardContent>
    </Card>
  );
}
