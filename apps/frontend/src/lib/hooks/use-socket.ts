'use client';
import { useEffect } from 'react';
import { useSocketStore } from '@/lib/store/socket';
import { useAuthStore } from '@/lib/store/auth';

/** Call once in dashboard layout to initialize the WebSocket connection.
 *  Returns the socket instance reactively via Zustand. */
export function useSocket() {
  const socket = useSocketStore((s) => s.socket);
  const connect = useSocketStore((s) => s.connect);
  const disconnect = useSocketStore((s) => s.disconnect);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) { connect(); }
    return () => {}; // don't disconnect on unmount — singleton persists across dashboard pages
  }, [token, connect]);

  // Disconnect on logout
  useEffect(() => {
    if (!token) { disconnect(); }
  }, [token, disconnect]);

  return socket;
}
