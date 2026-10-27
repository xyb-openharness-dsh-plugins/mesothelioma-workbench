'use strict';
/* 小胸宝 PleuraPal v开发版 — 恶性胸膜间皮瘤（MPM）工作台（public/，与原型同一份渲染代码）。
   与 prototypes/v0.2/app.js 的差异只有五处定点替换（ui-parity 单测钉住）：
   ① 数据加载：先向 `${apiBase()}/api/mesothelioma/bootstrap` 要真数据，拿不到才回退 window.DEMO_DATA；
   ② AI 五态按钮（AI 对话 / 正在连接… / 收起 AI 对话 / 打开 AI 对话 / AI 对话暂不可用）；
   ③ 面板宽度记忆（localStorage + clampAgentW 读回夹取）；
   ④ 版本：APP_INFO 降级值随 VERSION，bootstrap 回来后以服务端为准；
   ⑤ 启动异步化：先取数据再 render；apiBase 校验失败渲染错误横幅，禁止裸 throw 白屏。
   页面树唯一权威：research-notes/family-landscape.md §6.1/§6.2（10 一级 / 30 二级）。
   红线：无判读字段；private 不进 看板/导出/AI 上下文 三出口（sharedOnly 一个函数）；
   未检测≠阴性（虚线徽章+常驻句）；mMRC 分类只画节点不连线；材料页零法律建议；
   影像评估语（iRECIST 等）只随报告/评估原文引用出现。 */

const APP_INFO = {
  version: '0.1.5',
  build: '2026-10-24',
  channel: 'dsh',
  channelLabel: '开发版 · 已连接工作台数据',
  brand: '小胸宝 PleuraPal',
  en: 'mesothelioma'
};
APP_INFO.displayVersion = `v${APP_INFO.version}`;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uidSeq = 0;
const uid = (p) => p + (++uidSeq);
const DAY = 86400000;

/* ---------------- icons & nav ---------------- */
const icons = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  tumor: 'M12 4a5 5 0 0 1 5 5c0 2.5-1.7 3.4-1.7 5.5H8.7C8.7 12.4 7 11.5 7 9a5 5 0 0 1 5-5ZM9.5 20h5M12 8v4',
  anchor: 'M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 0v13M5 13H3a9 9 0 0 0 18 0h-2M8 21h8',
  calendar: 'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2m4 0h2',
  wave: 'M2 15c2-5 4-5 6 0s4 5 6 0 4-5 6 0M4 8.5h16',
  lab: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10',
  mri: 'M4 12a8 8 0 0 1 16 0v8H4Zm0 4h16M9 12a3 3 0 0 1 6 0',
  chart: 'M4 20V5m0 15h16M8 16l3-5 3 3 4-7',
  care: 'M12 20.3c-4.6-2.9-7.4-5.6-7.4-9A4.1 4.1 0 0 1 12 8.4a4.1 4.1 0 0 1 7.4 2.9c0 3.4-2.8 6.1-7.4 9Z',
  visit: 'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16M9 15l2 2 4-4'
};
const icon = (k) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[k]}"/></svg>`;

/* 页面树（family-landscape §6.1/§6.2：10 一级 / 30 二级） */
const PAGES = [
  ['dash', '看板', 'home'], ['tumor', '我的瘤与弯路', 'tumor'], ['asbestos', '石棉与材料', 'anchor'],
  ['treatment', '治疗档案', 'calendar'], ['pleura', '胸水与呼吸', 'wave'], ['labs', '血象与指标', 'lab'],
  ['imaging', '随访影像', 'mri'], ['chart', '病情一图秀', 'chart'],
  ['care', '照护与生活', 'care'], ['followup', '复诊与资料', 'visit']
];
const SUBPAGES = {
  tumor: [['detour', '弯路时间线'], ['pathology', '病理三型'], ['molecular', '分子三态'], ['reports', '报告原文']],
  asbestos: [['exposure', '暴露时间线'], ['checklist', '材料清单'], ['qanda', '问答与跟进']],
  treatment: [['cycles', '周期与用药'], ['immune', '双免与反应原文'], ['changes', '方案与变更'], ['calendar', '治疗日历']],
  pleura: [['events', '胸水事件轨道'], ['drainage', '引流与缓解'], ['pleurodesis', '胸膜固定术'], ['symptoms', '气促与胸痛']],
  labs: [['blood', '血象与 CTCAE'], ['effusion', '胸水生化'], ['mmrc', 'mMRC 与功能记录']],
  imaging: [['parallel', 'CT 并列'], ['questions', '问题清单'], ['archive', '影像档案']],
  care: [['feelings', '当下感受'], ['intake', '进食与体重'], ['family', '照护者代记与家事'], ['decisions', 'ACP 与决策']],
  followup: [['schedule', '复诊节奏'], ['library', '资料库'], ['candidates', '整理草稿与核对'], ['prepare', '就诊准备与导出'], ['trials', '试验线索与收藏']]
};
const SUBTITLES = {
  dash: '把今天能做的一件事放在最前面；胸水与呼吸、治疗与复查都从这里出发。',
  tumor: '弯路逐段记、三型对照看、分子按三态记；解释只解释名词，不做判断。',
  asbestos: '把散落的职业记忆整理成时间线；材料清单只整理材料，不提供法律建议。',
  treatment: '周期与输注按计划与实际分开留痕；反应模式只抄报告原文，不判疗效。',
  pleura: '胸穿、引流、固定术各走各的轨道；mMRC 分级只单选记录，不画趋势线。',
  labs: '数值照抄化验单；分级只对照国际标准区间；缺参考上限就明写，不凑近似。',
  imaging: '历次 CT 并排：测量原文 / 报告原文 / 当时 mMRC——只并列事实，不做判读。',
  chart: '引流量、胸膜厚度与体重放回同一段时间；mMRC 只画节点不连线。',
  care: '感受默认私密、照护代记带见证徽章；决策是信息整理，不是医学判断。',
  followup: '复查节奏、资料库、候选核对与两区导出分开放；试验线索不是推荐。'
};

/* 13 场景直达（INTERACTION-DESIGN v1：S01–S13 路径；HVT X1/X2 的走查锚点） */
const SCENES = [
  ['S01', '弯路', 'tumor', 'detour', [['to-family', 'care', 'family'], ['to-pathology', 'tumor', 'pathology'], ['to-reports', 'tumor', 'reports']], '弯路轨道'],
  ['S02', '分子', 'tumor', 'molecular', [['to-questions', 'imaging', 'questions']], '问题清单'],
  ['S03', '石棉史', 'asbestos', 'exposure', [['to-qanda', 'asbestos', 'qanda']], '暴露时间线'],
  ['S04', '材料', 'asbestos', 'checklist', [['to-witness', 'asbestos', 'qanda']], '清单状态'],
  ['S05', '胸水', 'pleura', 'drainage', [['to-events', 'pleura', 'events'], ['to-pleurodesis', 'pleura', 'pleurodesis']], '事件卡'],
  ['S06', '周期', 'treatment', 'calendar', [['to-cycles', 'treatment', 'cycles'], ['to-reaction', 'treatment', 'immune'], ['to-changes', 'treatment', 'changes']], '周期记录'],
  ['S07', 'CT', 'imaging', 'parallel', [['to-questions', 'imaging', 'questions'], ['to-archive', 'imaging', 'archive'], ['to-chart', 'chart', '']], '问题清单'],
  ['S08', '复诊', 'followup', 'prepare', [['to-schedule', 'followup', 'schedule'], ['to-decisions', 'care', 'decisions']], '摘要'],
  ['S09', '血象', 'labs', 'blood', [['to-effusion', 'labs', 'effusion'], ['to-mmrc', 'labs', 'mmrc']], '血象卡'],
  ['S10', '症状', 'pleura', 'symptoms', [['to-mmrc', 'labs', 'mmrc']], '症状轨道'],
  ['S11', '营养', 'care', 'intake', [['to-feelings', 'care', 'feelings']], '语境记录'],
  ['S12', '试验', 'followup', 'trials', [], '收藏线索'],
  ['S13', '导入', 'followup', 'library', [['to-candidates', 'followup', 'candidates']], '候选核对']
];

/* ---------------- 指标目录（与一图秀同一来源；23 号：分组单一来源） ---------------- */
const CATALOG = {
  WBC: { name: '白细胞', unit: '10⁹/L', cat: '血象', color: '#33608C', dec: 1 },
  ANC: { name: '中性粒细胞', unit: '10⁹/L', cat: '血象', color: '#4a7ba6', dec: 1 },
  PLT: { name: '血小板', unit: '10⁹/L', cat: '血象', color: '#7fa3c0', dec: 0 },
  HGB: { name: '血红蛋白', unit: 'g/L', cat: '血象', color: '#a3bfd4', dec: 0 },
  ALT: { name: 'ALT（谷丙转氨酶）', unit: 'U/L', cat: '肝功能', color: '#8a5a0c', dec: 0, ulnType: true },
  DRAIN: { name: '胸水引流量', unit: 'ml/次', cat: '胸水与呼吸', color: '#1F4A73', dec: 0 },
  PLEURA_MM: { name: '胸膜最厚处', unit: 'mm', cat: '胸水与呼吸', color: '#55707E', dec: 0 },
  WEIGHT: { name: '体重', unit: 'kg', cat: '体格与代谢', color: '#2f6f66', dec: 1 },
  MMRC: { name: 'mMRC 呼吸困难分级', unit: '级', cat: '功能评估', color: '#7C99A8', dec: 0, categorical: true }
};
const CAT_ORDER = ['血象', '肝功能', '胸水与呼吸', '体格与代谢', '功能评估'];
/* CTCAE v5.0 绝对阈值型（23 号 §2：血液四项；HGB 不设 G4 数值级） */
const CTCAE = {
  WBC: { term: '白细胞减少', unit: '10⁹/L', levels: [[3.5, 1], [3.0, 2], [2.0, 3], [1.0, 4]] },
  ANC: { term: '中性粒细胞减少', unit: '10⁹/L', levels: [[2.0, 1], [1.5, 2], [1.0, 3], [0.5, 4]] },
  PLT: { term: '血小板减少', unit: '10⁹/L', levels: [[125, 1], [75, 2], [50, 3], [25, 4]] },
  HGB: { term: '贫血', unit: 'g/L', levels: [[120, 1], [100, 2], [80, 3]] }
};
/* 区间语义：各级为 [下界, 上界)；等号归上一级。 */
function ctcaeGrade(code, v) {
  const c = CTCAE[code];
  if (!c) return null;
  const i = c.levels.findIndex(([lo]) => v < lo);
  if (i === -1) return null;
  const f = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1));
  const upper = c.levels[i][0];
  const lower = i + 1 < c.levels.length ? c.levels[i + 1][0] : null;
  const range = lower === null ? `<${f(upper)} ${c.unit}` : `${f(lower)}–<${f(upper)} ${c.unit}`;
  return { g: c.levels[i][1], range };
}
/* ALT ×ULN 型（23 号 §2.1）：必须用这张化验单自带的参考上限；缺上限=needsUln，不给级、不近似。
   CTCAE v5.0 ALT：G1 >ULN–3×ULN；G2 >3–10×ULN；G3 >10–20×ULN；G4 >20×ULN（本地最多给到 3 级，G4 留给治疗团队）。 */
function altGrade(v, refHigh) {
  if (!refHigh || refHigh <= 0) return { needsUln: true, range: '>1.0–3.0 / >3.0–10 / >10–20 ×ULN' };
  const ratio = v / refHigh;
  const levels = [[3, 1], [10, 2], [20, 3]];
  const hit = levels.find(([hi]) => ratio <= hi);
  if (!hit) return { g: 3, range: '>10–20 ×ULN（本地最多给到 3 级；是否到 G4 留给治疗团队）', ratio };
  const lo = hit[0] === 3 ? 1 : hit === levels[1] ? 3 : 10;
  return { g: hit[1], range: `>${lo}–${hit[0]} ×ULN`, ratio };
}
const MMRC_LEVELS = [
  '仅在费力运动时呼吸困难', '平地快走或爬缓坡时气促', '因气促平地走比同龄人慢或需停下',
  '平地走约 100 米或数分钟即需停下喘气', '严重气促，不能离家或穿衣时气促'
];

/* ---------------- AI 协助示例（INTERACTION-DESIGN：填入输入框但不自动发送；候选核对闭环） ---------------- */
const AI_DEMOS = {
  dash: { prompt: '帮我把这周的重要变化排成一段话，复诊时照着说。', cand: { title: '本周变化摘要（演示候选）', fields: [['最近 CT', '2026-09-25 · 测量与结论原文已登记'], ['最近 mMRC', '2 级（本人自记）'], ['下一治疗', '2026-10-26 待血象确认']], src: '看板摘要（演示）' } },
  tumor: { prompt: '帮我把"上皮样型"和"BAP1 未检测"各解释成一句大白话。', cand: { title: '术语解释候选（演示）', fields: [['上皮样型', '病理三型之一（解释不是判断）'], ['BAP1', '未检测 ≠ 阴性；是否补测由医生决定'], ['口径', '只解释名词，不推算预后']], src: '分子三态（演示）' } },
  asbestos: { prompt: '帮我把 1983 到 1998 在造船厂的那段经历整理成暴露段卡片。', cand: { title: '暴露段候选（演示）', fields: [['年代', '1983-03 → 1998-11'], ['工种', '管路保温工（本人回忆）'], ['防护', '纱布口罩，无培训记录']], src: '暴露时间线（演示）' } },
  treatment: { prompt: '今天输完液有点恶心，帮我记到周期记录里。', cand: { title: '治疗事件候选（演示）', fields: [['日期', '2026-10-24'], ['事件', '恶心一次'], ['归档', '入治疗日历；是否调整由治疗团队判断']], src: '治疗日历（演示）' } },
  pleura: { prompt: '今天抽了 450ml，晚上躺平了，帮我记一次引流。', cand: { title: '引流记录候选（演示）', fields: [['日期', '2026-10-24'], ['方式', '置管引流'], ['引流量', '450 ml'], ['缓解', '夜间可平卧']], src: '引流与缓解（演示）' } },
  labs: { prompt: '我拍了张化验单，帮我把白细胞数值读出来登记。', cand: { title: '指标数值候选（演示）', fields: [['WBC', '3.1 10⁹/L'], ['日期', '2026-10-12'], ['来源', 'C3D8 化验单']], src: '血象与 CTCAE（演示）' } },
  imaging: { prompt: '我拿到一份新 CT 报告，帮我登记测量原文和结论原文。', cand: { title: 'CT 登记候选（演示）', fields: [['日期', '待核对'], ['测量原文', '胸膜最厚处（照抄）'], ['结论原文', '照抄，不缩写']], src: 'CT 并列（演示）' } },
  chart: { prompt: '把 7 月那次引流到固定术之间的体重变化讲一段给我听。', cand: { title: '时段摘要候选（演示候选）', fields: [['时段', '2026-07-03 → 07-08'], ['体重', '66.4 → 65.9 kg（原文数值）'], ['口径', '每条线按自身范围缩放，不可比']], src: '病情一图秀（演示）' } },
  care: { prompt: '帮我记一条照护者感受：这几天她走路越来越慢，我心里没底。', cand: { title: '感受候选（演示 · 默认私密）', fields: [['内容', '这几天她走路越来越慢，我心里没底'], ['记录人', '照护者'], ['可见性', 'private（默认不进导出）']], src: '当下感受（演示）' } },
  followup: { prompt: '帮我把复诊要问的几条整理成清单。', cand: { title: '问题清单候选（演示）', fields: [['问题 1', '下次 CT 前要不要空腹'], ['问题 2', '血象低点期间感染要注意什么'], ['来源', '就诊准备生成']], src: '就诊准备（演示）' } }
};

/* ---------------- state ---------------- */
const state = {
  page: 'dash', sub: {}, profileId: 'demo1',
  range: 'all', zoom: 100,
  sel: { demo1: ['DRAIN', 'WEIGHT', 'MMRC'], demo2: ['PLEURA_MM', 'WEIGHT', 'MMRC'] },
  toggles: { treatment: true, keypoints: true },
  pin: null, flipped: new Set(),
  agent: { open: false, w: 35, draft: null, cand: null, connecting: false, everOpened: false, unavailable: false },
  dataSource: 'pending',
  cfg: {
    root: '/Users/demo/Documents/PleuraPal（演示）', size: { doc: 2.8, derived: 0.6, db: 0.3 },
    backupAt: '2026-10-23 22:10', tokenState: 'none', tokenMasked: null, consent: false
  },
  /* 逐档案的可编辑内存态（原型仅内存，刷新重置） */
  mem: {
    demo1: {
      questions: [
        { id: 'q1', text: '胸膜固定术后如果胸水再长，处理的选项有哪些？', asked: false, src: 'CT 并列 · 2026-09-25 报告后生成' },
        { id: 'q2', text: '第 4 周期 D1 前血象要查哪几项？', asked: false, src: '治疗日历 · 2026-10-26 前' },
        { id: 'q3', text: 'BAP1 需要补测吗？对方案有什么影响？', asked: false, src: '分子三态 · 场景生成' }
      ],
      savedTrials: [], drainages: [], symptoms: [], detours: [], exposures: [], qas: [], familyNotes: [], mmrc: [], materials: {}, witness: null
    },
    demo2: {
      questions: [
        { id: 'q1', text: '12 月复评时"未确认"会怎么确认？需要做什么检查？', asked: false, src: 'CT 并列 · 2026-10-12 评估后生成' },
        { id: 'q2', text: 'mMRC 从 2 级变 3 级，日常活动要注意什么？', asked: false, src: '气促与胸痛 · 场景生成' },
        { id: 'q3', text: 'TSH 随访的频率和哨兵症状是什么？', asked: false, src: '方案与变更 · 医嘱原文后生成' }
      ],
      savedTrials: [], drainages: [], symptoms: [], detours: [], exposures: [], qas: [], familyNotes: [], mmrc: [], materials: {}, witness: null
    }
  }
};
/* ---------------- 数据层（开发版）：先向 bootstrap 要真数据，拿不到才回退 window.DEMO_DATA ----------------
 * 为什么不在文件里写死数据：原型与开发版必须是同一份渲染代码（ui-parity 的 parity 要求），
 * 所以这里只改"数据从哪来"，不改任何视图函数。回退只为两种情况：纯静态打开、
 * 或 dev-server 还没起——这时页面顶部会显示"离线演示数据"的横幅，避免把演示当成自己的。
 * bootstrap 与 demo-data.js 同形：{ meta, profiles: [档案数组] }；version/build 随包走。 */
let DATA = { meta: {}, profiles: [] };
let TODAY = '2026-10-24';

/** API_BASE = 挂载前缀（v0.1.3 定稿契约）：独立启动空串，宿主 `/api/mesothelioma-workbench`。
 *  页面统一拼 `${API_BASE}/api/mesothelioma/xxx`。守卫 `/(^|/)api$/` 只禁**交界**重复 `/api/api`
 *  ——宿主前缀本身含 `/api`（如 /api/mesothelioma-workbench）是正常的，不许 includes('/api') 一刀切。
 *  纯函数（参数是 pathname），双形态回归测试见 test/client.test.mjs。 */
function deriveApiBase(pathname) {
  const m = String(pathname ?? '').match(/^(.*)\/ui(?:\/|$)/);
  let base = m ? m[1] : '';
  base = base.replace(/\/api\/mesothelioma$/, ''); // 自己的 API 前缀剥掉，只留挂载前缀
  if (/(^|\/)api$/.test(base)) base = base.slice(0, -4); // 守卫：只禁交界重复（/api/api/...）
  return base;
}

/** 基址校验：返回问题清单（空数组＝可用）。启动期失败走错误横幅，不裸 throw。 */
function apiBaseProblems(base) {
  if (base === '') return [];
  const problems = [];
  if (!base.startsWith('/')) problems.push(`基址必须是绝对路径或空串，实际「${base}」`);
  if (/(^|\/)api$/.test(base)) problems.push(`基址不能以 /api 结尾（会拼出 /api/api/...），实际「${base}」`);
  if (base.includes('/api/api')) problems.push(`基址里出现了重复的 /api/api，实际「${base}」`);
  return problems;
}

/** 当前页面用的基址（deriveApiBase 的运行时包装；apiBaseProblems 非空时 init 渲染错误横幅）。 */
function apiBase() {
  return deriveApiBase(location.pathname);
}

/** 拉真数据。返回 {reachable, data}：
 *  reachable=false 才允许回退演示数据；**接口通了但库是空的**必须显示空态，
 *  不能拿演示档案把空工作区填满（那会让用户以为数据被写进来了）。 */
async function loadBootstrap() {
  const url = `${apiBase()}/api/mesothelioma/bootstrap`;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return { reachable: false, data: null };
    const data = await res.json();
    return { reachable: true, data: data && Array.isArray(data.profiles) ? data : null };
  } catch { return { reachable: false, data: null }; }
}

/** 把 bootstrap（或离线回退的 DEMO_DATA）装进 DATA。视图函数读的还是 DATA.meta / DATA.profiles。 */
function applyData(data) {
  DATA = {
    meta: data?.meta || {},
    profiles: Array.isArray(data?.profiles) ? data.profiles : [],
  };
  if (DATA.meta?.today) TODAY = DATA.meta.today;
  if (data?.version) {
    APP_INFO.version = data.version;
    APP_INFO.build = data.build || APP_INFO.build;
    APP_INFO.channel = 'dsh';
    APP_INFO.channelLabel = DATA.profiles.length ? '开发版 · 已连接工作台数据' : '工作台已连接，资料库还是空的';
    APP_INFO.displayVersion = `v${APP_INFO.version}`;
  }
}

/** 启动期错误横幅：只提示、不抛错、不阻断页面（禁止裸 throw 白屏）。 */
function showBootBanner(text) {
  try {
    const el = document.createElement('div');
    el.className = 'notice plain';
    el.setAttribute('role', 'alert');
    el.style.margin = '12px 0';
    el.innerHTML = `<b>数据连接提示</b> · ${esc(text)}`;
    const main = document.getElementById('main');
    if (main) main.prepend(el);
  } catch { /* 横幅失败不影响后续渲染 */ }
}
const profile = () => DATA.profiles.find((p) => p.id === state.profileId) || DATA.profiles[0] || {
  /* 资料库为空的防御性空档案：页面照常渲染空态，不抛错（empty 态由横幅说明）。 */
  id: 'empty', name: '（还没有档案）', age: '—', gender: '', diagnosis: '资料库为空', stageLine: '',
  primaryRole: 'PATIENT', detour: [], pathology: null, molecular: [], reports: [], exposure: [],
  materials: [], witness: null, qa: [],
  treatment: { pathway: '', regimen: '', chemoCycles: [], immuneInfusions: [], reactionMode: null, nextOn: '', changes: [] },
  pleura: { events: [], mMRC: [], symptoms: [] },
  metrics: { numeric: {}, qual: { MMRC: [] } },
  imaging: [], effusionLabs: [], viewpoints: [], family: [], decisions: [], rhythm: [],
  documents: [], candidates: [], trials: [],
};
const mem = () => state.mem[state.profileId];
/* private 三出口过滤（看板摘要 / 导出 / AI 上下文 默认）共用此函数——全台唯一一份 */
const sharedOnly = (p) => (p.viewpoints || []).filter((v) => v.visibility !== 'private');
const privateCount = (p) => (p.viewpoints || []).filter((v) => v.visibility === 'private').length;

/* ---------------- 通用 UI ---------------- */
const btn = (text, action, cls = '', attr = '') => `<button class="${cls}" data-action="${action}" ${attr}>${text}</button>`;
const go = (text, page, sub = '', cls = '', attr = '') => btn(text, 'go', cls, `data-page="${page}" data-sub="${esc(sub)}"${attr ? ' ' + attr : ''}`);
const pill = (text, cls = '') => `<span class="pill ${cls}">${esc(text)}</span>`;
const shortDate = (d) => String(d).slice(5).replace('-', '.');
const longDate = (d) => String(d).replace(/-/g, '.');
const fmtNum = (v, dec) => (dec === 0 ? String(Math.round(v)) : Number(v).toFixed(dec ?? 1));
const addDays = (d, n) => longDate(new Date(Date.parse(d) + n * DAY)).replace(/\./g, '-');
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

function toast(t, opts = {}) {
  clearTimeout(state.toastTimer);
  const el = $('#toast');
  el.innerHTML = esc(t) + (opts.back ? ` <button class="toast-back" data-action="go" data-page="dash">回到看板</button>` : '');
  el.classList.add('visible');
  state.toastTimer = setTimeout(() => el.classList.remove('visible'), 4200);
}
function openModal(title, body, foot = '', eyebrow = '小胸宝 · 交互演示') {
  $('#dialog-title').textContent = title;
  $('#dialog-eyebrow').textContent = eyebrow;
  $('#dialog-body').innerHTML = body;
  $('#dialog-foot').innerHTML = foot;
  if (!$('#dialog').open) $('#dialog').showModal();
  document.body.style.overflow = 'hidden';
}
const closeModal = () => { if ($('#dialog').open) $('#dialog').close(); };
$('#dialog').addEventListener('close', () => { document.body.style.overflow = ''; });

function navigate(page, sub) {
  state.page = page;
  if (sub) state.sub[page] = sub;
  try { history.replaceState(null, '', '#' + page + (sub ? '/' + sub : '')); } catch (e) { /* file:// 下忽略 */ }
  render();
  $('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
const section = (title, desc = '', action = '') => `<div class="section-title"><div><h2>${title}</h2>${desc ? `<p>${esc(desc)}</p>` : ''}</div>${action}</div>`;
const backRow = () => state.page === 'dash' ? '' : `<div class="back-row"><button class="text-button" data-action="go" data-page="dash">← 回到看板</button></div>`;
const aiBtn = (label = 'AI 协助示例') => btn(label, 'ai-draft', 'soft', `data-ai="${state.page}"`);
function head(title, desc, action = '') {
  return `<div class="page-head"><div><span class="eyebrow">PLEURAPAL / MESOTHELIOMA WORKBENCH</span><h1>${title}</h1><p>${desc}</p></div><div class="actions">${action}</div></div>`;
}
const subnav = () => {
  const items = SUBPAGES[state.page]; if (!items) return '';
  const sel = state.sub[state.page] || items[0][0];
  return `<nav class="subnav" role="tablist" aria-label="${PAGES.find((p) => p[0] === state.page)[1]}二级页面">${items.map(([k, s]) => `<button role="tab" aria-selected="${sel === k}" data-action="sub" data-sub="${k}">${esc(s)}</button>`).join('')}</nav>`;
};
const subLabel = (page) => {
  const items = SUBPAGES[page]; if (!items) return '';
  const k = state.sub[page] || items[0][0];
  return items.find((x) => x[0] === k)[1];
};
const pageHeadFor = (desc, action = '') => head(subLabel(state.page), desc, action ? `${action}${aiBtn()}` : aiBtn()) + subnav();
/* ⋯ 更多菜单（手工通道收敛口；每页至多一个显式编辑入口） */
const moreMenu = (items) => `<details class="more-menu"><summary aria-label="更多操作">⋯</summary><div class="menu">${items.map(([t, a, attr]) => `<button data-action="${a}" ${attr || ''}>${esc(t)}</button>`).join('')}</div></details>`;
const authorTag = (a) => a === 'CAREGIVER' ? pill('照护者代记', 'mist') : a === 'PATIENT' ? pill('本人自记', 'blue') : '';

/* ---------------- 时间与治疗条 ---------------- */
function seriesAll(code) {
  const p = profile();
  const m = CATALOG[code];
  if (!m) return [];
  if (code === 'MMRC') return ((p.metrics.qual || {}).MMRC || []).map((x) => ({ d: x.d, v: x.v, src: x.src, label: x.label }));
  const arr = ((p.metrics.numeric || {})[code]) || [];
  return arr.map((x) => ({ d: x.d, v: x.v, src: x.src, refHigh: x.refHigh ?? null }));
}
function profileStart(p) {
  const dates = [];
  Object.values(p.metrics.numeric || {}).forEach((a) => a.forEach((x) => dates.push(Date.parse(x.d))));
  ((p.metrics.qual || {}).MMRC || []).forEach((x) => dates.push(Date.parse(x.d)));
  return Math.min(...dates) - 7 * DAY;
}
function profileEnd(p) {
  const dates = [Date.parse(TODAY)];
  Object.values(p.metrics.numeric || {}).forEach((a) => a.forEach((x) => dates.push(Date.parse(x.d))));
  return Math.max(...dates);
}
function treatmentBands(p) {
  const out = [];
  const t = p.treatment;
  (t.chemoCycles || []).forEach((c) => out.push({ kind: 'chemo', label: `C${c.n}`, from: c.from, to: addDays(c.from, 20), d1: addDays(c.from, c.delayDays || 0), color: '#33608C' }));
  (t.immuneInfusions || []).forEach((f) => out.push({ kind: 'immune', label: `#${f.n}`, date: f.d, color: '#33608C' }));
  (p.pleura.events || []).forEach((e) => {
    if (e.kind === 'pleurodesis') out.push({ kind: 'fix', label: '固定术', date: e.d, color: '#e8590c' });
    else if (e.kind === 'thoracentesis') out.push({ kind: 'pleura', label: '胸穿', date: e.d, color: '#1F4A73' });
    else if (e.kind === 'drain-tube' && e.volumeMl >= 700) out.push({ kind: 'pleura', label: '置管', date: e.d, color: '#6f93b5' });
  });
  return out;
}

/* ---------------- 一图秀（16 号合同 R1–R12） ---------------- */
const CW = 980, CH = 432, CX0 = 56, CX1 = 950, CY0 = 148, CY1 = 372;
const LANES = { chemo: 36, immune: 36, pleura: 60, fix: 60 };

function domain() {
  const p = profile();
  const end = profileEnd(p);
  const months = { '3m': 3, '6m': 6, '12m': 12 }[state.range];
  const start = months ? new Date(new Date(end).setMonth(new Date(end).getMonth() - months)) : new Date(profileStart(p));
  const span = end - start.getTime();
  const kept = span * state.zoom / 100;
  return [end - kept, end];
}
const inDomain = (d, t0, t1) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
const xOf = (t, t0, t1) => CX0 + (t - t0) / Math.max(1, t1 - t0) * (CX1 - CX0);
function smoothPath(coords) { /* 单调三次（Hermite→Bezier），同族骨架实现 */
  if (!coords.length) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  return coords.reduce((d, p, i) => {
    if (!i) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = coords[i - 1], before = coords[i - 2] || prev, after = coords[i + 1] || p;
    const c1x = prev.x + (p.x - before.x) / 6, c1y = prev.y + (p.y - before.y) / 6;
    const c2x = p.x - (after.x - prev.x) / 6, c2y = p.y - (after.y - prev.y) / 6;
    return `${d} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');
}
function seriesFor(code, t0, t1) {
  const m = CATALOG[code];
  const all = seriesAll(code);
  if (!all.length) return { code, m, lo: 0, hi: 1, span: 1, pts: [], all };
  const vals = all.map((p) => p.v);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo || Math.max(Math.abs(hi) * 0.08, 1); /* 零跨度兜底；归一化基准=全期 min/max */
  return { code, m, lo, hi, span, pts: all.filter((p) => inDomain(p.d, t0, t1)), all };
}
function monthTicks(t0, t1) {
  const out = []; const d = new Date(t0); let cur = new Date(d.getFullYear(), d.getMonth(), 1);
  if (cur.getTime() < t0) cur.setMonth(cur.getMonth() + 1);
  while (cur.getTime() <= t1) {
    const x = xOf(cur.getTime(), t0, t1);
    if (x > CX0 + 6 && x < CX1 - 6) out.push({ x, label: `${cur.getFullYear() % 100}-${String(cur.getMonth() + 1).padStart(2, '0')}` });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return out.length > 7 ? out.filter((_, i) => i % 2 === 0) : out;
}
function chartSVG(t0, t1) {
  const p = profile();
  const sel = state.sel[state.profileId];
  const series = sel.map((c) => seriesFor(c, t0, t1)).filter((s) => s.pts.length);
  if (!series.length) {
    return `<div class="empty"><h3>这个时间窗里没有所选指标</h3><p>扩大时间范围，或在左侧加选一个指标。</p></div>`;
  }
  const bands = state.toggles.treatment ? treatmentBands(p).filter((b) => {
    const t = b.date ? Date.parse(b.date) : Date.parse(b.from);
    const e = b.date ? t : Date.parse(b.to);
    return e >= t0 && t <= t1;
  }) : [];
  const yOf = (s, v) => CY1 - (v - s.lo) / s.span * (CY1 - CY0);
  const grid = [0, 1, 2, 3, 4].map((i) => { const y = CY0 + i * (CY1 - CY0) / 4; return `<line class="grid" x1="${CX0}" x2="${CX1}" y1="${y}" y2="${y}"/>`; }).join('');

  /* 治疗条分层（R3）：周期/输注在「治疗」泳道，胸穿/置管/固定术在「胸水操作」泳道；固定术=菱形+竖虚线 */
  const strip = [];
  bands.forEach((b) => {
    if (b.kind === 'chemo') {
      const x1 = Math.max(xOf(Date.parse(b.from), t0, t1), CX0), x2 = Math.min(xOf(Date.parse(b.to), t0, t1), CX1);
      const d1x = xOf(Date.parse(b.d1), t0, t1);
      strip.push(`<g><rect x="${x1.toFixed(1)}" y="${LANES.chemo}" width="${Math.max(x2 - x1, 7).toFixed(1)}" height="8" rx="4" fill="${b.color}" opacity=".26"/><rect x="${d1x.toFixed(1)}" y="${(LANES.chemo - 1).toFixed(1)}" width="6" height="10" rx="2" fill="${b.color}" opacity=".55"/><text x="${(x1 + 1).toFixed(1)}" y="${(LANES.chemo - 4).toFixed(1)}" font-size="8.5" fill="${b.color}" font-weight="500">${esc(b.label)}${esc(b.d1 > b.from ? '（顺延后）' : '')}</text></g>`);
    } else if (b.kind === 'immune') {
      const x = xOf(Date.parse(b.date), t0, t1).toFixed(1);
      strip.push(`<g><path d="M ${x} ${LANES.immune + 4.5} l4.5 4.5 -4.5 4.5 -4.5 -4.5 Z" fill="${b.color}"/><text x="${(+x + 7).toFixed(1)}" y="${LANES.immune + 13}" font-size="8.5" fill="${b.color}" font-weight="500">${esc(b.label)}</text></g>`);
    } else if (b.kind === 'pleura') {
      const x = xOf(Date.parse(b.date), t0, t1).toFixed(1);
      strip.push(`<g><path d="M ${x} ${LANES.pleura + 4.5} l4.5 4.5 -4.5 4.5 -4.5 -4.5 Z" fill="${b.color}"/><text x="${(+x + 7).toFixed(1)}" y="${LANES.pleura + 13}" font-size="8.5" fill="${b.color}" font-weight="500">${esc(b.label)}</text></g>`);
    } else if (b.kind === 'fix') {
      const x = xOf(Date.parse(b.date), t0, t1).toFixed(1);
      strip.push(`<g><path d="M ${x} ${LANES.fix - 5} l4.5 4.5 -4.5 4.5 -4.5 -4.5 Z" fill="${b.color}"/><text x="${(+x + 8).toFixed(1)}" y="${LANES.fix + 8}" font-size="9" fill="${b.color}" font-weight="600">${esc(b.label)}</text></g>`);
      strip.push(`<line x1="${x}" x2="${x}" y1="${CY0}" y2="${CY1}" stroke="${b.color}" stroke-width="1.2" stroke-dasharray="3 6" opacity=".4"/>`);
    }
  });
  const rowLabels = state.toggles.treatment ? `<text x="6" y="${LANES.chemo + 7}" font-size="8.5" fill="#96a5b2">治疗</text><text x="6" y="${LANES.pleura + 7}" font-size="8.5" fill="#96a5b2">胸水</text>` : '';

  /* 末点标签三向避让（R4） */
  const lastPos = series.map((s) => {
    const c = s.pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    const last = c[c.length - 1];
    return { s, x: last.x, y: last.y, v: s.pts[s.pts.length - 1].v };
  }).sort((a, b) => a.y - b.y);
  let cursor = -Infinity;
  for (const it of lastPos) { it.ly = Math.max(it.y, cursor + 13); cursor = it.ly; }
  const overflow = lastPos.length ? Math.max(0, lastPos[lastPos.length - 1].ly - (CY1 + 2)) : 0;
  if (overflow) for (const it of lastPos) it.ly -= overflow;

  const lines = series.map((s, si) => {
    const coords = s.pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    /* R2 单点不连线；分类序列（mMRC）只画节点不连线（红线） */
    const canLine = !s.m.categorical && s.pts.length > 1;
    const path = canLine ? `<path class="line" d="${smoothPath(coords)}" stroke="${s.m.color}" pathLength="1"/>` : '';
    const dots = coords.map((c, i) => {
      const pt = s.pts[i];
      const isLast = i === s.pts.length - 1;
      const r = isLast ? 5.2 : 4;
      const active = state.pin && state.pin.code === s.code && state.pin.date === pt.d;
      return `<circle class="pt${active ? ' active' : ''}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r}" fill="${s.m.color}" data-action="pin" data-code="${s.code}" data-date="${pt.d}"><title>${esc(s.m.name)} ${fmtNum(pt.v, s.m.dec)} ${esc(s.m.unit)} · ${pt.d}</title></circle>`;
    }).join('');
    const lp = lastPos.find((x) => x.s === s);
    const nearRight = lp.x > CX1 - 46;
    const lx = nearRight ? lp.x - 8 : lp.x + 8;
    const ltxt = s.m.categorical ? `${fmtNum(lp.v, 0)} 级` : fmtNum(lp.v, s.m.dec);
    const label = state.toggles.keypoints
      ? `<text class="delta-tag" x="${lx.toFixed(1)}" y="${(lp.ly + 4 + (si % 2 ? -11 : 0)).toFixed(1)}" text-anchor="${nearRight ? 'end' : 'start'}" fill="${s.m.color}">${ltxt}</text>` : '';
    return `<g>${path}${dots}${label}</g>`;
  }).join('');
  const ticks = monthTicks(t0, t1).map((t) => `<line class="axis" x1="${t.x.toFixed(1)}" x2="${t.x.toFixed(1)}" y1="${CY1}" y2="${CY1 + 5}"/><text class="tick" x="${t.x.toFixed(1)}" y="${CY1 + 18}" text-anchor="middle">${t.label}</text>`).join('');
  const singleNotes = series.filter((s) => !s.m.categorical && s.pts.length === 1).map((s) => `${s.m.name}只有 1 次记录，暂不连线`).join('；');
  const mmrcNote = series.some((s) => s.m.categorical) ? '；mMRC 为分类记录，只画节点不连线' : '';
  return `<svg class="chart" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="多指标时间轴：每条线按该指标全部记录范围缩放，不代表不同指标数值可比；mMRC 分类只画节点不连线；共 ${series.length} 条序列">
    ${grid}${ticks}${strip.join('')}${rowLabels}${lines}
    <text class="tick" x="${CX0}" y="${CY1 + 36}">↑ 每条线按该指标全部记录范围缩放，不代表不同指标数值可比${mmrcNote}${singleNotes ? '；' + esc(singleNotes) : ''}</text>
  </svg>`;
}

/* ---------------- 指标卡（3D 翻转 / 分类卡不翻） ---------------- */
function metricCard(code) {
  const m = CATALOG[code];
  const all = seriesAll(code);
  if (!all.length) {
    /* 无记录的指标仍列出，不编分级（23 号：没显示 ≠ 正常） */
    const ct = CTCAE[code];
    return `<div class="ccard" aria-label="${esc(m.name)}：暂无记录">
      <span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}</span>
      <span class="name">${esc(m.name)}</span>
      <span class="val">—<small>${esc(m.unit)}</small></span>
      <span class="na">这个档案里还没有${esc(m.name)}的记录。没显示不等于正常——下次化验后登记进来。${ct ? `有 ${esc(ct.term)} 的 CTCAE 对照区间。` : ''}</span>
      <span class="rec">${btn('＋ 快录一项', 'quick-add', 'soft', 'style="min-height:30px;padding:3px 10px;font-size:11px"')}</span>
    </div>`;
  }
  if (m.categorical) {
    return `<div class="ccard" aria-label="${esc(m.name)}：分类记录，只列各次结果，不做趋势线">
      <span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)} · 分类序列</span>
      <span class="name">${esc(m.name)}</span>
      <span class="val">${fmtNum(all[all.length - 1].v, 0)}<small>${esc(m.unit)}</small></span>
      <span class="vals">${all.slice(-4).map((x) => `<span><b>${esc(x.label || `${fmtNum(x.v, 0)} 级`)}</b><br>${shortDate(x.d)}</span>`).join('')}</span>
      <span class="rec">${all.length} 次记录 · ${shortDate(all[all.length - 1].d)} · 分类记录不连线不翻转</span>
    </div>`;
  }
  const pts = all, last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const diff = prev ? last.v - prev.v : 0;
  const arrow = prev ? (diff > 0 ? '↑' : diff < 0 ? '↓' : '→') : '';
  let grBadge = '', backRange = '';
  if (m.ulnType) {
    const g = altGrade(last.v, last.refHigh);
    if (g.needsUln) {
      grBadge = pill('需参考上限', 'dashed');
      backRange = `×ULN 型指标要按化验单的参考上限分级，但这条记录里没有上限，因此不给级、不近似。`;
    } else {
      grBadge = pill(`对照 CTCAE v5.0 · ${g.g} 级`, g.g >= 3 ? 'red' : g.g === 2 ? 'yellow' : 'grey');
      backRange = `对照 CTCAE v5.0：${g.g} 级区间（${g.range}）· 实测 ${(g.ratio ?? 0).toFixed(2)}×ULN（上限 ${last.refHigh}，来自本次记录）。对照不是诊断。`;
    }
  } else {
    const gr = CTCAE[code] ? ctcaeGrade(code, last.v) : null;
    grBadge = gr ? pill(`对照 CTCAE v5.0 · ${gr.g} 级`, gr.g >= 3 ? 'red' : gr.g === 2 ? 'yellow' : 'grey') : '';
    backRange = CTCAE[code] && gr ? `对照 CTCAE v5.0 ${CTCAE[code].term}：本值落 ${gr.g} 级区间（${gr.range}）。对照不是诊断。` : `全期 ${fmtNum(Math.min(...pts.map((x) => x.v)), m.dec)}–${fmtNum(Math.max(...pts.map((x) => x.v)), m.dec)} ${esc(m.unit)}。`;
  }
  const backPts = pts.slice(-5);
  const bw = 168, bh = 54, bpad = 6;
  const vals = backPts.map((x) => x.v);
  const blo = Math.min(...vals), bhi = Math.max(...vals);
  const bspan = bhi - blo || 1;
  const bx = (i) => bpad + (backPts.length === 1 ? (bw - bpad * 2) / 2 : i / (backPts.length - 1) * (bw - bpad * 2));
  const by = (v) => bh - bpad - (v - blo) / bspan * (bh - bpad * 2);
  const path = backPts.length > 1 ? `<path class="sp-line" d="${smoothPath(backPts.map((x, i) => ({ x: bx(i), y: by(x.v) })))}" stroke="${m.color}" pathLength="1"/>` : '';
  const dots = backPts.map((x, i) => `<circle class="sp-dot" cx="${bx(i).toFixed(1)}" cy="${by(x.v).toFixed(1)}" r="2.8" fill="${m.color}"/>`).join('');
  return `<button class="mcard" aria-pressed="${state.flipped.has(code)}" data-action="flip" data-code="${code}" aria-label="${esc(m.name)}，最新 ${fmtNum(last.v, m.dec)} ${esc(m.unit)}，点击查看最近 ${backPts.length} 次记录与参考区间">
    <span class="mcard-inner">
      <span class="mface front" aria-hidden="true">
        <span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}${m.ulnType ? ' · ×ULN 型' : CTCAE[code] ? ' · 有 CTCAE 对照' : ''}</span>
        <span class="name">${esc(m.name)}${grBadge}</span>
        <span class="val">${fmtNum(last.v, m.dec)}<small>${esc(m.unit)}</small></span>
        <span class="delta">${prev ? `${arrow} 较前次 <em>${diff > 0 ? '+' : ''}${fmtNum(diff, m.dec)}</em>` : '仅 1 次记录'}</span>
        <span class="rec">共 ${pts.length} 次 · ${shortDate(last.d)}</span>
        <span class="meta"><span>${esc(last.src || '')}</span><span class="hint">点开看趋势与区间</span></span>
      </span>
      <span class="mface back" aria-hidden="true">
        <span class="cat">最近 ${backPts.length} 次 · ${esc(m.cat)}</span>
        <span class="name">${esc(m.name)}</span>
        <span class="count">${esc(backRange)}</span>
        <svg class="spark" viewBox="0 0 ${bw} ${bh}" aria-hidden="true"><line class="base" x1="${bpad}" x2="${bw - bpad}" y1="${bh - bpad}" y2="${bh - bpad}"/>${path}${dots}</svg>
        <span class="spark-labels"><span>${esc(shortDate(backPts[0].d))}</span><span>${fmtNum(backPts[0].v, m.dec)} → ${fmtNum(last.v, m.dec)}</span><span>${esc(shortDate(last.d))}</span></span>
        <span class="foot">仅回顾已核对记录 · 对照不是诊断</span>
      </span>
    </span>
  </button>`;
}

/* ================= 看板（双主体 8 入口 + 特色状态卡 + 场景直达） ================= */
function pageDash() {
  const p = profile();
  const m = mem();
  const t = p.treatment;
  const events = p.pleura.events || [];
  const lastEvent = events[events.length - 1];
  const mMRC = (p.metrics.qual.MMRC || []).slice(-1)[0];
  const nextImaging = p.imaging[p.imaging.length - 1];
  const matReady = p.materials.filter((x) => x.state === 'ready').length + Object.values(m.materials).filter((v) => v === 'ready').length;
  const shared = sharedOnly(p);
  const todayTx = t.nextOn || '';
  const txLine = t.pathway === 'CHEMO' ? `化疗第 ${t.chemoCycles.length} 周期已完成 · 下次 D1 ${todayTx}` : `双免疫第 6 周 · 下次输注 ${todayTx}`;
  const selfEntries = [
    ['◷', '今天该治疗吗', txLine, 'treatment', 'calendar', 'S06'],
    ['◐', '胸水记录提醒', lastEvent ? `最近一次：${shortDate(lastEvent.d)} · ${lastEvent.method}（${lastEvent.volumeMl ? lastEvent.volumeMl + 'ml' : '无引流量'}）` : '还没有胸水记录；有就记一条', 'pleura', 'drainage', 'S05'],
    ['▤', '下次复查', nextImaging ? `${nextImaging.next}` : '待医院通知', 'followup', 'schedule', 'S08'],
    ['◎', '看看我的瘤', p.diagnosis, 'tumor', 'molecular', 'S02']
  ];
  const careEntries = [
    ['⌁', '记一次引流', lastEvent ? `上次记录 ${shortDate(lastEvent.d)}；引流量照护士单抄` : '还没有引流记录；今天抽了就记一条', 'pleura', 'drainage', 'S05'],
    ['☰', '材料清单', `${matReady} / ${p.materials.length} 项已备齐 · 只整理材料，不含法律建议`, 'asbestos', 'checklist', 'S04'],
    ['✎', '最近在想的事', `${m.questions.filter((q) => !q.asked).length} 条想问的事待问`, 'care', 'feelings', 'S11'],
    ['◷', '今天他该做什么', t.pathway === 'CHEMO' ? '周期休息日 · 下一周期前按医嘱查血象' : '输注间隔期 · 按医嘱观察，异常随时联系团队', 'treatment', 'calendar', 'S06']
  ];
  const duo = (title, cls, entries) => `<div class="duo-col ${cls}"><span class="duo-tag"><i></i>${title}</span>
    <div class="task-grid">${entries.map(([g, t2, d, page, sub, scene]) => `<button class="task-entry" data-action="go" data-page="${page}" data-sub="${sub}" data-scene="${scene}">
      <span class="entry-icon">${g}</span><b>${esc(t2)}</b><span>${esc(d)}</span><span class="arrow">→</span></button>`).join('')}</div></div>`;
  const recentCards = state.sel[state.profileId].filter((c) => c !== 'MMRC').slice(0, 2);
  /* 36 号 §2.6 病程状态卡四件：卡头 eyebrow / 大字天数（锚点派生，不手填）/ 现状行 / 出口按钮排 */
  const anchorDate = p.pathology?.biopsyDate || '';
  const dayN = anchorDate ? daysBetween(anchorDate, TODAY) + 1 : null;
  const nextRaw = t.nextOn || '';
  const nextDate = (nextRaw.match(/\d{4}-\d{2}-\d{2}/) || [''])[0];
  const nextItem = ((nextRaw.match(/（(.+?)）/) || [])[1] || '下次治疗').split('，')[0];
  const daysToNext = nextDate ? daysBetween(TODAY, nextDate) : null;
  const stageState = t.pathway === 'CHEMO' ? '化疗周期进行中（以医嘱原文为准）' : '双免疫疗程进行中（以医嘱原文为准）';
  const primerBtn = `<button class="soft" data-primer-open aria-label="疾病概要：定义、医学资料与指南情况、治疗全景、发展趋势">疾病概要：恶性胸膜间皮瘤是什么？</button>`;
  const statusCard = anchorDate && dayN !== null ? `
    <section class="status-card" data-product="病程状态卡" aria-label="病程状态卡">
      <div class="sc-head">
        <span class="eyebrow">D+${dayN} 状态卡 · 距${esc(nextItem)}${daysToNext !== null ? ` ${daysToNext} 天` : ''}</span>
        <span class="sc-anchor">锚点：确诊日 ${longDate(anchorDate)} · Day 0</span>
      </div>
      <div class="sc-main">
        <div class="sc-day"><b>第 ${dayN} 天</b><span>由确诊日自动计算，不手填</span></div>
        <div class="sc-now">
          <p class="sc-stage">${esc(p.stageLine)}</p>
          <p class="sc-state"><b>状态</b>${esc(stageState)}${nextDate ? ` · <b>下次</b>：${longDate(nextDate)}（${esc(nextItem)}）` : ''}</p>
        </div>
      </div>
      <div class="actions sc-actions">
        ${go('看治疗日历（按天）→', 'treatment', 'calendar', 'primary')}
        ${primerBtn}
      </div>
    </section>` : `
    <section class="status-card pending" data-product="病程状态卡" aria-label="病程状态卡">
      <div class="sc-head"><span class="eyebrow">状态卡 · 待初始化</span><span class="sc-anchor">没有锚点日，天数不手填</span></div>
      <div class="sc-main">
        <div class="sc-day"><b>待初始化</b><span>锚点：确诊日（待登记）</span></div>
        <div class="sc-now">
          <p class="sc-state"><b>三步</b>①在「我的瘤与弯路 · 病理三型」登记确诊日 → ②核对病理报告原文 → ③回看板生成「第 N 天」与下次日期</p>
        </div>
      </div>
      <div class="actions sc-actions">
        ${go('去登记确诊日 →', 'tumor', 'pathology', 'primary')}
        ${primerBtn}
      </div>
    </section>`;
  return `${head('看板', SUBTITLES.dash, aiBtn())}
    ${statusCard}
    <div class="duo">${duo('本人 · 现在可以做', 'self', selfEntries)}${duo('照护者 · 现在可以做', 'care', careEntries)}</div>
    <div class="scene-strip" aria-label="13 个场景直达（演示导航）"><span class="lab">场景直达：</span>${SCENES.map(([k, n]) => `<button class="scene-chip" data-action="scene" data-scene="${k}" aria-label="场景 ${k} ${n}">${k} ${n}</button>`).join('')}</div>
    <div class="change-strip" data-product="特色状态卡">
      <div class="chg"><span>最近胸水事件</span><b>${lastEvent ? `${longDate(lastEvent.d)} · ${esc(lastEvent.method)}${lastEvent.volumeMl ? ` · ${lastEvent.volumeMl}ml` : ''}` : '—'}</b><p>胸穿/引流/固定术分轨道记录；判读归呼吸团队</p></div>
      <div class="chg"><span>mMRC 现分级</span><b>${mMRC ? `${mMRC.label} · ${longDate(mMRC.d)}` : '—'}</b><p>${mMRC ? esc(mMRC.context) : '还没有分级记录'}</p></div>
      <div class="chg"><span>材料清单进度</span><b>${matReady} / ${p.materials.length} 项已备齐</b><p>本清单只整理材料，不含法律建议</p></div>
      <div class="actions">${go('看胸水事件轨道', 'pleura', 'events', 'soft')}${go('看 CT 并列', 'imaging', 'parallel', 'soft')}</div>
    </div>
    ${section('接下来 · 指标卡', '点数值卡翻到背面看参考区间与最近 5 次；分类记录（mMRC）不翻不连线。', go('看病情一图秀', 'chart', '', 'primary'))}
    <div class="dash-cols">
      <div class="metric-grid">${recentCards.map(metricCard).join('')}${metricCard('MMRC')}${metricCard(state.profileId === 'demo1' ? 'WBC' : 'ALT')}</div>
      <div class="stack">
        <div class="card accent">
          <div class="card-head"><div><h3>双主体说明</h3><p>照护者代记的条目带「照护者代记」徽章；私密感受默认不进摘要、导出与 AI 上下文。</p></div>${pill(`已隐藏 ${privateCount(p)} 条私密记录`, 'mist')}</div>
          <p class="small-note" style="margin:0">本页摘要只引用已登记事实与报告原文；${esc(DATA.meta.disclaimer)}</p>
        </div>
        <div class="card" data-product="想问的事">
          <div class="card-head"><div><h3>想问的事</h3><p>${m.questions.filter((q) => !q.asked).length} 条待问 · ${m.questions.length} 条累计</p></div>${go('去问题清单', 'imaging', 'questions')}</div>
          ${m.questions.slice(0, 2).map((q) => `<div class="row"><div class="row-main"><div><b>${esc(q.text)}</b><p>${esc(q.src)}</p></div></div>${pill(q.asked ? '已问' : '待问', q.asked ? 'green' : 'grey')}</div>`).join('') || '<p class="small-note" style="margin:0">还没有记录。</p>'}
        </div>
      </div>
    </div>`;
}

/* ================= 我的瘤与弯路 ================= */
const MOL_META = {
  detected: { label: '检出', cls: 'green' },
  not_detected: { label: '未检出', cls: 'grey' },
  not_tested: { label: '未检测', cls: 'dashed' }
};
function pageDetour() {
  const p = profile();
  const list = [...p.detour, ...mem().detours];
  return `${pageHeadFor('初诊印象 / 检查 / 转诊逐段卡片；只记原文，不判医生，不说"当初误诊了"。', btn('＋ 记一段', 'detour-add', 'primary'))}
    <div class="card" data-product="弯路轨道">
      <div class="detour-line">
        ${list.map((x, i) => `<div class="detour-card${i === list.length - 1 ? ' end' : ''}">
          <span class="tl-dot" aria-hidden="true"></span>
          <div class="detour-body">
            <div class="det-head"><b>${esc(x.stage)}</b><span class="place">${longDate(x.d)} · ${esc(x.place)}</span>${x.witnessed ? pill('照护者代记', 'mist') : ''}</div>
            <blockquote>初诊印象：${esc(x.impression)}</blockquote>
            <div class="kv"><span><b>检查：</b>${esc(x.exams)}</span><span><b>转诊：</b>${esc(x.referral)}</span>${x.note ? `<span class="muted">${esc(x.note)}</span>` : ''}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>这一页不做什么</h3></div></div>
        <div class="flag-list"><div>不写"误诊"判定——初诊印象只抄当时的原文</div><div>不评价任何机构与医生</div><div>弯路段可随时补记，补记=新增版本</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>弯路之后</h3></div></div>
        <div class="flag-list"><div>确诊当段会接「病理三型」与「报告原文」</div><div>照护者代记的段落在「照护者代记与家事」留痕</div></div>
        <div class="actions" style="margin-top:12px">${go('看病理三型', 'tumor', 'pathology', 'soft', 'data-step="to-pathology"')}${go('看报告原文', 'tumor', 'reports', 'soft', 'data-step="to-reports"')}${go('看照护者代记', 'care', 'family', 'soft', 'data-step="to-family"')}</div>
      </div>
    </div>`;
}
function pagePathology() {
  const p = profile();
  const pa = p.pathology;
  const TYPES = [
    { key: 'epithelioid', name: '上皮样型', desc: '三种病理亚型中最常见的一型；"亚型"是病理分类名词，具体含义请医生结合报告解释。', flag: '不做预后推断、不给生存数字' },
    { key: 'sarcomatoid', name: '肉瘤样型', desc: '三种病理亚型之一；形态学与治疗反应的关系由病理与治疗团队解释，本页不判断。', flag: '不做预后推断、不给生存数字' },
    { key: 'biphasic', name: '双相型', desc: '同时含上皮样与肉瘤样两种成分的亚型；成分比例写在报告原文里，本页照抄不解读。', flag: '不做预后推断、不给生存数字' }
  ];
  return `${pageHeadFor('病理三型对照卡 + 本例病理；"上皮样型是好还是坏"这类问题，本页只解释名词，判断归病理与治疗团队。')}
    <div class="notice blue"><b>三型对照是名词解释，不是病情判断。</b>本例是哪一型、意味着什么，请医生结合报告原文说明；本页不推算预后、不给任何生存数字。</div>
    <div class="type-cards" data-product="三型对照">
      ${TYPES.map((t) => `<div class="type-card${t.key === pa.type ? ' mine' : ''}">
        <h3>${esc(t.name)}${t.key === pa.type ? pill('本例', 'blue') : ''}</h3>
        <p>${esc(t.desc)}</p>
        <div class="flag">${esc(t.flag)}</div>
      </div>`).join('')}
    </div>
    <div class="card" style="margin-top:14px" data-product="本例病理">
      <div class="card-head"><div><span class="eyebrow">${longDate(pa.biopsyDate)} · ${esc(pa.hospital)}</span><h2 style="margin-top:4px">本例病理：${esc(pa.typeLabel)}</h2><p>${esc(pa.method)}</p></div>${moreMenu([['改这一条', 'manual-edit', 'data-code="pathology"']])}</div>
      <blockquote class="reaction-quote">${esc(pa.excerpt)}</blockquote>
      <div class="table-wrap"><table><thead><tr><th>免疫组化</th><th>结果（原文）</th><th>名词解释</th></tr></thead><tbody>
        ${pa.ihc.map((x) => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.value)}</td><td class="muted">${esc(x.meaning)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">组合判读归病理医生；本页每项都可回「报告原文」页签查出处。</p>
      <div class="actions" style="margin-top:10px">${go('看报告原文', 'tumor', 'reports', 'soft', 'data-step="to-reports"')}</div>
    </div>`;
}
function pageMolecular() {
  const p = profile();
  const items = p.molecular;
  const n = { detected: 0, not_detected: 0, not_tested: 0 };
  items.forEach((x) => n[x.status]++);
  return `${pageHeadFor('每项标志物按 检出 / 未检出 / 未检测 三态记录；"BAP1 阴性什么意思"——解释不是判断。')}
    <div class="notice blue" data-product="三态档案"><b>未检测不等于阴性。</b>报告里没有的项目按「未检测」记，不会补成阴性；${n.not_tested} 项未检测属于正常情况，是否补测由医生结合方案决定。</div>
    <div class="mol-grid">
      ${items.map((x) => {
    const meta = MOL_META[x.status];
    return `<div class="mol-card${x.status === 'not_tested' ? ' notested' : ''}">
          <div class="mol-head"><b>${esc(x.marker)}</b>${pill(meta.label, meta.cls)}</div>
          ${x.value ? `<div class="val">报告原文：${esc(x.value)}</div>` : ''}
          <p>${esc(x.explain)}</p>
          <div class="mol-meta">${x.method ? `方法 ${esc(x.method)} · ${esc(x.date)}` : '未送检 · 无方法与日期'}</div>
          <div class="actions" style="margin-top:9px">${btn('把这个问题记下来', 'q-from-term', 'soft', `data-term="${esc(x.marker)}"`)}</div>
        </div>`;
  }).join('')}
    </div>
    <p class="small-note">本页解释是「名词解释」不是「病情判断」；对治疗与预后的含义请医生结合全部结果说明。问题会存进「问题清单」页签。</p>
    <div class="actions" style="margin-top:10px">${go('去问题清单', 'imaging', 'questions', 'soft', 'data-step="to-questions"')}</div>`;
}
function pageReports() {
  const p = profile();
  return `${pageHeadFor('逐项回原文：每份报告的日期、类型与摘录；原件留在你的资料目录。')}
    <div class="card" data-product="报告原文">
      <div class="table-wrap"><table><thead><tr><th>日期</th><th>类型</th><th>标题</th><th>摘录（原文）</th><th></th></tr></thead><tbody>
        ${p.reports.map((r) => `<tr><td class="num">${esc(r.d)}</td><td>${pill(r.kind, r.kind === '病理报告' ? 'blue' : 'grey')}</td><td><b>${esc(r.title)}</b></td><td style="min-width:220px">${esc(r.excerpt)}</td><td>${btn('看原文', 'src', 'text-button', `data-src="${esc(r.kind)} · ${esc(r.d)}"`)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">"摘录"列照抄报告；需要完整原件时到「资料库」查档。若报告有更新版本，将作为新版本登记，不覆盖旧记录。</p>
    </div>`;
}

/* ================= 石棉与材料 ================= */
function pageExposure() {
  const p = profile();
  const list = [...p.exposure, ...mem().exposures];
  const dxYear = Number(String(p.detour[p.detour.length - 1].d).slice(0, 4));
  const lat = list.map((x) => {
    const y = Number(String(x.to).slice(0, 4));
    return `${x.from.slice(0, 4)}–${x.to.slice(0, 4)} 段距确诊年：${dxYear - y} 年`;
  }).join('；');
  return `${pageHeadFor('把散落的记忆整理成年代段卡：年代 / 工种 / 场所 / 防护；只记事实，不出职业病判定。', btn('＋ 记一段', 'expo-add', 'primary'))}
    <div class="exp-line" data-product="暴露时间线">
      ${list.map((x) => `<div class="exp-card${x.state === 'unverified' ? ' unverified' : ''}">
        <div class="era">${esc(x.from)}<br>→ ${esc(x.to)}<small>${x.state === 'unverified' ? '待核实' : '已记录'}</small></div>
        <div class="kv">
          <span><b>场所：</b>${esc(x.place)}</span>
          <span><b>工种：</b>${esc(x.job)}</span>
          <span><b>接触物：</b>${esc(x.hazard)}</span>
          <span><b>防护：</b>${esc(x.protection)}</span>
          ${x.note ? `<span class="muted">${esc(x.note)}</span>` : ''}
        </div>
      </div>`).join('')}
    </div>
    <div class="latency"><b>潜伏期年数（只做算术）：</b>${esc(lat)}。这只是"结束年份到确诊年份"的减法结果，不构成任何因果表述；因果判断归职业病诊断机构。</div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>这一页不做什么</h3></div></div>
        <div class="flag-list"><div>不出"你这是职业病"的判定</div><div>不评价工厂责任</div><div>记忆不确定的段落标「待核实」，等证言或档案补证</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>下一步</h3></div></div>
        <div class="flag-list"><div>把暴露段对齐到「材料清单」第 1 项（职业史与接触史）</div><div>问答与跟进里留痕：问了什么、对方答了什么</div></div>
        <div class="actions" style="margin-top:12px">${go('去材料清单', 'asbestos', 'checklist', 'soft')}${go('问答与跟进', 'asbestos', 'qanda', 'soft', 'data-step="to-qanda"')}</div>
      </div>
    </div>`;
}
function pageChecklist() {
  const p = profile();
  const m = mem();
  const rows = p.materials.map((x) => {
    const ov = m.materials[x.id];
    const st = ov || x.state;
    return { ...x, st };
  });
  const ready = rows.filter((x) => x.st === 'ready').length;
  const partial = rows.filter((x) => x.st === 'partial').length;
  return `${pageHeadFor('逐项勾选状态：备齐 / 部分 / 未备齐；清单来自职业病诊断材料要素，只整理材料。')}
    <div class="notice legal"><b>本清单只整理材料，不含法律建议。</b>本产品不提供法律建议；办什么、怎么办，请咨询诊断机构或正规法律渠道。</div>
    <div class="mat-progress" data-product="清单状态">
      <b>${ready} / ${rows.length} 项已备齐${partial ? ` · ${partial} 项部分备齐` : ''}</b>
      <div class="progress"><i style="width:${Math.round(ready / rows.length * 100)}%"></i></div>
      ${pill('三态勾选', 'grey')}
    </div>
    <div class="mat-list">
      ${rows.map((x) => `<div class="mat-row${x.st === 'ready' ? ' done' : ''}">
        <input type="checkbox" ${x.st === 'ready' ? 'checked' : ''} data-action="mat-check" data-id="${x.id}" ${x.st === 'partial' ? 'data-partial="1"' : ''} aria-label="${esc(x.name)}：当前${x.st === 'ready' ? '已备齐' : x.st === 'partial' ? '部分备齐' : '未备齐'}，点击切换">
        <div class="mat-main"><b>${esc(x.name)}</b><p><b class="muted">为什么：</b>${esc(x.why)}${x.note ? ` · ${esc(x.note)}` : ''}</p></div>
        ${pill(x.st === 'ready' ? '已备齐' : x.st === 'partial' ? '部分备齐' : '未备齐', x.st === 'ready' ? 'green' : x.st === 'partial' ? 'yellow' : 'grey')}
        ${x.id === 'm8' ? go('授权开关', 'asbestos', 'qanda', 'text-button', 'data-step="to-witness"') : ''}
      </div>`).join('')}
    </div>
    <p class="small-note">勾选状态保存在本页（演示仅内存）；清单依据的是职业病诊断材料要素（职业史、接触史、临床表现与辅助检查等），只做整理，不做补办指引。</p>`;
}
function pageQanda() {
  const p = profile();
  const list = [...p.qa, ...mem().qas];
  const w = { ...p.witness, ...(mem().witness || {}) };
  return `${pageHeadFor('问了什么、谁答的、原话是什么——逐条留痕；证言人信息默认 private。', btn('＋ 记一问一答', 'qa-add', 'primary'))}
    <div data-product="问答留痕">
      ${list.map((x) => `<div class="qa-item">
        <div class="qa-q"><span class="d">${longDate(x.d)}</span>${esc(x.q)}</div>
        <blockquote>${esc(x.a)}</blockquote>
        <span class="place">答复方：${esc(x.place)}</span>
      </div>`).join('') || '<div class="empty"><h3>还没有问答留痕</h3><p>问过窗口或医生后，把问题与答复原文各记一条。</p></div>'}
    </div>
    <div class="witness-box" style="margin-top:16px" data-product="证言人授权">
      <h3>工友证言 · 专项授权（涉第三方个人信息）</h3>
      <p>${esc(w.note)}</p>
      ${w.granted ? `<p><b>已授权（演示）：</b>证言人信息可在本页录入；仍默认 private，不进导出。</p><div class="private"><h3>证言人信息（private）</h3><p>${esc(w.fields || '（待录入）')}</p></div>` : `<div class="switch-row"><input type="checkbox" id="witness-switch" data-action="witness-auth" aria-describedby="witness-note"><span id="witness-note">勾选代表「证言人本人已同意录入其信息」（演示开关）；不勾选时这里不录入任何证言人信息。</span></div>`}
    </div>
    <div class="help-box">证言人信息默认 private：不进看板摘要、不进导出、不默认进入 AI 上下文（三出口同一过滤）。材料页签与授权状态互相联动。</div>`;
}

/* ================= 治疗档案 ================= */
function pageCycles() {
  const p = profile();
  const t = p.treatment;
  if (t.pathway !== 'CHEMO' || !t.chemoCycles.length) {
    return `${pageHeadFor('化疗周期计划与实际分开留痕。')}
      <div class="empty" data-product="空态"><h3>这个档案走的是双免疫路径</h3><p>化疗周期记录为空（不编数据）；输注记录在「双免与反应原文」页签。</p>
      <div class="actions" style="justify-content:center;margin-top:12px">${go('去看双免与反应原文', 'treatment', 'immune', 'soft', 'data-step="to-reaction"')}</div></div>`;
  }
  return `${pageHeadFor('计划与实际分开：方案、周期、延迟与调整逐行留痕；本页不判疗效。')}
    <div class="plan-card" data-product="周期记录">
      <div><span class="eyebrow">当前方案（医嘱原文语境）</span><div class="big">${esc(t.regimen)}</div>
        <p class="small-note" style="margin-top:6px">下次：${esc(t.nextOn)}</p></div>
      ${pill(`已完成 ${t.chemoCycles.length} 周期`, 'blue')}
    </div>
    <div class="card" style="margin-top:14px">
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>周期</th><th>开始（计划）</th><th>实际执行</th><th>延迟</th><th>调整（医嘱原文）</th></tr></thead><tbody>
        ${t.chemoCycles.map((c, i) => `<tr class="${i === t.chemoCycles.length - 1 ? 'next' : ''}"><td class="num"><b>第 ${c.n} 周期</b></td><td class="num">${esc(c.from)}</td><td>${esc(c.took)}</td><td class="num">${c.delayDays ? `顺延 ${c.delayDays} 天` : '—'}</td><td>${esc(c.adjust || '—')}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">实际执行列照抄出院小结与输液卡；本页不做疗效判断，反应模式见「双免与反应原文」（本档案为化疗路径则无）。</p>
    </div>
    <div class="actions" style="margin-top:14px">${go('去治疗日历', 'treatment', 'calendar', 'soft')}${go('看双免与反应原文', 'treatment', 'immune', 'soft', 'data-step="to-reaction"')}${go('看方案与变更', 'treatment', 'changes', 'soft')}</div>`;
}
function pageImmune() {
  const p = profile();
  const t = p.treatment;
  if (t.pathway !== 'IMMUNE' || !t.immuneInfusions.length) {
    return `${pageHeadFor('免疫治疗输注与反应模式原文。')}
      <div class="empty" data-product="空态"><h3>这个档案走的是化疗路径</h3><p>双免输注记录为空（不编数据）；化疗周期在「周期与用药」页签。</p>
      <div class="actions" style="justify-content:center;margin-top:12px">${go('去看周期与用药', 'treatment', 'cycles', 'soft')}${go('看方案与变更', 'treatment', 'changes', 'soft', 'data-step="to-changes"')}</div></div>`;
  }
  return `${pageHeadFor('输注逐次登记；反应模式只抄报告原文（iRECIST 语境），本页不判疗效、不解释"是好消息还是坏消息"。')}
    <div class="plan-card" data-product="输注记录">
      <div><span class="eyebrow">当前方案（医嘱原文语境）</span><div class="big">双免疫输注<small>纳武利尤单抗 + 伊匹木单抗</small></div>
        <p class="small-note" style="margin-top:6px">${esc(t.regimen)}</p></div>
      ${pill(`已输注 ${t.immuneInfusions.length} 次`, 'blue')}
    </div>
    <div class="card" style="margin-top:14px">
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>次数</th><th>日期</th><th>药物与剂量（医嘱原文）</th><th>当日反应（记录原文）</th><th></th></tr></thead><tbody>
        ${t.immuneInfusions.map((f) => `<tr><td class="num"><b>第 ${f.n} 次</b></td><td class="num">${esc(f.d)}</td><td>${esc(f.drugs)}</td><td style="min-width:180px">${esc(f.reaction || '—')}</td><td>${authorTag(f.author)}</td></tr>`).join('')}
      </tbody></table></div>
    </div>
    ${t.reactionMode ? `<div class="card" style="margin-top:14px" data-product="反应模式原文">
      <div class="card-head"><div><h3>反应模式（报告原文照抄）</h3><p>${esc(t.reactionMode.src)}</p></div>${pill('原文语境', 'blue')}</div>
      <blockquote class="reaction-quote">「${esc(t.reactionMode.excerpt)}」（${longDate(t.reactionMode.d)}）</blockquote>
      <p class="small-note">${esc(t.reactionMode.pending)}</p>
    </div>` : ''}
    <p class="small-note" style="margin-top:12px">免疫相关不良事件随访项目（如甲功）见「方案与变更」；数值变化由医生解读。</p>
    <div class="actions" style="margin-top:10px">${go('看方案与变更', 'treatment', 'changes', 'soft', 'data-step="to-changes"')}</div>`;
}
function pageChanges() {
  const p = profile();
  const list = p.treatment.changes || [];
  return `${pageHeadFor('变更留痕：改过什么、什么时候、依据是什么；旧记录保留，不覆盖。')}
    <div class="card" data-product="变更留痕">
      ${list.map((c) => `<div class="row">
        <div class="row-main"><div><b>${esc(c.item)}</b><p>${esc(c.detail)}</p><p class="muted">${esc(c.note)}</p></div></div>
        <div style="text-align:right">${pill(longDate(c.d), 'grey')}</div>
      </div>`).join('') || '<div class="empty"><h3>还没有变更记录</h3><p>方案调整后，把医嘱原文逐条登记在这里。</p></div>'}
    </div>
    <div class="help-box">更正=新增版本：登记新记录并保留旧记录，本台不出现"不可恢复"的删除。本页不判疗效、不解释方案优劣。</div>`;
}
function calGrid(fromDate, days, marks, today) {
  const cells = [];
  const start = new Date(Date.parse(fromDate));
  const lead = (start.getDay() + 6) % 7;
  for (let i = 0; i < lead; i += 1) cells.push('<div class="cal-cell pad"></div>');
  for (let i = 0; i < days; i += 1) {
    const d = addDays(fromDate, i);
    const mk = marks[d];
    cells.push(`<div class="cal-cell${mk ? ' tx' : ''}${d === today ? ' today' : ''}"><span class="d">${Number(d.slice(8, 10))}</span>${mk ? `<span class="t">${esc(mk)}</span>` : ''}</div>`);
  }
  return `<div class="cal-grid">${cells.join('')}</div>`;
}
function pageCalendar() {
  const p = profile();
  const t = p.treatment;
  const marks = {};
  if (t.pathway === 'CHEMO') t.chemoCycles.forEach((c) => { marks[c.from] = `C${c.n} D1`; });
  if (t.pathway === 'IMMUNE') t.immuneInfusions.forEach((f) => { marks[f.d] = `输注 #${f.n}`; });
  const nd = (t.nextOn.match(/2026-\d\d-\d\d/) || [null])[0];
  if (nd) marks[nd] = t.pathway === 'CHEMO' ? 'C4 D1（待血象）' : 'NIVO #4 + IPI #2';
  const monday = new Date(Date.parse(TODAY));
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const from = addDays(monday.toISOString().slice(0, 10), 0);
  const isTxToday = t.pathway === 'CHEMO'
    ? t.chemoCycles.some((c) => daysBetween(c.from, TODAY) >= 0 && daysBetween(c.from, TODAY) <= 20)
    : t.immuneInfusions.some((f) => daysBetween(f.d, TODAY) === 0);
  return `${pageHeadFor('未来两周的治疗日程与打卡；"今天该治疗吗"的答案以医嘱为准，本页只对日期。', btn('＋ 记一次治疗', 'tx-add', 'primary'))}
    <div class="cal-wrap">
      <div class="card" data-product="治疗日历">
        <div class="cal-head"><b>${from.slice(0, 7)} 起两周</b><span class="muted">周一开头 · 框出今天</span></div>
        ${calGrid(from, 14, marks, TODAY)}
        <div class="cal-legend"><span><i></i>治疗日（计划/实际）</span><span><i class="dot" style="border-radius:50%;background:var(--action);border:0"></i>今天</span></div>
      </div>
      <div class="rt-count" data-product="周期记录">
        <span class="eyebrow">今天该治疗吗</span>
        <div class="big">${isTxToday ? '治疗日' : '休息日'}</div>
        <p class="small-note" style="margin-top:6px">${esc(t.nextOn)}</p>
        <div class="actions" style="margin-top:12px;flex-direction:column;align-items:stretch">
          ${btn(isTxToday ? '打卡：今天已完成' : '打卡：今天按医嘱休息', 'tx-log', 'soft')}
        </div>
        <p class="small-note" style="margin-top:8px">打卡=登记一条当日记录（演示仅内存）；是否调整方案由治疗团队判断。</p>
      </div>
    </div>
    <div class="actions" style="margin-top:14px">${go('看周期与用药', 'treatment', 'cycles', 'soft', 'data-step="to-cycles"')}${go('看双免与反应原文', 'treatment', 'immune', 'soft', 'data-step="to-reaction"')}${go('看方案与变更', 'treatment', 'changes', 'soft', 'data-step="to-changes"')}</div>`;
}

/* ================= 胸水与呼吸 ================= */
const PLEURA_KIND = { thoracentesis: '胸腔穿刺', 'drain-tube': '置管引流', pleurodesis: '胸膜固定术' };
function pageEvents() {
  const p = profile();
  const list = p.pleura.events.slice().reverse();
  return `${pageHeadFor('胸穿 / 引流 / 固定术独立事件轨道（日期/方式/部位/引流量）；胸水是治疗线的一等公民。')}
    <div class="pleura-track" data-product="事件轨道">
      ${list.map((e) => `<div class="pleura-card ${e.kind}">
        <span class="tl-dot" aria-hidden="true"></span>
        <div class="pleura-body">
          <div class="pl-main">
            <b>${esc(PLEURA_KIND[e.kind])} · ${esc(e.side)}</b>
            <div class="kv"><span>${longDate(e.d)} · ${esc(e.method)}</span><span>${esc(e.relief && e.relief !== '—' ? `缓解：${e.relief}` : '')}</span>${e.note ? `<span class="muted">${esc(e.note)}</span>` : ''}</div>
          </div>
          <div class="vol">${e.volumeMl != null ? `<b>${e.volumeMl}</b><small>ml</small>` : ''}${authorTag(e.author)}</div>
        </div>
      </div>`).join('') || '<div class="empty"><h3>还没有胸水事件</h3><p>从「引流与缓解」记第一条。</p></div>'}
    </div>
    <div class="actions" style="margin-top:14px">${go('去记一次引流', 'pleura', 'drainage', 'soft', 'data-step="to-drainage"')}${go('看胸膜固定术', 'pleura', 'pleurodesis', 'soft', 'data-step="to-pleurodesis"')}${go('看胸水生化', 'labs', 'effusion', 'soft')}</div>
    <p class="small-note" style="margin-top:10px">本台不判断"该不该再抽"；引流量是否处理由呼吸团队决定。</p>`;
}
function pageDrainage() {
  const p = profile();
  const m = mem();
  const all = [...p.pleura.events.filter((e) => e.volumeMl != null), ...m.drainages].sort((a, b) => a.d < b.d ? -1 : 1);
  const total = all.reduce((s, e) => s + (e.volumeMl || 0), 0);
  return `${pageHeadFor('引流量与当日缓解逐条记录；照护者代记带徽章；本台不建议"该不该再抽"。', btn('＋ 记一次引流', 'drain-add', 'primary'))}
    <div class="stat-band" style="margin:0 0 14px;padding-top:0;border-top:0" data-product="事件卡">
      <span><b>${all.length}</b>条引流记录</span><span><b>${total}</b>ml 累计（演示窗口内）</span><span><b>${all.filter((e) => e.author === 'CAREGIVER').length}</b>条照护者代记</span>
    </div>
    <div class="card">
      ${all.slice().reverse().map((e) => `<div class="row">
        <div class="row-main"><div><b>${longDate(e.d)} · ${esc(e.method)}</b><p>${e.relief && e.relief !== '—' ? `缓解：${esc(e.relief)} · ` : ''}${esc(e.note || '')}</p></div></div>
        <div style="text-align:right"><b style="font-size:16px">${e.volumeMl}</b><small> ml</small><br>${authorTag(e.author)}</div>
      </div>`).join('')}
    </div>
    <div class="actions" style="margin-top:14px">${go('看胸水事件轨道', 'pleura', 'events', 'soft', 'data-step="to-events"')}${go('看胸膜固定术', 'pleura', 'pleurodesis', 'soft', 'data-step="to-pleurodesis"')}</div>
    <p class="small-note" style="margin-top:10px">引流曲线可在「病情一图秀」里与体重、mMRC 同框看（每条线按自身范围缩放）。</p>`;
}
function pagePleurodesis() {
  const p = profile();
  const list = p.pleura.events.filter((e) => e.kind === 'pleurodesis');
  if (!list.length) {
    return `${pageHeadFor('胸膜固定术留痕：日期、医院、方式与术后记录。')}
      <div class="empty" data-product="空态"><h3>这个档案没有胸膜固定术记录</h3><p>胸水处理走的是置管引流（见「胸水事件轨道」）；发生过固定术再登记，不编数据。</p>
      <div class="actions" style="justify-content:center;margin-top:12px">${go('看胸水事件轨道', 'pleura', 'events', 'soft')}</div></div>`;
  }
  return `${pageHeadFor('胸膜固定术留痕：日期、医院、方式与术后记录；术后发热等症状照抄记录原文。', btn('＋ 登记固定术', 'pld-add', 'primary'))}
    ${list.map((e) => `<div class="card" style="margin-bottom:14px" data-product="固定术留痕">
      <div class="card-head"><div><span class="eyebrow">${longDate(e.d)} · ${esc(e.side)}</span><h2 style="margin-top:4px">${esc(e.method)}</h2></div>${authorTag(e.author)}</div>
      <div class="kv" style="display:grid;gap:4px;font-size:12px"><span><b>缓解：</b>${esc(e.relief)}</span><span><b>备注：</b>${esc(e.note)}</span></div>
    </div>`).join('')}
    <div class="help-box">固定术的疗效评估（是否复张、是否再积液）归胸外科与呼吸团队；本页只留痕。</div>`;
}
function pageSymptoms() {
  const p = profile();
  const list = [...p.pleura.symptoms, ...mem().symptoms].sort((a, b) => a.d < b.d ? -1 : 1).reverse();
  return `${pageHeadFor('气促与胸痛并排记录；与胸水事件、治疗并排看，不写因果。', btn('＋ 记一次症状', 'sym-add', 'primary'))}
    <div class="sym-duo" data-product="症状轨道">
      <div class="sym-col"><h3>气促</h3>
        ${list.filter((x) => x.breathless && x.breathless !== '—').map((x) => `<div class="sym-item"><b>${longDate(x.d)}</b><p>${esc(x.breathless)}</p></div>`).join('') || '<p class="small-note">暂无记录。</p>'}
      </div>
      <div class="sym-col"><h3>胸痛（自评 0–10）</h3>
        ${list.filter((x) => x.pain && x.pain !== '—').map((x) => `<div class="sym-item"><b>${longDate(x.d)}</b><p>${esc(x.pain)}</p></div>`).join('') || '<p class="small-note">暂无记录。</p>'}
      </div>
    </div>
    <div class="actions" style="margin-top:14px">${go('看 mMRC 分级卡', 'labs', 'mmrc', 'soft', 'data-step="to-mmrc"')}${go('看胸水事件轨道', 'pleura', 'events', 'soft')}</div>
    <p class="small-note" style="margin-top:10px">症状强度与治疗、胸水事件同一段时间并排展示（见病情一图秀）；并排≠因果。</p>`;
}

/* ================= 血象与指标 ================= */
function pageBlood() {
  const p = profile();
  const codes = ['WBC', 'ANC', 'PLT', 'HGB', 'ALT'];
  const groups = [
    ['血象（化疗骨髓抑制对照）', codes.filter((c) => CATALOG[c].cat === '血象')],
    ['肝功能（免疫监测 · ×ULN 型）', codes.filter((c) => CATALOG[c].cat === '肝功能')]
  ];
  return `${pageHeadFor('分组卡 + 分级徽章 + 背面区间；×ULN 型缺参考上限就明写，不拿通用上限凑倍数。', btn('＋ 快录一项', 'quick-add', 'primary'))}
    <div class="notice blue"><b>两种指标两套处理：</b>血象四项按 CTCAE v5.0 绝对阈值对照；ALT 属 ×ULN 型，必须用<b>这张化验单自带</b>的参考上限，缺上限时给虚线徽章「需参考上限」，不给级、不近似。对照不是诊断。</div>
    ${groups.map(([g, arr]) => `<div class="metric-group" data-product="血象卡">
      <div class="metric-group-head"><h3>${esc(g)}</h3><span>${arr.length} 项${g.includes('血象') ? ' · 有 CTCAE 对照' : ''}</span></div>
      <div class="metric-grid">${arr.map(metricCard).join('')}</div>
    </div>`).join('')}
    <div class="metric-group"><div class="metric-group-head"><h3>体格与代谢</h3><span>趋势见病情一图秀</span></div>
      <div class="metric-grid">${metricCard('WEIGHT')}</div>
    </div>
    <div class="help-box">分组次序与「病情一图秀」左侧指标列表同源（单一来源）；无记录的指标仍列出——没显示 ≠ 正常。</div>
    <div class="actions" style="margin-top:10px">${go('看胸水生化', 'labs', 'effusion', 'soft', 'data-step="to-effusion"')}${go('看 mMRC 分级卡', 'labs', 'mmrc', 'soft', 'data-step="to-mmrc"')}</div>`;
}
function pageEffusion() {
  const p = profile();
  const list = p.effusionLabs || [];
  if (!list.length) {
    return `${pageHeadFor('胸水化验原值。')}
      <div class="empty" data-product="空态"><h3>这个档案还没有胸水生化记录</h3><p>下次胸穿时把化验单拍照导入「资料库」，核对后自动进入这里。</p></div>`;
  }
  return `${pageHeadFor('胸水常规与生化原值照抄；渗出液/漏出液的判读归呼吸团队，本页不做。')}
    <div class="card" data-product="胸水生化">
      <div class="table-wrap"><table><thead><tr><th>日期</th><th>总蛋白 g/L</th><th>LDH U/L</th><th>ADA U/L</th><th>葡萄糖 mmol/L</th><th>有核细胞 ×10⁶/L</th><th>来源</th></tr></thead><tbody>
        ${list.map((x) => `<tr><td class="num"><b>${esc(x.d)}</b></td><td class="num">${x.prot}</td><td class="num">${x.ldh}</td><td class="num">${x.ada}</td><td class="num">${x.gluc}</td><td class="num">${x.cells}</td><td class="muted" style="min-width:150px">${esc(x.src)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">Light 标准等判读口径不在本台做；数值只对照化验单原文。</p>
    </div>
    <div class="actions" style="margin-top:14px">${go('看胸水事件轨道', 'pleura', 'events', 'soft')}${go('看血象与 CTCAE', 'labs', 'blood', 'soft')}${go('看 mMRC 分级卡', 'labs', 'mmrc', 'soft', 'data-step="to-mmrc"')}</div>`;
}
function pageMmrc() {
  const p = profile();
  const cur = (p.metrics.qual.MMRC || []).slice(-1)[0];
  const curGrade = mem().mmrc.length ? mem().mmrc[mem().mmrc.length - 1].grade : (cur ? cur.v : null);
  return `${pageHeadFor('mMRC 0–4 级单选记录；分级卡不进趋势、不画趋势线。')}
    <div class="mmrc-card" data-product="分级卡">
      <div class="card-head" style="margin-bottom:0"><div><h3>mMRC 呼吸困难分级（改良英国医学研究理事会量表）</h3><p>分级定义是量表原文的通俗转述；选一个最接近今天的等级。</p></div>${pill(curGrade != null ? `当前 ${curGrade} 级` : '未记录', curGrade != null ? 'blue' : 'dashed')}</div>
      <div class="mmrc-opts">
        ${MMRC_LEVELS.map((desc, g) => `<button class="mmrc-opt" aria-pressed="${curGrade === g}" data-action="mmrc-pick" data-grade="${g}"><b>${g} 级</b><span>${esc(desc)}</span></button>`).join('')}
      </div>
      <div class="mmrc-note">记录会带日期存档（演示仅内存）；分级变化的意义请医生解读，本卡不做趋势线、不给分级建议。</div>
    </div>
    <div class="card" style="margin-top:14px" data-product="分级记录">
      <div class="card-head"><div><h3>分级记录</h3><p>${(p.metrics.qual.MMRC || []).length + mem().mmrc.length} 次 · 只列各次结果</p></div>${pill('分类记录 · 不连线', 'grey')}</div>
      ${(p.metrics.qual.MMRC || []).map((x) => `<div class="row"><div class="row-main"><div><b>${x.label}</b><p>${esc(x.context)}</p></div></div><div style="text-align:right">${pill(longDate(x.d), 'grey')}<br><small>${esc(x.src)}</small></div></div>`).join('')}
      ${mem().mmrc.map((x) => `<div class="row"><div class="row-main"><div><b>mMRC ${x.grade} 级</b><p>${esc(x.context || '本人在原型中记录（演示）')}</p></div></div><div style="text-align:right">${pill(longDate(x.d), 'blue')}<br><small>${esc(x.src || 'mMRC 分级卡单选')}</small></div></div>`).join('')}
    </div>
    <p class="small-note" style="margin-top:10px">mMRC 在一图秀里也只画节点（见「病情一图秀」），这是全台统一口径。</p>`;
}

/* ================= 随访影像 ================= */
function pageParallel() {
  const p = profile();
  const list = p.imaging.slice().reverse();
  return `${pageHeadFor('历次 CT 逐条并排：测量原文 / 报告原文 / 当时 mMRC——三列并排，无判读列。')}
    <div class="notice warn"><b>本页不做判读。</b>"胸膜增厚较前增大"是影像科医生写的报告原文；是病灶变化还是治疗反应，判断归影像与治疗团队。这里把每次检查的语境（测量原文、当时 mMRC）并排摆出来，供复诊时对照。</div>
    <div class="ct-row" data-product="CT 并列">
      ${list.map((x) => `<div class="ct-card">
        <div class="ct-date"><b>${longDate(x.d)}</b>${pill(x.kind.replace(/（.*）/, ''), 'blue')}</div>
        <div class="ct-col"><span>测量（原文）</span><blockquote>${esc(x.measure)}</blockquote></div>
        <div class="ct-col"><span>报告结论（原文）</span><blockquote>「${esc(x.excerpt)}」</blockquote></div>
        <div class="ct-col"><span>当时 mMRC（并列事实）</span><div class="mrc">${x.mMRCAtTime != null ? `${x.mMRCAtTime} 级` : '未记录'} · 下一步：${esc(x.next)}</div></div>
      </div>`).join('')}
    </div>
    ${section('这次我想问医生', '勾选会存进问题清单（fact 区），复诊导出自动带上。')}
    <div class="card">
      ${[
    ['"较前增大"和免疫治疗反应的关系，请影像医生当面解释一次'],
    ['下次 CT 在什么时候、要不要做增强？'],
    ['如果 12 月复评仍是"未确认"，下一步怎么确认？']
  ].map(([q]) => `<label class="q-item"><input type="checkbox" data-action="ask-pick" data-q="${esc(q)}"><div style="flex:1;min-width:0"><b style="font-weight:500">${esc(q)}</b><p class="muted">场景生成 · 可编辑</p></div></label>`).join('')}
      <div class="actions" style="margin-top:12px">${btn('把勾选的存进问题清单', 'ask-save', 'soft')}${go('去编辑全部问题', 'imaging', 'questions', 'text-button', 'data-step="to-questions"')}</div>
    </div>`;
}
function pageQuestions() {
  const m = mem();
  return `${pageHeadFor('问题清单是"患者想问的"，不是产品判断的；可编辑、可勾已问。', btn('＋ 加一个问题', 'q-add', 'primary'))}
    <div class="card" data-product="问题清单">
      ${m.questions.map((q) => `<div class="q-item">
        <input type="checkbox" ${q.asked ? 'checked' : ''} data-action="q-asked" data-id="${q.id}" aria-label="已问过：${esc(q.text)}">
        <div style="flex:1;min-width:0"><b style="font-weight:500">${esc(q.text)}</b><p class="muted">${esc(q.src)}</p></div>
        ${pill(q.asked ? '已问' : '待问', q.asked ? 'green' : 'grey')}
      </div>`).join('') || '<div class="empty"><h3>还没有问题</h3><p>可以从「CT 并列」的场景勾选生成，或直接添加。</p></div>'}
    </div>
    <div class="help-box">导出到「就诊准备与导出」时，问题清单进入 fact 区（想问的事）；「我的看法/担心」单独一区并标注不是医生结论。</div>
    <div class="actions" style="margin-top:10px">${go('去影像档案', 'imaging', 'archive', 'soft', 'data-step="to-archive"')}</div>`;
}
function pageArchive() {
  const p = profile();
  return `${pageHeadFor('登记每一份影像：日期、测量原文、结论原文；原件留在你的资料目录。', btn('＋ 登记一次影像', 'mri-add', 'primary'))}
    <div class="card" data-product="影像档案">
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>日期</th><th>类型</th><th>测量（原文）</th><th>结论原文（首句）</th><th>状态</th></tr></thead><tbody>
        ${p.imaging.map((x) => `<tr><td class="num">${esc(x.d)}</td><td><b>${esc(x.kind)}</b></td><td>${esc(x.measure)}</td><td>「${esc(x.excerpt)}」</td><td>${pill('已核对', 'green')}</td></tr>`).join('')}
        ${(p.imaging[p.imaging.length - 1].next.match(/2026-\d\d-\d\d/) || [null])[0] ? `<tr><td class="num">${esc((p.imaging[p.imaging.length - 1].next.match(/2026-\d\d-\d\d/) || [])[0])}</td><td><b>胸部 CT（已预约）</b></td><td>—</td><td>已预约，尚未检查</td><td>${pill('待检查', 'grey')}</td></tr>` : ''}
      </tbody></table></div>
      <p class="small-note">导入 PDF 报告走「AI 协助」候选通道：解析出日期/测量/结论后逐项核对，确认才入事实层；拒收无副作用。</p>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>登记三字段</h3><p>手工登记只填 3 项，其余交给核对。</p></div></div>
        <div class="flag-list"><div>检查日期</div><div>测量原文（如"胸膜最厚处约 Nmm"，照抄）</div><div>结论原文（照抄，不缩写）</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>原件去哪了</h3></div></div>
        <p class="small-note" style="margin:0">存放在 设置 · 工作区 的资料目录；云端解析（MinerU）需在 设置 · 文档解析 配置 Token，未配置时 TXT/MD/CSV 仍本机解析。</p>
        <div class="actions" style="margin-top:12px">${btn('打开设置', 'settings', 'soft')}</div>
      </div>
    </div>
    <div class="actions" style="margin-top:14px">${go('看病情一图秀', 'chart', '', 'soft', 'data-step="to-chart"')}</div>`;
}

/* ================= 病情一图秀（横切层，0 二级） ================= */
function pageChart() {
  const p = profile();
  const sel = state.sel[state.profileId];
  const [t0, t1] = domain();
  const groups = CAT_ORDER.map((cat) => ({ cat, items: Object.keys(CATALOG).filter((c) => CATALOG[c].cat === cat) }));
  return `${pageHeadFor('把引流量、胸膜厚度与体重放回同一段时间；mMRC 分类只画节点不连线。')}
    <div class="overview">
      <aside class="rail">
        <details class="pick" open><summary>指标选择<small>${sel.length}/4</small></summary>
          <div class="metric-list">
            ${groups.map((g) => `<div class="cat-label">${esc(g.cat)}</div>${g.items.map((c) => {
    const m = CATALOG[c];
    const all = seriesAll(c);
    const on = sel.includes(c);
    return `<label class="metric-pick"><input type="checkbox" data-action="sel" data-code="${c}" ${on ? 'checked' : ''}><i style="background:${m.color}"></i><span>${esc(m.name)}</span><small>${all.length ? fmtNum(all[all.length - 1].v, m.dec) + (m.categorical ? ' 级' : ' ' + m.unit) : '无记录'}</small></label>`;
  }).join('')}`).join('')}
          </div>
        </details>
        <section><h3>时间窗</h3>
          <div class="chips">${[['all', '全期'], ['3m', '近 3 月'], ['6m', '近 6 月']].map(([k, n]) => `<button class="chip" aria-pressed="${state.range === k}" data-action="range" data-range="${k}">${n}</button>`).join('')}</div>
          <div class="zoom"><input type="range" min="40" max="100" value="${state.zoom}" data-action="zoom" aria-label="缩放时间窗（右端锚定最新）"><span>${state.zoom}%</span></div>
        </section>
        <section><h3>图层</h3>
          <div class="chips">
            <button class="chip" aria-pressed="${state.toggles.treatment}" data-action="toggle" data-key="treatment">治疗与胸水节点</button>
            <button class="chip" aria-pressed="${state.toggles.keypoints}" data-action="toggle" data-key="keypoints">末点数值</button>
          </div>
        </section>
      </aside>
      <div class="timeline-main">
        <div class="chart-panel" id="chart-panel" data-product="一图秀">
          <div class="chart-top">
            <div class="legend">${sel.filter((c) => seriesAll(c).length).map((c) => {
    const s = seriesFor(c, t0, t1);
    return `<span><i style="background:${CATALOG[c].color}"></i><b>${esc(CATALOG[c].name)}</b><span class="range">全期 ${fmtNum(s.lo, CATALOG[c].dec)}–${fmtNum(s.hi, CATALOG[c].dec)} ${esc(CATALOG[c].unit)}</span></span>`;
  }).join('')}</div>
            <div class="chips"><button class="chip" data-action="unpin" ${state.pin ? '' : 'hidden'}>收起固定点</button></div>
          </div>
          <div class="chart-wrap"><div class="scroll-hint">表格与曲线过宽时可横向滚动（有意为之）→</div>${chartSVG(t0, t1)}</div>
          ${state.pin ? (() => {
    const s = seriesAll(state.pin.code).find((x) => x.d === state.pin.date);
    const m = CATALOG[state.pin.code];
    if (!s) return `<div class="pin"><div><b>该记录已不在当前时间窗</b><p>扩大时间范围或取消固定后可回看。</p></div>${btn('收起', 'unpin', 'soft')}</div>`;
    return `<div class="pin"><div><b>${esc(m.name)} ${fmtNum(s.v, m.dec)} ${esc(m.unit)} · ${longDate(s.d)}</b><p>来源：${esc(s.src || '演示数据')}${s.refHigh ? ` · 化验单参考上限 ${s.refHigh}` : ''}</p><p class="muted">原型不打开真实原件；接入后这里跳到该条记录并高亮。</p></div>${btn('收起', 'unpin', 'soft')}</div>`;
  })() : ''}
        </div>
        <p class="small-note">治疗条画在数据区上方独立泳道，关掉图层后曲线位置不变；单点序列不连线；超过 4 条序列会被回弹并提示。</p>
      </div>
    </div>`;
}

/* ================= 照护与生活 ================= */
function pageFeelings() {
  const p = profile();
  const shared = sharedOnly(p);
  const hidden = privateCount(p);
  return `${pageHeadFor('默认只属于你：private 的记录不进看板摘要、不进导出、不进 AI 上下文。', btn('＋ 记一条感受', 'feel-add', 'primary'))}
    <div class="grid two">
      <div class="card" data-product="感受记录">
        <div class="card-head"><div><h3>可共享（shared）</h3><p>会出现在导出的看法区，且标注"不是医生结论"。</p></div>${pill(`${shared.length} 条`, 'blue')}</div>
        ${shared.map((v) => `<div class="row"><div class="row-main"><div><b>${esc(v.content)}</b><p>${longDate(v.date)} · ${v.role === 'PATIENT' ? '本人' : '照护者'}</p></div></div>${pill('shared', 'blue')}</div>`).join('') || '<p class="small-note" style="margin:0">还没有共享的感受。</p>'}
      </div>
      <div class="private" data-product="私密区">
        <h3>私密（private）· ${hidden} 条已隐藏</h3>
        <p class="small-note">私密记录在本页也只显示数量不显示内容？——不，本页是它们的"家"：列表只对本人展示，其他出口统一过滤。</p>
        <div style="margin-top:10px">${(p.viewpoints || []).filter((v) => v.visibility === 'private').map((v) => `<div class="row"><div class="row-main"><div><b>${esc(v.content)}</b><p>${longDate(v.date)} · ${v.role === 'PATIENT' ? '本人' : '照护者'} · ${esc(v.topic)}</p></div></div>${pill('private', 'mist')}</div>`).join('')}</div>
      </div>
    </div>
    <div class="help-box">三出口过滤共用同一个函数（sharedOnly）：看板摘要、导出预览、AI 上下文。想带私密内容进 AI 时逐条显式勾选，草稿预览会标红提醒。</div>
    <div class="actions" style="margin-top:10px">${go('去照护者代记与家事', 'care', 'family', 'soft', 'data-step="to-family"')}</div>`;
}
function pageIntake() {
  const p = profile();
  const wt = p.metrics.numeric.WEIGHT || [];
  const meals = mem().meals || [];
  const last = wt[wt.length - 1];
  return `${pageHeadFor('只记"吃了多少、体重多少"；胸水期的体重波动要结合引流与补液语境，由医生解读。')}
    <div class="grid two">
      <div class="card" data-product="体重记录">
        <div class="card-head"><div><h3>体重（照护者可代记）</h3><p>${last ? `最近 ${longDate(last.d)} · ${fmtNum(last.v, 1)} kg` : '暂无记录'}</p></div></div>
        ${wt.slice(-6).reverse().map((x) => `<div class="row"><div class="row-main"><div><b>${fmtNum(x.v, 1)} kg</b><p>${esc(x.src || '')}</p></div></div>${pill(longDate(x.d), 'grey')}</div>`).join('')}
        <div class="form-grid" style="margin-top:12px"><div><label class="form-label" for="wt-quick">今天早上称了（kg）</label><input id="wt-quick" inputmode="decimal" placeholder="如 65.5"></div></div>
        <div class="actions" style="margin-top:10px">${btn('记下体重', 'wt-save', 'soft')}</div>
      </div>
      <div class="card" data-product="进食记录">
        <div class="card-head"><div><h3>今天吃了什么量</h3><p>三顿快记；量与搭配的调整听营养科。</p></div></div>
        <div class="actions" style="gap:8px">${['早餐', '午餐', '晚餐'].map((meal) => btn(`记${meal}`, 'meal-log', 'soft', `data-meal="${meal}"`)).join('')}</div>
        <div style="margin-top:12px">${meals.slice(-6).reverse().map((x) => `<div class="row"><div class="row-main"><div><b>${esc(x.meal)}</b><p>已记 · ${longDate(x.d)}</p></div></div></div>`).join('') || '<p class="small-note" style="margin:0">还没记；点上面的按钮即可。</p>'}</div>
      </div>
    </div>
    <div class="notice" style="margin-top:14px"><b>胸水期语境三说明：</b>① 引流当日与次日的体重变化可能来自积液量变化，不等于胖瘦；② 化疗期口味的波动常见，记录原话即可；③ 体重持续下降时的处理由治疗团队与营养科决定——本页只记事实。</div>
    <div class="actions" style="margin-top:10px">${go('去当下感受', 'care', 'feelings', 'soft', 'data-step="to-feelings"')}</div>`;
}
function pageFamily() {
  const p = profile();
  const list = [...p.family, ...mem().familyNotes].sort((a, b) => a.d < b.d ? -1 : 1).reverse();
  return `${pageHeadFor('照护者代记与家事：引流代记、材料经办、家事安排；代记条目带 witnessed/author 徽章。', btn('＋ 记一条家事', 'fam-add', 'primary'))}
    <div class="card" data-product="代记与家事">
      ${list.map((x) => `<div class="row">
        <div class="row-main"><div><b>${esc(x.topic)} · ${esc(x.content)}</b><p>${longDate(x.d)} · ${x.author === 'CAREGIVER' ? '照护者' : '本人'}${x.witnessed ? ' · 经本人确认（witnessed）' : ''}</p></div></div>
        ${pill(x.visibility === 'private' ? 'private' : 'shared', x.visibility === 'private' ? 'mist' : 'blue')}
      </div>`).join('') || '<div class="empty"><h3>还没有家事记录</h3><p>引流代记、材料经办、家事安排都可以记在这里。</p></div>'}
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>代记与弯路、材料的联系</h3></div></div>
        <div class="flag-list"><div>弯路时间线的段落可由照护者代记（带见证徽章）</div><div>材料清单的经办进度在家事里留痕</div><div>引流量代记在「引流与缓解」页签，与这里联动</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>可见性</h3></div></div>
        <div class="flag-list"><div>shared：进导出看法区（标注"不是医生结论"）</div><div>private：三出口统一过滤（看板/导出/AI）</div></div>
      </div>
    </div>`;
}
function pageDecisions() {
  const p = profile();
  const list = p.decisions || [];
  return `${pageHeadFor('决策信息整理：想和谁谈、谈到哪一步；本页给位置，不给倾向。')}
    <div class="card" data-product="决策话题">
      ${list.map((d) => `<div class="row">
        <div class="row-main"><div><b>${esc(d.topic)}</b><p>${esc(d.note || '还没谈；谈完把时间与结论记在这里')}</p></div></div>
        <div style="text-align:right">${pill(d.status === 'open' ? '未谈' : d.status === 'discussed' ? '谈过' : '已记录', d.status === 'open' ? 'grey' : 'green')}${btn('切换状态', 'topic-cycle', 'text-button', `data-topic="${esc(d.topic)}"`)}</div>
      </div>`).join('') || '<div class="empty"><h3>还没有决策话题</h3><p>想和谁谈、什么时候谈，先写下来。</p></div>'}
    </div>
    <div class="help-box">ACP（预立照护计划）是"信息整理"不是"医疗决定"：本页只记录谈过什么、和谁谈、下一步；医疗决定归患者与治疗团队。</div>`;
}

/* ================= 复诊与资料 ================= */
function pageSchedule() {
  const p = profile();
  return `${pageHeadFor('CT 与血象节奏、材料跟进同轨摆出来；该带什么去「就诊准备与导出」。')}
    <div class="card" data-product="复诊节奏">
      <div class="milestones">
        ${p.rhythm.map((r) => `<div class="milestone"><span class="dot"></span><div><b>${esc(r.item)}</b><p>频率：${esc(r.freq)} · 依据：${esc(r.guideline)}</p></div><small>${esc(r.next)}</small></div>`).join('')}
      </div>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>材料跟进（与复查同轨）</h3><p>${p.materials.filter((x) => x.state === 'ready').length} / ${p.materials.length} 项已备齐</p></div>${go('去材料清单', 'asbestos', 'checklist', 'soft')}</div>
        <p class="small-note" style="margin:0">材料页签的待办与这里的"每月跟进"是同一件事的两个视角。</p>
      </div>
      <div class="card"><div class="card-head"><div><h3>下次复诊要带</h3></div></div>
        <div class="flag-list"><div>问题清单（想问的事）</div><div>CT 光盘与报告</div><div>本机导出的复诊摘要（两区）</div></div>
        <div class="actions" style="margin-top:12px">${go('去就诊准备与导出', 'followup', 'prepare', 'soft')}${go('去 ACP 与决策', 'care', 'decisions', 'soft', 'data-step="to-decisions"')}</div>
      </div>
    </div>`;
}
function pageLibrary() {
  const p = profile();
  return `${pageHeadFor('导入 → 解析 → 候选 → 核对；接受之前都只是候选。', btn('＋ 导入文件', 'doc-add', 'primary'))}
    <div class="flow-steps"><span class="on">选文件</span><span>解析（本机 / 云端）</span><span>候选字段</span><span>逐项核对</span><span>入库</span></div>
    <div class="card" data-product="资料库">
      <div class="table-wrap"><table><thead><tr><th>文件</th><th>类型</th><th>大小</th><th>状态</th><th></th></tr></thead><tbody>
        ${p.documents.map((d) => `<tr><td><b>${esc(d.name)}</b></td><td>${pill(d.kind, 'grey')}</td><td class="num">${esc(d.size)}</td><td>${pill(d.status, d.status === '已核对' ? 'green' : 'yellow')}</td><td>${btn('看原文', 'src', 'text-button', `data-src="${esc(d.name)}"`)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">原件存放在你选的资料目录；主目录 / 根目录 / 桌面根会被拒绝。云端解析需在 设置 · 文档解析 配置 Token。</p>
    </div>
    <div class="actions" style="margin-top:14px">${go('去整理草稿与核对', 'followup', 'candidates', 'soft', 'data-step="to-candidates"')}</div>`;
}
function pageCandidates() {
  const p = profile();
  const list = p.candidates || [];
  return `${pageHeadFor('解析候选逐项核对：确认才入事实层；每项可拒，拒收无副作用。')}
    <div class="notice blue"><b>接受 ≠ 审核。</b>候选来自解析结果，只有你逐项确认后才算已核对记录；本页演示三态（待核对 / 已入库 / 已拒收）。</div>
    <div data-product="候选核对">
      ${list.map((c) => `<div class="row">
        <div class="row-main"><div><b>${esc(c.field)}：${esc(c.value)}</b><p>${esc(c.src)}</p></div></div>
        <div class="actions">${pill(c.state, c.state === '已入库' ? 'green' : c.state === '已拒收' ? 'grey' : 'yellow')}${c.state === '待核对' ? btn('确认入库', 'cand-accept', 'soft', `data-id="${c.id}"`) + btn('拒收', 'cand-reject2', 'soft', `data-id="${c.id}"`) : ''}</div>
      </div>`).join('') || '<div class="empty"><h3>没有待核对候选</h3><p>从「资料库」导入文件后会出现在这里。</p></div>'}
    </div>
    <div class="help-box">更正=新增版本：入库后发现填错，用「改这一条」登记新版本，旧记录保留。</div>`;
}
function exportMarkdown(p) {
  const m = mem();
  const lines = ['# 复诊摘要（演示）· ' + TODAY, '', '> 以下内容由本人与照护者整理，不是医生结论。', ''];
  lines.push('## 一、想问的事', '');
  m.questions.filter((q) => !q.asked).forEach((q, i) => lines.push(`${i + 1}. ${q.text}`, `   - 来源：${q.src}`));
  lines.push('', '## 二、事实区（已核对记录）', '');
  lines.push(`- 当前阶段（引用医生语境）：${p.stageLine}`);
  p.imaging.forEach((x) => lines.push(`- CT ${x.d}：测量「${x.measure}」；结论「${x.excerpt}」（当时 mMRC ${x.mMRCAtTime} 级）`));
  const mmrc = (p.metrics.qual.MMRC || []).slice(-1)[0];
  if (mmrc) lines.push(`- mMRC 最近一次：${mmrc.label}（${mmrc.d}，${mmrc.src}）`);
  const wbc = (p.metrics.numeric.WBC || []).slice(-1)[0];
  if (wbc) lines.push(`- WBC 最近一次：${fmtNum(wbc.v, 1)} 10⁹/L（${wbc.d}，${wbc.src}）`);
  const t = p.treatment;
  if (t.pathway === 'CHEMO') lines.push(`- 化疗：${t.regimen}；最近第 ${t.chemoCycles.length} 周期；下次 ${t.nextOn}`);
  else {
    lines.push(`- 双免疫：${t.regimen}；已输注 ${t.immuneInfusions.length} 次；下次 ${t.nextOn}`);
    if (t.reactionMode) lines.push(`- 反应模式（报告原文）：「${t.reactionMode.excerpt}」（${t.reactionMode.d}）`);
  }
  const lastEvent = (p.pleura.events || []).slice(-1)[0];
  if (lastEvent) lines.push(`- 胸水最近事件：${lastEvent.d} ${PLEURA_KIND[lastEvent.kind]}${lastEvent.volumeMl ? ` ${lastEvent.volumeMl}ml` : ''}`);
  const matReady = p.materials.filter((x) => x.state === 'ready').length;
  lines.push(`- 材料清单：${matReady}/${p.materials.length} 项已备齐（只整理材料，不含法律建议）`);
  const shared = sharedOnly(p);
  lines.push('', '## 三、看法区（shared）', '', '> 记录者自己的看法与担心，不是医生结论。', '');
  if (!shared.length) lines.push('（无共享的看法记录）');
  shared.forEach((v) => lines.push(`- ${v.date} · ${v.role === 'PATIENT' ? '本人' : '照护者'}：${v.content}`));
  lines.push('', '## 四、口径说明', '', `- 已隐藏 ${privateCount(p)} 条私密记录（visibility=private，含感受与家事）。`, '- 判读归呼吸与影像团队；本摘要不含判读，也不提供法律建议。', '- 演示数据：人物、数值与时间线不指向任何真实患者。');
  return { md: lines.join('\n'), hid: privateCount(p) };
}
function pagePrepare() {
  const p = profile();
  const m = mem();
  const { md, hid } = exportMarkdown(p);
  return `${pageHeadFor('fact / view 两区导出预览；私密内容自动过滤，首行声明"不是医生结论"。', btn('生成摘要并预览', 'export', 'primary'))}
    <div class="notice blue" data-product="摘要"><b>导出前核对：</b>私密记录默认不出现——当前已隐藏 ${hid} 条（当下感受与家事 private）。看法区只保留 visibility=shared 的记录，且每条都带"不是医生结论"标注。</div>
    <div class="card">
      <div class="card-head"><div><h3>问题清单（fact 区来源）</h3><p>${m.questions.filter((q) => !q.asked).length} 条待问</p></div>${go('去编辑', 'imaging', 'questions')}</div>
      ${m.questions.slice(0, 4).map((q) => `<div class="row"><div class="row-main"><div><b>${esc(q.text)}</b><p>${esc(q.src)}</p></div></div>${pill(q.asked ? '已问' : '待问', q.asked ? 'green' : 'grey')}</div>`).join('')}
    </div>
    <div class="card" style="margin-top:14px">
      <div class="card-head"><div><h3>导出预览</h3><p>顺序固定：声明 → 想问的事 → 事实区 → 看法区（shared）→ 口径说明</p></div>${pill(`${hid} 条已过滤`, 'mist')}</div>
      <pre class="export-pre">${esc(md)}</pre>
      <div class="actions" style="margin-top:12px">${btn('复制 Markdown', 'copy-md', 'soft')}${go('去复诊节奏', 'followup', 'schedule', 'soft', 'data-step="to-schedule"')}</div>
    </div>`;
}
const CHANNELS = [
  ['chinadrugtrials', 'CDE 药物临床试验登记', '演示样例 3 条（关键词：双免 / 石棉相关加权）'],
  ['chictr_online', 'ChiCTR（实时）', '未取样例'],
  ['ctv', 'ClinicalTrials.gov / CTV', '未取样例'],
  ['ictrp', 'WHO ICTRP', '未取样例']
];
function pageTrials() {
  const p = profile();
  const m = mem();
  return `${pageHeadFor('线索不是推荐：登记库样例按 MPM 口径四通道检索；入组条件由研究团队判断。')}
    <div class="notice blue"><b>四通道口径：</b>CDE / ChiCTR / ClinicalTrials.gov(CTV) / WHO ICTRP；0 条结果必须带该来源自己的覆盖声明，「没查到」不等于「不存在」。全部条目为「登记状态，未核实」。</div>
    <div data-product="收藏线索">
      ${p.trials.map((t) => `<div class="trial-card">
        <div class="card-head"><div><span class="eyebrow">${esc(t.key)} · ${esc(t.phase)} 期 · ${esc(t.source)}</span><h2 style="margin-top:4px;font-size:13.5px;line-height:1.55">${esc(t.title)}</h2></div>${pill('登记状态，未核实', 'grey')}</div>
        <div class="actions">${btn(m.savedTrials.includes(t.key) ? '★ 已收藏' : '☆ 收藏', 'trial-save', 'soft', `data-key="${esc(t.key)}"`)}${btn('入组前问什么', 'src', 'text-button', 'data-src="入组问题由研究团队解答；本台不判断是否适合"')}</div>
      </div>`).join('')}
    </div>
    <div class="card"><div class="card-head"><div><h3>已收藏（${m.savedTrials.length}）</h3><p>收藏后可带去复诊与试验门诊。</p></div></div>
      ${m.savedTrials.length ? m.savedTrials.map((k) => { const t = p.trials.find((x) => x.key === k); return `<div class="row"><div class="row-main"><div><b>${esc(t.title)}</b><p>${esc(t.key)} · ${esc(t.phase)}</p></div></div></div>`; }).join('') : '<p class="small-note" style="margin:0">还没收藏；线索不是推荐，收藏只是标记。</p>'}
    </div>`;
}

/* ---------------- render ---------------- */
const RENDERERS = {
  dash: pageDash,
  tumor: () => ({ detour: pageDetour, pathology: pagePathology, molecular: pageMolecular, reports: pageReports })[state.sub.tumor || 'detour'](),
  asbestos: () => ({ exposure: pageExposure, checklist: pageChecklist, qanda: pageQanda })[state.sub.asbestos || 'exposure'](),
  treatment: () => ({ cycles: pageCycles, immune: pageImmune, changes: pageChanges, calendar: pageCalendar })[state.sub.treatment || 'cycles'](),
  pleura: () => ({ events: pageEvents, drainage: pageDrainage, pleurodesis: pagePleurodesis, symptoms: pageSymptoms })[state.sub.pleura || 'events'](),
  labs: () => ({ blood: pageBlood, effusion: pageEffusion, mmrc: pageMmrc })[state.sub.labs || 'blood'](),
  imaging: () => ({ parallel: pageParallel, questions: pageQuestions, archive: pageArchive })[state.sub.imaging || 'parallel'](),
  chart: pageChart,
  care: () => ({ feelings: pageFeelings, intake: pageIntake, family: pageFamily, decisions: pageDecisions })[state.sub.care || 'feelings'](),
  followup: () => ({ schedule: pageSchedule, library: pageLibrary, candidates: pageCandidates, prepare: pagePrepare, trials: pageTrials })[state.sub.followup || 'schedule']()
};
function render() {
  const page = RENDERERS[state.page] || pageDash;
  const p = profile();
  const subs = SUBPAGES[state.page];
  $('#nav').innerHTML = PAGES.map(([id, label, ic]) => `<button class="nav-button" aria-current="${state.page === id ? 'page' : 'false'}" data-action="go" data-page="${id}">${icon(ic)}<span>${label}</span>${subs && id === state.page && SUBPAGES[id] ? `<span class="nav-count">${SUBPAGES[id].length}</span>` : ''}</button>`).join('');
  $('#breadcrumb').textContent = PAGES.find((x) => x[0] === state.page)[1] + (subs ? ' / ' + subLabel(state.page) : '');
  $('#profile-name').textContent = `${p.name}的资料`;
  $('#profile-meta').textContent = `${p.age} 岁 · MPM ${p.diagnosis.split('·')[1] || ''}`;
  $('#profile-avatar').textContent = p.name[0];
  $('#profile-btn').setAttribute('aria-label', `切换演示档案，当前为${p.name}`);
  $('#main').innerHTML = `<div class="page-enter">${backRow()}${page()}</div>`;
  $('#app-version').textContent = APP_INFO.displayVersion;
  $('#app-build').textContent = APP_INFO.build;
  $('#ver-chip').textContent = APP_INFO.displayVersion;
  $('#ready-store').innerHTML = `<i></i><span>资料目录</span><b>已激活</b>`;
  renderAgent();
}
/* ---------------- AI 面板（20 号合同：开/收/调宽 25–45%，收起不结束会话） ---------------- */
function clampAgentW(w) { return Math.min(45, Math.max(25, w)); }
/* AI 五态（DSH-WORKBENCH-TOP-BAR）：AI 对话（无会话）/ 正在连接… / 收起 AI 对话（已展开）/
   打开 AI 对话（已收起）/ AI 对话暂不可用（服务缺失）。纯函数，测试直接喂态。 */
function agentLabelFor(a) {
  if (a.unavailable) return 'AI 对话暂不可用';
  if (a.connecting) return '正在连接…';
  if (!a.everOpened) return 'AI 对话';
  return a.open ? '收起 AI 对话' : '打开 AI 对话';
}
/* 面板宽度记忆（WIDTH_KEY 一份来源；读回时过 clampAgentW——手改过或旧版本存了越界值不能一开就坏） */
const AGENT_W_KEY = 'pleura.pal.mesothelioma.agent-pane.v1';
function loadAgentW() {
  try {
    const w = clampAgentW(JSON.parse(localStorage.getItem(AGENT_W_KEY) || 'null')?.w);
    return Number.isFinite(w) ? w : 35;
  } catch { return 35; }
}
function saveAgentW(w) {
  try { localStorage.setItem(AGENT_W_KEY, JSON.stringify({ w: Math.round(w * 100) / 100 })); } catch { /* 隐私模式忽略 */ }
}
function renderAgent() {
  const a = state.agent;
  $('#agent-splitter').hidden = !a.open;
  $('#agent-pane').hidden = !a.open;
  const label = agentLabelFor(a);
  $('#agent-toggle').setAttribute('aria-expanded', String(a.open));
  $('#agent-toggle').textContent = label;
  $('#agent-toggle').setAttribute('aria-label', `AI 对话：${label}`);
  document.documentElement.style.setProperty('--agent-w', a.w + '%');
  $('#agent-splitter').setAttribute('aria-valuenow', String(Math.round(a.w)));
  if (!a.open) return;
  const body = $('.agent-body');
  const demo = a.draft && AI_DEMOS[a.draft] ? AI_DEMOS[a.draft] : null;
  const candHtml = demo && demo.cand ? `<div class="agent-cand" data-testid="agent-cand">
      <b>演示候选 · 未发送（一切 AI 产出都是候选）</b>
      <p class="cand-title">${esc(demo.cand.title)}</p>
      <ul>${demo.cand.fields.map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join('')}</ul>
      <small>来源：${esc(demo.cand.src)} · 逐项核对后才入事实层；拒收无副作用</small>
      <div class="actions">
        <button class="primary" data-action="cand-ok">确认入事实层</button>
        <button class="soft" data-action="cand-fix">不对，改一下</button>
        <button class="soft" data-action="cand-reject">不用这条</button>
      </div>
    </div>` : '';
  const staticNote = `<div class="notice plain">这是<b>演示面板</b>：原型未接入真实 AI，不会发送任何内容；真实版本走宿主接口接入。</div>`;
  const demoMsgs = `<div class="agent-msg user"><b>示例输入</b><p>把最近两次 CT 的测量原文排在一起。</p></div>
    <div class="agent-msg bot"><b>演示回复（未接通）</b><p>真实版本会基于「CT 并列」的已核对记录生成草稿；本原型不生成内容。</p></div>`;
  body.innerHTML = candHtml + staticNote + (candHtml ? '' : demoMsgs) + `<p class="small-note">私密内容（visibility=private 的感受与家事记录）默认不进入 AI 上下文（sharedOnly 统一过滤）；需要带入时逐条显式勾选。输入框里的草稿只保存在本页，不会自动发送。</p>`;
  const input = $('.agent-foot input');
  if (demo && input) { input.value = demo.prompt; input.setAttribute('aria-label', 'AI 草稿（待你发送，演示不发送）'); }
}
function setAgent(open) {
  state.agent.open = open;
  if (open) state.agent.everOpened = true;
  saveAgentW(state.agent.w);
  renderAgent();
}
function agentResize(deltaPct) {
  state.agent.w = clampAgentW(state.agent.w + deltaPct);
  saveAgentW(state.agent.w);
  renderAgent();
}
(function agentSplitterInit() {
  state.agent.w = loadAgentW(); // 读回时已过 clampAgentW
  const sp = $('#agent-splitter');
  let dragging = false;
  sp.addEventListener('pointerdown', (e) => {
    dragging = true; sp.setPointerCapture(e.pointerId); e.preventDefault();
  });
  sp.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = $('.stage').getBoundingClientRect(); /* 按容器 rect 夹取，不用 window 宽 */
    const pct = ((rect.right - e.clientX) / rect.width) * 100;
    state.agent.w = clampAgentW(pct);
    saveAgentW(state.agent.w);
    renderAgent();
  });
  const end = () => { dragging = false; };
  sp.addEventListener('pointerup', end); sp.addEventListener('pointercancel', end);
  sp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { agentResize(2); e.preventDefault(); } /* 变窄 */
    else if (e.key === 'ArrowRight') { agentResize(-2); e.preventDefault(); } /* 变宽 */
    else if (e.key === 'Home') { state.agent.w = 45; saveAgentW(45); renderAgent(); e.preventDefault(); }
    else if (e.key === 'End') { state.agent.w = 25; saveAgentW(25); renderAgent(); e.preventDefault(); }
  });
})();

/* ---------------- 弹窗 ---------------- */
function openProfiles() {
  openModal('切换演示档案', `<div class="notice plain">两套档案各带完整时间线；切换后指标序列、治疗条与页面数据全部换源，私密记录互不可见。</div>
    ${DATA.profiles.map((p) => `<button class="profile-row ${p.id === state.profileId ? 'on' : ''}" data-action="pick-profile" data-id="${p.id}"><div><b>${esc(p.name)} · ${p.age} 岁 · ${p.primaryRole === 'PATIENT' ? '本人主导' : '照护者主导'}</b><p>${esc(p.diagnosis)} · ${esc(p.stageLine)}</p></div><span class="profile-caret">${p.id === state.profileId ? '当前' : '切换'}</span></button>`).join('')}`,
    '<button data-action="close">关闭</button>', '小胸宝 · 演示');
}
function openSettings(tab) {
  const c = state.cfg;
  const tokStates = [['none', '未配置（当前）', 'TXT/MD/CSV 仍本机解析；PDF 云端解析需配置 Token'], ['ok', '已配置', '只显示后 4 位；保存时先校验，失败区分 401 / 429 / 网络错误'], ['fail', '校验失败', 'Token 未通过校验；原件保留，可重试']];
  openModal('设置', `<div class="cfg-tabs" role="tablist">
      <button role="tab" aria-selected="${tab !== 'parse' && tab !== 'data'}" data-action="cfg-tab" data-tab="ws">工作区</button><button role="tab" aria-selected="${tab === 'parse'}" data-action="cfg-tab" data-tab="parse">文档解析</button><button role="tab" aria-selected="${tab === 'data'}" data-action="cfg-tab" data-tab="data">临床数据包</button>
    </div>
    <div style="margin-top:16px" class="cfg-block" data-tab="ws" ${tab && tab !== 'ws' ? 'hidden' : ''}>
      <h3 style="font-size:12.5px">资料目录</h3>
      <p class="small-note">业务数据放在你选的目录里；主目录、根目录、桌面根会被拒绝。</p>
      <div class="path-row"><code>${esc(c.root)}</code><button class="soft" data-action="pick-root">更改位置</button></div>
      <div class="grid three" style="margin-top:12px">
        <div class="stat-tile"><span>原件</span><b>${c.size.doc} GB</b></div>
        <div class="stat-tile"><span>派生</span><b>${c.size.derived} GB</b></div>
        <div class="stat-tile"><span>数据库</span><b>${c.size.db} GB</b></div>
      </div>
      <p class="small-note">上次备份：${esc(c.backupAt)}（演示值）</p>
    </div>
    <div class="cfg-block" style="margin-top:12px" data-tab="parse" ${tab !== 'parse' ? 'hidden' : ''}>
      <h3 style="font-size:12.5px">文档解析（MinerU）Token 三态</h3>
      <label class="check-row"><input type="checkbox" ${c.consent ? 'checked' : ''} data-action="consent"><span>我知道选中的文件会被上传到云端解析；不勾选不会上传。</span></label>
      <div class="token-states">
        ${tokStates.map(([k, t, d]) => `<div class="token-state ${c.tokenState === k ? 'cur' : ''}"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}
      </div>
      <p class="small-note">当前状态：<b>${c.tokenState === 'none' ? '未配置' : c.tokenState === 'ok' ? '已配置' : '校验失败'}</b>${c.tokenState === 'none' ? ' —— TXT/MD/CSV 仍本机解析，功能不受影响；需要解析 PDF 时再配置。' : ''}</p>
      <div class="token-row">${c.tokenState === 'ok' ? `<code class="masked">${esc(c.tokenMasked)}</code>` : ''}<button class="soft" data-action="token-config">配置 Token</button></div>
    </div>
    <div class="cfg-block" style="margin-top:12px" data-tab="data" ${tab !== 'data' ? 'hidden' : ''}>
      <h3 style="font-size:12.5px">临床数据包（试验线索来源）</h3>
      <div class="grid two" style="margin-top:6px">
        <div class="stat-tile"><span>数据包</span><b>CLINICAL-DATA-2026</b></div>
        <div class="stat-tile"><span>数据截止</span><b>${esc(DATA.meta.today || TODAY)}</b></div>
      </div>
      <div class="channel-grid" style="margin-top:10px">
        ${CHANNELS.map(([k, n, s]) => `<div class="channel-tile ${s.includes('未取样例') ? 'off' : ''}"><b>${esc(n)}</b><span>${esc(s)}</span></div>`).join('')}
        <div class="channel-tile off"><b>ChiCTR 离线语料</b><span>未配置（MPM 覆盖以登记库实时查询为准）</span></div>
        <div class="channel-tile off"><b>既往工作台归档</b><span>未配置（无 MPM 覆盖）</span></div>
      </div>
      <p class="small-note">四通道终态如实标注；0 条结果必须带该来源自己的覆盖声明，「没查到」不等于「不存在」。登记状态一律显示「登记状态，未核实」。</p>
    </div>`, '<button class="primary" data-action="close">完成</button>', '小胸宝 · 设置');
}
function openAbout() {
  openModal('关于小胸宝', `<div class="about" style="display:grid;grid-template-columns:96px minmax(0,1fr);gap:16px;align-items:start">
    <span class="brand-mark" style="width:96px;height:96px;border-radius:18px;display:grid;place-items:center;background:var(--brand-soft);border:1px solid var(--line)">
      <svg viewBox="0 0 48 48" width="64" height="64" aria-hidden="true"><rect x="4" y="4" width="40" height="40" rx="12" fill="#E9F1F7"/><path d="M24 9c-6 5-9 10-9 15a9 9 0 0 0 18 0c0-5-3-10-9-15Z" fill="#33608C"/><path d="M24 13v20M17 22h14" stroke="#E9F1F7" stroke-width="2.2" stroke-linecap="round"/><circle cx="37" cy="12" r="2.6" fill="#E8590C"/></svg>
    </span>
    <div>
      <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap"><b style="font-size:22px">${APP_INFO.displayVersion}</b>${pill('交互原型', 'blue')}</div>
      <p style="font-size:12px;margin:8px 0 10px">恶性胸膜间皮瘤（MPM）患者与照护者的病程整理工具。本原型不提供诊断、治疗或用药建议，也不提供法律建议；判读归呼吸与影像团队。</p>
      <div style="display:grid;gap:5px;font-size:11.5px">
        <div><span class="muted">版本　</span>${APP_INFO.displayVersion} · ${APP_INFO.build}</div>
        <div><span class="muted">渲染　</span>零依赖 HTML/CSS/JS，无网络请求</div>
        <div><span class="muted">渠道　</span>${esc(APP_INFO.channelLabel)}</div>
        <div><span class="muted">数据　</span>${esc(DATA.meta.disclaimer || '')}</div>
      </div>
    </div>
  </div>`, '<button data-action="close">关闭</button>', '小胸宝 · 关于');
}
function openHelp() {
  openModal('原型操作说明', `<div class="flag-list">
      <div>左侧导航 = 10 条一级线；带数字的是有二级页签的线，点进去后顶部一排 tab。</div>
      <div>顶栏「AI 对话」开/收演示面板，可拖宽度（25%–45%），收起不丢内容。</div>
      <div>「大字 Aa」切换 12.5px ↔ 15px 基线。</div>
      <div>看板上的「场景直达」对应 13 条签认场景路径（S01–S13）。</div>
      <div>全部为模拟资料；刷新重置内存中的编辑。</div>
    </div>`, '<button data-action="close">关闭</button>', '小胸宝 · 帮助');
}
function openExport() {
  const p = profile();
  const { md, hid } = exportMarkdown(p);
  openModal('导出预览', `<div class="notice blue">已隐藏 ${hid} 条私密记录；两区导出与「就诊准备与导出」页签同一份数据。</div><pre class="export-pre">${esc(md)}</pre>`,
    `${btn('复制 Markdown', 'copy-md', 'soft')}<button data-action="close">关闭</button>`, '小胸宝 · 导出');
}
/* ---------------- 小表单（字段 ≤6；每页显式编辑入口 ≤1） ---------------- */
const formField = (label, inner) => `<div><label class="form-label">${label}</label>${inner}</div>`;
function openDrainForm() {
  openModal('记一次引流（4 字段）', `<div class="form-grid">
      ${formField('日期', `<input id="f-d" type="date" value="${TODAY}">`)}
      ${formField('方式', `<select id="f-k"><option value="thoracentesis">胸腔穿刺</option><option value="drain-tube">置管引流</option></select>`)}
      ${formField('引流量（ml）', `<input id="f-v" inputmode="numeric" placeholder="如 450">`)}
      ${formField('当日缓解（可留空）', `<input id="f-r" placeholder="如 夜间可平卧">`)}
    </div><p class="small-note" style="margin-top:10px">照护者代记会带徽章；本台不判断"该不该再抽"。</p>`,
    `${btn('保存', 'save-drain', 'primary')}<button data-action="close">取消</button>`, '胸水与呼吸 · 引流与缓解');
}
function openTxForm() {
  openModal('记一次治疗（4 字段）', `<div class="form-grid">
      ${formField('日期', `<input id="f-d" type="date" value="${TODAY}">`)}
      ${formField('类型', `<select id="f-k"><option>周期输注（D1）</option><option>免疫输注</option><option>前置检查</option></select>`)}
      ${formField('项目（药名或周期号）', `<input id="f-n" placeholder="如 第 4 周期 D1">`)}
      ${formField('反应或备注（原文照抄）', `<input id="f-x" placeholder="如 输注顺利">`)}
    </div>`,
    `${btn('保存', 'save-tx', 'primary')}<button data-action="close">取消</button>`, '治疗档案 · 治疗日历');
}
function openPldForm() {
  openModal('登记胸膜固定术（4 字段）', `<div class="form-grid">
      ${formField('日期', `<input id="f-d" type="date">`)}
      ${formField('医院', `<input id="f-h" placeholder="如 市胸科医院">`)}
      ${formField('方式', `<input id="f-m" placeholder="如 滑石粉胸膜固定术（胸腔镜）">`)}
      ${formField('术后记录（原文照抄）', `<input id="f-x" placeholder="如 术后发热 2 天">`)}
    </div>`,
    `${btn('保存', 'save-pld', 'primary')}<button data-action="close">取消</button>`, '胸水与呼吸 · 胸膜固定术');
}
function openSymForm() {
  openModal('记一次症状（4 字段）', `<div class="form-grid">
      ${formField('日期', `<input id="f-d" type="date" value="${TODAY}">`)}
      ${formField('气促', `<input id="f-b" placeholder="如 上二楼要歇一次">`)}
      ${formField('胸痛（0–10 自评）', `<input id="f-p" inputmode="numeric" placeholder="如 3">`)}
      ${formField('备注（可留空）', `<input id="f-x">`)}
    </div><p class="small-note" style="margin-top:10px">症状与治疗、胸水并排记录，不写因果。</p>`,
    `${btn('保存', 'save-sym', 'primary')}<button data-action="close">取消</button>`, '胸水与呼吸 · 气促与胸痛');
}
function openQuickForm() {
  openModal('快录一项数值（4 字段）', `<div class="form-grid">
      ${formField('指标', `<select id="f-c">${['WBC', 'ANC', 'PLT', 'HGB', 'ALT', 'WEIGHT'].map((c) => `<option value="${c}">${esc(CATALOG[c].name)}</option>`).join('')}</select>`)}
      ${formField('数值', `<input id="f-v" inputmode="decimal" placeholder="按化验单照抄">`)}
      ${formField('日期', `<input id="f-d" type="date" value="${TODAY}">`)}
      ${formField('来源（可留空）', `<input id="f-s" placeholder="如 家中体重秤">`)}
    </div>`,
    `${btn('保存', 'save-quick', 'primary')}<button data-action="close">取消</button>`, '血象与指标 · 快录');
}
function openQForm() {
  openModal('加一个问题', `<div class="form-grid"><div class="wide">${formField('想问的事', `<textarea id="f-q" placeholder="复诊时想问什么，原话即可"></textarea>`)}</div></div>`,
    `${btn('保存', 'save-q', 'primary')}<button data-action="close">取消</button>`, '问题清单');
}
function openMriForm() {
  openModal('登记一次影像（3 字段）', `<div class="form-grid">
      ${formField('检查日期', `<input id="f-d" type="date">`)}
      ${formField('测量原文', `<input id="f-m" placeholder="如 胸膜最厚处约 20mm（照抄）">`)}
      ${formField('结论原文（不缩写）', `<input id="f-x" placeholder="照抄报告结论">`)}
    </div>`,
    `${btn('保存', 'save-mri', 'primary')}<button data-action="close">取消</button>`, '随访影像 · 影像档案');
}
function openFeelForm() {
  openModal('记一条感受', `<div class="form-grid">
      <div class="wide">${formField('内容', `<textarea id="f-q" placeholder="原话即可；默认私密"></textarea>`)}</div>
      <label class="check-row"><input type="checkbox" id="f-shared"><span>设为 shared（进入导出看法区并标注"不是医生结论"）；不勾选=private。</span></label>
    </div>`,
    `${btn('保存', 'save-feel', 'primary')}<button data-action="close">取消</button>`, '照护与生活 · 当下感受');
}
function openFamForm() {
  openModal('记一条家事（4 字段）', `<div class="form-grid">
      ${formField('主题', `<select id="f-k"><option>引流代记</option><option>材料经办</option><option>家事安排</option></select>`)}
      ${formField('内容', `<input id="f-q">`)}
      ${formField('可见性', `<select id="f-v"><option value="shared">shared</option><option value="private">private</option></select>`)}
      <label class="check-row"><input type="checkbox" id="f-w"><span>经本人确认（witnessed）</span></label>
    </div>`,
    `${btn('保存', 'save-fam', 'primary')}<button data-action="close">取消</button>`, '照护与生活 · 照护者代记与家事');
}
function openDocForm() {
  openModal('导入文件（3 字段）', `<div class="form-grid">
      ${formField('文件名', `<input id="f-n" placeholder="如 化验单 2026-10-24">`)}
      ${formField('类型', `<select id="f-k"><option>pdf</option><option>图片</option><option>TXT/MD/CSV（本机解析）</option></select>`)}
      ${formField('大小', `<input id="f-s" placeholder="如 1.2 MB">`)}
    </div><p class="small-note" style="margin-top:10px">保存后进入解析三态（parsing → 已载入 / 出错），解析候选在「整理草稿与核对」逐项确认。</p>`,
    `${btn('保存并解析', 'save-doc', 'primary')}<button data-action="close">取消</button>`, '复诊与资料 · 资料库');
}
function openExpoForm() {
  openModal('记一段暴露（6 字段）', `<div class="form-grid">
      ${formField('起始年月', `<input id="f-a" placeholder="如 1983-03">`)}
      ${formField('结束年月', `<input id="f-b" placeholder="如 1998-11">`)}
      ${formField('场所', `<input id="f-c">`)}
      ${formField('工种', `<input id="f-j">`)}
      ${formField('防护', `<input id="f-p" placeholder="如 纱布口罩">`)}
      ${formField('备注（可留空）', `<input id="f-x">`)}
    </div><p class="small-note" style="margin-top:10px">记忆不确定的段落会标「待核实」；本页只记事实。</p>`,
    `${btn('保存', 'save-expo', 'primary')}<button data-action="close">取消</button>`, '石棉与材料 · 暴露时间线');
}
function openDetourForm() {
  openModal('记一段弯路（4 字段）', `<div class="form-grid">
      ${formField('时间', `<input id="f-d" type="date">`)}
      ${formField('场所', `<input id="f-c">`)}
      ${formField('初诊印象（原文照抄）', `<input id="f-i">`)}
      ${formField('检查与转诊', `<input id="f-x">`)}
    </div><p class="small-note" style="margin-top:10px">只记原文，不判医生；补记=新增版本。</p>`,
    `${btn('保存', 'save-detour', 'primary')}<button data-action="close">取消</button>`, '我的瘤与弯路 · 弯路时间线');
}
function openQaForm() {
  openModal('记一问一答（4 字段）', `<div class="form-grid">
      ${formField('日期', `<input id="f-d" type="date" value="${TODAY}">`)}
      ${formField('问了什么', `<input id="f-q">`)}
      ${formField('答复原文（摘抄）', `<input id="f-a">`)}
      ${formField('答复方/地点', `<input id="f-p">`)}
    </div>`,
    `${btn('保存', 'save-qa', 'primary')}<button data-action="close">取消</button>`, '石棉与材料 · 问答与跟进');
}

/* ---------------- ACTIONS ---------------- */
const ACTIONS = {
  go(el) { navigate(el.dataset.page, el.dataset.sub || ''); },
  sub(el) { navigate(state.page, el.dataset.sub); },
  scene(el) {
    const s = SCENES.find((x) => x[0] === el.dataset.scene);
    if (s) navigate(s[2], s[3]);
  },
  range(el) { state.range = el.dataset.range; render(); },
  toggle(el) { state.toggles[el.dataset.key] = !state.toggles[el.dataset.key]; render(); },
  sel(el) {
    const arr = state.sel[state.profileId];
    const c = el.dataset.code;
    if (el.checked) {
      if (arr.length >= 4) { el.checked = false; toast('最多同时看 4 个指标；先取消一个再加。'); return; }
      arr.push(c);
    } else {
      if (arr.length === 1) { el.checked = true; toast('至少留一个指标。'); return; }
      state.sel[state.profileId] = arr.filter((x) => x !== c);
    }
    render();
  },
  pin(el) { state.pin = { code: el.dataset.code, date: el.dataset.date }; render(); },
  unpin() { state.pin = null; render(); },
  flip(el) {
    const c = el.dataset.code;
    if (state.flipped.has(c)) state.flipped.delete(c); else state.flipped.add(c);
    el.setAttribute('aria-pressed', state.flipped.has(c));
  },
  'agent-toggle'() { setAgent(!state.agent.open); },
  'agent-hide'() { setAgent(false); toast('已收起面板（会话保留，草稿不丢）'); },
  'ai-draft'(el) {
    const key = el.dataset.ai || state.page;
    state.agent.draft = AI_DEMOS[key] ? key : null;
    if (!state.agent.open) setAgent(true); else renderAgent();
    const input = $('.agent-foot input');
    if (AI_DEMOS[key] && input) input.value = AI_DEMOS[key].prompt;
    toast('已把示例提示词填入 AI 面板（待你发送，不会自动发出）');
  },
  'cand-ok'() { toast('演示：核对通过后进入事实层（原型仅示意）', { back: true }); },
  'cand-fix'() { toast('演示：进入逐项修改（每项都可以改）'); },
  'cand-reject'() { state.agent.draft = null; renderAgent(); toast('已拒收这条候选（无副作用）'); },
  profiles() { openProfiles(); },
  settings(el) { openSettings(el && el.dataset.tab); },
  'open-store'() { openSettings('ws'); },
  about() { openAbout(); },
  help() { openHelp(); },
  export() { openExport(); },
  close() { closeModal(); },
  src(el) { openModal('来源', `<p style="font-size:12.5px">${esc(el.dataset.src)}</p><p class="small-note">原型不打开真实文件；接入后这里会跳到该页并高亮。</p>`, '<button data-action="close">关闭</button>', '原文出处'); },
  'font-toggle'() { document.body.classList.toggle('large'); $('#font-toggle').setAttribute('aria-pressed', document.body.classList.contains('large')); },
  'pick-root'() {
    const bad = prompt('输入资料目录的绝对路径（演示：输入 /Users/demo 会被拒绝）', state.cfg.root);
    if (bad === null) return;
    if (['/', '/Users/demo', '/Users/demo/Desktop'].includes(bad.trim())) { toast('已拒绝：不能选主目录、根目录或桌面根'); return; }
    state.cfg.root = bad.trim(); toast('资料目录已更新（原型仅内存）'); openSettings('ws');
  },
  'token-config'() { toast('原型不接收真实 Token；真实实现只校验不回显（失败区分 401 / 429 / 网络）'); },
  'manual-add'() { toast('演示：手工补一条走小表单（字段 ≤6）'); },
  'manual-edit'() { toast('演示：改这一条=登记新版本，旧记录保留（不出现"不可恢复"）'); },
  /* 记录动作（每页显式编辑入口 ≤1；其余为快捷动作） */
  'drain-add'() { openDrainForm(); },
  'tx-add'() { openTxForm(); },
  'pld-add'() { openPldForm(); },
  'sym-add'() { openSymForm(); },
  'quick-add'() { openQuickForm(); },
  'q-add'() { openQForm(); },
  'mri-add'() { openMriForm(); },
  'feel-add'() { openFeelForm(); },
  'fam-add'() { openFamForm(); },
  'doc-add'() { openDocForm(); },
  'expo-add'() { openExpoForm(); },
  'detour-add'() { openDetourForm(); },
  'qa-add'() { openQaForm(); },
  'q-from-term'(el) {
    const term = el.dataset.term;
    mem().questions.push({ id: uid('q'), text: `${term} 这个结果对我的情况意味着什么，请医生解释`, asked: false, src: `分子三态 · ${TODAY} 生成` });
    toast('已加入问题清单（fact 区）', { back: true }); render();
  },
  'q-asked'(el) {
    const q = mem().questions.find((x) => x.id === el.dataset.id);
    if (q) { q.asked = el.checked; toast(q.asked ? '已标记"已问"' : '恢复为待问'); }
  },
  'ask-save'() {
    const picked = $$('#main .q-item input[data-action="ask-pick"]').filter((i) => i.checked).map((i) => i.dataset.q);
    if (!picked.length) { toast('先勾选至少一条'); return; }
    const m = mem();
    picked.forEach((q) => { if (!m.questions.some((x) => x.text === q)) m.questions.push({ id: uid('q'), text: q, asked: false, src: `CT 并列 · ${TODAY} 勾选` }); });
    toast(`已存 ${picked.length} 条进问题清单`, { back: true }); render();
  },
  'mat-check'(el) {
    const id = el.dataset.id;
    const m = mem();
    const base = profile().materials.find((x) => x.id === id);
    const cur = m.materials[id] || base.state;
    const next = cur === 'ready' ? (el.dataset.partial ? 'partial' : 'todo') : 'ready';
    m.materials[id] = next;
    toast(next === 'ready' ? '已标记"备齐"（演示仅内存）' : next === 'partial' ? '恢复为"部分备齐"' : '恢复为"未备齐"');
    render();
  },
  'mmrc-pick'(el) {
    const grade = Number(el.dataset.grade);
    mem().mmrc.push({ d: TODAY, grade, context: '本人在原型中记录（演示）', src: 'mMRC 分级卡单选' });
    toast(`已记录 mMRC ${grade} 级（${MMRC_LEVELS[grade]}）；分级卡不画趋势线`, { back: true });
    render();
  },
  'topic-cycle'(el) {
    const t = profile().decisions.find((x) => x.topic === el.dataset.topic);
    if (!t) return;
    t.status = t.status === 'open' ? 'discussed' : t.status === 'discussed' ? 'filed' : 'open';
    toast('话题状态已更新（讨论状态，不是医学结论）'); render();
  },
  'trial-save'(el) {
    const m = mem(); const k = el.dataset.key;
    m.savedTrials = m.savedTrials.includes(k) ? m.savedTrials.filter((x) => x !== k) : [...m.savedTrials, k];
    toast(m.savedTrials.includes(k) ? '已收藏（登记状态，未核实）' : '已取消收藏'); render();
  },
  'cand-accept'(el) {
    const c = profile().candidates.find((x) => x.id === el.dataset.id);
    if (c) c.state = '已入库';
    toast('已入库（演示仅内存）；接受=逐项确认完成', { back: true }); render();
  },
  'cand-reject2'(el) {
    const c = profile().candidates.find((x) => x.id === el.dataset.id);
    if (c) c.state = '已拒收';
    toast('已拒收（无副作用）；候选不进事实层'); render();
  },
  'tx-log'() { toast('已记录今日打卡（演示仅内存）；是否调整方案由治疗团队判断', { back: true }); },
  'wt-save'() {
    const v = parseFloat(($('#wt-quick') || {}).value);
    toast(Number.isFinite(v) && v > 0 ? `已记录体重 ${v} kg（演示仅内存）` : '先输入一个体重数字', { back: true });
  },
  'meal-log'(el) {
    mem().meals = mem().meals || [];
    mem().meals.push({ meal: el.dataset.meal, d: TODAY });
    toast(`已记：${el.dataset.meal}`); render();
  },
  'witness-auth'(el) {
    if (el.checked) {
      mem().witness = { granted: true, visibility: 'private', fields: '李师傅（工友，演示）· 在岗时间 1988–1996 · 同班组（已按证言人本人同意录入）' };
      toast('已记录"证言人本人同意"（演示）；信息默认 private，不进导出', { back: true });
    } else {
      mem().witness = null;
      toast('已撤回演示授权；证言人信息不再展示');
    }
    render();
  },
  'consent'(el) { state.cfg.consent = el.checked; toast(el.checked ? '已同意云端解析' : '已取消；不会上传文件'); }
};

/* ---------------- events ---------------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'pick-profile') {
    state.profileId = el.dataset.id;
    state.pin = null; state.flipped = new Set(); state.agent.draft = null;
    closeModal();
    toast(`已切换到 ${profile().name}（演示档案）；指标与治疗条已换源`);
    render();
    return;
  }
  if (a === 'cfg-tab') {
    $$('.cfg-tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b === el)));
    $$('.cfg-block[data-tab]').forEach((b) => { b.hidden = b.dataset.tab !== el.dataset.tab; });
    return;
  }
  if (a === 'copy-md') {
    const { md } = exportMarkdown(profile());
    navigator.clipboard?.writeText(md).then(() => toast('已复制 Markdown（若浏览器拒绝则复制失败）')).catch(() => toast('复制失败：浏览器未授权剪贴板'));
    return;
  }
  const fn = ACTIONS[a];
  if (fn) fn(el);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'zoom') { state.zoom = Number(el.value); render(); }
  else if (a === 'sel') ACTIONS.sel(el);
  else if (a === 'q-asked') ACTIONS['q-asked'](el);
  else if (a === 'consent' || a === 'mat-check' || a === 'witness-auth') ACTIONS[a](el);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#dialog').open) closeModal();
});

/* 保存类表单动作（各弹窗 save-*） */
const SAVE = {
  'save-drain'() {
    const d = $('#f-d')?.value, v = parseInt($('#f-v')?.value, 10);
    if (!d || !Number.isFinite(v) || v < 0) { toast('日期与引流量（ml）必填'); return; }
    mem().drainages.push({ id: uid('px'), d, kind: $('#f-k').value, side: '左侧', method: $('#f-k').value === 'thoracentesis' ? '胸腔穿刺（本人登记）' : '置管引流（本人登记）', volumeMl: v, relief: $('#f-r')?.value || '—', author: profile().primaryRole, note: '本人在原型中记录（演示）' });
    closeModal(); render(); toast('已生成事件卡，复诊时会带上', { back: true });
  },
  'save-tx'() {
    const d = $('#f-d')?.value, n = $('#f-n')?.value?.trim();
    if (!d || !n) { toast('日期与项目必填'); return; }
    profile().treatment.changes.push({ d, item: n, detail: `${$('#f-k').value}；${$('#f-x')?.value || '无备注'}`, note: '本人在原型中登记（演示）；变更留痕' });
    closeModal(); render(); toast('已登记（留痕，不覆盖旧记录）', { back: true });
  },
  'save-pld'() {
    const d = $('#f-d')?.value, m = $('#f-m')?.value?.trim();
    if (!d || !m) { toast('日期与方式必填'); return; }
    profile().pleura.events.push({ id: uid('px'), d, kind: 'pleurodesis', side: '左侧', method: m, volumeMl: null, relief: $('#f-x')?.value || '—', author: profile().primaryRole, note: `医院：${$('#f-h')?.value || '未填'}（本人在原型中登记）` });
    closeModal(); render(); toast('已登记固定术留痕', { back: true });
  },
  'save-sym'() {
    const d = $('#f-d')?.value, b = $('#f-b')?.value?.trim(), p = $('#f-p')?.value?.trim();
    if (!d || (!b && !p)) { toast('日期与气促/胸痛至少一项必填'); return; }
    mem().symptoms.push({ d, breathless: b || '—', pain: p ? `${p}/10（自评）` : '—', note: $('#f-x')?.value || '', author: profile().primaryRole });
    closeModal(); render(); toast('已记一次症状（演示仅内存）', { back: true });
  },
  'save-quick'() {
    const c = $('#f-c')?.value, v = parseFloat($('#f-v')?.value), d = $('#f-d')?.value;
    if (!c || !Number.isFinite(v) || !d) { toast('指标、数值与日期必填'); return; }
    profile().metrics.numeric[c] = profile().metrics.numeric[c] || [];
    profile().metrics.numeric[c].push({ d, v, src: $('#f-s')?.value || '本人快录（演示）' });
    closeModal(); render(); toast('已登记（数字键盘录入；每项可拒——已在候选页逐项核对语境）', { back: true });
  },
  'save-q'() {
    const text = ($('#f-q')?.value || '').trim();
    if (!text) { toast('问题为空，未保存'); return; }
    mem().questions.push({ id: uid('q'), text, asked: false, src: `本人添加 · ${TODAY}` });
    closeModal(); render(); toast('已加入问题清单');
  },
  'save-mri'() {
    const d = $('#f-d')?.value, m = $('#f-m')?.value?.trim(), x = $('#f-x')?.value?.trim();
    if (!d || !x) { toast('日期与结论原文必填'); return; }
    profile().imaging.push({ id: uid('ct'), d, kind: '胸部 CT（手工登记）', measure: m || '未抄录', excerpt: x, mMRCAtTime: null, next: '新登记，待复诊讨论' });
    closeModal(); render(); toast('已登记（结论照抄原文）', { back: true });
  },
  'save-feel'() {
    const text = ($('#f-q')?.value || '').trim();
    if (!text) { toast('内容为空，未保存'); return; }
    const shared = $('#f-shared')?.checked;
    profile().viewpoints.push({ role: profile().primaryRole, visibility: shared ? 'shared' : 'private', date: TODAY, topic: 'MOOD', content: text });
    closeModal(); render(); toast(shared ? '已记录（shared，进入导出看法区）' : '已记录（private，三出口统一过滤）');
  },
  'save-fam'() {
    const text = ($('#f-q')?.value || '').trim();
    if (!text) { toast('内容为空，未保存'); return; }
    mem().familyNotes.push({ d: TODAY, author: 'CAREGIVER', topic: $('#f-k')?.value || '家事安排', content: text, visibility: $('#f-v')?.value || 'shared', witnessed: $('#f-w')?.checked });
    closeModal(); render(); toast('已记一条家事（代记徽章按 witnessed 显示）');
  },
  'save-doc'() {
    const n = $('#f-n')?.value?.trim();
    if (!n) { toast('文件名为空，未保存'); return; }
    profile().documents.push({ id: uid('d'), name: n, kind: $('#f-k')?.value || 'pdf', size: $('#f-s')?.value || '—', status: '待核对' });
    closeModal(); render(); toast('已进入解析队列（演示：parsing → 已载入，候选在「整理草稿与核对」）', { back: true });
  },
  'save-expo'() {
    const a = $('#f-a')?.value?.trim(), b = $('#f-b')?.value?.trim(), c = $('#f-c')?.value?.trim();
    if (!a || !b || !c) { toast('起止年月与场所必填'); return; }
    mem().exposures.push({ from: a, to: b, place: c, job: $('#f-j')?.value || '未填', hazard: '本人补充（原型演示）', protection: $('#f-p')?.value || '未记录', state: 'unverified', note: $('#f-x')?.value || '' });
    closeModal(); render(); toast('已记一段暴露（记忆段默认标「待核实」）', { back: true });
  },
  'save-detour'() {
    const d = $('#f-d')?.value, i = $('#f-i')?.value?.trim();
    if (!d || !i) { toast('时间与初诊印象（原文）必填'); return; }
    mem().detours.push({ d, stage: '补充段', place: $('#f-c')?.value || '未填', impression: i, exams: $('#f-x')?.value || '—', referral: '—', note: '本人在原型中补记（演示）' });
    closeModal(); render(); toast('已补记一段弯路（新增版本，旧记录保留）', { back: true });
  },
  'save-qa'() {
    const q = $('#f-q')?.value?.trim(), a = $('#f-a')?.value?.trim();
    if (!q || !a) { toast('问题与答复原文必填'); return; }
    mem().qas.push({ d: $('#f-d')?.value || TODAY, q, a, place: $('#f-p')?.value || '未记录' });
    closeModal(); render(); toast('已留痕一问一答（原文照抄）', { back: true });
  }
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action^="save-"]');
  if (!el) return;
  const fn = SAVE[el.dataset.action];
  if (fn) fn(el);
});

/* 直达 hash：#page 或 #page/sub（sub 用 key） */
function applyHash() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!hash) return false;
  const [p, s] = hash.split('/');
  if (!RENDERERS[p]) return false;
  state.page = p;
  if (s && SUBPAGES[p] && SUBPAGES[p].some(([k]) => k === s)) state.sub[p] = s;
  return true;
}

/* ---------------- 启动（异步化：先取数据再 render；校验失败渲染横幅，不裸 throw） ---------------- */
$('#font-toggle').addEventListener('click', () => ACTIONS['font-toggle']());

async function boot() {
  const { reachable, data } = await loadBootstrap();
  if (reachable) {
    applyData(data || { meta: {}, profiles: [] });
    state.dataSource = DATA.profiles.length ? 'api' : 'empty';
    if (state.dataSource === 'empty') APP_INFO.channelLabel = '工作台已连接，资料库还是空的';
  } else if (typeof DEMO_DATA !== 'undefined' && DEMO_DATA) {
    applyData({ meta: DEMO_DATA.meta, profiles: DEMO_DATA.profiles });
    state.dataSource = 'demo';
    APP_INFO.channelLabel = '离线演示数据（未连接工作台）';
  } else {
    applyData(null);
    state.dataSource = 'empty';
    APP_INFO.channelLabel = '没有数据（资料目录未选择或为空）';
  }
  const problems = apiBaseProblems(apiBase());
  try {
    applyHash();
    render();
  } catch (error) {
    /* 渲染失败也绝不白屏：横幅说明 + 控制台留痕 */
    showBootBanner(`页面渲染失败：${error?.message ?? error}`);
    console.error(error);
  }
  if (problems.length) showBootBanner(`接口基址异常（${apiBase() || '空串'}）：${problems.join('；')}——接口调用会失败，请检查挂载前缀。`);
  else if (state.dataSource === 'demo') showBootBanner('当前是离线演示数据（未连接工作台接口）。新装工作台请先在左侧会话列表新建一个会话（宿主按会话授权本台接口），然后刷新。');
  else if (state.dataSource === 'empty') showBootBanner('工作台已连接，但资料库是空的。');
  document.body.setAttribute('data-booted', '1');
}

void boot();
window.addEventListener('hashchange', () => {
  if (!applyHash()) return;
  render();
  $('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
});
