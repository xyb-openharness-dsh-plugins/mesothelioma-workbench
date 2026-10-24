/* 演示数据播种（MPM · 恶性胸膜间皮瘤）。
 *
 * 唯一数据源是 `demo/build-demo-data.mjs` 的 `buildDemoProfiles()`（三个产物
 * prototypes/v0.2/demo-data.js、public/demo-data.js、demo/demo-data.sqlite 都从它生成）。
 * 这里只是把同一份纯数据写进**用户资料目录里那个库**，不新增、不改写任何数值——
 * 演示数据一旦在这里多出一条，原型与开发版就会各说一套
 * （这是 `test/store.test.mjs` 里 deepStrictEqual parity 断言存在的原因）。
 *
 * 幂等：库里已经有 subjects 就整批跳过（开发版启动时可能跑很多次，不能每次都复制一份档案）。
 * 事务：整批在一个事务里，中途失败整体回滚，不留"半个档案"。
 *
 * 与 cervical seedDemo 的结构差异（别照抄）：
 * - MPM 的 schema/0001 冻结 27 表 + 0002 增量（7 新表 + 补列）；本文件全部走显式列名 INSERT；
 * - 档案级标量（age/diagnosis/stageLine/witness/treatment 汇总/病理补充）在 profile_meta（0002）；
 * - 全局演示元信息（meta.dataStart/today/disclaimer/…）在 demo_meta（0002）；
 * - 指标点存 metric_point（数值）+ mmrc_grade（mMRC 分类，qual.MMRC 由读模型从 mmrc_grade 派生，
 *   不双写——"数据只有一个来源"）；
 * - 候选（candidates）按 18 号 v2 语义挂在 parse_job 下：每档案建一条合成导入文档
 *   （ext_id='demo-import'，读模型排除它不进资料库列表）+ succeeded 的 parse_job + candidate 行。
 *
 * 两个字段口径（H6 的教训，别图省事）：
 * 1. 所有 INSERT 写显式列名 + 显式问号数，不用位置式 VALUES；
 * 2. demo-data 里的对象字段按下标/键名显式取，不 spread（多一个键，读模型 parity 就红）。
 */

import { createHash } from 'node:crypto';
/* finalize()（不是 buildDemoProfiles()）：metrics 字段是 expandMetrics 的派生结果，
   直接播种会把 metrics:null 写空——读模型的 qual/numeric 就全空了。 */
import { finalize } from '../demo/build-demo-data.mjs';

/* ---------------- 小工具 ---------------- */

const sha = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex');
const j = (v) => (v === undefined ? null : JSON.stringify(v));
const flag = (v) => (v ? 1 : 0);

/** demo 的材料三态 → 0001 compensation_doc.status 四态（canonical）；原文态存 state_text。 */
const MATERIAL_STATUS = { todo: 'missing', partial: 'requested', ready: 'received' };
/** demo 胸水事件 kind → 0001 pleural_event.kind 枚举。 */
const PLEURA_KIND = { thoracentesis: 'THORACENTESIS', 'drain-tube': 'DRAINAGE', pleurodesis: 'PLEURODESIS' };
/** demo 侧别 → 枚举。 */
const SIDE = { 左侧: 'LEFT', 右侧: 'RIGHT', 双侧: 'BILATERAL' };
/** demo 分子标记显示名 → 0001 molecular_marker.marker 枚举（显示名存 marker_label）。 */
const MARKER_KEY = {
  'BAP1': 'BAP1',
  'SMARCB1（INI1）': 'SMARCB1',
  'MTAP': 'MTAP',
  '间皮素（SMRP）': 'MESOTHELIN',
  'PD-L1（22C3 TPS）': 'OTHER',
};
/** demo 心境/家事主题 → 0001 viewpoint.topic 枚举（原文主题存 topic_label）。
 *  family 行统一 topic='FAMILY'，读模型按 topic 分流回 viewpoints / family 两个数组。 */
const TOPIC_KEY = { MOOD: 'MOOD', CARE_BURDEN: 'CARE_BURDEN', 赔偿分歧: 'COMPENSATION', DECISION_ACP: 'DECISION_ACP' };

/** 指标目录种子（显示字典在原型 app.js 的 CATALOG；这里只落库 code 侧元数据，不是第二份显示源）。
 *  ctcae_rule：血液四项=绝对阈值型（levels 存 JSON）；ALT=×ULN 型（须用化验单自带参考上限）。 */
const METRIC_DEFS = [
  ['WBC', '白细胞', '10⁹/L', '血象', '#33608C', 1, 'absolute', 0],
  ['ANC', '中性粒细胞', '10⁹/L', '血象', '#4a7ba6', 1, 'absolute', 1],
  ['PLT', '血小板', '10⁹/L', '血象', '#7fa3c0', 1, 'absolute', 2],
  ['HGB', '血红蛋白', 'g/L', '血象', '#a3bfd4', 1, 'absolute', 3],
  ['ALT', 'ALT（谷丙转氨酶）', 'U/L', '肝功能', '#8a5a0c', 1, 'uln', 4],
  ['DRAIN', '胸水引流量', 'ml/次', '胸水与呼吸', '#1F4A73', 1, null, 5],
  ['PLEURA_MM', '胸膜最厚处', 'mm', '胸水与呼吸', '#55707E', 1, null, 6],
  ['WEIGHT', '体重', 'kg', '体格与代谢', '#2f6f66', 1, null, 7],
  ['MMRC', 'mMRC 呼吸困难分级', '级', '功能评估', '#7C99A8', 0, null, 8],
];

/** mMRC 记录人：src 含"医生"→CLINICIAN、含"代记"→CAREGIVER，其余 SELF。 */
function mmrcDoneBy(src) {
  const s = String(src ?? '');
  if (s.includes('医生')) return 'CLINICIAN';
  if (s.includes('代记')) return 'CAREGIVER';
  return 'SELF';
}

/* ---------------- 播种 ---------------- */

/**
 * 把 buildDemoProfiles() 的数据写进库。返回写入计数（便于启动日志与测试）。
 * 档案 key = profile.id（demo1 / demo2）。
 */
export function seedDemo(db, input) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('seedDemo 需要一个已打开的数据库');
  const data = input || finalize();

  const already = db.prepare('SELECT COUNT(*) AS n FROM profile').get().n;
  if (already > 0) return { skipped: true, subjects: 0, metrics: 0, points: 0, trials: 0 };

  const counts = { skipped: false, subjects: 0, metrics: 0, points: 0, trials: 0 };
  const today = data.meta?.today ?? new Date().toISOString().slice(0, 10);

  db.exec('BEGIN');
  try {
    const insWorkspace = db.prepare('INSERT OR REPLACE INTO workspace (id, data_root, schema_version, dataset_state) VALUES (?,?,?,?)');
    const insProfile = db.prepare(`INSERT INTO profile
      (id, name, birth_date, gender, primary_role, cognitive_flag, created_at) VALUES (?,?,?,?,?,?,?)`);
    const insProfileMeta = db.prepare('INSERT INTO profile_meta (profile_id, k, v) VALUES (?,?,?)');
    const insMetricDef = db.prepare(`INSERT INTO metric_def
      (code, label, unit, category, color, is_numeric, ctcae_rule, ord) VALUES (?,?,?,?,?,?,?,?)`);
    const insPoint = db.prepare(`INSERT INTO metric_point
      (profile_id, code, measured_at, value_num, value_text, source_note, revision, ref_low, ref_high) VALUES (?,?,?,?,?,?,?,?,?)`);
    const insLab = db.prepare(`INSERT INTO lab_result
      (profile_id, collected_at, panel, ref_range, document_id, source_note) VALUES (?,?,?,?,?,?)`);
    const insDocument = db.prepare(`INSERT INTO document
      (profile_id, file_name, sha256, status, imported_at, ord, ext_id, kind_text, size_text, review_state) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const insExposure = db.prepare(`INSERT INTO asbestos_exposure
      (profile_id, period_from, period_to, job_type, workplace, protection, exposure_kind, source_note, author_role, ord, revision, hazard_text, state_text, note)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insMaterial = db.prepare(`INSERT INTO compensation_doc
      (profile_id, doc_name, status, note, ord, ext_id, why_text, state_text) VALUES (?,?,?,?,?,?,?,?)`);
    const insDetour = db.prepare(`INSERT INTO detour_visit
      (profile_id, visit_date, institution, initial_impression, exams_done, referral_note, author_role, ord, revision, stage_text, note)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const insPleural = db.prepare(`INSERT INTO pleural_event
      (profile_id, event_date, kind, fluid_volume_ml, relief_note, mMRC_at_time, side, note, ord, method_text, author_role, ext_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insMmrc = db.prepare(`INSERT INTO mmrc_grade
      (profile_id, graded_on, grade, done_by, ord, context_text, source_note) VALUES (?,?,?,?,?,?,?)`);
    const insPathology = db.prepare(`INSERT INTO pathology_type
      (profile_id, histology, status, im_panel, report_date, report_doc_id, ord, revision, method_text, hospital, excerpt, type_label)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insMarker = db.prepare(`INSERT INTO molecular_marker
      (profile_id, marker, status, method, specimen_date, value_text, report_doc_id, note, ord, revision, marker_label, explain_text)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insMarkerTitle = db.prepare('INSERT OR REPLACE INTO molecular_marker_title (marker, title, ord) VALUES (?,?,?)');
    const insCycle = db.prepare(`INSERT INTO onco_cycle
      (profile_id, kind, cycle_number, start_date, end_date, regimen_note, response_text, status, stop_reason, ord, revision, delay_days, adjust_text, author_role)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insCt = db.prepare(`INSERT INTO ct_followup
      (profile_id, exam_date, measurement_text, report_excerpt, mMRC_at_time, next_exam_plan, report_doc_id, ord, kind_text, ext_id)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const insView = db.prepare(`INSERT INTO viewpoint
      (profile_id, author_role, visibility, topic, content, record_date, ord, topic_label, witnessed)
      VALUES (?,?,?,?,?,?,?,?,?)`);
    const insDecision = db.prepare('INSERT INTO decision_checklist (profile_id, topic, status, note, ord) VALUES (?,?,?,?,?)');
    const insChange = db.prepare('INSERT INTO treatment_change (profile_id, changed_on, item, detail, note, ord) VALUES (?,?,?,?,?,?)');
    const insQa = db.prepare('INSERT INTO followup_qa (profile_id, asked_on, question, answer_text, place, ord) VALUES (?,?,?,?,?,?)');
    const insRhythm = db.prepare('INSERT INTO followup_rhythm (profile_id, item, freq, guideline, next_on, ord) VALUES (?,?,?,?,?,?)');
    const insTrialLead = db.prepare('INSERT INTO trial_lead (profile_id, trial_key, title, phase, status_text, source, ord) VALUES (?,?,?,?,?,?,?)');
    const insReport = db.prepare('INSERT INTO report_excerpt (profile_id, ext_id, reported_on, kind_text, title, excerpt, ord) VALUES (?,?,?,?,?,?,?)');
    const insSymptom = db.prepare(`INSERT INTO symptom_log
      (profile_id, logged_at, symptom, severity_text, author_role, ord, note) VALUES (?,?,?,?,?,?,?)`);
    const insJob = db.prepare('INSERT INTO parse_job (document_id, requested_at, state, error_code, error_message) VALUES (?,?,?,?,?)');
    const insCand = db.prepare(`INSERT INTO candidate
      (parse_job_id, field_name, value_text, value_num, unit, confirmed, confirmed_at, target_table, target_id, ext_id, source_note, state_text)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insDemoMeta = db.prepare('INSERT OR REPLACE INTO demo_meta (k, v) VALUES (?,?)');

    /* 全局：workspace 行 + 演示元信息 + 指标目录（目录是全局字典，只种一次）。 */
    insWorkspace.run(1, null, '0001+0002', 'demo-seeded');
    for (const [k, v] of Object.entries(data.meta || {})) insDemoMeta.run(k, v ?? null);
    for (const [code, label, unit, cat, color, isNum, rule, ord] of METRIC_DEFS) {
      insMetricDef.run(code, label, unit, cat, color, isNum, rule, ord);
    }

    for (const p of data.profiles || []) {
      const key = p.id;
      insProfile.run(key, p.name, null, p.gender ?? null, p.primaryRole ?? 'PATIENT',
        p.cognitiveFlag ?? 'stable', today);
      counts.subjects++;

      /* 档案级标量 → profile_meta（读模型逐键还原；多一个键 parity 就红）。 */
      const metaRows = [
        ['age', p.age === undefined ? null : String(p.age)],
        ['diagnosis', p.diagnosis ?? null],
        ['stageLine', p.stageLine ?? null],
        ['witness', j(p.witness ?? null)],
        ['treatment_pathway', p.treatment?.pathway ?? null],
        ['treatment_regimen', p.treatment?.regimen ?? null],
        ['treatment_next_on', p.treatment?.nextOn ?? null],
        ['treatment_reaction', j(p.treatment?.reactionMode ?? null)],
        ['pathology_method', p.pathology?.method ?? null],
        ['pathology_hospital', p.pathology?.hospital ?? null],
        ['pathology_excerpt', p.pathology?.excerpt ?? null],
        ['pathology_type_label', p.pathology?.typeLabel ?? null],
      ];
      for (const [k, v] of metaRows) insProfileMeta.run(key, k, v);

      /* 指标点：数值序列（mMRC 不写这里——qual.MMRC 由读模型从 mmrc_grade 派生，单源）。 */
      for (const [code, pts] of Object.entries(p.metrics?.numeric || {})) {
        counts.metrics++;
        (pts || []).forEach((pt, i) => {
          insPoint.run(key, code, pt.d, typeof pt.v === 'number' ? pt.v : null,
            typeof pt.v === 'number' ? null : (pt.v === undefined ? null : String(pt.v)),
            pt.src ?? null, 1, pt.refLow ?? null, pt.refHigh ?? null);
          counts.points++;
        });
      }

      /* 胸水生化 → lab_result（panel 存 JSON；ref_range 留空——胸水生化报告没印参考区间）。 */
      (p.effusionLabs || []).forEach((r) => {
        insLab.run(key, r.d, j({ prot: r.prot, ldh: r.ldh, ada: r.ada, gluc: r.gluc, cells: r.cells }),
          null, null, r.src ?? null);
      });

      /* 资料库文档：合成导入文档（候选的宿主）ext_id='demo-import'，读模型按它排除。 */
      const importDoc = db.prepare(
        'INSERT INTO document (profile_id, file_name, sha256, status, imported_at, ord, ext_id, kind_text, size_text, review_state) VALUES (?,?,?,?,?,?,?,?,?,?)',
      ).run(key, '演示候选（拍照识别导入）', sha(`demo-import:${key}`), 'parsed', today, 0, 'demo-import', null, null, null);
      const job = insJob.run(importDoc.lastInsertRowid, today, 'succeeded', null, null);

      (p.documents || []).forEach((d, i) => {
        insDocument.run(key, d.name, sha(d.name), 'parsed', today, i + 1, d.id,
          d.kind ?? null, d.size ?? null, d.status ?? null);
      });
      (p.candidates || []).forEach((c, i) => {
        insCand.run(job.lastInsertRowid, c.field, c.value, null, null, 0, null, null, null,
          c.id, c.src ?? null, c.state ?? null);
      });

      /* 石棉暴露 / 材料清单 / 弯路。 */
      (p.exposure || []).forEach((r, i) => {
        insExposure.run(key, r.from ?? null, r.to ?? null, r.job ?? null, r.place ?? null,
          r.protection ?? null, 'OCCUPATIONAL', null, p.primaryRole ?? 'PATIENT', i, 1,
          r.hazard ?? null, r.state ?? null, r.note ?? null);
      });
      (p.materials || []).forEach((r, i) => {
        insMaterial.run(key, r.name, MATERIAL_STATUS[r.state] ?? 'missing', r.note ?? null, i, r.id, r.why ?? null, r.state ?? null);
      });
      (p.detour || []).forEach((r, i) => {
        insDetour.run(key, r.d ?? null, r.place ?? null, r.impression ?? null, r.exams ?? null,
          r.referral ?? null, p.primaryRole ?? 'PATIENT', i, 1, r.stage ?? null, r.note ?? null);
      });

      /* 胸水事件 / mMRC / 症状。 */
      (p.pleura?.events || []).forEach((r, i) => {
        insPleural.run(key, r.d, PLEURA_KIND[r.kind] ?? 'OTHER', r.volumeMl ?? null, r.relief ?? null,
          null, SIDE[r.side] ?? 'UNKNOWN', r.note ?? null, i, r.method ?? null, r.author ?? null, r.id ?? null);
      });
      (p.pleura?.mMRC || []).forEach((r, i) => {
        insMmrc.run(key, r.d, r.grade, mmrcDoneBy(r.src), i, r.context ?? null, r.src ?? null);
      });
      (p.pleura?.symptoms || []).forEach((r, i) => {
        insSymptom.run(key, r.d, r.breathless ?? '—', r.pain ?? null, r.author ?? p.primaryRole ?? 'PATIENT',
          i, r.note ?? null);
      });

      /* 病理（一档案一行）+ 分子三态 + 标题表。 */
      if (p.pathology) {
        insPathology.run(key, String(p.pathology.type || 'NOT_SUBTYPED').toUpperCase(), 'reported',
          j(p.pathology.ihc || []), p.pathology.biopsyDate ?? null, null, 0, 1,
          p.pathology.method ?? null, p.pathology.hospital ?? null, p.pathology.excerpt ?? null,
          p.pathology.typeLabel ?? null);
      }
      (p.molecular || []).forEach((r, i) => {
        const mk = MARKER_KEY[r.marker] ?? 'OTHER';
        insMarker.run(key, mk, r.status, r.method ?? null, r.date ?? null, r.value ?? null,
          null, null, i, 1, r.marker, r.explain ?? null);
        insMarkerTitle.run(mk, r.marker, i);
      });

      /* 治疗周期（化疗 / 双免两条轨道，同一张 onco_cycle）+ 变更。 */
      (p.treatment?.chemoCycles || []).forEach((c, i) => {
        insCycle.run(key, 'CHEMO_PEM_PLATINUM', c.n ?? (i + 1), c.from ?? null, null, c.plan ?? null,
          c.took ?? null, 'completed', null, i, 1, c.delayDays ?? null, c.adjust ?? null, null);
      });
      (p.treatment?.immuneInfusions || []).forEach((c, i) => {
        insCycle.run(key, 'IMMUNO_NIVO_IPI', c.n ?? (i + 1), c.d ?? null, null, c.drugs ?? null,
          c.reaction ?? null, 'completed', null, i, 1, null, null, c.author ?? null);
      });
      (p.treatment?.changes || []).forEach((r, i) => {
        insChange.run(key, r.d, r.item, r.detail ?? null, r.note ?? null, i);
      });

      /* 随访影像（mRECIST 语境并列，无判读列）。 */
      (p.imaging || []).forEach((r, i) => {
        insCt.run(key, r.d, r.measure ?? null, r.excerpt ?? null, r.mMRCAtTime ?? null,
          r.next ?? null, null, i, r.kind ?? null, r.id ?? null);
      });

      /* 双主体：viewpoints（当下感受）+ family（照护代记与家事）→ 同一张 viewpoint 表，
         family 行 topic='FAMILY'，读模型按 topic 分流。 */
      (p.viewpoints || []).forEach((v, i) => {
        insView.run(key, v.role ?? 'PATIENT', v.visibility ?? 'shared', TOPIC_KEY[v.topic] ?? 'OTHER',
          v.content, v.date, i, v.topic ?? null, null);
      });
      (p.family || []).forEach((v, i) => {
        insView.run(key, v.author ?? 'CAREGIVER', v.visibility ?? 'shared', 'FAMILY',
          v.content, v.d, i, v.topic ?? null, flag(v.witnessed));
      });
      (p.decisions || []).forEach((r, i) => {
        insDecision.run(key, r.topic, r.status ?? 'open', r.note ?? null, i);
      });

      /* 复诊节奏 / 问答与跟进 / 报告原文 / 试验线索。 */
      (p.rhythm || []).forEach((r, i) => {
        insRhythm.run(key, r.item, r.freq ?? null, r.guideline ?? null, r.next ?? null, i);
      });
      (p.qa || []).forEach((r, i) => {
        insQa.run(key, r.d ?? null, r.q, r.a ?? null, r.place ?? null, i);
      });
      (p.reports || []).forEach((r, i) => {
        insReport.run(key, r.id ?? null, r.d ?? null, r.kind ?? null, r.title ?? null, r.excerpt ?? null, i);
      });
      (p.trials || []).forEach((t, i) => {
        insTrialLead.run(key, t.key ?? null, t.title, t.phase ?? null, t.status ?? null, t.source ?? null, i);
        counts.trials++;
      });
    }

    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* 回滚失败也要把原始错误抛出去 */ }
    throw new Error(`播种演示数据失败（已回滚）：${error.message}`);
  }
  return counts;
}

/** 库的演示档案是否已播种过。启动流程用它决定要不要 seedDemo。 */
export function hasDemoData(db) {
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM profile').get().n > 0;
  } catch {
    return false;
  }
}
