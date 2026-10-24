# 家族结构素材（family-landscape）· MPM DIFF-MATRIX 全量化与 M2 原型准备

日期：2026-10-24。状态：调研笔记，供 DIFF-MATRIX §二全量行与 M2 原型 PAGES/SUBPAGES 设计引用；不是签认产物。
素材边界（重要）：

- **移植样板 = `/Users/qinxiaoqiang/Downloads/cervical-workbench`**（VERSION 0.1.1，用户指定；原型停在 `prototypes/v0.2/`，client 链路 488 行为家族最成熟的 customFrame 底本）。
- **成熟基准 = `/Users/qinxiaoqiang/Downloads/breast-cancer-workbench`**（VERSION 0.12.0，8 一级 / 27 二级）。breast 仓**没有 DIFF-MATRIX 文档**（全目录核对无命中），其 L1–L10 落点取自 SPEC §2/§3 + 家族契约 26 号（26 号原文在 `xyb-workbench-starter/docs/`，MPM 仓已有拷贝 `docs/26-CANCER-FEATURE-LINES.md`）。
- cervical 仓也**没有 DIFF-MATRIX**，其"刻意不同"自查写在 `docs/SPEC.md` §3/§4（两个专属一级页、筛查与预防降子页、首个默认私密模块）。
- MPM 侧已读：`docs/DIFF-MATRIX.md`（六种子已签）、`docs/SCENARIOS.md`（S01–S13）、`docs/PATIENT-FLOW.md`（三流）、`docs/RESPONSIVE-RULES.md`（v0.1.5，对应 starter 30 号）。
- 格式参照 GBM 仓 `research-notes/family-landscape.md`（七部分结构），内容全部按 cervical+breast 重做。

---

## 一、cervical 一级/二级导航全集 + L1–L10 映射

实测口径（`prototypes/v0.2/app.js` L54–86 常量）：**12 个一级 / 38 个二级**。app.js 注释明写"12 个一级页：SPEC §4 的 11 个 + 「资料库」（家族脚手架要求）"——资料库后来长成「病情整理」整线（5 子页），是 cervical 对家族 L9 的做法：**资料线独立成一级**。设置不占一级（弹窗）。SPEC §4 草案本身是 11 一级（差异自查：两个专属一级页、筛查与预防刻意降为子页）。

| 一级 | 二级页签全集（SUBPAGES） | 职责一句 | 关键组件/口径 |
| --- | --- | --- | --- |
| 看板 dashboard | —（0） | 分期、路径、长期影响与随访放在一起 | 定调条→「现在可以做」→**放疗长期影响状态卡**→随访卡→接下来/最近变化；任务卡跳转 go-* 动作 |
| 病情整理 records | 资料库 / 整理草稿·核对 / 病情档案 / 指标检测 / 病情汇总（5） | 上传→解析→确认指标→入库；接受之前都只是候选 | DOCS/CANDS 双轨；候选 accept 前不进正式数据；family L9 落点 |
| 我的分期 stage | 分期档案 / 病理与分子 / 会诊与二次意见（3） | FIGO 2018 只记录不自算（IIIC1/IIIC2、r/p） | stage_rows 版本链留旧分期；molecular 四态 ok/na/warn/pending |
| 治疗历程 treatment | 治疗路径 / 手术记录 / 放疗疗程 / 系统治疗（4） | 路径三选一（手术/根治性放化疗/系统治疗） | pathway_rows 改过留旧不覆盖；rt_rows EBRT 与后装分列、禁"总剂量"合成列 |
| 性与生育 fertility | 生育档案 / 生育保留记录 / 卵巢与月经 / 性健康（私密）（4） | 生育是记录不是承诺 | cervical 独有线；sexual_rows/vagina_rows `is_private` 默认 1（家族首个默认私密模块） |
| 放疗与长期影响 late | 放疗后事件 / 淋巴水肿 / 阴道与扩张 / 绝经与骨健康（4） | 放疗结束后的问题按时间记 | cervical 独有线；不给分级建议不推产品 |
| 检查与指标 labs | 肿瘤标志物 / 细胞学与 HPV / 影像随访（3） | SCC-Ag 只对鳞癌有意义 | 口径 E：SCC-Ag 显示由 histology 决定（check 脚本比对）；细胞学只存原文无重判读 |
| 病情一图秀 timeline | 数值曲线 / 分类与事件 / 数据口径（3） | SCC-Ag、体重与阴道狭窄放回同一时间轴 | 数值线 + 分类节点不连线；state.sel 默认 2 数值 + 1 分类 |
| 营养支持 nutrition | 进食量记录 / 补充剂与医嘱（2） | 记"吃了多少"，不给食谱不给剂量 | 家族骨架 |
| 心理支持 mind | 当下感受 / 身体形象与亲密关系 / 母亲身份与家庭沟通（3） | 默认只属于你 | viewpoints 私密；私密展开跨页自动收回（state.privateOpen） |
| 复诊准备 review | 复诊节奏 / 三类随访节点 / 筛查与预防 / 就诊准备（4） | 该带什么该问什么提前写下 | 筛查与预防刻意降为子页防变科普页；导出 Markdown |
| 临床研究 trials | 2026 线索 / 已收藏 / 入组问题（3） | 线索不是推荐 | TRIALS 卡 + topic 筛选 |

**与 26 号 L1–L10 的映射（cervical 实排）**：

| 26 号线 | cervical 落点 | 备注 |
| --- | --- | --- |
| L1 看板 | 看板（0 二级） | 四点位；长期影响状态卡为特色位 |
| L2 疾病本体 | 我的分期（3 二级） | FIGO 分期是宫颈癌的"起点" |
| L3 治疗与决策 | 治疗历程（4 二级） | 路径三选一 + 后装是独有字段 |
| L4 指标分析 | 检查与指标（3 二级）+ 病情整理·指标检测 | SCC-Ag 组织学条件显示 |
| L5 安全与症状 | 放疗与长期影响（4 二级） | 独立整线（专属） |
| L6 营养与体重 | 营养支持（2 二级） | 骨架 |
| L7 心理与家庭 | 心理支持（3 二级）+ 性与生育·性健康（私密） | 母亲身份为专属子页 |
| L8 复诊与随访 | 复诊准备（4 二级） | 三类随访节点（细胞学+SCC-Ag+影像） |
| L9 资料与导出 | **病情整理（5 二级，独立一级）**+ 就诊准备子页 | 家族脚手架要求 + cervical 特色 |
| L10 试验与线索 | 临床研究（3 二级） | 骨架 |
| 横切层 | 病情一图秀（3 二级）+ 私密默认过滤 + 指南出处 | 一图秀带二级是 cervical 与 lymphoma 的差别 |

---

## 二、cervical schema 表分组与专属表清单

共 **35 张表**：`0001_initial.sql` 34 张 + `0002_profile_meta.sql` 1 张；`schema/freeze-contract.md` sha256 冻结，加结构只能新增迁移（`scripts/check-schema.mjs` 拦截改 0001）。

| 组 | 表 | 职责一句话 |
| --- | --- | --- |
| 档案级（2） | `subjects` | 患者档案：headline/stage/mindset 三个"一眼看到"标量 + histology（决定 SCC-Ag 显示）+ hpv_status + dash_keys/path（JSON 数组） |
| | `section_titles` | 分节标题表化（key/ord）——食管癌那轮 `*_title` 列返工的教训，加一节只加一行 |
| 指标（3，通用） | `metrics` | kind: numeric/grade/qual；分类指标 unit 必须 NULL、dec NULL |
| | `metric_points` | v_num 可空 + v_text 保分类原值 + src 来源 |
| | `molecular` | 分子四态 state：ok 已检测 / na 未检测 / warn 需关注 / pending 待出（**未检测≠阴性**）；宫颈癌词表 = PD-L1 CPS、p16、MMR、HER2（腺癌） |
| 病情与时间轴（4，通用） | `events` | 一图秀事件 {d,label} |
| | `rhythm` | 随访节奏（item/freq/guideline/next） |
| | `cycles` | 周期计划/实际 |
| | `treatment_lines` | 治疗线容器 |
| 宫颈专属（20，勿互相抄回） | `stage_rows` / `pathology_rows` / `pathway_rows` / `surgery_rows` / `rt_rows` | FIGO 分期（IIIC r/p，TEXT 原样抄）、病理、路径三选一版本链、手术范围、EBRT+后装分列 |
| | `late_effect_rows` / `lymphedema_rows` / `vagina_rows` / `menopause_rows` / `hormone_rows` | 放疗长期影响五件套：肠膀胱事件、淋巴水肿、阴道狭窄与扩张（is_private 默认 1）、绝经症状、激素替代医嘱留痕 |
| | `fertility_rows` / `fert_surgery_rows` / `ovary_rows` / `sexual_rows` | 生育档案、生育保留手术（含随访要求原文位）、卵巢功能、性健康（is_private 默认 1） |
| | `cytology_rows` / `hpv_rows` / `imaging_rows` / `screening_rows` | 细胞学与 HPV 只存 result_text 原文（无正常/异常枚举列）、影像、筛查史 |
| | `nutrition_rows` / `supplement_rows` | 进食量、补充剂与医嘱 |
| 通用尾段（5） | `viewpoints` / `trials` / `documents` / `candidate_fields` / `demo_meta` | 看法（恒不是结论，无 is_conclusion 列）、试验收藏、人工归档、解析候选、演示元数据 |
| 迁移件（0002） | `profile_meta` | 档案元信息扩展 |

cervical 独有五条口径（写死在 0001 头注释，读模型与前端都按此执行）：A FIGO 只记录不自算（不设 TNM→FIGO 推导列或触发器）；B EBRT 与后装分列、禁"总剂量"合成列；C 细胞学/HPV 只存原文；D 性与生育默认私密（读模型默认过滤 is_private=1，导出层不得包含）；E SCC-Ag 只属鳞癌（数据层不拦，check 脚本比对 metrics.key 与 histology）。家族四契约同段：看法恒不是结论、四点位 NULL≠0（宫颈癌不做四点位留白）、更正只新增版本、事实四层不合并（文档/候选/记录/指标分表）。

---

## 三、cervical 客户端链路结构（M5 移植底本）

链路：**`src/client.js`（482 行，手写唯一源）→ `scripts/build-client.mjs`（116 行，零依赖字符串替换）→ `lib/client.js`（488 行，生成物勿手改，`--check` 兜同步）**。为什么生成不手抄：面板参数、接口前缀、版本、仓库各自只有一份来源，生成后由 `npm run check` 的 `--check` 拦漂移。

**src/client.js 段落（customFrame 外壳，M5 移植时整段保留、只换品牌）**：

1. 装载壳：`window.__ModuleLoader__.load({ id: '__PKG_NAME__', factory(require) })`；无 loader 静默退出。
2. 常量段：TITLE / PANEL_TITLE / SUBTITLE / DESCRIPTION + 注入的面板参数（BUSINESS_SIDE/WIDTH、CUSTOM_FRAME、AGENT_DEFAULT/MIN/MAX/STEP、NARROW_BELOW、DRAWER_MAX）。
3. 宽度记忆：clampWidth/snapWidth（对齐 ratioStep 0.02，避免 33.7%）、loadWidth/saveWidth → localStorage。
4. 样式段：全部内联 style 对象（rootStyle/headerStyle/brandStyle/verStyle/hintStyle/paneStyle/splitterStyle/buttonStyle/ghostStyle…），主色 `#18AFA5`（青）配中性冷灰。
5. 会话判定：currentSession/ownsSession/ownedSession（官方 dsh-site-selection 同款，含 snapshot 兜底）。
6. **原生草稿桥**：fillDraft 只填入不发送（校验 ownedSession、occurrences/phase 防引用冲突）；pendingDraft 队列存 DRAFT_QUEUE_KEY，Panel 内 500ms 轮询 flushDraft，composer 未就绪留队重试。
7. onboardingPrompt：6 行开场白（本机资料整理、不提供诊疗建议、分工声明、"看法不是医生结论"）。
8. Panel 组件：`<header>` 顶栏（首个子元素，`--dsh-frame-leading-clearance` 避让 macOS 窗口按钮；品牌+版本 chip+提示+「AI 对话/收起」按钮）→ iframe 业务区（8s broken 兜底可重试）→ `<aside>` 原生会话**始终挂载**只 display 显隐 → splitter（鼠标拖 + 键盘 ←/→/Home/End，25%–45%，role=separator + aria-valuenow）→ 窄屏（**容器宽** ResizeObserver <760px，非 window.innerWidth）转覆盖抽屉 → postMessage `cervi:agent-draft`（校验 event.source===iframe.contentWindow + 同源，截 8000 字）。
9. apply/register：title/panelTitle/icon 🪷/repository/audience/requirements/initialization:'empty'/embedded:true/version/layout{businessSide,businessWidth}/customFrame；`inject: ['desktopWorkbenches','sessions']`。

**品牌变量注入点清单（M5 移植"换什么"）**：

| 类别 | 项 | cervical 现值 | 来源 |
| --- | --- | --- | --- |
| 构建注入（14 个 token，改各自源头即可） | `__PKG_NAME__` | @xyb-community/cervical-workbench | package.json name |
| | `__REPOSITORY__` | github.com/xyb-openharness-dsh-plugins/cervical-workbench | package.json repository（canonicalRepository 规范化，强校验 https://github.com/owner/repo） |
| | `__API_PREFIX__` / `__UI_ENTRY__` | /api/cervical、/api/cervical/ui | dsh/routes.js（全仓 API 路由也由它派生） |
| | `__VERSION__` | 0.1.1 | lib/version.js（← VERSION 文件） |
| | `__BUSINESS_SIDE__`/`__BUSINESS_WIDTH__`/`__CUSTOM_FRAME__` | left / 0.65 / true | lib/layout.js PANEL |
| | `__AGENT_DEFAULT__/MIN/MAX/STEP/NARROW_BELOW/DRAWER_MAX__` | 0.35 / 0.25 / 0.45 / 0.02 / 760 / — | lib/layout.js AGENT_PANE（HOST_LIMITS 0.25–0.7 宿主强校验） |
| src/client.js 手写品牌（8 处） | TITLE / PANEL_TITLE / SUBTITLE / DESCRIPTION | 小莲宝 CerviPal / 小莲宝宫颈癌工作台 / 本机数据 · 记录不是诊断 / …… | 手改 |
| | WIDTH_KEY / DRAFT_QUEUE_KEY | cervip.pal.cervical.agent-pane.v1 / cervip.pal.cervical.initial-drafts.v1 | 手改（localStorage 键，家族前缀 cervip.pal → MPM 自定） |
| | 消息类型 | `cervi:agent-draft` | 手改（与业务侧 postMessage 两端同改） |
| | icon / 色板 | 🪷；#18AFA5 主色、#28605c 深青、#f2f8f7/#f5faf9 底、#e2efec 边、#158f87 提示 | 手改（rootStyle/headerStyle/brandStyle/buttonStyle/ghostStyle/note/drawer 阴影/splitterFocus 全套） |
| | register 元数据 | audience '宫颈癌患者与照护者'、author、requirements、onboardingPrompt 6 行、Fallback 与顶栏 hint 文案 | 手改 |

`scripts/build-client.mjs` 本身**零癌种内容**，可直接复用；`lib/layout.js` 的 PANEL/AGENT_PANE/HOST_LIMITS 结构与注释（customFrame 判定依据、0.65 的两条理由）也是移植底本。

---

## 四、breast 基准 L1–L10 做法摘要（小粉宝 0.12.0：8 一级 / 27 二级）

一级全集：看板 / 病情整理 / 病情一图秀 / 临床 / 营养支持 / 心理支持 / 全程与康复 / 收藏与回顾。

| # | 线 | breast 基准做法 | 出处 |
| --- | --- | --- | --- |
| L1 | 看板 | 单页：当前阶段（**用户选**）、一件事、上肢差值提醒、最近变化、安排、问题入口；不做自动判定阶段 | SPEC §2 |
| L2 | 疾病本体 | 病情整理·病情档案：病理转录、标本、指标序列；报告原文可回溯、自动判读不做 | SPEC §2/§3 |
| L3 | 治疗与决策 | 临床·治疗历程（计划 vs 实际、方案与药物）+ 全程与康复的"术后恢复三阶段"话题（D15 定名） | SPEC §2/§3 |
| L4 | 指标分析 | 病情整理·指标检测：分组卡 + CTCAE 分级徽章 + 背面区间 + needsUln（×ULN 型需化验单参考上限） | 26 §3.1、23 号 |
| L5 | 安全与症状 | 全程与康复·上肢与淋巴水肿独立主题；四点位测量与差值（缺健侧不生成差值）；症状强度记录 | SPEC §2/§3 |
| L6 | 营养与体重 | 独立一级 3 二级：当下困扰 / 进食与体重 / 建议与回顾；体重进指标、只做趋势无 CTCAE 界限 | SPEC §2、23 §8 |
| L7 | 心理与家庭 | 独立一级 4 二级：当下感受 / 我的记录 / 支持资源 / 身体与亲密；**主体（患者/照护者）区分**、私密标记、敏感话题入口（HVT §4.5） | SPEC §2/§3 |
| L8 | 复诊与随访 | 全程与康复·近期安排 + 就诊准备 | SPEC §2 |
| L9 | 资料与导出 | **收藏与回顾独立一级**：问题清单版本、快照、Markdown 导出、源变标「已过时」；病情整理承载导入+草稿核对+解析 | SPEC §2 |
| L10 | 试验与线索 | 临床·试验线索（一期虚构样例仅作界面演示，真实登记库二期） | SPEC §2 |
| 横切 | 一图秀 | 多指标时间轴、治疗条、缩放与时间窗、点详情回源、3D 翻转卡 | SPEC §2 |

判定纪律（26 号）：HCC 曾因"营养一张表、心理完全没有、指标无卡无分级、二级为 0"被判结构性不足——MPM 走查时逐线过同一张表。

---

## 五、家族通用件 vs 必须癌种化部位

**通用骨架（换癌种不换结构）**：

| 件 | 出处 | 要点 |
| --- | --- | --- |
| 三层结构 线→页→卡 | 26 §1 | 一级 8–10 / 二级 24–30；二级为 0 的一级 ≤2；单线二级 ≤6；<8/<20 直接判结构性不足 |
| customFrame 外壳 | cervical src/client.js、20 号、lib/layout.js | businessSide/0.65 + 会话面板 25%–45% 可拖；顶栏 AI 按钮、splitter、宽度记忆、草稿桥、始终挂载、窄屏抽屉——M5 整段移植 |
| 看板四点位 | SPEC 家族段 | 定调条→「现在可以做」→特色状态卡→随访卡→接下来/最近变化 |
| 一图秀 | 16 号 R1–R12 | 三合同 + 单点不连线、治疗条分层、末点避让、minmax(0,1fr) |
| 3D 指标卡翻转 | 16 §2、19 §4 | data-flipped 唯一开关、固定高度、reduced-motion 降级 |
| 指标分组 + CTCAE 分级 | 23 号 | 绝对阈值 vs ×ULN（needsUln）；分类卡（mMRC/分级）不进趋势 |
| 私密=数据结构属性 | 26 §4.3、cervical 口径 D | is_private/visibility 列 + 三出口（一图秀/摘要/导出）各过滤、收敛一个函数 |
| 版本链只增不改 | SCHEMA-SPEC、0001 头注 | 更正=INSERT+翻 is_current；触发器禁改禁删 |
| 分节标题表化 | cervical `section_titles` | 教训件：不用 subjects 上的 *_title 列 |
| 设置三区 / 两区导出 / 试验线索卡 / MinerU 管线 | SETTINGS-DESIGN、29 号、D22 | 拒根/桌面根、Token 三态；fact/view 分区；只写药名期别 |
| **30-RESPONSIVE-RULES** | starter `docs/30-RESPONSIVE-RULES.md`；MPM 本地已有 `docs/RESPONSIVE-RULES.md`（v0.1.5） | 接入点：①业务区视口=iframe 宽（AI 面板展开后 @media 量到的就是业务区宽）；②六条硬规则（标签+值+说明纵向堆、grid+minmax(0,1fr)、行内标签不做 flex item、min-width:0、横向滚动配 .scroll-hint、短 token nowrap）；③断点只有 1180/900/600 三档；④验收=`npm run probe:resp`（8 档宽 × 10 一级页出数字）+ `test/responsive.test.mjs`。移植动作：`scripts/probe-responsive.mjs` 的 SCAN 段整段抄、`#main` 与页面 hash 换 MPM 选择器。⚠️ MPM 本地该文件的示例词（"最近 KPS / MRI / 激素"）是 GBM 遗留，落地时换成 MPM 语境（胸水/mMRC/血象） |
| 工程件 | lib/version.js + build-version.mjs、freeze-contract、check-* 族 | VERSION 唯一来源；迁移哈希冻结；无头实测出数字 |

**必须癌种化（不许换名复用）**：品牌三档色与色板（青 #18AFA5 全套，见 §三清单）；指标字典（SCC-Ag/细胞学/HPV → 血象、胸水生化、体重；mMRC 为分类指标不进趋势）；分子词表（PD-L1 CPS/p16/MMR/HER2 四态 → BAP1/SMARCB1/MTAP **三态**）；20 张 *_rows 专属表全换；SUBTITLES 13 条与全部立场句、页脚免责句；demo 画像（histology 鳞/腺/腺鳞 → 上皮样/肉瘤样/双相）；治疗条形状（路径三选一+后装 → 培美曲塞+顺铂周期、双免输注周期）；随访节奏（细胞学+SCC-Ag+影像三类 → CT modified RECIST+血象）；试验检索关键词（双免/石棉相关加权）；check-wording 红线词表（MPM 加"零法律建议"词族）；API 前缀与 routes。

---

## 六、MPM 结构建议草案（M2 原型候选，待 G1 讨论）

### 6.1 一级 10 条候选线（覆盖 6 差异化种子）

| # | 候选线名 | 接哪句患者原话 | L 线 / 种子 | 与 cervical（及 breast）的刻意不同 |
| --- | --- | --- | --- | --- |
| 1 | 看板 | "我现在整体什么情况？今天该做什么？"；照护者："今天引流量记了吗？" | L1 | 沿用四点位，特色状态卡=**胸水事件最近一次 + mMRC 现分级**（cervical 是放疗长期影响卡）；入口按双主体换（本人/代记） |
| 2 | 我的瘤与弯路 | "当结核治了三个月，药全白吃了"＋"上皮样型是好还是坏？""BAP1 阴性什么意思？" | L2；种子 #6 #3 | cervical 叫「我的分期」（FIGO 库）；MPM **不做分期库**（分期归报告原文），改**病理三型 + 分子三态档案 + 就诊弯路时间线**——弯路进疾病本体（确诊即弯路终点，DIFF-MATRIX L2 草案明写） |
| 3 | 石棉与材料 | "医生问我哪年接触的，我说不清"；"诊断证明、暴露证明、劳动关系证明……到底要几样？" | L2 延伸；种子 #1 | 家族独有整线（对位 cervical 的「性与生育」专属线）：职业暴露时间线（年代/工种/场所/防护）+ 职业病诊断材料清单逐项勾选 + 问答留痕；**零法律建议**是全家族新红线 |
| 4 | 治疗档案 | "这是第几周期？下周几开始？" | L3；种子 #4 | 对 cervical「治疗历程」：路径三选一→**化疗（培美曲塞+顺铂）与双免两条主径**；无手术/后装字段；新增**反应模式原文列**（iRECIST 假性进展语境，不判读） |
| 5 | 胸水与呼吸 | "这礼拜又抽了 800ml"；"爬两层楼就喘（mMRC 2 级）" | L3 延伸+L5；种子 #2 | 家族独有整线（对位 cervical「放疗与长期影响」）：**胸穿/引流/胸膜固定术独立事件轨道**，胸水是治疗线的一等公民；气促/胸痛症状轨道与治疗并排 |
| 6 | 血象与指标 | "白细胞低、人没劲" | L4（+L5 骨髓抑制） | 对 cervical「检查与指标」：无 SCC-Ag 条件显示逻辑；**mMRC 呼吸困难分级卡替代 KPS/SCC-Ag 成为功能分类主卡（不进趋势）**；胸水生化入组 |
| 7 | 随访影像 | "胸膜增厚较前进展，是免疫反应吗？" | L8 前移；种子 #5 | cervical 影像只是「检查与指标」子页；MPM **升一级**（同 GBM 做法）：CT 并列 = modified RECIST 胸膜厚度测量值/报告原文/当时 mMRC 三列并排，**禁判读列**；假性进展困惑由问题清单承接 |
| 8 | 病情一图秀 | "变化发生在哪一步" | 横切层 | 骨架同构；默认选线换 SCC-Ag+体重 → **胸水引流量/胸膜厚度 + 体重**，分类节点 = mMRC 等级 |
| 9 | 照护与生活 | 流二/三照护者："引流我来记"；S11 营养语境；"要不要跟家里说" | L6+L7 合并 | 对 cervical 拆「营养支持」「心理支持」两条：MPM 合并为一条（同 HCC 心理+家属合并逻辑）——家庭维度主要是**照护者代记（witnessed/author 标签）+ 材料经办 + ACP**；进食与体重带"胸水期语境"三说明 |
| 10 | 复诊与资料 | S08 复诊准备；S12 "还有什么研究能参加"；S13 文档导入 | L8+L9+L10 合并（GBM 同款） | 对 cervical 拆「复诊准备」「病情整理」「临床研究」三条：MPM 合并为一条 5 子页；材料跟进与复查同轨（DIFF-MATRIX L8）；导出两区 private 过滤同家族 |

### 6.2 二级 30 个候选页签

| 一级 | 二级候选 | 职责一句 |
| --- | --- | --- |
| 看板（0） | — | 双主体四点位 |
| 我的瘤与弯路（4） | 弯路时间线 / 病理三型 / 分子三态 / 报告原文 | 初诊印象/检查/转诊逐段卡片；上皮样/肉瘤样/双相对照；BAP1/SMARCB1/MTAP 三态（未检测≠阴性）；逐项回原文 |
| 石棉与材料（3） | 暴露时间线 / 材料清单 / 问答与跟进 | 年代/工种/场所/防护；逐项勾选状态；问了什么、医生/机构答了什么原文 |
| 治疗档案（4） | 周期与用药 / 双免与反应原文 / 方案与变更 / 治疗日历 | 化疗周期计划/实际；免疫治疗周期与反应模式抄原文；变更留痕；下次日历 |
| 胸水与呼吸（4） | 胸水事件轨道 / 引流与缓解 / 胸膜固定术 / 气促与胸痛 | 胸穿独立轨道（日期/方式/部位）；引流量与缓解当日记录（照护者代记）；固定术留痕；症状与胸水/治疗并排 |
| 血象与指标（3） | 血象与 CTCAE / 胸水生化 / mMRC 与功能记录 | 分组卡+分级徽章+背面区间；蛋白/LDL 等胸水化验原值；分级卡不进趋势 |
| 随访影像（3） | CT 并列 / 问题清单 / 影像档案 | 测量值/原文/当时 mMRC 三列并排无判读；"进展还是免疫反应"想问的事；报告登记 |
| 病情一图秀（0） | — | 数值线 + mMRC 分类节点 |
| 照护与生活（4） | 当下感受 / 进食与体重 / 照护者代记与家事 / ACP 与决策 | 私密默认；胸水期语境记录；witnessed/author 落记录行；决策信息整理 |
| 复诊与资料（5） | 复诊节奏 / 资料库 / 整理草稿与核对 / 就诊准备与导出 / 试验线索与收藏 | CT+血象节奏与材料跟进同轨；导入管线；候选核对；两区导出（private 过滤）；MPM 口径四通道 |

### 6.3 差异化判据自查（对 26 号 §4.1 与 DIFF-MATRIX §三）

- 一级 10 / 二级 30（∈8–10 / 24–30，二级压线 30，G1 可把「治疗日历」并回「周期与用药」降到 29）；二级为 0 的一级 = 2（看板、一图秀）≤2；单线二级最大 5 ≤6。
- **与 cervical 并排一级名称一致率（M1 实测填数）**：MPM 10 条中与 cervical 12 条完全同名 = 看板、病情一图秀 共 **2 条 = 20% ≤70%** ✅（宽松口径再算上"血象与指标↔检查与指标""复诊与资料↔复诊准备"的部分同名约 40%，仍过线；若 G1 采纳 §6.4 的备选拆分，重名率不变）。
- 6 种子落位：#1→石棉与材料（S03/S04）；#2→胸水与呼吸（S05/S10）；#3→我的瘤与弯路·分子三态（S02）；#4→治疗档案·双免反应原文（S06）；#5→随访影像·CT 并列（S07）；#6→我的瘤与弯路·弯路时间线（S01）。S08→复诊与资料·导出；S09→血象与指标；S11→照护与生活；S12/S13→复诊与资料。**S01–S13 全部有落页**。
- 每条线一句原话全部来自 SCENARIOS/PATIENT-FLOW 现文；M1 回填一手访谈后留痕签认。

### 6.4 已知张力（G1 决策点，写明不沉默）

1. SCENARIOS 映射把 S01→「疾病与弯路」、S02→「我的瘤」当**两条线**；本草案按 DIFF-MATRIX L2 草案（"弯路进疾病本体"）合并为「我的瘤与弯路」。若 G1 要拆开：我的瘤（3）+ 疾病与弯路（3）→ 一级变 11，需再砍一线（建议把「石棉与材料」的问答子页并回弯路线，或接受 11 级超编并记录理由）。
2. L6+L7 合并为「照护与生活」：26 号把 L6 列为"强烈建议独立"，HCC 的教训是合并前必须有"家庭维度主要是什么"的论证——MPM 的论证是照护代记+材料经办，若 M1 访谈发现情绪支持是独立高频诉求，应拆回两条（一级仍 10：把「资料库」降为子页并回弯路线）。
3. 一图秀带不带二级：cervical 给 3 个、lymphoma/GBM 给 0 个；本草案取 0（压"二级为 0 ≤2"的上限），若 M2 实测"数据口径"讲不清再升子页。

---

## 七、移植注意（cervical 0.1.1 → MPM）

**直接复用（文件级，改 ID/品牌后原样搬）**：

| 层 | 文件 | 说明 |
| --- | --- | --- |
| 客户端 | `src/client.js` + `scripts/build-client.mjs` + `lib/layout.js` | customFrame 外壳全结构（顶栏/会话/宽度/草稿桥/抽屉/broken 兜底）零癌种内容；只换 §三清单的 14 token 源头 + 8 处手写品牌；build-client.mjs 原样 |
| | `lib/zip.js`、`lib/version.js` + `scripts/build-version.mjs` | 导出打包与版本唯一来源 |
| 数据层 | `dsh/` 12 文件的形态：server/routes/store/import/export/readmodels/settings/mineru/layout/index/workbench/demo | 零依赖 http + 127.0.0.1 + 前缀改写（`/api/cervical`→`/api/mesothelioma`）；导入-解析-候选管线、候选 accept、导出模板、设置三区全保留 |
| | `schema/freeze-contract.md` 机制 + 0001/0002 结构 | 迁移冻结与"只增不改"执行器；表内容全换（见下） |
| 工程 | `scripts/check-{schema,syntax,version,wording,pack,workbench-package,install,demo-columns}.mjs`、`dev-server.mjs` | 家族检查器；wording 红线词表按 MPM 扩（加零法律建议词族）；check-demo-columns 对 MPM 新列重配 |
| 原型 | `prototypes/v0.2/` 骨架段 | PAGES/SUBPAGES/SUBTITLES 常量结构、state 模型（view/sub/sel/range/zoom/pin/flipped/privateOpen…）、hash 路由 + go-* 动作表、esc/fmtDate/delta 工具、pageHead/subnav 渲染、3D 翻面 flipCard、sidebar/breadcrumb/index.html 壳（含 skip-link 与 `#main` 焦点管理）、一图秀 SVG 段 |
| 样式 | `style.css` 令牌骨架 | 五组令牌结构保留，色值按 19 §9 换肤规则整组替换 |

**必须换掉（不许换名复用）**：

1. **schema 20 张专属表**：stage/pathology/pathway/surgery/rt/late_effect/lymphedema/vagina/menopause/hormone/fertility/fert_surgery/ovary/sexual/cytology/hpv/imaging/screening/nutrition/supplement_rows → MPM 专属表（胸水事件、引流量、胸膜固定术、mMRC 记录、职业暴露、职业病材料、弯路节点、双免周期与反应原文、modified RECIST 测量、照护代记…）。通用 17 张平移：subjects/section_titles/metrics/metric_points/molecular（词表换三态三标记）/events/rhythm/cycles/treatment_lines/viewpoints/trials/documents/candidate_fields/demo_meta/profile_meta + nutrition/supplement 按需。
2. **cervical 五条独有口径 → MPM 口径重写**：A FIGO 不自算 → **分期只存报告原文，不建分期库**；B EBRT/后装分列 → **胸穿/引流/固定术分轨道**；C 细胞学原文 → **反应模式只抄原文（iRECIST 语境无判读列）**；D 性与生育私密 → 当下感受/弯路叙述私密策略按 26 §4.3 visibility；E SCC-Ag 条件显示 → **无此逻辑**（换成三态"未检测≠阴性"契约冻结）。
3. **demo 画像与指标字典**：histology 鳞/腺/腺鳞 → 上皮样/肉瘤样/双相；SCC-Ag/细胞学/HPV 序列 → 血象+胸水生化+体重+mMRC；窗口与演示律照家族（化验 2–4 周一点，影像不加密）。
4. **文案全量**：SUBTITLES 13 条、看板任务卡与 go-* 跳转、页脚免责句、onboardingPrompt 6 行、Fallback/顶栏 hint——全部按 MPM 立场重写（新增：零法律建议、不判假性进展、材料清单不做补办指引）。
5. **品牌与身份**：TITLE/PANEL_TITLE、icon、色板全套、WIDTH_KEY/DRAFT_QUEUE_KEY 前缀、`cervi:agent-draft` 消息类型（业务侧 postMessage 两端同改）、package.json name/repository、cordis.patch.yml、API 前缀。
6. **30-RESPONSIVE-RULES 落地**：probe-responsive.mjs SCAN 段抄入 + `#main`/hash 换 MPM；RESPONSIVE-RULES.md 示例词去 GBM 化（KPS/MRI/激素 → 胸水/mMRC/血象）。
7. **试验数据源**：MPM 口径四通道，关键词按 DIFF-MATRIX（双免/石棉相关加权）；无真实 MPM 覆盖时不做入口（同 GBM 诚实边界）。

---

### 落点提示

- 本笔记 §6.1–6.2 → 填 `docs/DIFF-MATRIX.md` §二全量行与 §三自查（重名率 20% 已实测）；§6.2 → M2 原型 PAGES/SUBPAGES/SUBTITLES 常量；§三 → M5 客户端移植清单；§七 → DEV-PLAN。
- 待 M1 补：SCENARIOS 一手访谈回填、breast 基准的逐线走查表（26 §7 模板）、L4 mMRC 分级卡与 23 号"分类不做分级"口径的对齐复核。
