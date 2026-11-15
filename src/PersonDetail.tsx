import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  MessageCircle,
  ScrollText,
  Link as LinkIcon,
  BookOpen,
} from "lucide-react";
import type { Person, ChatMode } from "./types";
import { Motif } from "./Art";
import Modal from "./Modal";

export default function PersonDetail({
  person,
  close,
  saved,
  toggleSave,
  openChat,
  navigate,
  toast,
}: {
  person: Person | null;
  close: () => void;
  saved: boolean;
  toggleSave: () => void;
  openChat: (p: Person, mode?: ChatMode) => void;
  navigate: (name: string) => void;
  toast: (s: string) => void;
}) {
  const [tab, setTab] = useState("生平年表");
  const tabs = ["生平年表", "诗文作品", "人物关系", "史料出处"];
  return (
    <Modal
      open={!!person}
      close={close}
      title="人物卷宗"
      className="detail-modal"
    >
      {person && (
        <>
          <div className={`detail-top color-${person.color}`}>
            <Motif type={person.motif} />
            <span className="eyebrow">史鉴人物志 / 人物卷宗</span>
            <div className="detail-name">
              <span className="name-seal">{person.name.slice(-1)}</span>
              <div>
                <span className="mini-label">
                  {person.era} · {person.years}
                </span>
                <h2>{person.name}</h2>
                <p>{person.alias}</p>
              </div>
            </div>
            <div className="detail-tags">
              {person.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
          <div className="detail-content">
            <div className="detail-facts">
              <span>{person.role}</span>
              <span>{person.hometown}</span>
            </div>
            <p className="detail-bio">{person.bio}</p>
            <blockquote>
              {person.quote}
              <cite>——{person.quoteSource}</cite>
            </blockquote>
            <div className="detail-actions">
              <button className="primary" onClick={() => openChat(person)}>
                <MessageCircle size={16} />与{person.name}对谈
                <ArrowUpRight size={16} />
              </button>
              <button
                className={`secondary ${saved ? "saved" : ""}`}
                onClick={toggleSave}
              >
                {saved ? <Check size={16} /> : <Bookmark size={16} />}{" "}
                {saved ? "已入书斋" : "收入书斋"}
              </button>
              <button
                className="icon-button"
                aria-label="复制人物链接"
                onClick={async () => {
                  const url = new URL(location.href);
                  url.hash = `person=${person.id}`;
                  try {
                    await navigator.clipboard.writeText(url.href);
                    toast("人物链接已复制");
                  } catch {
                    toast("暂时无法复制，请从地址栏复制人物链接");
                  }
                }}
              >
                <LinkIcon size={17} />
              </button>
            </div>
            <div className="detail-tabs" role="tablist" aria-label="人物资料">
              {tabs.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  aria-controls="detail-tab-panel"
                  id={`tab-${t}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div
              className="tab-panel"
              id="detail-tab-panel"
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
            >
              {tab === "生平年表" && (
                <div className="timeline">
                  {person.timeline.map((item) => (
                    <div className="timeline-item" key={item.year}>
                      <span className="timeline-year">{item.year}</span>
                      <div>
                        <h4>{item.title}</h4>
                        <p>{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {tab === "诗文作品" && (
                <div className="works">
                  {person.works.map((w) => (
                    <article key={w.title}>
                      <BookOpen size={18} />
                      <div>
                        <h4>{w.title}</h4>
                        <p>{w.text}</p>
                      </div>
                    </article>
                  ))}
                  <p className="fine-print">
                    选文用于认识人物；署名与流传问题，请结合原典阅读。
                  </p>
                </div>
              )}
              {tab === "人物关系" && (
                <div className="relations">
                  <p className="fine-print">
                    循有记载的交往，认识人物所处的时代。
                  </p>
                  <svg
                    className="relation-graph"
                    viewBox="0 0 600 245"
                    role="img"
                    aria-label={`${person.name}的人物关系图`}
                  >
                    <circle
                      cx="300"
                      cy="118"
                      r="34"
                      fill="#e5ebdc"
                      stroke="#acbc96"
                    />
                    <text
                      x="300"
                      y="123"
                      textAnchor="middle"
                      fill="#4e6b40"
                      fontSize="15"
                    >
                      {person.name}
                    </text>
                    {person.relations.map((r, i) => {
                      const angle =
                        (i * Math.PI * 2) / person.relations.length -
                        Math.PI / 2;
                      const x = 300 + Math.cos(angle) * 205,
                        y = 118 + Math.sin(angle) * 78;
                      return (
                        <g key={r.name}>
                          <line
                            x1={300 + Math.cos(angle) * 36}
                            y1={118 + Math.sin(angle) * 36}
                            x2={x}
                            y2={y}
                            stroke="#bcc9aa"
                            strokeDasharray="3 4"
                          />
                          <rect
                            x={(300 + x) / 2 - 22 + (Math.abs(Math.cos(angle)) < 0.1 ? 33 : 0)}
                            y={(118 + y) / 2 - 9}
                            width="44"
                            height="18"
                            fill="#fbfaf4"
                          />
                          <text
                            x={(300 + x) / 2 + (Math.abs(Math.cos(angle)) < 0.1 ? 33 : 0)}
                            y={(118 + y) / 2 + 3}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#96a283"
                          >
                            {r.type}
                          </text>
                          <circle
                            cx={x}
                            cy={y}
                            r="22"
                            fill="#f2f3e9"
                            stroke="#cbd5bc"
                          />
                          <text
                            x={x}
                            y={y + 5}
                            textAnchor="middle"
                            fontSize="15"
                            fill="#83996d"
                          >
                            {r.name.slice(-1)}
                          </text>
                          <text
                            x={x}
                            y={y + 39}
                            textAnchor="middle"
                            fill="#778d62"
                            fontSize="11"
                          >
                            {r.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  {person.relations.map((r) => (
                    <article key={r.name}>
                      <span className="relation-seal">{r.name.slice(-1)}</span>
                      <div>
                        <button
                          className="text-button"
                          onClick={() => navigate(r.name)}
                        >
                          {r.name}
                          <ArrowUpRight size={13} />
                        </button>
                        <p>{r.detail}</p>
                      </div>
                      <span className="relation-type">{r.type}</span>
                    </article>
                  ))}
                </div>
              )}
              {tab === "史料出处" && (
                <div className="sources">
                  <p>
                    以下链接通往古籍整理本，生平提要据相关记载编写。有争议的年代已标注，本站题语不作人物原话。
                  </p>
                  {person.sources.map((s) => (
                    <a
                      href={s.url}
                      key={s.title}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ScrollText size={20} />
                      <span>
                        <strong>{s.title}</strong>
                        <small>{s.note}</small>
                      </span>
                      <ArrowUpRight size={18} />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <button
              className="historian-link text-button"
              onClick={() => openChat(person, "historian")}
            >
              <ScrollText size={15} /> 对此人此事有疑问？请文渊史官解读{" "}
              <ArrowUpRight size={14} />
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
