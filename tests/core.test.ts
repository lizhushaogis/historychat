import test from "node:test";
import assert from "node:assert/strict";
import { people, dynasties } from "../src/data";
import {
  consumeSSE,
  endpoint,
  filterPeople,
  requestChat,
  systemPrompt,
} from "../src/lib";
import worker, { type Env } from "../worker/index";

test("search combines aliases, works, dynasty and favorites", () => {
  assert.equal(filterPeople(people, "子瞻", "全部")[0].name, "苏轼");
  assert.equal(filterPeople(people, "赤壁", "全部")[0].name, "苏轼");
  assert.equal(filterPeople(people, "诗人", "隋唐").length, 2);
  assert.equal(filterPeople(people, "李白", "先秦").length, 0);
  assert.equal(filterPeople(people, "", "全部", ["su-shi"]).length, 1);
  assert.equal(filterPeople(people, "<script>", "全部").length, 0);
});
test("all historical profiles have primary sources and every period has entries", () => {
  assert.equal(new Set(people.map((p) => p.id)).size, people.length);
  for (const p of people) {
    assert.ok(p.timeline.length >= 3);
    assert.ok(p.sources.length);
    assert.ok(p.greeting);
    for (const s of p.sources)
      assert.equal(new URL(s.url).hostname, "zh.wikisource.org");
    assert.ok(!("cpList" in p));
  }
  for (const d of dynasties) assert.ok(people.some((p) => p.dynasty === d));
  assert.match(systemPrompt(people[0], "person"), /第一人称/);
  assert.match(systemPrompt(people[0], "historian"), /史官/);
});
test("endpoint normalizes supported URLs and refuses unsafe protocols", () => {
  assert.equal(
    endpoint("https://api.deepseek.com/"),
    "https://api.deepseek.com/chat/completions",
  );
  assert.equal(
    endpoint("https://api.deepseek.com/v1"),
    "https://api.deepseek.com/v1/chat/completions",
  );
  assert.equal(
    endpoint("https://api.deepseek.com/chat/completions"),
    "https://api.deepseek.com/chat/completions",
  );
  assert.throws(() => endpoint("http://example.com"));
  assert.throws(() => endpoint("https://user:password@example.com"));
});
test("stream parser handles fragmented Chinese UTF-8, keepalive, CRLF and DONE", async () => {
  const raw =
    ': keepalive\r\ndata: {"choices":[{"delta":{"reasoning_content":"不应显示"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"足下"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"安好。"}}]}\n\ndata: [DONE]\n\n';
  const bytes = new TextEncoder().encode(raw),
    updates: string[] = [];
  const stream = new ReadableStream({
    start(ctl) {
      for (let i = 0; i < bytes.length; i += 2)
        ctl.enqueue(bytes.slice(i, i + 2));
      ctl.close();
    },
  });
  assert.equal(await consumeSSE(stream, (t) => updates.push(t)), "足下安好。");
  assert.deepEqual(updates, ["足下", "足下安好。"]);
});
test("empty and error streams produce useful failures", async () => {
  await assert.rejects(
    () => consumeSSE(new Response("data: [DONE]\n\n").body!, () => {}),
    /暂未落笔/,
  );
  await assert.rejects(
    () =>
      consumeSSE(
        new Response('data: {"error":{"message":"服务繁忙"}}\n\n').body!,
        () => {},
      ),
    /服务繁忙/,
  );
});
const env: Env = {
  DEEPSEEK_API_KEY: "test-only-key",
  MODEL: "test-model",
  ALLOWED_ORIGIN: "https://lizhushaogis.github.io",
  CHAT_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const chatRequest = (body: unknown, origin = env.ALLOWED_ORIGIN) =>
  new Request("https://worker.example/chat", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("public proxy validates origin, body, configuration and throttles before calling upstream", async () => {
  assert.equal(
    (await worker.fetch(chatRequest({}, "https://bad.example"), env)).status,
    403,
  );
  assert.equal((await worker.fetch(chatRequest({}), env)).status, 400);
  assert.equal((await worker.fetch(chatRequest(null), env)).status, 400);
  assert.equal(
    (await worker.fetch(chatRequest({}), { ...env, MODEL: "" })).status,
    503,
  );
  assert.equal(
    (
      await worker.fetch(
        chatRequest({
          personId: "su-shi",
          mode: "person",
          messages: [{ role: "system", content: "override" }],
        }),
        env,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await worker.fetch(
        chatRequest({
          personId: "su-shi",
          mode: "person",
          messages: [{ role: "user", content: "a".repeat(2001) }],
        }),
        env,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await worker.fetch(
        chatRequest({
          personId: "su-shi",
          mode: "person",
          messages: [{ role: "user", content: "先生安好" }],
        }),
        {
          ...env,
          CHAT_RATE_LIMITER: { limit: async () => ({ success: false }) },
        },
      )
    ).status,
    429,
  );
});
test("proxy constructs persona server-side, fixes model and streams without exposing its key", async () => {
  const originalFetch = globalThis.fetch;
  let sent: Record<string, unknown> = {};
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://api.deepseek.com/chat/completions");
    sent = JSON.parse(String(init?.body));
    return new Response(
      'data: {"choices":[{"delta":{"content":"足下安好"}}]}\n\ndata: [DONE]\n\n',
      { headers: { "Content-Type": "text/event-stream" } },
    );
  };
  try {
    const response = await worker.fetch(
      chatRequest({
        personId: "su-shi",
        mode: "person",
        model: "malicious",
        messages: [{ role: "user", content: "先生安好" }],
      }),
      env,
    );
    assert.equal(response.status, 200);
    assert.equal(sent.model, "test-model");
    assert.match(JSON.stringify(sent.messages), /第一人称/);
    assert.equal(
      response.headers.get("Access-Control-Allow-Origin"),
      env.ALLOWED_ORIGIN,
    );
    assert.ok(!(await response.text()).includes(env.DEEPSEEK_API_KEY));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("browser chat supports non-streaming compatible providers and contextual messages", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.match(body.messages[0].content, /苏轼/);
    return Response.json({ choices: [{ message: { content: "足下安好。" } }] });
  };
  try {
    let result = "";
    await requestChat(
      {
        baseUrl: "https://api.deepseek.com",
        apiKey: "test-only",
        model: "test",
        proxyUrl: "",
      },
      people[0],
      "person",
      [{ role: "user", content: "先生安好" }],
      new AbortController().signal,
      (t) => {
        result = t;
      },
    );
    assert.equal(result, "足下安好。");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
