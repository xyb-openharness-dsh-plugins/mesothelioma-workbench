-- MPM 专属表草案（Phase1 · schema/draft/，未冻结、不执行）
-- 四契约同 GBM（无判读列 / 缺测 NULL≠0 / 更正只新增版本 / 事实四层不合并）。
-- 通用 8 张 + 指标 3 张 + 档案级 + 导入 3 张：由 family-landscape 调研并入 0002 草案（结构平移 cervical）。
-- MPM 红线：M1 三态；M2 胸水独立轨道 + mMRC 不连线；M3 材料零法律建议；M4 影像并列无判读；M5 双主体 visibility。

-- ── 种子 #1 石棉暴露与职业史 ─────────────────────────────────
CREATE TABLE asbestos_exposure (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  period_from TEXT, period_to TEXT,        -- 暴露年代段（记忆模糊时只填 from）
  job_type TEXT, workplace TEXT,           -- 工种/场所（患者语言原文）
  protection TEXT,                          -- 防护情况（"没有口罩"等原文）
  exposure_kind TEXT CHECK (exposure_kind IN ('OCCUPATIONAL','HOUSEHOLD','ENVIRONMENTAL','UNKNOWN')),
  source_note TEXT,                         -- 记忆来源（本人回忆/家属补充）
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE compensation_doc (             -- M3 红线：只整理材料状态，零法律建议字段
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  doc_name TEXT NOT NULL,                   -- 材料名（职业病诊断证明/暴露证明/劳动关系证明…）
  status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('missing','requested','received','filed')),
  note TEXT,                                -- 去哪办/缺什么（家属经验，非法律指导）
  ord INTEGER NOT NULL DEFAULT 0
);

-- ── 种子 #6 就诊弯路时间线 ──────────────────────────────────
CREATE TABLE detour_visit (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  visit_date TEXT,
  institution TEXT,
  initial_impression TEXT,                  -- 初诊印象原文（"考虑结核性胸膜炎"只抄不判）
  exams_done TEXT,                          -- 做过什么检查/治疗（"抗结核三个月"原文）
  referral_note TEXT,                       -- 转诊/转折点
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);

-- ── 种子 #2 胸水事件轨道（独立，不并入化验趋势）──────────────
CREATE TABLE pleural_event (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  event_date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('THORACENTESIS','DRAINAGE','PLEURODESIS','INTRA_CAVITY_CHEMO','OTHER')),
  fluid_volume_ml INTEGER,                  -- 引流量（可 NULL）
  relief_note TEXT,                         -- 缓解程度患者语言
  mMRC_at_time INTEGER CHECK (mMRC_at_time BETWEEN 0 AND 4),   -- 当时呼吸困难分级（关联展示用）
  side TEXT CHECK (side IN ('LEFT','RIGHT','BILATERAL','UNKNOWN')),
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE mmrc_grade (                   -- mMRC 0-4 分类卡（不进趋势线，26 号分类语义）
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  graded_on TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 0 AND 4),
  done_by TEXT CHECK (done_by IN ('SELF','CAREGIVER','CLINICIAN')),
  ord INTEGER NOT NULL DEFAULT 0
);

-- ── 种子 #3 病理三型 + 分子三态 ─────────────────────────────
CREATE TABLE pathology_type (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  histology TEXT NOT NULL CHECK (histology IN ('EPITHELIOID','SARCOMATOID','BIPHASIC','NOT_SUBTYPED')),
  status TEXT NOT NULL CHECK (status IN ('reported','not_reported')),   -- 报告未分型 ≠ 分型阴性
  im_panel TEXT,                            -- 免疫组化鉴别套餐原文（calretinin/WT-1/TTF-1/Napsin A 逐项另存或 JSON 抄写）
  report_date TEXT,
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE molecular_marker (             -- 三态红线（同 GBM G1）
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  marker TEXT NOT NULL CHECK (marker IN ('BAP1','SMARCB1','MTAP','MESOTHELIN','SMRP','OTHER')),
  status TEXT NOT NULL CHECK (status IN ('detected','not_detected','not_tested')),
  method TEXT, specimen_date TEXT,
  value_text TEXT,                          -- 原文数值（如 SMRP nmol/L）照抄
  report_doc_id INTEGER,
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE molecular_marker_title ( marker TEXT PRIMARY KEY, title TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0 );

-- ── 种子 #4 免疫/化疗周期（kind 枚举 MPM 化）────────────────
CREATE TABLE onco_cycle (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('CHEMO_PEM_PLATINUM','IMMUNO_NIVO_IPI','IMMUNO_MAINTENANCE','BEV_OFFLABEL','OTHER')),
  cycle_number INTEGER,
  start_date TEXT, end_date TEXT,
  regimen_note TEXT,                        -- 方案原文（含叶酸/B12 辅助记录位）
  response_text TEXT,                       -- 反应模式报告原文（iRECIST 语境只抄写）
  status TEXT CHECK (status IN ('planned','ongoing','completed','stopped','changed')),
  stop_reason TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);

-- ── 种子 #5 CT 随访并列（modified RECIST 语境，无判读列）────
CREATE TABLE ct_followup (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  exam_date TEXT NOT NULL,
  measurement_text TEXT,                    -- 胸膜测量原文（mRECIST 垂直厚度语境，照抄）
  report_excerpt TEXT,                      -- 结论原文
  mMRC_at_time INTEGER CHECK (mMRC_at_time BETWEEN 0 AND 4),
  next_exam_plan TEXT,
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0
);
