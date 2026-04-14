import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

let sharedSocket = null;

/**
 * Returns a shared socket.io connection authenticated with the stored JWT.
 * The socket is created once and reused across components.
 * Call connect() explicitly after auth, or it auto-connects on first use.
 */
export function useSocket() {
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef([]);

  // Connect (or reuse existing)
  const connect = useCallback(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // Reuse if already connected with same token
    if (sharedSocket?.connected) {
      setConnected(true);
      return;
    }

    // Disconnect stale socket
    if (sharedSocket) {
      sharedSocket.disconnect();
      sharedSocket = null;
    }

    sharedSocket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    sharedSocket.on("connect", () => setConnected(true));
    sharedSocket.on("disconnect", () => setConnected(false));
    sharedSocket.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
      setConnected(false);
    });
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (sharedSocket) {
      sharedSocket.disconnect();
      sharedSocket = null;
    }
    setConnected(false);
  }, []);

  // Emit wrapper
  const emit = useCallback((event, data) => {
    if (!sharedSocket?.connected) {
      console.warn(`Socket not connected, cannot emit "${event}"`);
      return;
    }
    sharedSocket.emit(event, data);
  }, []);

  // Listen wrapper — auto-cleans up on unmount
  const on = useCallback((event, handler) => {
    if (!sharedSocket) return;
    sharedSocket.on(event, handler);
    listenersRef.current.push({ event, handler });
  }, []);

  // Remove a specific listener
  const off = useCallback((event, handler) => {
    if (!sharedSocket) return;
    sharedSocket.off(event, handler);
    listenersRef.current = listenersRef.current.filter(
      (l) => !(l.event === event && l.handler === handler)
    );
  }, []);

  // Cleanup all listeners registered through this hook instance on unmount
  useEffect(() => {
    return () => {
      const listeners = listenersRef.current;
      if (sharedSocket) {
        listeners.forEach(({ event, handler }) => sharedSocket.off(event, handler));
      }
      listenersRef.current = [];
    };
  }, []);

  // Sync connected state if socket already exists
  useEffect(() => {
    if (sharedSocket?.connected) setConnected(true);
  }, []);

  return {
    socket: sharedSocket,
    connected,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}
