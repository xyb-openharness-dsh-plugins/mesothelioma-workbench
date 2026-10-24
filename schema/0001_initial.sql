-- 0001_initial.sql · MPM 工作台初始迁移（G3 冻结版 · 2026-10-24）
-- 来源：schema/draft/0001_mpm_specific.sql（MPM 专属 10 表，判读列断言 PASS）+ 家族通用结构
--（GBM 冻结版 27 表骨架平移；通用组 7 张，viewpoint/decision_checklist 归入专属组带双主体字段）。
-- 顺序：档案级 → 指标 → 通用 → MPM 专属 → 导入件。共 27 表。
-- 冻结规则：sha256 记入 schema/freeze-contract.md；结构变更只能新增 000N_*.sql，不改本文件。
-- 四契约：① 无判读列 ② 缺测 NULL ≠ 0 ③ 更正只新增版本 ④ 事实四层不合并。
-- MPM 红线：M3 材料清单零法律建议（表内无建议类字段，note 只存用户原文）；证言人等第三方信息走
--   viewpoint/topic=OTHER + visibility='private'（专项授权在应用层，数据层默认私密）。

-- ═══ 档案级（2）═══
CREATE TABLE workspace (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_root TEXT,
  schema_version TEXT NOT NULL,
  dataset_state TEXT
);
CREATE TABLE profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date TEXT,
  gender TEXT,
  primary_role TEXT CHECK (primary_role IN ('PATIENT','CAREGIVER')),
  cognitive_flag TEXT CHECK (cognitive_flag IN ('stable','changed')),
  created_at TEXT NOT NULL
);

-- ═══ 指标（3）═══
CREATE TABLE metric_def (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT,
  category TEXT NOT NULL,
  color TEXT,
  is_numeric INTEGER NOT NULL DEFAULT 1,
  ctcae_rule TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE metric_point (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  code TEXT NOT NULL REFERENCES metric_def(code),
  measured_at TEXT NOT NULL,
  value_num REAL,
  value_text TEXT,
  source_note TEXT,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE lab_result (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  panel TEXT,
  ref_range TEXT,
  document_id INTEGER
);

-- ═══ 通用（7）═══
CREATE TABLE adverse_event (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  term TEXT NOT NULL,
  ctcae_grade INTEGER,
  attribution_note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE symptom_log (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  symptom TEXT NOT NULL,
  severity_text TEXT,
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE nutrition_log (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  intake_level TEXT CHECK (intake_level IN ('OK','REDUCED','MINIMAL')),
  weight_kg REAL,
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE question (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fact','view')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  asked_on TEXT,
  from_scenario TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE task (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due_on TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE document (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','parsed','parse_failed')),
  imported_at TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE saved_trial (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  trial_key TEXT NOT NULL,
  saved_at TEXT NOT NULL
);

-- ═══ MPM 专属（12）═══
-- 种子 #1：石棉暴露与材料（M3：零法律建议，note 只存用户/家属原文）
CREATE TABLE asbestos_exposure (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  period_from TEXT, period_to TEXT,
  job_type TEXT, workplace TEXT,
  protection TEXT,
  exposure_kind TEXT CHECK (exposure_kind IN ('OCCUPATIONAL','HOUSEHOLD','ENVIRONMENTAL','UNKNOWN')),
  source_note TEXT,
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE compensation_doc (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  doc_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('missing','requested','received','filed')),
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
-- 种子 #6：就诊弯路
CREATE TABLE detour_visit (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  visit_date TEXT,
  institution TEXT,
  initial_impression TEXT,
  exams_done TEXT,
  referral_note TEXT,
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
-- 种子 #2：胸水事件轨道 + mMRC 分类卡
CREATE TABLE pleural_event (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  event_date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('THORACENTESIS','DRAINAGE','PLEURODESIS','INTRA_CAVITY_CHEMO','OTHER')),
  fluid_volume_ml INTEGER,
  relief_note TEXT,
  mMRC_at_time INTEGER CHECK (mMRC_at_time BETWEEN 0 AND 4),
  side TEXT CHECK (side IN ('LEFT','RIGHT','BILATERAL','UNKNOWN')),
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE mmrc_grade (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  graded_on TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 0 AND 4),
  done_by TEXT CHECK (done_by IN ('SELF','CAREGIVER','CLINICIAN')),
  ord INTEGER NOT NULL DEFAULT 0
);
-- 种子 #3：病理三型 + 分子三态（未检测 ≠ 阴性）
CREATE TABLE pathology_type (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  histology TEXT NOT NULL CHECK (histology IN ('EPITHELIOID','SARCOMATOID','BIPHASIC','NOT_SUBTYPED')),
  status TEXT NOT NULL CHECK (status IN ('reported','not_reported')),
  im_panel TEXT,
  report_date TEXT,
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE molecular_marker (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  marker TEXT NOT NULL CHECK (marker IN ('BAP1','SMARCB1','MTAP','MESOTHELIN','SMRP','OTHER')),
  status TEXT NOT NULL CHECK (status IN ('detected','not_detected','not_tested')),
  method TEXT, specimen_date TEXT,
  value_text TEXT,
  report_doc_id INTEGER,
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE molecular_marker_title ( marker TEXT PRIMARY KEY, title TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0 );
-- 种子 #4：治疗周期（MPM 枚举；反应模式只抄原文）
CREATE TABLE onco_cycle (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('CHEMO_PEM_PLATINUM','IMMUNO_NIVO_IPI','IMMUNO_MAINTENANCE','BEV_OFFLABEL','OTHER')),
  cycle_number INTEGER,
  start_date TEXT, end_date TEXT,
  regimen_note TEXT,
  response_text TEXT,
  status TEXT CHECK (status IN ('planned','ongoing','completed','stopped','changed')),
  stop_reason TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
-- 种子 #5：CT 随访并列（mRECIST 语境，无判读列）
CREATE TABLE ct_followup (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  exam_date TEXT NOT NULL,
  measurement_text TEXT,
  report_excerpt TEXT,
  mMRC_at_time INTEGER CHECK (mMRC_at_time BETWEEN 0 AND 4),
  next_exam_plan TEXT,
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0
);
-- 双主体（G5：visibility 数据结构属性；证言人等第三方信息默认 private）
CREATE TABLE viewpoint (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  visibility TEXT NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared','private')),
  topic TEXT CHECK (topic IN ('MOOD','CARE_BURDEN','FAMILY','DECISION_ACP','COMPENSATION','OTHER')),
  content TEXT NOT NULL,
  record_date TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE decision_checklist (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','discussed','filed')),
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

-- ═══ 导入件（3，18 号 v2 语义）═══
CREATE TABLE import_file (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES document(id),
  byte_size INTEGER NOT NULL,
  mime TEXT,
  in_use INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE parse_job (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES document(id),
  requested_at TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('running','succeeded','failed')),
  error_code TEXT,
  error_message TEXT
);
CREATE TABLE candidate (
  id INTEGER PRIMARY KEY,
  parse_job_id INTEGER NOT NULL REFERENCES parse_job(id),
  field_name TEXT NOT NULL,
  value_text TEXT,
  value_num REAL,
  unit TEXT,
  confirmed INTEGER NOT NULL DEFAULT 0,
  confirmed_at TEXT,
  target_table TEXT,
  target_id INTEGER
);
