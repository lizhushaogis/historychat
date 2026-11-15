import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  Feather,
  Github,
  MessageCircle,
  Search,
  Settings2,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";
import { people, dynasties, periods } from "./data";
import { Landscape, Motif } from "./Art";
import { filterPeople, readStored, writeStored, downloadText } from "./lib";
import type { ApiSettings, ChatMode, Message, Person } from "./types";
import PersonDetail from "./PersonDetail";
import ChatPanel from "./ChatPanel";
import Settings from "./Settings";

const initialSettings: ApiSettings = {
  baseUrl: "https://api.deepseek.com",
  model: "",
  apiKey: "",
  proxyUrl: "",
};
const parseFavorites = () => {
  const value = readStored<unknown>("shijian:favorites", []);
  return Array.isArray(value)
    ? value.filter(
        (id): id is string =>
          typeof id === "string" && people.some((p) => p.id === id),
      )
    : [];
};
const parseChats = (): Record<string, Message[]> => {
  const stored = readStored<unknown>("shijian:chats", {});
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
  return Object.fromEntries(
    Object.entries(stored)
      .filter(
        ([key, val]) =>
          people.some(
            (p) => key === `${p.id}:person` || key === `${p.id}:historian`,
          ) && Array.isArray(val),
      )
      .map(([k, v]) => [
        k,
        (v as Message[])
          .filter(
            (m) =>
              m &&
              ["user", "assistant"].includes(m.role) &&
              typeof m.content === "string",
          )
          .slice(-40),
      ]),
  );
};
export default function App() {
  const [query, setQuery] = useState(""),
    [dynasty, setDynasty] = useState("全部"),
    [favoritesOnly, setFavoritesOnly] = useState(false),
    [sort, setSort] = useState("curated");
  const [favorites, setFavorites] = useState<string[]>(parseFavorites),
    [chats, setChats] = useState<Record<string, Message[]>>(parseChats);
  const [selected, setSelected] = useState<Person | null>(null),
    [chatPerson, setChatPerson] = useState(people[0]),
    [chatMode, setChatMode] = useState<ChatMode>("person");
  const [chatOpen, setChatOpen] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(false),
    [notice, setNotice] = useState("");
  const [settings, setSettings] = useState<ApiSettings>(() => {
    const stored = readStored<Partial<ApiSettings>>("shijian:settings", {});
    return {
      ...initialSettings,
      ...Object.fromEntries(
        ["baseUrl", "model", "proxyUrl"]
          .filter((k) => typeof stored?.[k as keyof ApiSettings] === "string")
          .map((k) => [k, stored[k as keyof ApiSettings]]),
      ),
    };
  });
  useEffect(() => {
    if (!writeStored("shijian:favorites", favorites))
      setNotice("浏览器存储不可用，收藏暂仅保留于本次页面。");
  }, [favorites]);
  useEffect(() => {
    if (!writeStored("shijian:chats", chats))
      setNotice("浏览器存储空间不足，请导出重要对话。");
  }, [chats]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const run = () => {
      const id = new URLSearchParams(location.hash.slice(1)).get("person");
      const p = people.find((p) => p.id === id);
      setSelected(p || null);
    };
    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, []);
  useEffect(() => {
    const control = new AbortController();
    fetch(`${import.meta.env.BASE_URL}site-config.json`, {
      signal: control.signal,
    })
      .then((r) => r.json())
      .then((config) => {
        if (
          typeof config.proxyUrl === "string" &&
          config.proxyUrl.startsWith("https://")
        )
          setSettings((s) => ({
            ...s,
            proxyUrl: s.proxyUrl || config.proxyUrl,
            model:
              s.model || (typeof config.model === "string" ? config.model : ""),
          }));
      })
      .catch(() => {});
    return () => control.abort();
  }, []);
  const filtered = useMemo(() => {
    const result = filterPeople(
      people,
      query,
      dynasty,
      favoritesOnly ? favorites : undefined,
    );
    return sort === "dynasty"
      ? result.sort(
          (a, b) => dynasties.indexOf(a.dynasty) - dynasties.indexOf(b.dynasty),
        )
      : result;
  }, [query, dynasty, favoritesOnly, favorites, sort]);
  function toggleSave(p: Person) {
    setFavorites((f) =>
      f.includes(p.id) ? f.filter((id) => id !== p.id) : [...f, p.id],
    );
    setNotice(
      favorites.includes(p.id)
        ? `已将${p.name}移出书斋`
        : `${p.name}已收入书斋`,
    );
  }
  function viewPerson(p: Person) {
    setSelected(p);
    history.replaceState(null, "", `#person=${p.id}`);
  }
  function closePerson() {
    setSelected(null);
    history.replaceState(null, "", location.pathname + location.search);
  }
  function openChat(p = chatPerson, mode: ChatMode = "person") {
    setChatPerson(p);
    setChatMode(mode);
    closePerson();
    setChatOpen(true);
  }
  function goLibrary(saved = false) {
    setFavoritesOnly(saved);
    setDynasty("全部");
    setQuery("");
    document
      .getElementById("catalog")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <>
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label="史鉴人物志首页"
        >
          <span className="brand-seal">
            史<br />鉴
          </span>
          <span className="brand-type">
            史鉴<span>人物志</span>
            <small>SHIJIAN · A CHRONICLE OF LIVES</small>
          </span>
        </a>
        <nav aria-label="主导航">
          <button
            className={!favoritesOnly ? "active" : ""}
            onClick={() => goLibrary()}
          >
            人物志
          </button>
          <button onClick={() => openChat()}>
            文渊阁
            <span className="nav-dot" />
          </button>
          <button
            className={favoritesOnly ? "active" : ""}
            onClick={() => goLibrary(true)}
          >
            我的书斋{favorites.length > 0 && <sup>{favorites.length}</sup>}
          </button>
        </nav>
        <div className="header-actions">
          <a
            className="icon-button github-link"
            href="https://github.com/lizhushaogis/historychat"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub 项目"
          >
            <Github size={19} />
          </a>
          <button
            className="icon-button"
            aria-label="对话设置"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={19} />
          </button>
          <span className="header-divider" />
          <button
            className="header-random"
            aria-label="随缘一遇"
            onClick={() =>
              viewPerson(people[Math.floor(Math.random() * people.length)])
            }
          >
            <Shuffle size={15} />
            <span>随缘一遇</span>
          </button>
        </div>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-art">
            <Landscape />
            <span className="art-caption">山河犹在 · 故人可寻</span>
            <span className="art-seal">
              与古
              <br />
              为友
            </span>
          </div>
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="tiny-rule" /> 观 人 物 · 知 兴 替
            </span>
            <h1 id="hero-title">
              翻一页史书，
              <br />
              遇见<span>千古风流。</span>
            </h1>
            <p>
              从一段生平，走进一个时代。
              <br />
              循着诗文与史迹，与那些熟悉的名字重新相识。
            </p>
            <div className="hero-actions">
              <button className="primary" onClick={() => goLibrary()}>
                展开人物长卷
                <ArrowDown size={16} />
              </button>
              <button className="text-button" onClick={() => openChat()}>
                <Feather size={16} />
                与古人聊聊
                <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="hero-footnote">
              <span>以史为鉴</span>
              <i />
              <span>与古为友</span>
              <i />
              <span>让历史有温度</span>
            </div>
          </div>
        </section>
        <section className="featured" aria-label="卷首人物">
          <div className="featured-label">
            <Sparkles size={16} />
            <span>卷首人物</span>
            <small>本期相逢</small>
          </div>
          <div className="featured-person">
            <span className="featured-avatar">苏</span>
            <div>
              <h2>
                苏轼<span>北宋 · 东坡居士</span>
              </h2>
              <p>“人生如逆旅，我亦是行人。”</p>
            </div>
          </div>
          <p className="featured-caption">
            于一蓑烟雨间，
            <br />
            寻一份旷达人生。
          </p>
          <button onClick={() => viewPerson(people[0])}>
            翻开他的故事
            <ArrowRight size={17} />
          </button>
        </section>
        <section
          className="catalog section-wrap"
          id="catalog"
          aria-labelledby="catalog-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE PEOPLE, THE STORIES</span>
              <h2 id="catalog-title">
                {favoritesOnly ? "我的书斋" : "千载人物，一卷相逢"}
                <span className="small-seal">
                  {favoritesOnly ? "藏" : "览"}
                </span>
              </h2>
              <p>
                {favoritesOnly
                  ? "将心中所念，安放在这一方书斋。收藏与对话仅存于当前浏览器。"
                  : "越过朝代的山水，读懂名字背后的生命。"}
              </p>
            </div>
            <div className="catalog-count">
              <strong>{String(people.length).padStart(2, "0")}</strong>
              <span>
                位人物
                <br />
                待君细读
              </span>
            </div>
          </div>
          <div className="catalog-layout">
            <aside className="catalog-sidebar">
              <div className="sidebar-title">
                <BookOpen size={15} />
                <span>循朝代而行</span>
              </div>
              <div className="dynasty-list" aria-label="朝代筛选">
                <button
                  className={dynasty === "全部" ? "active" : ""}
                  onClick={() => setDynasty("全部")}
                  aria-pressed={dynasty === "全部"}
                >
                  <span>全部朝代</span>
                  <small>{people.length}</small>
                </button>
                {dynasties.map((d, i) => (
                  <button
                    key={d}
                    className={dynasty === d ? "active" : ""}
                    aria-pressed={dynasty === d}
                    onClick={() => setDynasty(d)}
                  >
                    <span>
                      {d}
                      <small>{periods[i]}</small>
                    </span>
                    <span className="dynasty-count">
                      {people.filter((p) => p.dynasty === d).length}
                    </span>
                  </button>
                ))}
              </div>
              <div className="sidebar-note">
                <span>读史有道</span>
                <p>
                  于史有据，于文有情。
                  <br />
                  每一段生平，皆可循迹。
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    viewPerson(people[0]);
                  }}
                >
                  从东坡开始
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </aside>
            <div className="catalog-main">
              <div className="search-row">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="搜索历史人物"
                    placeholder="寻一位故人，或一种志趣……"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query ? (
                    <button
                      className="icon-button"
                      aria-label="清除搜索"
                      onClick={() => setQuery("")}
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <span className="search-hint">姓名 / 字号 / 作品</span>
                  )}
                </div>
                <button
                  className={`filter-saved ${favoritesOnly ? "active" : ""}`}
                  aria-label="只看我的收藏"
                  aria-pressed={favoritesOnly}
                  onClick={() => setFavoritesOnly(!favoritesOnly)}
                >
                  <Bookmark size={15} />
                  <span>我的收藏</span>
                  {favorites.length > 0 && <small>{favorites.length}</small>}
                </button>
              </div>
              <div className="results-row">
                <span>
                  共寻得 <strong>{filtered.length}</strong> 位人物
                  {dynasty !== "全部" && (
                    <button
                      className="filter-chip"
                      onClick={() => setDynasty("全部")}
                    >
                      {dynasty}
                      <X size={11} />
                    </button>
                  )}
                </span>
                <label className="sort-control">
                  <span className="sr-only">排列方式</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="curated">编者选序</option>
                    <option value="dynasty">朝代顺序</option>
                  </select>
                  <ChevronDown size={12} />
                </label>
              </div>
              {filtered.length ? (
                <div className="people-grid">
                  {filtered.map((p, i) => (
                    <article
                      className={`person-card color-${p.color}`}
                      key={p.id}
                      style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                    >
                      <div className="card-art">
                        <Motif type={p.motif} />
                      </div>
                      <button
                        className={`card-save icon-button ${favorites.includes(p.id) ? "saved" : ""}`}
                        aria-label={`${favorites.includes(p.id) ? "取消收藏" : "收藏"}${p.name}`}
                        aria-pressed={favorites.includes(p.id)}
                        onClick={() => toggleSave(p)}
                      >
                        <Bookmark
                          size={17}
                          fill={
                            favorites.includes(p.id) ? "currentColor" : "none"
                          }
                        />
                      </button>
                      <button
                        className="card-main"
                        onClick={() => viewPerson(p)}
                        aria-label={`查看${p.name}卷宗`}
                      >
                        <span className="card-era">
                          {p.era}
                          <span> / </span>
                          {p.years}
                        </span>
                        <div className="card-identity">
                          <span className="person-monogram">
                            {p.name.slice(-1)}
                          </span>
                          <div>
                            <h3>{p.name}</h3>
                            <p>{p.alias.split(" · ")[0]}</p>
                          </div>
                        </div>
                        <p className="card-role">{p.role}</p>
                        <p className="card-quote">
                          {p.quoteSource.includes("本站题语") && (
                            <span className="editorial">题语</span>
                          )}
                          {p.quote}
                        </p>
                        <span className="card-bottom">
                          <span>
                            {p.tags.slice(0, 2).map((t) => (
                              <span className="card-tag" key={t}>
                                {t}
                              </span>
                            ))}
                          </span>
                          <span className="card-read">
                            阅其生平
                            <ArrowUpRight size={13} />
                          </span>
                        </span>
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <BookOpen size={40} strokeWidth={1} />
                  <h3>
                    {favoritesOnly && !favorites.length
                      ? "书斋尚待一位故人"
                      : "此卷尚未寻得故人"}
                  </h3>
                  <p>
                    {favoritesOnly && !favorites.length
                      ? "点击人物卡片上的书签，将喜欢的人物收入书斋。"
                      : "试试姓名、字号或作品名称，亦可放宽朝代筛选。"}
                  </p>
                  <button className="secondary" onClick={() => goLibrary()}>
                    重览人物长卷
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
              {favoritesOnly && favorites.length > 0 && (
                <button
                  className="export-favorites text-button"
                  onClick={() =>
                    downloadText(
                      "史鉴-我的书斋.md",
                      `# 我的书斋\n\n${people
                        .filter((p) => favorites.includes(p.id))
                        .map(
                          (p) =>
                            `## ${p.name} · ${p.era}\n\n${p.bio}\n\n史料：${p.sources.map((s) => `[${s.title}](${s.url})`).join("、")}`,
                        )
                        .join("\n\n")}`,
                    )
                  }
                >
                  导出收藏书单
                  <ArrowUpRight size={14} />
                </button>
              )}
              <div className="catalog-end">
                <span />
                <Feather size={15} />
                <p>纸上千秋事，心中万里山。</p>
                <span />
              </div>
            </div>
          </div>
        </section>
        <section className="conversation-banner section-wrap">
          <span className="banner-seal">
            文<br />渊<br />阁
          </span>
          <div>
            <span className="eyebrow">LET THE PAST SPEAK</span>
            <h2>史书之外，且听故人言。</h2>
            <p>
              问东坡如何安放心事，问太白何处可寄豪情。
              <br className="mobile-break" />
              以古人口吻，叙今人心事。
            </p>
          </div>
          <button className="primary" onClick={() => openChat()}>
            <MessageCircle size={16} />
            入阁一叙
            <ArrowUpRight size={16} />
          </button>
          <span className="banner-decoration">叙</span>
        </section>
      </main>
      <footer className="site-footer section-wrap">
        <div>
          <span className="footer-brand">史鉴人物志</span>
          <span>以史为鉴，与古为友。</span>
        </div>
        <p>资料据古籍整理 · 对话为 AI 角色演绎</p>
        <a
          href="https://github.com/lizhushaogis/historychat"
          target="_blank"
          rel="noreferrer"
        >
          开卷亦开源
          <ArrowUpRight size={13} />
        </a>
      </footer>
      <button
        className="chat-fab"
        onClick={() => openChat()}
        aria-label="进入文渊阁对话"
      >
        <Feather size={19} />
        <span>文渊阁</span>
        <span className="fab-dot" />
      </button>
      <PersonDetail
        key={selected?.id || "none"}
        person={selected}
        close={closePerson}
        saved={!!selected && favorites.includes(selected.id)}
        toggleSave={() => selected && toggleSave(selected)}
        openChat={openChat}
        navigate={(name) => {
          const p = people.find((p) => p.name === name);
          if (p) viewPerson(p);
          else setNotice(`尚未收录${name}的独立卷宗，可请史官进一步解读`);
        }}
        toast={setNotice}
      />
      <ChatPanel
        open={chatOpen}
        close={() => setChatOpen(false)}
        person={chatPerson}
        setPerson={setChatPerson}
        mode={chatMode}
        setMode={setChatMode}
        settings={settings}
        openSettings={() => setSettingsOpen(true)}
        chats={chats}
        setChats={setChats}
      />
      <Settings
        open={settingsOpen}
        close={() => setSettingsOpen(false)}
        settings={settings}
        save={(value) => {
          setSettings(value);
          const { apiKey: _key, ...safe } = value;
          writeStored("shijian:settings", safe);
          setNotice("对话设置已保存");
        }}
      />
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </>
  );
}
