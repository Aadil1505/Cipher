"use client";

import { useState, useEffect, useRef } from "react";
import type { SetupData, PriceUpdate, TradePosition } from "@/app/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ── Pattern name + description mapping ───────── */

const PATTERN_INFO: Record<string, { label: string; desc: string }> = {
  CDLENGULFING: {
    label: "Engulfing",
    desc: "Current candle fully covers the previous one — strong reversal signal.",
  },
  CDLHAMMER: {
    label: "Hammer",
    desc: "Small body with a long lower wick — buyers rejected lower prices, often signals a bounce.",
  },
  CDLMORNINGSTAR: {
    label: "Morning Star",
    desc: "Three-candle reversal: big red, small indecision, then big green — trend may be turning up.",
  },
  CDLDOJI: {
    label: "Doji",
    desc: "Open and close nearly equal — market is undecided, watch for a breakout in either direction.",
  },
  CDLHARAMI: {
    label: "Harami",
    desc: "Small candle contained inside the previous one — momentum is slowing, possible reversal.",
  },
  CDLPIERCING: {
    label: "Piercing",
    desc: "Green candle opens below prior low but closes above its midpoint — bullish reversal signal.",
  },
  CDLMARUBOZU: {
    label: "Marubozu",
    desc: "Full-body candle with no wicks — very strong conviction in one direction.",
  },
  CDLINVERTEDHAMMER: {
    label: "Inv. Hammer",
    desc: "Small body with a long upper wick after a downtrend — buyers are testing higher prices.",
  },
  CDLMORNINGDOJISTAR: {
    label: "Morning Doji",
    desc: "Like Morning Star but the middle candle is a Doji — stronger indecision before reversal.",
  },
  CDL3WHITESOLDIERS: {
    label: "3 Soldiers",
    desc: "Three consecutive strong green candles — powerful bullish momentum, trend likely continuing up.",
  },
  CDLKICKING: {
    label: "Kicking",
    desc: "Two opposing Marubozu candles with a gap — one of the strongest reversal signals.",
  },
  CDLDRAGONFLYDOJI: {
    label: "Dragonfly",
    desc: "Doji with a long lower wick — sellers pushed down but buyers fought back to the open.",
  },
  CDLHANGINGMAN: {
    label: "Hanging Man",
    desc: "Hammer shape at the top of an uptrend — warning that buyers may be losing control.",
  },
  CDLEVENINGSTAR: {
    label: "Evening Star",
    desc: "Three-candle reversal: big green, small indecision, then big red — trend may be turning down.",
  },
  CDLSHOOTINGSTAR: {
    label: "Shooting Star",
    desc: "Small body with a long upper wick at a high — sellers rejected higher prices, bearish signal.",
  },
  CDL3BLACKCROWS: {
    label: "3 Crows",
    desc: "Three consecutive strong red candles — powerful bearish momentum, trend likely continuing down.",
  },
  CDLEVENINGDOJISTAR: {
    label: "Eve. Doji",
    desc: "Like Evening Star but the middle candle is a Doji — stronger indecision before bearish reversal.",
  },
};

function patternName(raw: string) {
  return PATTERN_INFO[raw]?.label || raw.replace("CDL", "");
}

function patternDesc(raw: string) {
  return PATTERN_INFO[raw]?.desc || "";
}

/* ── Formatting helpers ────────────────────────── */

function fmtPrice(n: number) {
  // For sub-penny stocks, show enough decimals to be meaningful
  const decimals = n !== 0 && Math.abs(n) < 0.01 ? 4 : 2;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
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

function scoreColor(score: number, bias: string) {
  if (bias === "Bearish") {
    if (score >= 9) return "#ef4444";
    if (score >= 7) return "#f87171";
    if (score >= 5) return "#eab308";
    return "#6b7280";
  }
  if (score >= 9) return "#22c55e";
  if (score >= 7) return "#4ade80";
  if (score >= 5) return "#eab308";
  if (score >= 3) return "#f97316";
  return "#ef4444";
}

function scoreBorderGlow(score: number, bias: string) {
  if (bias === "Bearish" && score >= 7)
    return "inset 0 0 0 1px rgba(239,68,68,0.25), 0 0 24px rgba(239,68,68,0.08)";
  if (score >= 9)
    return "inset 0 0 0 1px rgba(34,197,94,0.25), 0 0 24px rgba(34,197,94,0.08)";
  if (score >= 7)
    return "inset 0 0 0 1px rgba(74,222,128,0.2), 0 0 16px rgba(74,222,128,0.05)";
  return undefined;
}

/* ── Score Gauge (SVG ring) ────────────────────── */

function ScoreGauge({ score, bias }: { score: number; bias: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const filled = (score / 10) * circ;
  const offset = circ - filled;
  const color = scoreColor(score, bias);

  return (
    <svg viewBox="0 0 52 52" className="h-14 w-14" aria-label={`${bias} score ${score} out of 10`}>
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

function BearishCriterion({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold",
          met ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground"
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
  livePrice: PriceUpdate | null;
  onAnalyze: (symbol: string) => Promise<unknown>;
  activeTrade: TradePosition | null;
  onWatch: (symbol: string, immediate: boolean) => void;
  onOpenTrade: (symbol: string, price: number) => void;
  onCloseTrade: (symbol: string, price: number) => void;
  onCancelWatch: (symbol: string) => void;
}

export default function SetupCard({ setup, livePrice, onAnalyze, activeTrade, onWatch, onOpenTrade, onCloseTrade, onCancelWatch }: Props) {
  const { symbol, score, indicators, patterns, breakdown, bearish_breakdown, bias, dominant_score, llm_analysis } = setup;
  const [analyzing, setAnalyzing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [watchExpanded, setWatchExpanded] = useState(false);
  const prevUpdate = useRef(setup._updatedAt);

  // Use live price if available, fall back to indicator price
  const displayPrice = livePrice?.last_price ?? indicators.price;
  const prevPriceRef = useRef(displayPrice);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (displayPrice !== prevPriceRef.current) {
      setPriceDirection(displayPrice > prevPriceRef.current ? "up" : "down");
      prevPriceRef.current = displayPrice;
      const t = setTimeout(() => setPriceDirection(null), 500);
      return () => clearTimeout(t);
    }
  }, [displayPrice]);

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

  // Track freshness — update a relative time string every second
  const lastDataTime = useRef(Date.now());
  const [ago, setAgo] = useState("");

  // Reset timer whenever we get new data (setup update or price tick)
  useEffect(() => {
    lastDataTime.current = Date.now();
  }, [setup._updatedAt, livePrice]);

  useEffect(() => {
    const tick = () => {
      const sec = Math.floor((Date.now() - lastDataTime.current) / 1000);
      if (sec < 5) setAgo("Live");
      else if (sec < 60) setAgo(`${sec}s ago`);
      else if (sec < 3600) setAgo(`${Math.floor(sec / 60)}m ago`);
      else setAgo("Stale");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Live-compute price_above_vwap using real-time price
  const liveAboveVwap = displayPrice > indicators.vwap;
  const liveVolume = livePrice?.total_volume ?? indicators.volume;

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
      style={{ boxShadow: scoreBorderGlow(dominant_score, bias) }}
    >
      {/* ── Header ─────────────────────────────── */}
      <CardHeader className="flex-row items-center justify-between px-5 pt-4 pb-3 gap-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-lg font-bold tracking-wider text-foreground">
              {symbol}
            </h3>
            <Badge
              variant="outline"
              className={cn(
                "rounded-md px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider",
                bias === "Bullish"
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : bias === "Bearish"
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {bias}
            </Badge>
            <span
              className={cn(
                "text-[10px] font-mono",
                ago === "Live"
                  ? "text-green-500"
                  : ago === "Stale"
                    ? "text-red-500"
                    : "text-muted-foreground"
              )}
            >
              {ago === "Live" && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
              )}
              {ago}
            </span>
          </div>
          <p
            className={cn(
              "mt-0.5 font-mono text-2xl font-semibold tracking-tight transition-colors duration-300",
              priceDirection === "up"
                ? "text-green-400"
                : priceDirection === "down"
                  ? "text-red-400"
                  : liveAboveVwap
                    ? "text-green-500"
                    : "text-red-500"
            )}
          >
            {fmtPrice(displayPrice)}
          </p>
        </div>
        <ScoreGauge score={dominant_score} bias={bias} />
      </CardHeader>

      {/* ── Indicators ─────────────────────────── */}
      <Separator />
      <CardContent className="px-5 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Indicators
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono">
          <Row label="VWAP" value={fmtPrice(indicators.vwap)} signal={liveAboveVwap} />
          <Row label="SMA 8" value={fmtPrice(indicators.sma_8)} />
          <Row label="SMA 21" value={fmtPrice(indicators.sma_21)} signal={indicators.sma_bullish_cross} />
          <Row label="Vol" value={fmtVol(liveVolume)} />
          <Row label="Vol Ratio" value={fmtRatio(indicators.volume_ratio)} signal={indicators.volume_surge} />
          <Row label="Momentum" value={fmtPct(indicators.sma_separation_pct)} signal={indicators.strong_momentum} />
          <Row label="RSI(14)" value={indicators.rsi.toFixed(1)} signal={indicators.rsi_oversold ? true : indicators.rsi_overbought ? false : undefined} />
          <Row label="ATR(14)" value={fmtPrice(indicators.atr)} />
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
                title={patternDesc(name)}
                className={cn(
                  "cursor-help rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide animate-in fade-in-0",
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
        <div className="flex gap-6">
          {/* Bullish */}
          <div className="flex-1">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-green-500">
              Bullish {score}/10
            </p>
            <div className="space-y-1">
              <Criterion label="Price > VWAP" met={breakdown.price_above_vwap} />
              <Criterion label="SMA Bullish" met={breakdown.sma_bullish} />
              <Criterion label="Volume Surge" met={breakdown.volume_surge} />
              <Criterion label="Bull Pattern" met={breakdown.bullish_pattern} />
              <Criterion label="Momentum" met={breakdown.strong_momentum} />
            </div>
          </div>
          {/* Bearish */}
          <div className="flex-1">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-500">
              Bearish {bearish_breakdown.score}/10
            </p>
            <div className="space-y-1">
              <BearishCriterion label="Price < VWAP" met={bearish_breakdown.price_below_vwap} />
              <BearishCriterion label="SMA Bearish" met={bearish_breakdown.sma_bearish} />
              <BearishCriterion label="Volume Surge" met={bearish_breakdown.volume_surge} />
              <BearishCriterion label="Bear Pattern" met={bearish_breakdown.bearish_pattern} />
              <BearishCriterion label="Momentum" met={bearish_breakdown.strong_momentum} />
            </div>
          </div>
        </div>
      </CardContent>

      {/* ── LLM Analysis ───────────────────────── */}
      <Separator />
      <CardContent className="px-5 py-3 pb-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              AI Analysis
            </p>
            {llm_analysis?.generated_at && (
              <p className="text-[10px] text-muted-foreground/60">
                {new Date(llm_analysis.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>
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
            {/* Bias + Confidence + R:R */}
            <div className="flex items-center gap-2">
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
              {llm_analysis.confidence && (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide",
                    llm_analysis.confidence === "High"
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : llm_analysis.confidence === "Medium"
                        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                  )}
                >
                  {llm_analysis.confidence}
                </Badge>
              )}
              {llm_analysis.risk_reward > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-auto rounded-md px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide",
                    llm_analysis.risk_reward >= 2
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : llm_analysis.risk_reward >= 1
                        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                  )}
                >
                  {llm_analysis.risk_reward}:1 R/R
                </Badge>
              )}
            </div>

            {/* Validation warning */}
            {llm_analysis.validated === false && (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-[11px] text-yellow-500">
                <p className="font-semibold">Warning: LLM output may be unreliable</p>
                {llm_analysis.validation_warnings?.map((w, i) => (
                  <p key={i} className="mt-0.5 text-yellow-500/80">{w}</p>
                ))}
              </div>
            )}

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

            {/* Structured reasoning */}
            <div className="space-y-1.5">
              {llm_analysis.why_enter && (
                <div className="text-[11px] leading-relaxed">
                  <span className="font-semibold text-green-500">Why enter: </span>
                  <span className="text-muted-foreground">{llm_analysis.why_enter}</span>
                </div>
              )}
              {llm_analysis.key_risk && (
                <div className="text-[11px] leading-relaxed">
                  <span className="font-semibold text-red-500">Key risk: </span>
                  <span className="text-muted-foreground">{llm_analysis.key_risk}</span>
                </div>
              )}
              {llm_analysis.watch_for && (
                <div className="text-[11px] leading-relaxed">
                  <span className="font-semibold text-yellow-500">Watch for: </span>
                  <span className="text-muted-foreground">{llm_analysis.watch_for}</span>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            {dominant_score >= 7
              ? "Awaiting AI analysis..."
              : "Score below threshold. Click Analyze to force."}
          </p>
        )}
      </CardContent>

      {/* ── Watch Trade ─────────────────────────────── */}
      {llm_analysis && (
        <>
          <Separator />
          <CardContent className="px-5 py-3 pb-4">
            {!activeTrade ? (
              /* No active trade — show Watch button or expanded choice */
              !watchExpanded ? (
                <Button
                  variant="outline"
                  size="xs"
                  className="w-full border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setWatchExpanded(true)}
                >
                  <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="8" r="5" /><path d="M8 5v3l2 1.5" />
                  </svg>
                  Watch Trade
                </Button>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Watch Trade</p>
                    <button onClick={() => setWatchExpanded(false)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                  </div>
                  {/* Entry/Target/Stop preview */}
                  <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/40 px-2.5 py-2 font-mono text-center">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Entry</p>
                      <p className="text-xs font-medium">{fmtPrice(llm_analysis.entry)}</p>
                    </div>
                    <div className="border-x">
                      <p className="text-[9px] uppercase tracking-widest text-green-500">Target</p>
                      <p className="text-xs font-medium text-green-500">{fmtPrice(llm_analysis.target)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-red-500">Stop</p>
                      <p className="text-xs font-medium text-red-500">{fmtPrice(llm_analysis.stop)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="xs"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => { onWatch(symbol, true); setWatchExpanded(false); }}
                    >
                      Enter Now
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => { onWatch(symbol, false); setWatchExpanded(false); }}
                    >
                      Alert at {fmtPrice(llm_analysis.entry)}
                    </Button>
                  </div>
                </div>
              )
            ) : activeTrade.status === "watching" ? (
              /* Watching state — show entry level + distance + actions */
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "inline-block h-2 w-2 rounded-full flex-shrink-0",
                      activeTrade.entry_alerted ? "bg-yellow-500" : "bg-yellow-500/60 animate-pulse"
                    )} />
                    <span className="text-xs font-medium text-yellow-500">
                      {activeTrade.entry_alerted ? "Price reached entry!" : `Waiting for ${fmtPrice(activeTrade.watch_entry)}`}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {activeTrade.entry_alerted && (
                      <Button
                        size="xs"
                        className="bg-yellow-500 text-black hover:bg-yellow-400 font-semibold text-[10px]"
                        onClick={() => onOpenTrade(symbol, livePrice?.last_price ?? activeTrade.watch_entry)}
                      >
                        Confirm Entry
                      </Button>
                    )}
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground text-[10px]"
                      onClick={() => onCancelWatch(symbol)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
                {/* Distance to entry */}
                {livePrice && !activeTrade.entry_alerted && (() => {
                  const dist = Math.abs(activeTrade.watch_entry - livePrice.last_price);
                  const pct = (dist / livePrice.last_price) * 100;
                  const movingToward = activeTrade.trigger_above
                    ? livePrice.last_price < activeTrade.watch_entry
                    : livePrice.last_price > activeTrade.watch_entry;
                  return (
                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                      <span>Now: <span className="text-foreground">{fmtPrice(livePrice.last_price)}</span></span>
                      <span>·</span>
                      <span className={movingToward ? "text-yellow-500" : ""}>
                        {fmtPrice(dist)} ({pct.toFixed(2)}%) {activeTrade.trigger_above ? "below" : "above"} entry
                      </span>
                    </div>
                  );
                })()}
              </div>
            ) : activeTrade.status === "active" ? (
              /* Active state — P&L + target/stop distance + progress */
              <div className="space-y-2">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Active @ <span className="font-mono text-foreground">{fmtPrice(activeTrade.actual_entry)}</span>
                    </span>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    className="border-red-500/40 text-red-500 hover:bg-red-500/10 text-[10px]"
                    onClick={() => onCloseTrade(symbol, livePrice?.last_price ?? activeTrade.watch_entry)}
                  >
                    Close
                  </Button>
                </div>

                {activeTrade.actual_entry && livePrice && (() => {
                  const price = livePrice.last_price;
                  const entry = activeTrade.actual_entry!;
                  const pnl = activeTrade.direction === "Bullish" ? price - entry : entry - price;
                  const pct = (pnl / entry) * 100;
                  const isPos = pnl >= 0;
                  const toTarget = Math.abs(activeTrade.target - price);
                  const toStop = Math.abs(price - activeTrade.stop);
                  const range = Math.abs(activeTrade.target - activeTrade.stop);
                  const progress = range > 0
                    ? Math.min(1, Math.max(0,
                        activeTrade.direction === "Bullish"
                          ? (price - activeTrade.stop) / range
                          : (activeTrade.stop - price) / range
                      ))
                    : 0;

                  return (
                    <>
                      {/* P&L prominent */}
                      <p className={cn("font-mono text-base font-bold", isPos ? "text-green-500" : "text-red-500")}>
                        {pnl >= 0 ? "+" : ""}{fmtPrice(pnl)}
                        <span className="ml-1.5 text-sm font-semibold opacity-80">({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)</span>
                      </p>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-300", isPos ? "bg-green-500" : "bg-red-400")}
                            style={{ width: `${progress * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-red-500">Stop {fmtPrice(activeTrade.stop)}</span>
                          <span className="text-green-500">Target {fmtPrice(activeTrade.target)}</span>
                        </div>
                      </div>

                      {/* Distance indicators */}
                      <div className="flex gap-3 text-[10px] font-mono">
                        <span className="text-green-500/80">↑ {fmtPrice(toTarget)} to target</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-red-500/80">↓ {fmtPrice(toStop)} to stop</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </CardContent>
        </>
      )}
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
