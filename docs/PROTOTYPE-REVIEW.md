# HTML 交互原型确认记录（PROTOTYPE-REVIEW）· v0.2

状态：**G2 已签（2026-10-24）**。确认人 samqin123（用户，会话原话"G2确认ok"）；允许实施范围：全部 10 线 30 页签 + 设置 3 页签（含支持资源方案 B 落位）。签认前版本冻结保留于 git c4d1e3e；评审与修订链见 DESIGN-REVIEW.md。
独立评审：DESIGN-REVIEW.md（PASS 10 / WARN 3 / FAIL 0；对象 f458187；红线五条全过；引用抽查 2/2 实）。

- HTML 实际路径/版本/SHA-256：`prototypes/v0.2/`，git `f458187`（2026-10-24），app.js sha256 前缀 `8e56cf6b9098679e`（138,266 字节）
- 对应 SPEC/场景/数据模型版本：SPEC v0.1（G1 已签）+ SCENARIOS S01–S17 + INTERACTION-DESIGN v1 + schema/draft/0001
- 预览：`file:///Users/qinxiaoqiang/Downloads/mesothelioma-workbench/prototypes/v0.2/index.html`（零依赖直开）；无头走查 1440×900 + 窄宽 8 档
- 数据界限：demo-data.js 唯一源（build-demo-data.mjs 生成）；AI 面板静态候选演示未接宿主；MinerU 未接（M5）
- 视图：10 一级 / 30 二级（32 视图函数）× 2 档案（王建国·新诊断自记 / 李桂芳·双免照护者代记）+ 设置 3 页签

## 自验数字（构建方，2026-10-24）

截图 67 张；页签走查 **64/64**（aria-selected 失配 0 / 指纹重复 0 / 溢出 0 / error 0 / 网络失败 0）；AI 面板 35/45/25 钳制 + <760px 抽屉；一图秀数值线 2 + mMRC 节点 4（mmrcPath=0 不连线）+ 末点避让 + 归一化水印；3D 翻卡零位移。
**HVT X1–X4**：孤儿 0（31/31 被 13 场景覆盖）/ 路径 26/26 逐 key 走通 / 编辑入口 max=1（62 页）/ 候选闭环全通 + AI 示例按钮 10/10。
**窄宽**：80 组合（8 档×10 页）+ 40 组合（面板展开 4 窗宽）0 问题；页脚贴底 40/40。
**红线**：禁词 10 族 0 命中；"进展"仅 excerpt 原文引用 3 处；sharedOnly 单函数三出口；未检测虚线徽章；材料页"只整理材料不含法律建议"常驻。

## 独立视觉抽查（主线）

- `asbestos-checklist-demo1.png`：**通过**——"只整理材料"常驻句、品牌深海蓝、10 线导航齐全。
- `imaging-parallel-demo1.png`：**通过**——"三列并列，无判读"副标题在位（测量/原文/当时 mMRC）。

## 已知遗留

① demo-data.sqlite 待 G3 冻结后同源产出；② X3 口径=显式编辑入口（勾选/单选计快捷动作，明细在 check-hvt）；③ AI 上下文 private 过滤为原型演示（M5 接宿主）；④ file:// 剪贴板可能被拒（toast 回退）；⑤ 截图为视口截图。

## G2 状态

**未签认**。签认时记录确认人/范围/日期（22 号闸口）；签认后旧版冻结保留。独立评审结论见 DESIGN-REVIEW.md。
