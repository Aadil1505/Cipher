"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SetupData, HealthData, WsStatus } from "@/app/lib/types";
import { api } from "@/app/lib/api";

const WS_URL = "ws://localhost:8000/ws";
const HEALTH_POLL_MS = 5000;
const RECONNECT_MS = 3000;

export function useCipher() {
  const [setups, setSetups] = useState<Record<string, SetupData>>({});
  const [health, setHealth] = useState<HealthData | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
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

  return {
    setups,
    health,
    wsStatus,
    connect,
    disconnect,
    startEngine,
    stopEngine,
    addSymbols,
    removeSymbols,
    analyzeSymbol,
  };
}
