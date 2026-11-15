# 史鉴人物志

以史为鉴，与古为友。一个以历史人物阅览和古风 AI 对谈为核心的响应式网站。

页面重新设计，采用宣纸底色、墨绿、朱砂印章与原创 SVG 山水。参考项目为 [史鉴人物志](https://qiqigis.github.io/history-characters/)，本项目独立实现，不包含 CP 排名、热度数据和走势。

## 已实现

- 16 位人物，覆盖先秦、秦汉、三国、魏晋南北朝、隋唐、宋元、明清七组目录。
- 姓名、字号、身份、志趣、代表作品的即时检索，朝代筛选与排序。
- 人物生平、关键年表、作品选读、关系图及关系说明、古籍出处链接。
- 收藏、收藏书单导出、人物直达链接和随机探索。
- 与人物第一人称对谈、请文渊史官解读，两种模式分别保存会话。
- 流式回答、停止生成、失败重试、对话导出、清空确认、中文输入法兼容。
- 访客自行配置兼容 Chat Completions 的接口、模型和 API Key。
- Key 只在当前页面内存中保留，刷新即清除，不存入浏览器存储、不随源码发布。
- 收藏和最近 40 条/段对话保存在本机浏览器，未上传站点服务器。

## 本地开发

使用 Node.js 24 与 pnpm 11.25.0：

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install
pnpm dev
```

打开 `http://127.0.0.1:4180`。

```sh
pnpm test
pnpm build
pnpm preview
```

8 项自动化检查覆盖资料结构、检索组合、接口地址、中文 UTF-8 流分片、异常处理、代理校验和模型请求构建。真实模型效果需填写有效 Key 与模型名后验证。

## GitHub Pages

仓库：<https://github.com/lizhushaogis/historychat>

站点地址：<https://lizhushaogis.github.io/historychat/>

在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。推送至 `main` 后，工作流会安装依赖、运行检查、构建并发布；也可在 Actions 中手动执行。构建使用相对资源路径，适用于仓库子路径部署，人物链接使用 hash，直接刷新无需服务器重写。

## 对话配置

打开页面右上角设置或文渊阁中的设置：

1. 接口地址默认 `https://api.deepseek.com`，也接受兼容服务的 `/v1` 或完整 `/chat/completions` 地址。
2. 模型名称填写你的服务实际支持的模型 ID；页面不替访客选择付费模型。
3. 输入自己的 API Key，保存后进入文渊阁问询。

浏览器直接向访客配置的接口发起请求。接口需允许浏览器跨域请求。请求只发送最近 20 条消息及当前人物背景；推理模型的内部 reasoning 字段不会显示为回答。刷新页面后需要重新输入 Key。源码与 `site-config.json` 中不要写入真实密钥。

## 可选：共享服务端代理

默认部署使用访客自行填 Key 的方式。若以后需要访客免填 Key，可启用仓库内的 Cloudflare Worker：

1. 在 `wrangler.toml` 填写 `MODEL`，确认 `ALLOWED_ORIGIN` 是前端域名（不包含路径）。
2. 使用 Cloudflare Wrangler 配置 secret `DEEPSEEK_API_KEY`，并部署 Worker。不要把 Key 放进 `vars`。
3. 将 `public/site-config.json` 的 `proxyUrl` 设为 `https://你的域名/chat`，再发布前端。也可在对话设置中切换“站点服务”。

示例命令（需自行登录对应 Cloudflare 账户）：

```sh
pnpm dlx wrangler secret put DEEPSEEK_API_KEY
pnpm dlx wrangler deploy
```

Worker 固定 DeepSeek 上游，在服务端重建人物设定与模型参数，限制来源、请求体大小、消息角色和长度，并使用每 IP 每分钟 12 次的近似限流。共享网络会共享额度；CORS 与限流不能替代身份认证或严格预算控制。此可选服务未随 GitHub Pages 自动部署。

## 内容说明

人物简介为本站编写；古籍链接主要指向维基文库的公版原典整理本。生卒年代有分歧时已注明；“本站题语”不作为人物原话。曹操按“三国人物”通行分类编入目录，其实际时代仍标注为东汉末。朝代分组为浏览目录，不代表每段年限无重叠。

对话是 AI 历史角色演绎。提示词要求以古人口吻作答、引用注明出处、区分传说与史实、不得声称亲历身后之事，但模型仍可能出错，应结合原典核对。

中文字体采用 Noto Serif SC 的在线字体，网络不可用时回退到设备上的宋体。其余主视觉由代码绘制，无需远程图片资源。

## 主要文件

- `src/data.ts`：人物资料、作品、关系及史料。
- `src/App.tsx`：主页、筛选与收藏。
- `src/PersonDetail.tsx`：人物卷宗。
- `src/ChatPanel.tsx`：对话界面与记录。
- `src/lib.ts`：角色提示词、接口调用与流解析。
- `src/Art.tsx`、`src/styles.css`：视觉与响应式布局。
- `.github/workflows/pages.yml`：持续部署。
- `worker/index.ts`：可选的共享对话后端。
