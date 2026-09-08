"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/** One shared Socket.IO connection per browser tab, reused across components. */
export function getSocket() {
  if (!socket) {
    socket = io({ path: "/socket.io", autoConnect: true });
  }
  return socket;
}
