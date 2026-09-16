import "server-only";
import { liveChannelName, type LiveBroadcastMap } from "@/lib/live-events";

// Fans a live-game state change out to every browser (host + students)
// subscribed to this homework's Realtime channel, via Supabase's broadcast
// REST endpoint - no persistent server-side connection needed, which is the
// whole point: this runs from a stateless Server Action on Vercel, not a
// long-lived process. See https://supabase.com/docs/guides/realtime/broadcast
export async function broadcast<E extends keyof LiveBroadcastMap>(
  homeworkId: string,
  event: E,
  payload: LiveBroadcastMap[E]
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error(`Realtime broadcast "${event}" skipped - Supabase env vars are not configured`);
    return;
  }

  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ topic: liveChannelName(homeworkId), event, payload }],
      }),
    });
    if (!res.ok) {
      console.error(`Realtime broadcast "${event}" failed (${res.status})`, await res.text());
    }
  } catch (err) {
    console.error(`Realtime broadcast "${event}" errored`, err);
  }
}
