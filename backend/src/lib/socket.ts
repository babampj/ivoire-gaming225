import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
      credentials: true,
    },
    maxHttpBufferSize: 1e6,
  });
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO pas initialisé');
  return io;
}

export function socketRoom(room: string): string {
  return room;
}