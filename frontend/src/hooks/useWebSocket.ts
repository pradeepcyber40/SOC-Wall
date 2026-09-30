import { useState, useEffect, useRef, useCallback } from 'react';
import { SOCLiveEvent, KPISummary } from '../types';

interface UseWebSocketOptions {
  onEvent?: (event: SOCLiveEvent) => void;
  onKpiUpdate?: (kpis: KPISummary) => void;
  soundEnabled?: boolean;
}

export function useWebSocket({ onEvent, onKpiUpdate, soundEnabled = true }: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<SOCLiveEvent[]>([]);
  const [latestKpi, setLatestKpi] = useState<KPISummary | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Play subtle tactical audio ping for alerts using Web Audio API
  const playTacticalSound = useCallback((severity: string) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (severity === 'critical') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (severity === 'high') {
        osc.frequency.setValueAtTime(659, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(523, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) {
      // Audio autoplay policy catch
    }
  }, [soundEnabled]);

  useEffect(() => {
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      const getWsUrl = () => {
        const envWs = (import.meta as any).env?.VITE_WS_URL;
        if (envWs) return envWs;
        const envApi = (import.meta as any).env?.VITE_API_URL;
        if (envApi) {
          const u = new URL(envApi);
          const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
          return `${proto}//${u.host}/ws/soc-feed`;
        }
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          return `${proto}//${window.location.host}/ws/soc-feed`;
        }
        return 'ws://127.0.0.1:8000/ws/soc-feed';
      };

      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!unmounted) {
          setIsConnected(true);
          console.log('[SOC WS] Connected to live telemetry stream');
        }
      };

      ws.onmessage = (messageEvent) => {
        try {
          const payload = JSON.parse(messageEvent.data);
          if (payload.type === 'SOC_EVENT' && payload.data) {
            const newEvt: SOCLiveEvent = payload.data;
            setEvents((prev) => [newEvt, ...prev].slice(0, 100));
            if (onEvent) onEvent(newEvt);
            playTacticalSound(newEvt.severity);
          } else if (payload.type === 'KPI_UPDATE' && payload.data) {
            setLatestKpi(payload.data);
            if (onKpiUpdate) onKpiUpdate(payload.data);
          }
        } catch (err) {
          console.error('[SOC WS] Error parsing message:', err);
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          setIsConnected(false);
          console.warn('[SOC WS] Connection closed. Reconnecting in 3s...');
          reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error('[SOC WS] Socket error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [playTacticalSound]);

  const clearEvents = () => setEvents([]);

  return { isConnected, events, latestKpi, clearEvents };
}
