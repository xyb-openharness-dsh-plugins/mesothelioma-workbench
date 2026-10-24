/* 读模型（MPM · 恶性胸膜间皮瘤）：把库里的行还原成 **demo-data.js 同一形状**。
 *
 * 契约：`GET /api/bootstrap` 的 profiles 数组必须与 prototypes/v0.2/demo-data.js 里的同名档案
 * 逐字段一致（test/store.test.mjs 是 deepStrictEqual）。parity 是这一层唯一验收标准。
 * 所以这里不做任何"顺手优化"：字段名、数组层级、null 与缺失的语义都跟着 demo-data.js 走。
 *
 * 七条容易踩的（家族级 D1–D10 继承）：
 * 1. 数值指标点用 value_num，分类/文字用 value_text；读出来统一还原成 `v`（数字就是数字）。
 * 2. 排序：metric_point 没有 ord 列，按 rowid（＝插入顺序）；其余按各自 ord 列。
 * 3. 数值点的 `refHigh` 键**恒在**（demo 的 lab() 给每个点都写了 refHigh，缺省 null）——
 *    不能"为 null 就不还原"，否则 deepStrictEqual 因少键而红。
 * 4. qual.MMRC 从 mmrc_grade **派生**（不双写）：label = `mMRC ${grade} 级`，v = grade。
 * 5. viewpoint 一张表承载 viewpoints（当下感受）与 family（照护代记与家事）两组：
 *    family 行 topic='FAMILY'，读回时按 topic 分流，两组各自的 ord 独立排序。
 * 6. 候选挂在合成导入文档（ext_id='demo-import'）的 parse_job 下；资料库 documents 列表
 *    必须排除这条合成行，否则页面会多出一张"演示候选导入"卡。
 * 7. 节点对象用 {...r} 摊平（node:sqlite 返回 null-prototype 行，deepStrictEqual 会因原型不同失败）。
 */

import { AGENT_PANE } from '../lib/layout.js';

const jp = (s, fallback = null) => {
  if (s === null || s === undefined) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
};
/* node:sqlite 返回 null-prototype 行对象，直接 deepStrictEqual 会因原型不同而失败。统一摊平。 */
const rows = (db, sql, ...args) => db.prepare(sql).all(...args).map((r) => ({ ...r }));

const num = (v) => (typeof v === 'number' ? v : (v === null || v === undefined ? null : Number(v)));

/* 0001 枚举 ↔ demo-data 原文的双向映射（两侧必须能互逆，parity 才成立）。 */
const SIDE_LABEL = { LEFT: '左侧', RIGHT: '右侧', BILATERAL: '双侧', UNKNOWN: '不详' };
const PLEURA_KIND_DEMO = {
  THORACENTESIS: 'thoracentesis',
  DRAINAGE: 'drain-tube',
  PLEURODESIS: 'pleurodesis',
  INTRA_CAVITY_CHEMO: 'intra-cavity-chemo',
  OTHER: 'other',
};

/** 读一个档案，还原成 demo-data.js 的档案对象形状。 */
function readProfile(db, key) {
  const found = db.prepare('SELECT * FROM profile WHERE id = ?').get(key);
  if (!found) return null;
  const meta = new Map(rows(db, 'SELECT k, v FROM profile_meta WHERE profile_id = ?', key).map((r) => [r.k, r.v]));

  /* ── 指标：数值序列（metric_point 按 rowid）＋ mMRC 分类（mmrc_grade 派生） ── */
  const numeric = {};
  for (const m of rows(db, 'SELECT code, measured_at, value_num, value_text, source_note, ref_high FROM metric_point WHERE profile_id = ? ORDER BY rowid', key)) {
    const arr = numeric[m.code] || (numeric[m.code] = []);
    /* lab() 契约：{ d, v, src, refHigh } 四键恒在（refHigh 可为 null）。 */
    arr.push({ d: m.measured_at, v: num(m.value_num) ?? m.value_text, src: m.source_note ?? null, refHigh: m.ref_high === undefined ? null : m.ref_high });
  }
  const mMRCRows = rows(db, 'SELECT graded_on, grade, context_text, source_note FROM mmrc_grade WHERE profile_id = ? ORDER BY ord, rowid', key);
  const qual = {
    MMRC: mMRCRows.map((r) => ({ d: r.graded_on, label: `mMRC ${r.grade} 级`, v: r.grade, src: r.source_note ?? null })),
  };

  /* ── 我的瘤与弯路 ── */
  const detour = rows(db, 'SELECT visit_date, institution, initial_impression, exams_done, referral_note, stage_text, note FROM detour_visit WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ d: r.visit_date, stage: r.stage_text, place: r.institution, impression: r.initial_impression, exams: r.exams_done, referral: r.referral_note, note: r.note }));
  const pa = rows(db, 'SELECT * FROM pathology_type WHERE profile_id = ? ORDER BY ord, rowid', key)[0] ?? null;
  const pathology = pa ? {
    type: String(pa.histology || '').toLowerCase(),
    typeLabel: pa.type_label,
    biopsyDate: pa.report_date,
    method: pa.method_text,
    hospital: pa.hospital,
    excerpt: pa.excerpt,
    ihc: jp(pa.im_panel, []),
  } : null;
  const molecular = rows(db, 'SELECT marker_label, status, method, specimen_date, value_text, explain_text FROM molecular_marker WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ marker: r.marker_label, status: r.status, method: r.method, date: r.specimen_date, value: r.value_text, explain: r.explain_text }));
  const reports = rows(db, 'SELECT ext_id, reported_on, kind_text, title, excerpt FROM report_excerpt WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ id: r.ext_id, d: r.reported_on, kind: r.kind_text, title: r.title, excerpt: r.excerpt }));

  /* ── 石棉与材料 ── */
  const exposure = rows(db, 'SELECT period_from, period_to, workplace, job_type, hazard_text, protection, state_text, note FROM asbestos_exposure WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ from: r.period_from, to: r.period_to, place: r.workplace, job: r.job_type, hazard: r.hazard_text, protection: r.protection, state: r.state_text, note: r.note }));
  const materials = rows(db, 'SELECT ext_id, doc_name, why_text, state_text, note FROM compensation_doc WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ id: r.ext_id, name: r.doc_name, why: r.why_text, state: r.state_text, note: r.note }));
  const qa = rows(db, 'SELECT asked_on, question, answer_text, place FROM followup_qa WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ d: r.asked_on, q: r.question, a: r.answer_text, place: r.place }));

  /* ── 治疗档案 ── */
  const cycles = rows(db, 'SELECT kind, cycle_number, start_date, regimen_note, response_text, delay_days, adjust_text, author_role FROM onco_cycle WHERE profile_id = ? ORDER BY ord, rowid', key);
  const treatment = {
    pathway: meta.get('treatment_pathway') ?? null,
    regimen: meta.get('treatment_regimen') ?? null,
    chemoCycles: cycles.filter((c) => c.kind === 'CHEMO_PEM_PLATINUM')
      .map((c) => ({ n: c.cycle_number, from: c.start_date, plan: c.regimen_note, took: c.response_text, delayDays: c.delay_days, adjust: c.adjust_text })),
    immuneInfusions: cycles.filter((c) => c.kind === 'IMMUNO_NIVO_IPI').map((c) => {
      /* demo-data 里 infusion 的 author 是可选键（demo2 第 1 次输注没写）：只有真的存了才还原，
         不能补 author:null——deepStrictEqual 会因多键而红。 */
      const item = { n: c.cycle_number, d: c.start_date, drugs: c.regimen_note, reaction: c.response_text };
      if (c.author_role !== null && c.author_role !== undefined) item.author = c.author_role;
      return item;
    }),
    reactionMode: jp(meta.get('treatment_reaction') ?? null),
    nextOn: meta.get('treatment_next_on') ?? null,
    changes: rows(db, 'SELECT changed_on, item, detail, note FROM treatment_change WHERE profile_id = ? ORDER BY ord, rowid', key)
      .map((r) => ({ d: r.changed_on, item: r.item, detail: r.detail, note: r.note })),
  };

  /* ── 胸水与呼吸 ── */
  const pleuralEvents = rows(db, 'SELECT ext_id, event_date, kind, side, method_text, fluid_volume_ml, relief_note, author_role, note FROM pleural_event WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({
      id: r.ext_id, d: r.event_date,
      kind: PLEURA_KIND_DEMO[r.kind] ?? 'other',
      side: SIDE_LABEL[r.side] ?? '不详', method: r.method_text, volumeMl: r.fluid_volume_ml,
      relief: r.relief_note, author: r.author_role, note: r.note,
    }));
  const symptoms = rows(db, 'SELECT logged_at, symptom, severity_text, author_role, note FROM symptom_log WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ d: r.logged_at, breathless: r.symptom, pain: r.severity_text, note: r.note, author: r.author_role }));
  const pleura = { events: pleuralEvents, mMRC: mMRCRows.map((r) => ({ d: r.graded_on, grade: r.grade, context: r.context_text, src: r.source_note ?? null })), symptoms };

  /* ── 随访影像 / 胸水生化 ── */
  const imaging = rows(db, 'SELECT ext_id, exam_date, kind_text, measurement_text, report_excerpt, mMRC_at_time, next_exam_plan FROM ct_followup WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ id: r.ext_id, d: r.exam_date, kind: r.kind_text, measure: r.measurement_text, excerpt: r.report_excerpt, mMRCAtTime: r.mMRC_at_time, next: r.next_exam_plan }));
  const effusionLabs = rows(db, 'SELECT collected_at, panel, source_note FROM lab_result WHERE profile_id = ? ORDER BY rowid', key)
    .map((r) => {
      const p = jp(r.panel, {});
      return { d: r.collected_at, prot: p.prot ?? null, ldh: p.ldh ?? null, ada: p.ada ?? null, gluc: p.gluc ?? null, cells: p.cells ?? null, src: r.source_note ?? null };
    });

  /* ── 双主体：viewpoint 一张表分流两组 ── */
  const views = rows(db, 'SELECT author_role, visibility, topic, topic_label, content, record_date, witnessed FROM viewpoint WHERE profile_id = ? ORDER BY ord, rowid', key);
  const viewpoints = views.filter((v) => v.topic !== 'FAMILY')
    .map((v) => ({ role: v.author_role, visibility: v.visibility, date: v.record_date, topic: v.topic_label, content: v.content }));
  const family = views.filter((v) => v.topic === 'FAMILY')
    .map((v) => ({ d: v.record_date, author: v.author_role, topic: v.topic_label, content: v.content, visibility: v.visibility, witnessed: v.witnessed === null ? false : !!v.witnessed }));
  const decisions = rows(db, 'SELECT topic, status, note FROM decision_checklist WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ topic: r.topic, status: r.status, note: r.note }));

  /* ── 复诊与资料 ── */
  const rhythm = rows(db, 'SELECT item, freq, guideline, next_on FROM followup_rhythm WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ item: r.item, freq: r.freq, guideline: r.guideline, next: r.next_on }));
  const documents = rows(db, "SELECT ext_id, file_name, kind_text, size_text, review_state FROM document WHERE profile_id = ? AND ext_id <> 'demo-import' ORDER BY ord, rowid", key)
    .map((r) => ({ id: r.ext_id, name: r.file_name, kind: r.kind_text, size: r.size_text, status: r.review_state }));
  const candidates = rows(db, `SELECT c.ext_id, c.field_name, c.value_text, c.source_note, c.state_text
      FROM candidate c JOIN parse_job pj ON pj.id = c.parse_job_id
      JOIN document d ON d.id = pj.document_id
      WHERE d.profile_id = ? AND d.ext_id = 'demo-import' ORDER BY c.rowid`, key)
    .map((r) => ({ id: r.ext_id, field: r.field_name, value: r.value_text, src: r.source_note, state: r.state_text }));
  const trials = rows(db, 'SELECT trial_key, title, phase, status_text, source FROM trial_lead WHERE profile_id = ? ORDER BY ord, rowid', key)
    .map((r) => ({ key: r.trial_key, title: r.title, phase: r.phase, status: r.status_text, source: r.source }));

  return {
    id: found.id,
    name: found.name,
    age: meta.has('age') ? Number(meta.get('age')) : null,
    gender: found.gender,
    diagnosis: meta.get('diagnosis') ?? null,
    stageLine: meta.get('stageLine') ?? null,
    primaryRole: found.primary_role,
    cognitiveFlag: found.cognitive_flag,
    detour,
    pathology,
    molecular,
    reports,
    exposure,
    materials,
    witness: jp(meta.get('witness') ?? null),
    qa,
    treatment,
    pleura,
    metrics: { numeric, qual },
    imaging,
    effusionLabs,
    viewpoints,
    family,
    decisions,
    rhythm,
    documents,
    candidates,
    trials,
  };
}

export function listSubjects(db) {
  return rows(db, 'SELECT id, name FROM profile ORDER BY rowid');
}

export function getProfile(db, key, opts = {}) {
  return readProfile(db, key);
}

/** `/api/bootstrap` 的 payload：与 demo-data.js 同形（meta + profiles 数组），version/build 注入。 */
export function bootstrap(db, { version, build } = {}) {
  const meta = {};
  for (const r of rows(db, 'SELECT k, v FROM demo_meta')) meta[r.k] = r.v;
  const profiles = listSubjects(db).map((s) => readProfile(db, s.id));
  return {
    version: version ?? null,
    build: build ?? null,
    meta,
    profiles,
    /* 宿主未提供原生会话时这里会是 available:false；开发版自带挂载位演示，所以默认 true。 */
    agent: { available: true, mode: 'dev-mount' },
    layout: { agentPane: AGENT_PANE },
  };
}
