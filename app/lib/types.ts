export interface IndicatorData {
  symbol: string;
  price: number;
  vwap: number;
  sma_8: number;
  sma_21: number;
  volume: number;
  avg_volume: number;
  volume_ratio: number;
  sma_separation_pct: number;
  rsi: number;
  atr: number;
  price_above_vwap: boolean;
  sma_bullish_cross: boolean;
  volume_surge: boolean;
  strong_momentum: boolean;
  rsi_overbought: boolean;
  rsi_oversold: boolean;
}

export interface PatternData {
  symbol: string;
  bullish_patterns: string[];
  bearish_patterns: string[];
  has_bullish_pattern: boolean;
  has_bearish_pattern: boolean;
}

export interface ScoreBreakdown {
  price_above_vwap: boolean;
  sma_bullish: boolean;
  volume_surge: boolean;
  bullish_pattern: boolean;
  strong_momentum: boolean;
  score: number;
}

export interface BearishBreakdown {
  price_below_vwap: boolean;
  sma_bearish: boolean;
  volume_surge: boolean;
  bearish_pattern: boolean;
  strong_momentum: boolean;
  score: number;
}

export interface LLMAnalysis {
  bias: string;
  confidence: string;
  entry: number;
  target: number;
  stop: number;
  risk_reward: number;
  why_enter: string;
  key_risk: string;
  watch_for: string;
  generated_at?: string;
  validated?: boolean;
  validation_warnings?: string[];
}

export interface SetupData {
  symbol: string;
  score: number;
  bearish_score: number;
  bias: string;
  dominant_score: number;
  indicators: IndicatorData;
  patterns: PatternData;
  breakdown: ScoreBreakdown;
  bearish_breakdown: BearishBreakdown;
  llm_analysis: LLMAnalysis | null;
  _updatedAt?: number;
}

export interface HealthData {
  schwab_authenticated: boolean;
  ollama_healthy: boolean;
  engine_running: boolean;
  tracked_symbols: string[];
}

export interface PriceUpdate {
  symbol: string;
  last_price: number;
  bid_price: number;
  ask_price: number;
  total_volume: number;
}

export type WsStatus = "connecting" | "connected" | "disconnected";

export type TradeStatus = "watching" | "active" | "closed";
export type ExitReason = "hit_target" | "hit_stop" | "manual" | "cancelled";

export interface TradePosition {
  id: string;
  symbol: string;
  direction: string;
  watch_entry: number;
  target: number;
  stop: number;
  status: TradeStatus;
  opened_at: string;
  actual_entry: number | null;
  entered_at: string | null;
  exit_price: number | null;
  exit_reason: ExitReason | null;
  closed_at: string | null;
  pnl: number | null;
  pnl_pct: number | null;
  entry_alerted: boolean;
  trigger_above: boolean;
  confidence: string;
  why_enter: string;
  key_risk: string;
  watch_for: string;
}

export interface TradeAlertMsg {
  alert_type: "entry_alert" | "exit_alert";
  symbol: string;
  price: number;
  trade_id: string;
  direction: string;
  entry?: number;
  target?: number;
  stop?: number;
  reason?: ExitReason;
  pnl?: number;
  pnl_pct?: number;
}
