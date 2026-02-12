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

export interface LLMAnalysis {
  bias: string;
  entry: number;
  target: number;
  stop: number;
  reasoning: string;
}

export interface SetupData {
  symbol: string;
  score: number;
  indicators: IndicatorData;
  patterns: PatternData;
  breakdown: ScoreBreakdown;
  llm_analysis: LLMAnalysis | null;
  _updatedAt?: number;
}

export interface HealthData {
  schwab_authenticated: boolean;
  ollama_healthy: boolean;
  engine_running: boolean;
  tracked_symbols: string[];
}

export type WsStatus = "connecting" | "connected" | "disconnected";
