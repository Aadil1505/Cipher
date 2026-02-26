"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SetupData, HealthData, WsStatus, PriceUpdate, TradePosition, TradeAlertMsg } from "@/app/lib/types";
import { api } from "@/app/lib/api";

const WS_URL = "ws://localhost:8000/ws";
const HEALTH_POLL_MS = 5000;
const RECONNECT_MS = 3000;
const MAX_TRADE_ALERTS = 10;

export function useCipher() {
  const [setups, setSetups] = useState<Record<string, SetupData>>({});
  const [livePrices, setLivePrices] = useState<Record<string, PriceUpdate>>({});
  const [health, setHealth] = useState<HealthData | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [activeTrades, setActiveTrades] = useState<Record<string, TradePosition>>({});
  const [tradeAlerts, setTradeAlerts] = useState<TradeAlertMsg[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradePosition[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  /* ── WebSocket ────────────────────────────────── */

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    )
      return;

    setWsStatus("connecting");
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      if (alive.current) setWsStatus("connected");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "setup_update" && msg.data) {
          const d = msg.data as SetupData;
          setSetups((prev) => ({
            ...prev,
            [d.symbol]: { ...d, _updatedAt: Date.now() },
          }));
        } else if (msg.type === "price_update" && msg.data) {
          const p = msg.data as PriceUpdate;
          setLivePrices((prev) => ({ ...prev, [p.symbol]: p }));
        } else if (msg.type === "trade_update" && msg.data) {
          const t = msg.data as TradePosition;
          if (t.status === "closed") {
            setActiveTrades((prev) => {
              const next = { ...prev };
              delete next[t.symbol];
              return next;
            });
            setTradeHistory((prev) => [t, ...prev].slice(0, 100));
          } else {
            setActiveTrades((prev) => ({ ...prev, [t.symbol]: t }));
          }
        } else if (msg.type === "trade_alert" && msg.data) {
          const alert = msg.data as TradeAlertMsg;
          setTradeAlerts((prev) => [alert, ...prev].slice(0, MAX_TRADE_ALERTS));
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      if (alive.current) {
        setWsStatus("disconnected");
        reconnectRef.current = setTimeout(connect, RECONNECT_MS);
      }
    };

    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setWsStatus("disconnected");
  }, []);

  useEffect(() => {
    alive.current = true;
    connect();
    return () => {
      alive.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  /* ── Health polling ───────────────────────────── */

  useEffect(() => {
    const poll = async () => {
      try {
        const h = await api.getHealth();
        if (alive.current) setHealth(h);
      } catch {
        if (alive.current) setHealth(null);
      }
    };
    poll();
    const id = setInterval(poll, HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, []);

  /* ── Fetch initial active trades on mount ──────── */

  useEffect(() => {
    api.getActiveTrades().then((trades) => {
      if (!alive.current) return;
      const map: Record<string, TradePosition> = {};
      for (const t of trades) map[t.symbol] = t;
      setActiveTrades(map);
    }).catch(() => {/* backend may not be up yet */});
  }, []);

  /* ── Actions ──────────────────────────────────── */

  const startEngine = useCallback(async (symbols: string[]) => {
    const res = await api.startEngine(symbols);
    return res;
  }, []);

  const stopEngine = useCallback(async () => {
    await api.stopEngine();
    setSetups({});
  }, []);

  const addSymbols = useCallback(async (symbols: string[]) => {
    return api.addSymbols(symbols);
  }, []);

  const removeSymbols = useCallback(async (symbols: string[]) => {
    const res = await api.removeSymbols(symbols);
    setSetups((prev) => {
      const next = { ...prev };
      for (const s of symbols) delete next[s];
      return next;
    });
    return res;
  }, []);

  const analyzeSymbol = useCallback(async (symbol: string) => {
    const res = await api.analyzeSymbol(symbol);
    if (res.analysis) {
      setSetups((prev) => {
        const existing = prev[symbol];
        if (!existing) return prev;
        return {
          ...prev,
          [symbol]: {
            ...existing,
            llm_analysis: res.analysis,
            _updatedAt: Date.now(),
          },
        };
      });
    }
    return res;
  }, []);

  const watchTrade = useCallback(async (symbol: string, immediate: boolean) => {
    const pos = await api.watchTrade(symbol, immediate);
    setActiveTrades((prev) => ({ ...prev, [pos.symbol]: pos }));
    return pos;
  }, []);

  const openTrade = useCallback(async (symbol: string, actual_entry: number) => {
    const pos = await api.openTrade(symbol, actual_entry);
    setActiveTrades((prev) => ({ ...prev, [pos.symbol]: pos }));
    return pos;
  }, []);

  const closeTrade = useCallback(async (symbol: string, exit_price: number) => {
    const pos = await api.closeTrade(symbol, exit_price);
    setActiveTrades((prev) => {
      const next = { ...prev };
      delete next[pos.symbol];
      return next;
    });
    setTradeHistory((prev) => [pos, ...prev].slice(0, 100));
    return pos;
  }, []);

  const cancelWatch = useCallback(async (symbol: string) => {
    await api.cancelWatch(symbol);
    setActiveTrades((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
  }, []);

  const dismissAlert = useCallback((tradeId: string) => {
    setTradeAlerts((prev) => prev.filter((a) => a.trade_id !== tradeId));
  }, []);

  return {
    setups,
    livePrices,
    health,
    wsStatus,
    activeTrades,
    tradeAlerts,
    tradeHistory,
    connect,
    disconnect,
    startEngine,
    stopEngine,
    addSymbols,
    removeSymbols,
    analyzeSymbol,
    watchTrade,
    openTrade,
    closeTrade,
    cancelWatch,
    dismissAlert,
  };
}
