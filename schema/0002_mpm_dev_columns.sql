-- 0002_mpm_dev_columns.sql · M5 开发版增量（2026-10-24；冻结后新增，不改 0001）
-- 来源：M5 移植时 demo/build-demo-data.mjs（唯一数据源）有若干事实在 0001 的 27 表里没有落点。
-- 逐条对照（每一列都对应读模型 restore 的一个字段，缺一 parity 即红）：
--   ① profile 级标量（age/diagnosis/stageLine/witness/treatment 汇总）→ 新表 profile_meta（k/v；cervical 0002 先例）；
--   ② 全局演示元信息 meta{dataStart,today,disclaimer,trialNote,materialNote} → 新表 demo_meta（cervical demo_meta 先例）；
--   ③ 治疗变更（treatment.changes）→ 新表 treatment_change；
--   ④ 问答与跟进（qa）→ 新表 followup_qa（question 表无"答复原文"列，语义不同，不硬塞）；
--   ⑤ 随访节奏（rhythm）→ 新表 followup_rhythm；
--   ⑥ 试验线索（profile.trials，按档案）→ 新表 trial_lead（0001 的 saved_trial 是"收藏"不是"线索目录"）；
--   ⑦ 报告原文（reports）→ 新表 report_excerpt（与 document 资料库语义不同）；
--   ⑧ 补列（只 ALTER ADD）：detour_visit.stage_text/note、pleural_event.method_text/author_role、
--      mmrc_grade.context_text/source_note、metric_point.ref_low/ref_high（ZERO-TO-DEV §1.2 参考值落库）、
--      ct_followup.kind_text/ext_id、symptom_log.note、document.ext_id/kind_text/size_text/review_state、
--      candidate.ext_id/source_note/state_text、asbestos_exposure.hazard_text/state_text/note、
--      compensation_doc.ext_id/why_text、pathology_type.method_text/hospital/excerpt/type_label、
--      molecular_marker.marker_label/explain_text、onco_cycle.delay_days/adjust_text/author_role、
--      lab_result.source_note、pleural_event.ext_id、viewpoint.topic_label/witnessed。
-- 红线复核：全部为新增列/新增表，无 UPDATE/DELETE，无既有列改名或删除；判读列断言不受影响
--（新列均为"原文照抄"类，无 is_conclusion/is_progression/legal_advice 语义）。

-- ─── 新表（7）───
CREATE TABLE profile_meta (
  profile_id TEXT NOT NULL REFERENCES profile(id),
  k TEXT NOT NULL,
  v TEXT,
  PRIMARY KEY (profile_id, k)
);
CREATE TABLE demo_meta (
  k TEXT PRIMARY KEY,
  v TEXT
);
CREATE TABLE treatment_change (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  changed_on TEXT NOT NULL,
  item TEXT NOT NULL,
  detail TEXT,
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE followup_qa (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  asked_on TEXT,
  question TEXT NOT NULL,
  answer_text TEXT,
  place TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE followup_rhythm (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  item TEXT NOT NULL,
  freq TEXT,
  guideline TEXT,
  next_on TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE trial_lead (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  trial_key TEXT,
  title TEXT NOT NULL,
  phase TEXT,
  status_text TEXT,
  source TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE report_excerpt (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  ext_id TEXT,
  reported_on TEXT,
  kind_text TEXT,
  title TEXT,
  excerpt TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

-- ─── 补列（只 ADD COLUMN）───
ALTER TABLE detour_visit ADD COLUMN stage_text TEXT;
ALTER TABLE detour_visit ADD COLUMN note TEXT;
ALTER TABLE pleural_event ADD COLUMN method_text TEXT;
ALTER TABLE pleural_event ADD COLUMN author_role TEXT;
ALTER TABLE mmrc_grade ADD COLUMN context_text TEXT;
ALTER TABLE mmrc_grade ADD COLUMN source_note TEXT;
ALTER TABLE metric_point ADD COLUMN ref_low REAL;
ALTER TABLE metric_point ADD COLUMN ref_high REAL;
ALTER TABLE ct_followup ADD COLUMN kind_text TEXT;
ALTER TABLE ct_followup ADD COLUMN ext_id TEXT;
ALTER TABLE symptom_log ADD COLUMN note TEXT;
ALTER TABLE document ADD COLUMN ext_id TEXT;
ALTER TABLE document ADD COLUMN kind_text TEXT;
ALTER TABLE document ADD COLUMN size_text TEXT;
ALTER TABLE document ADD COLUMN review_state TEXT;
ALTER TABLE candidate ADD COLUMN ext_id TEXT;
ALTER TABLE candidate ADD COLUMN source_note TEXT;
ALTER TABLE candidate ADD COLUMN state_text TEXT;
ALTER TABLE asbestos_exposure ADD COLUMN hazard_text TEXT;
ALTER TABLE asbestos_exposure ADD COLUMN state_text TEXT;
ALTER TABLE asbestos_exposure ADD COLUMN note TEXT;
ALTER TABLE compensation_doc ADD COLUMN ext_id TEXT;
ALTER TABLE compensation_doc ADD COLUMN why_text TEXT;
ALTER TABLE compensation_doc ADD COLUMN state_text TEXT;
ALTER TABLE pathology_type ADD COLUMN method_text TEXT;
ALTER TABLE pathology_type ADD COLUMN hospital TEXT;
ALTER TABLE pathology_type ADD COLUMN excerpt TEXT;
ALTER TABLE pathology_type ADD COLUMN type_label TEXT;
ALTER TABLE molecular_marker ADD COLUMN marker_label TEXT;
ALTER TABLE molecular_marker ADD COLUMN explain_text TEXT;
ALTER TABLE onco_cycle ADD COLUMN delay_days INTEGER;
ALTER TABLE onco_cycle ADD COLUMN adjust_text TEXT;
ALTER TABLE onco_cycle ADD COLUMN author_role TEXT;
ALTER TABLE lab_result ADD COLUMN source_note TEXT;
ALTER TABLE pleural_event ADD COLUMN ext_id TEXT;
ALTER TABLE viewpoint ADD COLUMN topic_label TEXT;
ALTER TABLE viewpoint ADD COLUMN witnessed INTEGER;
