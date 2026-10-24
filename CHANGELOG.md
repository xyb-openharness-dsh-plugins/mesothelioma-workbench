# 变更记录

只增不删；每条写清"改了什么 + 为什么 + 用户可见结果"。版本号与 VERSION、package.json 三处必须一致。

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
