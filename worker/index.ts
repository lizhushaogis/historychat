import { people } from "../src/data";
import { systemPrompt } from "../src/lib";
import type { ChatMode, Message } from "../src/types";

export interface Env {
  DEEPSEEK_API_KEY: string;
  MODEL: string;
  ALLOWED_ORIGIN: string;
  CHAT_RATE_LIMITER: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
}

// A fixed upstream and model prevent this endpoint from becoming an arbitrary API relay.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN)
      return new Response("Forbidden", { status: 403 });
    const headers = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    const error = (status: number, message: string) =>
      Response.json({ error: { message } }, { status, headers });
    if (new URL(request.url).pathname !== "/chat")
      return error(404, "Not found");
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return error(405, "Method not allowed");
    if (!env.DEEPSEEK_API_KEY || !env.MODEL)
      return error(503, "Chat service is not configured");
    if (!request.headers.get("Content-Type")?.includes("application/json"))
      return error(415, "JSON required");
    if (Number(request.headers.get("Content-Length") || 0) > 80000)
      return error(413, "Request too large");
    if (!request.body) return error(400, "Empty request");
    let bytes = 0;
    const bounded = request.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, ctl) {
          bytes += chunk.byteLength;
          if (bytes > 80000) throw new Error("Payload too large");
          ctl.enqueue(chunk);
        },
      }),
    );
    let payload: { personId?: string; mode?: ChatMode; messages?: Message[] };
    try {
      payload = JSON.parse(await new Response(bounded).text());
    } catch {
      return error(bytes > 80000 ? 413 : 400, "Invalid request");
    }
    if (!payload || typeof payload !== "object")
      return error(400, "Invalid request");
    const person = people.find((p) => p.id === payload.personId);
    if (!person || !["person", "historian"].includes(payload.mode || ""))
      return error(400, "Invalid person or mode");
    if (
      !Array.isArray(payload.messages) ||
      !payload.messages.length ||
      payload.messages.length > 20 ||
      !payload.messages.every(
        (m) =>
          m &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string" &&
          m.content.trim() &&
          m.content.length <= (m.role === "user" ? 2000 : 12000),
      ) ||
      payload.messages.at(-1)?.role !== "user"
    )
      return error(400, "Invalid conversation");
    // IP-based throttling is a best-effort abuse limit; shared networks share the allowance.
    if (!env.CHAT_RATE_LIMITER)
      return error(503, "Rate limiter is not configured");
    const { success } = await env.CHAT_RATE_LIMITER.limit({
      key: `historychat:${request.headers.get("CF-Connecting-IP") || "unknown"}`,
    });
    if (!success) return error(429, "Please try again later");
    try {
      const signal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(115000),
      ]);
      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: env.MODEL,
            stream: true,
            max_tokens: 1800,
            temperature: 0.8,
            messages: [
              { role: "system", content: systemPrompt(person, payload.mode!) },
              ...payload.messages.map(({ role, content }) => ({
                role,
                content,
              })),
            ],
          }),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        return error(
          [401, 402, 403, 404, 429].includes(response.status)
            ? response.status
            : 502,
          "Model service request failed",
        );
      }
      return new Response(response.body, {
        headers: {
          ...headers,
          "Content-Type":
            response.headers.get("Content-Type") ||
            "text/event-stream; charset=utf-8",
        },
      });
    } catch {
      return error(502, "Model service unavailable");
    }
  },
};
