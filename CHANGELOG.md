# 变更记录

只增不删；每条写清"改了什么 + 为什么 + 用户可见结果"。版本号与 VERSION、package.json 三处必须一致。

## 0.1.5 — 2026-10-27

**36 号 v2 补齐（指南可点 + 状态卡）**。按 `docs/36-DISEASE-PRIMER.md` §2.1/§2.5/§2.6 补齐，全部实测。

- **模式层同步**：`prototypes/v0.2/primer.js`、`primer.css` 覆盖为 starter
  `assets/patterns/disease-primer.js/.css` 最新版（含 `sourceLine` 链接渲染与 `{text,url}` 表格单元格）；
  §2.5 缺链接行现在渲染红色「缺链接，违反 36 号 §2.5」标记。
- **指南原件可点**：`primer-data.js` 共 21 个链接位点（4 段 sources 16 处 + evidence 表「原件」列 5 行，
  其中 nolink 1 处），全部 `https://` 且逐条用 `verify-links.mjs` 真浏览器验活 OK：
  卫健委 2025（壹生转载页）、中华医学会 2021（中华肿瘤杂志全文 43(04):383-394）、
  NCCN 患者版 Pleural Mesothelioma 2026、NCCN 临床版详情页、SEER/AJCC 分期教学页、
  BMS 中国双免疫获批新闻稿、FDA 2024-09-17 帕博利珠单抗批准公告。
- **未取得原件的如实标注**：NCCN 临床版 V2.2025 仍需注册登录（挂官方详情页）；
  AJCC 第 8 版手册全文未取得（挂 SEER 二次来源）；本项目登记快照是本机
  `research/mesothelioma-cancer/manifest.json`，无公网 URL → `nolink:true` + note，**未编造链接**。
- **看板状态卡（§2.6 四件）**：看板首卡由 `.stage-strip` 改为 `病程状态卡`——
  卡头 `D+N 状态卡 · 距第 4 周期 D1 2 天`／大字 `第 180 天`（锚点＝确诊日 `2026-04-28` 为 Day 0，
  自动派生，不手填）／现状行（阶段原文 + 状态 + `下次：2026.10.26（第 4 周期 D1）`）／出口按钮排
  （主：看治疗日历（按天）；副：疾病概要：恶性胸膜间皮瘤是什么？→ 打开浮窗）。
  无锚点日时整卡显示「待初始化」并指向三步（登记确诊日 → 核对病理原文 → 回看板生成天数）。
- **入口落到开发版**：`public/` 同步 primer 三件套（`primer.js/.css/primer-data.js`）与顶栏「?」，
  `public/app.js`、`public/style.css`、`public/index.html` 与原型保持 parity（ui-parity 8/8 PASS）。
- **闸门**：新增 `scripts/check-primer-links.mjs` 并接进 `npm run check` 末尾。
  实测：链接断言 21/21、探针 9/9 PASS（端口 8127）、`npm run check` 退出码 0（单测 44/44）。
- 未完成：装机副本刷新与真机抽查（需宿主）。

## 0.1.4 — 2026-10-24

- **修复：开库失败后不再锁死到进程生命周期**。0.1.2 加了 `mkdirSync`，但 `apply()` 仍只在
  插件加载那一刻试一次开库，失败就把原因写死；而宿主进程往往是**装包之前**启动的，于是用户
  装好新版本、只重开工作台，界面永远报同一句「打不开数据库」，只能靠完全退出重开。
  → `dsh/index.js` 改成懒重试（`ensureSource()`，1s 防抖），路由层拿到的是每次都去要数据源的
  代理对象；`dsh/routes.js` 的 `failure` 支持传函数，`/health` 与 503 分支按请求重新取值。
  以后同类故障（目录被清、外置盘掉线）刷新页面即可恢复。
- 与 ATTR 0.3.1 同一改法（那边抽成了 `dsh/lazy-source.js` + 用例；这边内联，代码量小）。

## 0.1.3 — 2026-10-24

- 版本字面量补齐（VERSION / package.json / 页面 / lib/version.js 同步），无功能改动。

## 0.1.2 — 2026-10-24

- **修复：装机首次打开报 `打不开数据库`**。宿主的 `dshHomePath` 只拼路径、不建目录，全新机器上
  `harness/mesothelioma-workbench/` 那一层不存在，SQLite 在不存在的目录里建不了文件。
  → `dsh/index.js` 开库前 `mkdirSync(dir, { recursive: true })`，失败时报清路径与 `error.code`。
  与小甲宝 ATTR 0.3.0 同一缺陷（那台是真机踩到的，见 attr-workbench CHANGELOG）。
- 验证：`npm run check` 全绿（单测 43 全过），audit 37/37。真机装机待确认。

## 0.1.1 — 2026-10-24

开发版本（beta · 数据仅在本机）。**尚未装机实测**，Desktop 侧 V2/V3 待用户真机确认。

- **闸口**：G1 流程 / G2 原型 / G3 数据模型三项签认（签认人 samqin123，2026-10-24；原话与依据见 `docs/DEV-PLAN.md §闸口签认留痕`）。
- **数据层**：`schema/0001_initial.sql` 冻结（27 表，sha256 `eec1589a…`，内存库实测 + 判读列断言 PASS）；
  `schema/0002_mpm_dev_columns.sql` 增量（新表 7 + ALTER 补列 29）。两份哈希都记在 `schema/freeze-contract.md`。
- **服务端**：`dsh/` 补齐入口 → 路由 → 读模型 → 存储分层；接口前缀 `/api/mesothelioma`，库文件 `xyb-mesothelioma.sqlite`；
  鉴权只走宿主 `connection.requestRejection`，不自建登录；未配置资料目录时退到内存演示库。
- **宿主接线**：`cordis.patch.yml` 注入 `config.root: !!js dshHomePath(...)`；客户端改为 `customFrame=true`
  （业务区左 0.65，AI 会话 25%–45% 可拖），按家族基线自绘 header 与会话分栏。
- **业务界面**：`public/` 开发页与原型同源渲染代码，数据优先向 `/bootstrap` 取真数据、取不到回退 `demo-data.js`；
  页面树 10 一级 / 30 二级，私密记录不出 看板 / 导出 / AI 上下文 三个出口。
- **版本同源修复（本轮主要改动）**：`VERSION` 升到 0.1.1，`package.json` 同步（原 0.1.1 / 0.1.0 两处不一致）；
  补 `build:version` / `check:version` / `build:client` 三个脚本并接进 `npm run check`，`lib/version.js` 由 `VERSION` 生成
  （`dsh/index.js` 直接 import 它，缺文件包根本起不来）。
- **检查链补全**：`npm run check` 原来只做语法 + 包结构，现在串起 版本生成 → 演示数据同源产出（demo-data.js×2 + demo/demo-data.sqlite）→
  **build:client --check**（客户端生成物与来源同步）→ 版本一致（10 处同源）→ 语法 → schema 冻结（sha256 复算）→ 文案红线（含 M3 零法律建议词族）→
  **列一致性**（schema 00*.sql 全执行 vs demo-data.sqlite 逐列比对）→ 单测 43 项 → 包结构；`check-schema.mjs` 修掉「哈希两侧带反引号就读不出冻结记录」的误报。
  `check-pack.mjs` 从 tgz 内容验证宿主接线四要素（H3 占位标记=0 / H1 dsh 块 / H2 patch config.root / 版本同源）。
- **MinerU 六部件（18 号 v2）**：`dsh/mineru.js`（v4 四步协议 + 错误分类）、`dsh/settings.js`（Token 文件优先/env 兜底，原子写 600）、
  `dsh/mesoparse.js`（HTML 表先转竖线表再按位置对齐、单位先剥 LaTeX、不等式保留原文）、`dsh/parse.js`（事务原子、失败不产候选、重试留痕、.html 拒收）、
  设置接口 `GET/POST /api/mesothelioma/settings/mineru` 三态、`parse_job` 任务表。
- **实测数字（M5 验收）**：开发版无头 64 页签 × 2 档案（溢出 0 / error 0 / 4xx 0 / aria 不匹配 0，面板 35→45→25→收起→重开 25，
  一图秀 2 条数值线 + 4 个 mMRC 节点、mMRC 连线 0）；HVT X1–X4：X1 孤儿 0（31/31）、X2 walk 26 fail 0、X3 max=1/62 页、
  X4 候选闭环 3 键 + AI 按钮 10/10 线、jsError 0；probe:resp 8 档宽 × 10 页 80 组合 0 问题；家族一致性 audit 37/37。
- **N/A**：本次不做发布、不推进 M8（用户 2026-10-24 决定「先不发布」）。

## 0.1.0 — 2026-10-24

- 由社区脚手架 dsh-wb-cli@1.5.0 (792399a+dirty) 初始化，仅有注册骨架与健康接口，无业务功能。

## 0.1.3（2026-10-24）· M6/M7：装机与首用引导

- 真机走查核心通过（用户实机）：打开/渲染/新建会话后连接+对话出现/按钮正常。
- 真机发现（非缺陷，首用流程）：新装工作台未建会话时宿主鉴权闸拒 bootstrap（离线演示兜底）+ 会话区空白。
- 0.1.2/0.1.3 增量：离线兜底文案补"新装请先新建会话"引导；会话区垫底引导层（首用不空白）。
- 诊断资产：scripts/probe-install.mjs（attr fork 换 MPM 前缀，npm run probe:install）——装机副本 + 假宿主 + 真 Chrome 全链验证。
- 装机四要素+占位=0 五要素全过；0.1.1→0.1.2→0.1.3 改包必升版规则全程执行。
