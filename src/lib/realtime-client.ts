"use client";

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { liveChannelName, type LiveBroadcastMap } from "@/lib/live-events";

let client: SupabaseClient | null = null;

function getSupabaseClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

type Handlers = Partial<{
  [E in keyof LiveBroadcastMap]: (payload: LiveBroadcastMap[E]) => void;
}>;

/**
 * Subscribes to a homework's live-game broadcast channel. `onResync` fires
 * every time the socket (re)connects - including the very first time - so
 * the caller can re-fetch authoritative state (getLiveState) and cover
 * anything broadcast while disconnected: Realtime broadcast messages don't
 * replay, and there's no server-side instance affinity to rely on across a
 * reconnect on Vercel. Returns an unsubscribe function.
 */
export function subscribeToHomework(
  homeworkId: string,
  handlers: Handlers,
  onResync?: () => void
): () => void {
  const supabase = getSupabaseClient();
  const channel: RealtimeChannel = supabase.channel(liveChannelName(homeworkId));

  for (const [event, handler] of Object.entries(handlers)) {
    channel.on("broadcast", { event }, ({ payload }) => handler?.(payload as never));
  }

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") onResync?.();
  });

  return () => {
    supabase.removeChannel(channel);
  };
}
