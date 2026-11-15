import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Download,
  Feather,
  MessageCircle,
  Settings2,
  Square,
  Trash2,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import type { ApiSettings, ChatMode, Message, Person } from "./types";
import { people } from "./data";
import { downloadText, requestChat } from "./lib";
import Modal from "./Modal";

export default function ChatPanel({
  open,
  close,
  person,
  setPerson,
  mode,
  setMode,
  settings,
  openSettings,
  chats,
  setChats,
}: {
  open: boolean;
  close: () => void;
  person: Person;
  setPerson: (p: Person) => void;
  mode: ChatMode;
  setMode: (m: ChatMode) => void;
  settings: ApiSettings;
  openSettings: () => void;
  chats: Record<string, Message[]>;
  setChats: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
}) {
  const [draft, setDraft] = useState(""),
    [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmClear, setConfirmClear] = useState(false);
  const controller = useRef<AbortController | null>(null),
    scrollRef = useRef<HTMLDivElement>(null);
  const thread = `${person.id}:${mode}`;
  const history = chats[thread] || [];
  const historyRef = useRef(history);
  historyRef.current = history;
  const configured =
    !!settings.proxyUrl || (!!settings.apiKey && !!settings.model);
  const speaker = mode === "person" ? person.name : "文渊史官";
  useEffect(() => {
    controller.current?.abort();
    setDraft("");
    setError("");
    setConfirmClear(false);
  }, [thread]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 260)
      el.scrollTop = el.scrollHeight;
  }, [answer, history.length, busy, open]);

  async function send(retry = false, quick?: string) {
    const text = (quick ?? draft).trim();
    if (busy || (!retry && !text)) return;
    if (!configured) {
      setError("尚未连接模型，请先备好对话设置。");
      return;
    }
    const current = historyRef.current;
    const messages: Message[] = retry
      ? current
      : [...current, { role: "user", content: text }];
    if (!messages.length || messages.at(-1)?.role !== "user") return;
    const key = thread,
      control = new AbortController();
    controller.current = control;
    setChats((old) => ({ ...old, [key]: messages.slice(-40) }));
    setDraft("");
    setAnswer("");
    setError("");
    setBusy(true);
    let partial = "",
      timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      control.abort();
    }, 120000);
    try {
      await requestChat(
        settings,
        person,
        mode,
        messages,
        control.signal,
        (value) => {
          partial = value;
          setAnswer(value);
        },
      );
      setChats((old) => ({
        ...old,
        [key]: [
          ...(old[key] || messages),
          { role: "assistant", content: partial },
        ].slice(-40) as Message[],
      }));
    } catch (err) {
      if (control.signal.aborted && partial)
        setChats((old) => ({
          ...old,
          [key]: [
            ...(old[key] || messages),
            { role: "assistant", content: `${partial}\n\n〔已停止生成〕` },
          ].slice(-40) as Message[],
        }));
      if (timedOut) setError("等候较久，已暂停此次请求。请稍后重试。");
      else if (!control.signal.aborted)
        setError(
          err instanceof TypeError
            ? "未能连接接口。请检查网络、地址，或接口是否允许浏览器访问。"
            : err instanceof Error
              ? err.message
              : "请求未完成，请重试。",
        );
    } finally {
      clearTimeout(timer);
      setBusy(false);
      setAnswer("");
      if (controller.current === control) controller.current = null;
    }
  }
  const questions =
    mode === "person"
      ? [
          "先生如何看待人生得失？",
          "愿闻先生平生最难忘之事。",
          "请与我谈谈你的代表作品。",
        ]
      : [
          `${person.name}的生平，有哪些关键转折？`,
          "哪些流传故事并非信史？",
          "请赏析此人的代表作品。",
        ];
  return (
    <Modal open={open} close={close} title="文渊阁" className="chat-modal">
      <div className="chat-shell">
        <header className="chat-header">
          <span className="eyebrow">
            <Feather size={14} /> 文 渊 阁
          </span>
          <h2>隔千年，话平生。</h2>
          <p>一盏清茶，与古人相对而坐。</p>
        </header>
        <div className="chat-tools">
          <label className="sr-only" htmlFor="chat-person">
            对话人物
          </label>
          <select
            id="chat-person"
            value={person.id}
            disabled={busy}
            onChange={(e) =>
              setPerson(people.find((p) => p.id === e.target.value)!)
            }
          >
            {people.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} · {p.era}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="对话设置"
            onClick={openSettings}
          >
            <Settings2 size={17} />
          </button>
          <button
            className="icon-button"
            disabled={!history.length || busy}
            aria-label="导出对话"
            onClick={() =>
              downloadText(
                `史鉴-${speaker}-对话.md`,
                `# 与${speaker}对谈\n\n${history.map((m) => `**${m.role === "user" ? "来客" : speaker}**\n\n${m.content}`).join("\n\n---\n\n")}\n\n> 历史文化角色演绎，模型回答需结合史料核对。`,
              )
            }
          >
            <Download size={17} />
          </button>
          <button
            className="icon-button"
            disabled={!history.length || busy}
            aria-label="清空当前对话"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="chat-mode segmented" role="group" aria-label="对话方式">
          <button
            className={mode === "person" ? "active" : ""}
            disabled={busy}
            onClick={() => setMode("person")}
          >
            <MessageCircle size={14} />
            与人物对谈
          </button>
          <button
            className={mode === "historian" ? "active" : ""}
            disabled={busy}
            onClick={() => setMode("historian")}
          >
            <BookOpen size={14} />
            请史官解读
          </button>
        </div>
        <div
          className="chat-messages"
          ref={scrollRef}
          aria-live="polite"
          aria-relevant="additions text"
        >
          <div className="chat-date">
            {mode === "person"
              ? `${person.era} · ${person.alias}`
              : `文渊阁史官 · 正在阅览${person.name}卷宗`}
          </div>
          <div className="message assistant">
            <span className="speaker-seal">
              {mode === "person" ? person.name.slice(-1) : "史"}
            </span>
            <div>
              <small>
                {speaker}
                <span>开卷问候</span>
              </small>
              <p>
                {mode === "person"
                  ? person.greeting
                  : `足下安好，吾乃文渊，忝为此间史官。今案头所展，乃${person.name}之卷宗。生平得失、诗文旨趣、史事真伪，皆可共论。`}
              </p>
            </div>
          </div>
          {!history.length && (
            <div className="chat-invitation">
              <span className="tiny-rule" />
              <p>旧时书页，今朝回响。</p>
              <span className="tiny-rule" />
            </div>
          )}
          {history.map((message, index) => (
            <div
              className={`message ${message.role}`}
              key={`${thread}-${index}`}
            >
              <span className="speaker-seal">
                {message.role === "user"
                  ? "客"
                  : mode === "person"
                    ? person.name.slice(-1)
                    : "史"}
              </span>
              <div>
                <small>{message.role === "user" ? "来客" : speaker}</small>
                <p>{message.content}</p>
              </div>
            </div>
          ))}
          {busy && (
            <div className="message assistant generating">
              <span className="speaker-seal">
                {mode === "person" ? person.name.slice(-1) : "史"}
              </span>
              <div>
                <small>{speaker}</small>
                <p>
                  {answer || (
                    <span className="thinking">
                      研墨沉吟中<span>···</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="chat-error" role="alert">
              <p>{error}</p>
              <div>
                {!configured ? (
                  <button className="text-button" onClick={openSettings}>
                    打开对话设置 →
                  </button>
                ) : (
                  <>
                    <button
                      className="text-button"
                      onClick={() => send(true)}
                      disabled={busy}
                    >
                      <RotateCcw size={13} />
                      重试
                    </button>
                    <button className="text-button" onClick={openSettings}>
                      检查设置
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {!busy && !error && history.at(-1)?.role === "user" && (
            <button
              className="retry-button secondary"
              onClick={() => send(true)}
            >
              <RotateCcw size={14} />
              继续此问
            </button>
          )}
          {confirmClear && (
            <div className="clear-confirm" role="alert">
              <p>清空与{speaker}的这段对话？</p>
              <button
                className="secondary"
                onClick={() => setConfirmClear(false)}
              >
                保留
              </button>
              <button
                className="primary"
                onClick={() => {
                  setChats((old) => ({ ...old, [thread]: [] }));
                  setConfirmClear(false);
                  setError("");
                }}
              >
                清空本段
              </button>
            </div>
          )}
        </div>
        <footer className="chat-compose">
          {!history.length && (
            <div className="suggestions">
              {questions.map((q) => (
                <button
                  key={q}
                  disabled={busy}
                  onClick={() => {
                    if (configured) void send(false, q);
                    else {
                      setDraft(q);
                      openSettings();
                    }
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label className="sr-only" htmlFor="chat-input">
              写下想问的话
            </label>
            <textarea
              id="chat-input"
              placeholder={`写一封短笺，问问${speaker}……`}
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            {busy ? (
              <button
                type="button"
                className="send-button"
                aria-label="停止生成"
                onClick={() => controller.current?.abort()}
              >
                <Square size={17} />
              </button>
            ) : (
              <button
                className="send-button"
                aria-label="发送"
                disabled={!draft.trim()}
              >
                <ArrowUp size={20} />
              </button>
            )}
          </form>
          <div className="compose-note">
            <span
              className={`connection-dot ${configured ? "connected" : ""}`}
            />
            <span>{configured ? "笔墨已备" : "待配置对话接口"}</span>
            <span>角色演绎 · 回答请以史料核对</span>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
