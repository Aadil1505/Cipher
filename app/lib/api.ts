import type { LLMAnalysis, TradePosition } from "@/app/lib/types";

const API = "http://localhost:8000";

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  startEngine: (symbols: string[]) =>
    post<{ status: string; symbols: string[] }>("/api/start", { symbols }),

  stopEngine: () => post<{ status: string }>("/api/stop"),

  addSymbols: (symbols: string[]) =>
    post<{ status: string; symbols: string[] }>("/api/symbols/add", {
      symbols,
    }),

  removeSymbols: (symbols: string[]) =>
    post<{ status: string; symbols: string[] }>("/api/symbols/remove", {
      symbols,
    }),

  analyzeSymbol: (symbol: string) =>
    post<{ symbol: string; analysis: LLMAnalysis | null }>(`/api/analyze/${symbol}`),

  getSetups: () =>
    get<Record<string, unknown>>("/api/setups"),

  getHealth: () =>
    get<{
      schwab_authenticated: boolean;
      ollama_healthy: boolean;
      engine_running: boolean;
      tracked_symbols: string[];
    }>("/api/health"),

  watchTrade: (symbol: string, immediate: boolean) =>
    post<TradePosition>(`/api/trades/watch/${symbol}`, { immediate }),

  openTrade: (symbol: string, actual_entry: number) =>
    post<TradePosition>(`/api/trades/open/${symbol}`, { actual_entry }),

  closeTrade: (symbol: string, exit_price: number) =>
    post<TradePosition>(`/api/trades/close/${symbol}`, { exit_price }),

  cancelWatch: (symbol: string) =>
    fetch(`${API}/api/trades/watch/${symbol}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json() as Promise<{ status: string; symbol: string }>;
    }),

  getActiveTrades: () => get<TradePosition[]>("/api/trades/active"),

  getTradeHistory: () => get<TradePosition[]>("/api/trades/history"),
};
