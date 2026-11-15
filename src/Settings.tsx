import { useEffect, useState } from "react";
import { Settings2, ShieldCheck, Eye, EyeOff, Check } from "lucide-react";
import type { ApiSettings } from "./types";
import { endpoint } from "./lib";
import Modal from "./Modal";

export default function Settings({
  open,
  close,
  settings,
  save,
}: {
  open: boolean;
  close: () => void;
  settings: ApiSettings;
  save: (s: ApiSettings) => void;
}) {
  const [draft, setDraft] = useState(settings),
    [showKey, setShowKey] = useState(false),
    [error, setError] = useState("");
  const [mode, setMode] = useState(settings.proxyUrl ? "proxy" : "direct");
  useEffect(() => {
    if (open) {
      setDraft(settings);
      setError("");
      setShowKey(false);
      setMode(settings.proxyUrl ? "proxy" : "direct");
    }
  }, [open, settings]);
  return (
    <Modal
      open={open}
      close={close}
      title="对话设置"
      className="settings-modal"
    >
      <div className="settings-content">
        <span className="modal-symbol">
          <Settings2 size={23} />
        </span>
        <span className="eyebrow">文渊阁 / 对话设置</span>
        <h2>备好笔墨，再叙古今。</h2>
        <p className="muted">接入你的模型，让纸上的名字开口说话。</p>
        <div className="segmented">
          <button
            className={mode === "direct" ? "active" : ""}
            onClick={() => setMode("direct")}
          >
            个人接口
          </button>
          <button
            className={mode === "proxy" ? "active" : ""}
            onClick={() => setMode("proxy")}
          >
            站点服务
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              if (mode === "direct") {
                endpoint(draft.baseUrl);
                if (!draft.model.trim()) throw new Error("请填写模型名。");
              } else {
                const url = new URL(draft.proxyUrl);
                if (
                  url.protocol !== "https:" &&
                  !["localhost", "127.0.0.1"].includes(url.hostname)
                )
                  throw new Error("服务地址请使用 HTTPS。");
              }
              save({
                ...draft,
                proxyUrl: mode === "proxy" ? draft.proxyUrl.trim() : "",
                model: draft.model.trim(),
              });
              close();
            } catch (err) {
              setError(err instanceof Error ? err.message : "请检查接口地址。");
            }
          }}
        >
          {mode === "direct" ? (
            <>
              <label>
                接口地址 <span>Base URL</span>
                <input
                  type="url"
                  required
                  value={draft.baseUrl}
                  onChange={(e) =>
                    setDraft({ ...draft, baseUrl: e.target.value })
                  }
                  placeholder="https://api.deepseek.com"
                  autoComplete="off"
                />
              </label>
              <label>
                模型名称 <span>Model</span>
                <input
                  required
                  value={draft.model}
                  onChange={(e) =>
                    setDraft({ ...draft, model: e.target.value })
                  }
                  placeholder="填写你的模型名称"
                  autoComplete="off"
                />
              </label>
              <label>
                API Key <span>仅在当前页面内存中使用</span>
                <div className="key-field">
                  <input
                    type={showKey ? "text" : "password"}
                    value={draft.apiKey}
                    onChange={(e) =>
                      setDraft({ ...draft, apiKey: e.target.value })
                    }
                    placeholder="sk-…"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={showKey ? "隐藏密钥" : "显示密钥"}
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <p className="settings-note">
                <ShieldCheck size={17} />
                <span>
                  密钥仅发送至你填写的接口，刷新页面后清除。地址和模型名会保存在本机。
                </span>
              </p>
            </>
          ) : (
            <>
              <label>
                站点对话服务地址
                <input
                  required
                  type="url"
                  value={draft.proxyUrl}
                  onChange={(e) =>
                    setDraft({ ...draft, proxyUrl: e.target.value })
                  }
                  placeholder="https://你的服务.workers.dev/chat"
                />
              </label>
              <p className="settings-note">
                <ShieldCheck size={17} />
                <span>
                  由站点服务统一连接模型，访客无需填写密钥。管理员需先完成服务部署。
                </span>
              </p>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="settings-footer">
            <button
              type="button"
              className="text-button"
              onClick={() => setDraft({ ...draft, apiKey: "" })}
            >
              清除密钥
            </button>
            <button className="primary" type="submit">
              <Check size={16} />
              保存设置
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
