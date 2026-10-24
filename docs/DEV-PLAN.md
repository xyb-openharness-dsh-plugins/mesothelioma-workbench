# 开发计划（DEV-PLAN）· 唯一里程碑来源

> 认领 issue：xyb-openharness-dsh-plugins/.github#13（2026-10-24 /claim）。
> 闸口标准见 `22-PHASES-AND-GATES.md`。阶段产物比 GBM 轮新增：交互路径文档（28 号 IP1，HTML 前必备）+ HVT X 层一致性验证 + 宿主接线四要素前置。

| 里程碑 | 内容 | 状态 | 闸口 |
| --- | --- | --- | --- |
| M0 骨架 | 认领 #13、建仓、init（146 文件）、接线修复（config.root）、文档体系 8 件、RESPONSIVE 继承 | ✅ 2026-10-24 | — |
| M1 调研SPEC | 三路调研（医学/用户/家族结构 vs cervical+breast）→ USER-RESEARCH/SCENARIOS/PATIENT-FLOW/DIFF-MATRIX 全量/SPEC + **INTERACTION-DESIGN 全量** | ⏳ | **G1** |
| M2 原型 | demo 构建器（双主体两档案）+ schema 草案 + prototypes/v0.2（含窄宽规则）+ 无头走查 + **HVT X1–X4** | ⏳ | **G2** |
| M3 数据模型 | schema/0001 冻结（sha256 + 判读列断言） | ⏳ | **G3** |
| M4 临床库 | 在线通道采集 2026 MPM 试验 → research/mesothelioma-cancer/ | ⏳（采集可与 M1 并行） | — |
| M5 开发版 | dsh 七步（含真客户端链路 src→build→lib）+ MinerU 六部件 + apiBase 定稿契约 + check 全绿 + HVT 一致性 | ⏳ | V1 |
| M6 装机 | pack（**改包必升版**）→ tgz 四要素对照 → pnpm 装 → 宿主信号 + 真机走查 | ⏳ | V2/V3 |
| M7 发布 | tag/release + 经验回流 starter | ⏳ | — |

## 2026-10-24 进展

- issue #13 认领 /claim 已触发；私有仓建立；starter init（146 文件，最新版含 28 号交互路径与 HVT X 层）。
- **接线前置修复**：新版 init 已自带 dsh 块与 repository（踩 1 一半已由模板修复）；config.root 已补（踩 1 另一半）；真客户端链路（踩 3）与版本簿记（踩 2）在 M5 交付清单中强制——init 的 lib/client.js 仍是占位骨架，`grep -c "接入骨架"` = 1 是已知状态，不是缺陷遗漏。
- apiBase 定稿契约（踩 4）已写进 DEV-REQUIREMENTS，M5 按 v0.1.3 语义实现。
- RESPONSIVE-RULES.md 自 GBM 继承；其通用化进 starter（30 号）另列。
