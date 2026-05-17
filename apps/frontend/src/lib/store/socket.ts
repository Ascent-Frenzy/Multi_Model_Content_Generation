import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  /** The token used to create the current socket connection */
  currentToken: string | null;
  connect: () => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>()((set, get) => ({
  socket: null,
  connected: false,
  currentToken: null,
  connect: () => {
    const existing = get().socket;
    const token = useAuthStore.getState().token;
    if (!token) return;

    // If socket exists, is connected, and was created with the same token, reuse it
    if (existing?.connected && get().currentToken === token) return;

    // Disconnect stale socket if one exists (e.g. token changed or disconnected)
    if (existing) {
      existing.disconnect();
    }

    const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      query: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));
    set({ socket, currentToken: token });
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false, currentToken: null });
    }
  },
}));
