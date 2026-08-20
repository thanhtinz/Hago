import { io, Socket } from 'socket.io-client';
import { API_URL, getToken } from './api';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  const token = await getToken();
  if (socket?.connected && socket.auth && (socket.auth as any).token === token) return socket;
  socket?.close();
  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function closeSocket(): void {
  socket?.close();
  socket = null;
}

/** emit kèm ack, có timeout để UI không treo khi mạng chập chờn. */
export function emitAck<T = any>(event: string, payload: unknown, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('NO_SOCKET'));
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    socket.emit(event, payload, (res: T) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

let counter = 0;
export function newActionId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
}
