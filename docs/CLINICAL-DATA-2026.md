# 临床试验数据 2026（CLINICAL-DATA-2026）

> 规程同 GBM（ZERO-TO-DEV §1.3 + docs/CLINICAL-DATA-2026 同款诚实边界）。脚本 `scripts/fetch-mesothelioma-trials-2026.mjs`。

## 通道覆盖

| 通道 | 覆盖 |
| --- | --- |
| chinadrugtrials（CDE，含 PI） | 在线，将查 |
| ctv（ClinicalTrials.gov 深度索引） | 在线，将查（英文词命中主力） |
| chictr_online | 在线，将查（GBM 轮曾两轮 FAILED，如实记录终态） |
| ictrp（WHO） | 在线，将查（同上） |
| 离线语料（ChiCTR/CDE/CTV 离线/小胰宝归档） | **未配置（仅胰腺癌覆盖）**，不假装已查 |

## 采集关键词口径（M4 前冻结，中英双语）

- 中文：间皮瘤 / 胸膜间皮瘤 / 恶性胸膜间皮瘤
- 英文：mesothelioma / malignant pleural mesothelioma / malignant mesothelioma / MPM
- 成分词（第二层核对，不作主检索）：asbestos / 石棉 / BAP1 / nivolumab / ipilimumab / 双免疫

## 诚实边界（同 GBM 不可让步）

0 条结果带覆盖声明；FAILED/NEEDS_SETUP 不算"查过"；登记状态一律"登记状态，未核实"；同一登记号才合并；manifest=jsonl=sqlite 断言。

## 交付物

`research/mesothelioma-cancer/{manifest.json, trials-2026.jsonl, mesothelioma_cancer_trials_2026.sqlite, README.md}`
