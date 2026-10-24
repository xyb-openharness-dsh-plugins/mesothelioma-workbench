# Schema 冻结合同（G3）· 2026-10-24

| 项 | 值 |
| --- | --- |
| 文件 | `schema/0001_initial.sql` |
| sha256 | `eec1589ae971d0cd0c7d8a94f73ac18452c7226e046f42b60a89ac632031c850` |
| 表数 | 27（档案 2 + 指标 3 + 通用 7 + MPM 专属 12 + 导入 3） |
| 冻结日 | 2026-10-24（用户 G2 签认后执行；G3 签认人 samqin123） |
| 验证 | 内存库实测 27 表全建；判读列断言 PASS（无 is_conclusion/is_progression/legal_advice 类列） |

## 内容边界

档案级：workspace / profile（双主体 primary_role + cognitive_flag）。
指标：metric_def（is_numeric=0 不进趋势）/ metric_point（value_num+value_text 双轨）/ lab_result（ref_range）。
通用：adverse_event / symptom_log（author_role）/ nutrition_log / question（fact/view+from_scenario）/ task / document（三态）/ saved_trial。
MPM 专属：asbestos_exposure（暴露时间线，author_role）/ compensation_doc（材料四态，零法律建议字段）/ detour_visit（弯路）/ pleural_event（胸水轨道+引流量+mMRC）/ mmrc_grade（0–4 分类卡）/ pathology_type（三型）/ molecular_marker(+title)（三态）/ onco_cycle（MPM 枚举+反应原文）/ ct_followup（mRECIST 并列）/ viewpoint（visibility+COMPENSATION 主题，证言人等第三方信息默认 private）/ decision_checklist。
导入：import_file（in_use）/ parse_job（重试留痕）/ candidate（逐项核对）。

## 冻结规则

1. sha256 与实算一致才可继续；不一致即冻结破坏，停线排查。
2. 结构变更**只能新增** `000N_*.sql`，不改 0001，不写 UPDATE/DELETE 迁移。
3. 分节补列走 ALTER 追加（D5 教训；GBM 0002 先例——**改包必升版**同时适用）。
4. 解冻需用户书面确认并在本文件追加记录。
