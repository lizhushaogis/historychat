import type { ApiSettings, ChatMode, Message, Person } from "./types";
import { systemPrompt } from "./prompts";
export { systemPrompt } from "./prompts";

export function filterPeople(
  people: Person[],
  query: string,
  dynasty: string,
  favorites?: string[],
) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return people.filter(
    (p) =>
      (dynasty === "全部" || p.dynasty === dynasty) &&
      (!favorites || favorites.includes(p.id)) &&
      words.every((w) =>
        [
          p.name,
          p.alias,
          p.dynasty,
          p.era,
          p.role,
          ...p.tags,
          ...p.works.map((w) => w.title),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(w),
      ),
  );
}
export function endpoint(base: string) {
  const url = new URL(base.trim());
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("接口地址请使用 HTTPS。");
  if (url.username || url.password || url.search || url.hash)
    throw new Error("接口地址不能包含密码、查询参数或片段。");
  const normalized = url.href.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}
export async function consumeSSE(
  body: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "",
    answer = "",
    doneEvent = false;
  const parseLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") {
      if (data === "[DONE]") doneEvent = true;
      return;
    }
    const packet = JSON.parse(data);
    if (packet.error)
      throw new Error(packet.error.message || "上游接口返回错误。");
    const content = packet.choices?.[0]?.delta?.content;
    if (typeof content === "string") {
      answer += content;
      onText(answer);
    }
    if (packet.choices?.[0]?.finish_reason === "length") {
      answer += "\n\n〔本次回答已达长度上限，可请先生接着讲。〕";
      onText(answer);
    }
  };
  try {
    while (!doneEvent) {
      const result = await reader.read();
      buffer += decoder.decode(result.value, { stream: !result.done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) parseLine(line.replace(/\r$/, ""));
      if (result.done) {
        if (buffer.trim()) parseLine(buffer.trim());
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (!answer.trim()) throw new Error("先生暂未落笔，请重试。");
  return answer;
}
export async function requestChat(
  settings: ApiSettings,
  person: Person,
  mode: ChatMode,
  messages: Message[],
  signal: AbortSignal,
  onText: (value: string) => void,
) {
  const proxy = settings.proxyUrl.trim();
  if (!proxy && (!settings.apiKey.trim() || !settings.model.trim()))
    throw new Error("请先在「对话设置」中填写模型名与 API Key。");
  const target = proxy ? new URL(proxy) : new URL(endpoint(settings.baseUrl));
  if (
    target.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(target.hostname)
  )
    throw new Error("对话接口请使用 HTTPS。");
  const response = await fetch(target, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(!proxy ? { Authorization: `Bearer ${settings.apiKey.trim()}` } : {}),
    },
    body: JSON.stringify(
      proxy
        ? { personId: person.id, mode, messages: messages.slice(-20) }
        : {
            model: settings.model.trim(),
            messages: [
              { role: "system", content: systemPrompt(person, mode) },
              ...messages.slice(-20),
            ],
            stream: true,
            max_tokens: 1800,
            temperature: 0.8,
          },
    ),
  });
  if (!response.ok) {
    const hints: Record<number, string> = {
      401: "密钥验证未通过，请检查 API Key。",
      402: "接口账户余额不足，请检查账户。",
      403: "接口拒绝访问，请检查权限或站点来源。",
      404: "接口或模型不存在，请检查地址和模型名。",
      429: "问询太急，稍候片刻再试。",
      500: "对话服务暂时异常，请稍后再试。",
      502: "模型服务暂时不可用，请稍后再试。",
      503: "模型服务繁忙，请稍后再试。",
    };
    throw new Error(
      hints[response.status] ||
        `请求失败（${response.status}），请检查接口配置。`,
    );
  }
  if (
    response.headers.get("content-type")?.includes("text/event-stream") &&
    response.body
  )
    return consumeSSE(response.body, onText);
  const json = await response.json();
  const answer = json.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim())
    throw new Error("接口未返回可读的回答，请检查模型配置。");
  onText(answer);
  return answer;
}
export function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
export function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function downloadText(
  filename: string,
  text: string,
  type = "text/markdown;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
