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
    post<{ symbol: string; analysis: { bias: string; entry: number; target: number; stop: number; reasoning: string } | null }>(`/api/analyze/${symbol}`),

  getSetups: () =>
    get<Record<string, unknown>>("/api/setups"),

  getHealth: () =>
    get<{
      schwab_authenticated: boolean;
      ollama_healthy: boolean;
      engine_running: boolean;
      tracked_symbols: string[];
    }>("/api/health"),
};
