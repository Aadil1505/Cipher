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
  price_above_vwap: boolean;
  sma_bullish_cross: boolean;
  volume_surge: boolean;
  strong_momentum: boolean;
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
