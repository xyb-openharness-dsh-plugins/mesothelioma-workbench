#!/usr/bin/env node
/**
 * build-demo-data.mjs — 演示数据唯一来源（PROTOTYPE-BRIEF §1）
 *
 * 被 import 时只返回 buildDemoProfiles() 纯数据，不碰磁盘；
 * 直接运行时写 prototypes/v0.2/demo-data.js（M2 原型直开用，禁止手改）。
 * demo/demo-data.sqlite 在 G3 冻结 schema 后由本脚本同一数据源产出（M3，见 DEV-PLAN）。
 *
 * 两套档案 × 6 个月窗口（2026-04-24 → 2026-10-24）：
 *   DEMO-1 王建国（演示）62 男 · 新诊断路径：弯路（抗结核 3 个月）→ 胸膜活检上皮样型 →
 *          BAP1 未检测 / 间皮素检测 → 培美曲塞+顺铂第 3 周期 + 胸穿×2（600/800ml）+
 *          滑石粉胸膜固定术 → mMRC 1→2 → 石棉暴露段（1983-1998 造船厂）→ 材料 4/9 项。
 *   DEMO-2 李桂芳（演示）58 女 · 双免路径照护者代记：双免第 6 周（反应模式原文
 *          "irRECIST 未确认进展待评"）→ CT 并列 2 次 → mMRC 2→3 → 弯路 2 段（基层误诊肺炎）→
 *          材料 6/9 项 → 照护者 private 记录（含"赔偿分歧"主题）+ 证言人授权演示（默认 private）。
 *
 * 演示律（D7）：化验/体征 2–4 周一点延续到今天；CT 按真实频率不加密。
 * 双主体：DEMO-1 患者自记为主（primaryRole=PATIENT），DEMO-2 照护者代记为主（CAREGIVER）。
 * 数据为合成演示，人物与数值不指向任何真实患者；试验条目取自真实登记库样例（登记状态，未核实）。
 * 红线：本文件不含判读字段；"进展"只出现在报告/评估原文引用字段（excerpt/src 类）；
 *      无禁词（建议治疗/可能复发/可以停药/无需就医/推荐方案/治愈率/生存率）；
 *      材料相关文案零法律建议。
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'prototypes', 'v0.2', 'demo-data.js');

const DATA_START = '2026-04-24';
const TODAY = '2026-10-24'; // 演示"今天"，两档案共用

/* 化验点：显式给定（演示数据显式可读优于生成器魔法数），src 标来源 */
const lab = (rows) => rows.map((r) => ({ d: r.d, v: r.v, src: r.src ?? '化验报告（原文数值，合成演示）', refHigh: r.refHigh ?? null }));

function buildDemoProfiles() {
  return {
    meta: {
      dataStart: DATA_START,
      today: TODAY,
      disclaimer: '演示数据（合成）：人物、数值与时间线不指向任何真实患者。',
      trialNote: '试验条目取自真实登记库样例，登记状态，未核实。',
      materialNote: '材料清单只整理材料要素，不提供法律建议。',
    },
    profiles: [buildProfile1(), buildProfile2()],
  };
}

/* ────────────────────────────────────────────────────────────
   DEMO-1 王建国 62 男 · 新诊断路径（本人自记为主）
   ──────────────────────────────────────────────────────────── */
function buildProfile1() {
  return {
    id: 'demo1',
    name: '王建国（演示）',
    age: 62,
    gender: '男',
    diagnosis: '恶性胸膜间皮瘤，上皮样型 · 左侧胸膜',
    stageLine: '新诊断 · 培美曲塞+顺铂第 3 周期（分期只引用报告原文，本台不建分期库）',
    primaryRole: 'PATIENT', // 患者自记为主，家属偶代记
    cognitiveFlag: 'stable',
    /* 就诊弯路时间线（S01）：初诊印象/检查/转诊逐段卡；只记原文，不判医生 */
    detour: [
      { d: '2025-12-15', stage: '首诊', place: '区属社区医院（演示）', impression: '「左侧胸腔积液，考虑结核性胸膜炎可能」', exams: '胸片 + 结核抗体检查（原文摘录）', referral: '未转诊，开始试验性抗结核', note: '当结核治了三个月，药全白吃了（家属原话，照护者代记）' },
      { d: '2026-01-12', stage: '抗结核治疗', place: '区结核病防治所（演示）', impression: '「试验性抗结核治疗，2 个月后复评」', exams: 'HRZE 四联方案开始（医嘱原文）', referral: '—', note: '治疗期间胸水反复，症状未缓解' },
      { d: '2026-04-02', stage: '转诊', place: '市胸科医院 呼吸科（演示）', impression: '「胸腔积液原因待查，胸膜呈弥漫结节样增厚」', exams: '胸部增强 CT + 胸水生化（原文摘录）', referral: '转胸外科行胸腔镜下胸膜活检', note: '换了医院才做上活检' },
      { d: '2026-04-28', stage: '确诊', place: '市胸科医院 病理科（演示）', impression: '「（左侧胸膜活检）上皮样型恶性胸膜间皮瘤」', exams: '胸腔镜胸膜活检 + 免疫组化', referral: '转肿瘤内科讨论治疗方案', note: '确诊即弯路终点；此段由本人在「弯路时间线」逐段核对' },
    ],
    /* 病理三型对照的本例落点（三型知识卡在原型常量层，此处只存本例事实） */
    pathology: {
      type: 'epithelioid', typeLabel: '上皮样型',
      biopsyDate: '2026-04-28', method: '胸腔镜（VATS）胸膜活检', hospital: '市胸科医院（演示）',
      excerpt: '「镜下见肿瘤细胞呈管状乳头状排列，免疫组化：Calretinin（+）、WT-1（+）、D2-40（+），支持间皮源性。」',
      ihc: [
        { name: 'Calretinin', value: '阳性（+）', meaning: '间皮源性的常用免疫组化标记之一' },
        { name: 'WT-1', value: '阳性（+）', meaning: '间皮源性的常用免疫组化标记之一' },
        { name: 'D2-40', value: '阳性（+）', meaning: '间皮源性的常用免疫组化标记之一' },
        { name: 'TTF-1', value: '阴性（−）', meaning: '用于与肺腺癌鉴别方向之一，组合判读归病理医生' },
      ],
    },
    /* 分子三态（S02）：未检测 ≠ 阴性（红线）；BAP1 未检测 / 间皮素检测 */
    molecular: [
      { marker: 'BAP1', status: 'not_tested', method: null, date: null, value: null, explain: '未检测。未检测不等于阴性，报告里没有的项目按「未检测」记；是否补测由医生结合方案决定。' },
      { marker: 'SMARCB1（INI1）', status: 'not_tested', method: null, date: null, value: null, explain: '未检测。未检测不等于阴性。' },
      { marker: 'MTAP', status: 'not_tested', method: null, date: null, value: null, explain: '未检测。未检测不等于阴性。' },
      { marker: '间皮素（SMRP）', status: 'detected', method: 'ELISA（血清）', date: '2026-05-06', value: '血清 SMRP 1.92 nmol/L（报告原文数值）', explain: '间皮素是本瘤种常用的血清标志物，报告数值照抄；它与病情变化的关系由医生结合影像解释，本页只记结果与名词。' },
      { marker: 'PD-L1（22C3 TPS）', status: 'not_detected', method: '免疫组化', date: '2026-05-06', value: 'TPS < 1%（报告原文）', explain: '报告写"TPS < 1%"。它与治疗方案的关系由医生解释，本页只记结果与名词。' },
    ],
    /* 报告原文（逐项回原文） */
    reports: [
      { id: 'r1', d: '2026-04-28', kind: '病理报告', title: '胸膜活检病理诊断报告', excerpt: '「上皮样型恶性胸膜间皮瘤；免疫组化 Calretinin（+）、WT-1（+）、D2-40（+），TTF-1（−）」' },
      { id: 'r2', d: '2026-05-10', kind: '影像报告', title: '胸部增强 CT（基线）', excerpt: '「左侧胸膜弥漫性增厚伴结节样改变，纵隔胸膜受累，少量胸腔积液」——原文见随访影像' },
      { id: 'r3', d: '2026-05-06', kind: '检验报告', title: '分子与标志物检测', excerpt: '「血清 SMRP 1.92 nmol/L；PD-L1 TPS < 1%」' },
      { id: 'r4', d: '2026-07-12', kind: '出院小结', title: '胸腔镜滑石粉胸膜固定术 · 出院小结', excerpt: '「术后发热 2 天，对症处理后缓解；拔管前 24 小时引流量 < 100ml」' },
      { id: 'r5', d: '2026-09-25', kind: '影像报告', title: '胸部增强 CT（第 2 周期后复查）', excerpt: '「左侧胸膜增厚范围较前略缩小，胸腔积液较前减少」——原文见随访影像' },
      { id: 'r6', d: '2026-10-12', kind: '化验单', title: '化疗第 3 周期 D8 血常规', excerpt: '「WBC 3.1×10⁹/L；ANC 1.4×10⁹/L；HGB 92g/L；PLT 192×10⁹/L」' },
    ],
    /* 职业暴露时间线（S03）：年代/工种/场所/防护；只记事实，不出职业病判定 */
    exposure: [
      { from: '1983-03', to: '1998-11', place: '市造船厂（演示）', job: '管路保温工（分段包扎作业）', hazard: '石棉绳、石棉布、保温灰（本人回忆口述）', protection: '当年仅纱布口罩，无防护培训记录', state: 'recorded', note: '1983 年进厂至 1998 年下岗，工龄 15 年' },
      { from: '1999-04', to: '2012-08', place: '船舶维修车间（演示）', job: '拆解工段临时工', hazard: '疑似接触旧保温层（记忆待核实）', protection: '无记录', state: 'unverified', note: '此段为回忆整理，待工友证言核实（见「问答与跟进」）' },
    ],
    /* 职业病诊断材料清单（S04）：只整理材料要素（职业病防治法第四十七条语境），零法律建议 */
    materials: [
      { id: 'm1', name: '职业史与职业病危害接触史（单位盖章或档案复印件）', why: '诊断材料要素 ①：职业史、在岗时间、工种、岗位', state: 'partial', note: '回忆稿已写好；等原单位人事档案盖章' },
      { id: 'm2', name: '劳动关系证明（劳动合同 / 工资条 / 工友证明）', why: '证明在岗时间与工种对应关系', state: 'todo', note: '工资条已找到 1990–1993 段，其余待找' },
      { id: 'm3', name: '病理诊断证明（胸膜活检报告复印件）', why: '临床表现与辅助检查结果要素', state: 'ready', note: '2026-04-28 病理报告已入资料库' },
      { id: 'm4', name: '影像学资料（CT 原片或光盘）', why: '辅助检查结果要素', state: 'ready', note: '05-10 与 09-25 两次 CT 光盘已借出' },
      { id: 'm5', name: '职业健康检查结果', why: '历年职业体检档案', state: 'todo', note: '原厂历年体检档案需向档案室调取' },
      { id: 'm6', name: '工作场所历年职业病危害因素检测评价资料', why: '工作场所危害因素情况要素', state: 'todo', note: '需向原单位或档案部门查询' },
      { id: 'm7', name: '身份证明材料', why: '诊断机构受理基本材料', state: 'ready', note: '身份证复印件已备' },
      { id: 'm8', name: '工友证言（涉第三方个人信息，需专项授权）', why: '接触史的旁证材料', state: 'todo', note: '默认 private；授权开关见「问答与跟进」页签' },
      { id: 'm9', name: '用人单位工商登记信息', why: '明确责任主体信息的公开可查材料', state: 'ready', note: '公开渠道可查，已打印' },
    ],
    witness: { granted: false, visibility: 'private', fields: null, note: '证言人信息涉第三方个人信息：需证言人本人同意后才录入与使用；默认 private，不进导出。' },
    qa: [
      { d: '2026-09-12', q: '职业病诊断的流程从哪里开始？需要先准备什么？', a: '窗口回复（原文摘录）：先备齐职业史与接触史材料，向职业病诊断机构提出。', place: '区卫生健康委职业健康科窗口（演示）' },
      { d: '2026-10-09', q: '原厂改制了，人事档案去哪里查？', a: '回复（原文摘录）：先到市档案馆查企业移交档案。', place: '市档案馆查询窗口（演示）' },
    ],
    /* 治疗档案（S06）：培美曲塞+顺铂第 3 周期 */
    treatment: {
      pathway: 'CHEMO',
      regimen: '培美曲塞 500mg/m² + 顺铂 75mg/m² · 每 21 天一周期',
      chemoCycles: [
        { n: 1, from: '2026-08-24', plan: 'D1 输注，住院 3 天水化', took: 'D1 完成；D2–3 恶心反应记录在案', delayDays: 0, adjust: null },
        { n: 2, from: '2026-09-14', plan: 'D1 输注', took: 'D1 完成，血象达标', delayDays: 0, adjust: null },
        { n: 3, from: '2026-10-05', plan: 'D1 输注', took: 'D1 完成；D8 血象低点已复评（医生医嘱观察）', delayDays: 0, adjust: null },
      ],
      immuneInfusions: [],
      reactionMode: null, // 化疗路径无 irRECIST 反应模式原文
      nextOn: '2026-10-26（第 4 周期 D1，待血象确认）',
      changes: [
        { d: '2026-10-13', item: '止吐方案', detail: '第 3 周期起调整止吐用药（医嘱原文照抄）', note: '变更留痕：旧记录保留，不改写' },
        { d: '2026-10-13', item: '下一周期前置检查', detail: '第 4 周期 D1 前查血常规 + 生化（医嘱原文）', note: '见复诊节奏' },
      ],
    },
    /* 胸水与呼吸（S05/S10）：胸穿×2（600/800ml）+ 滑石粉胸膜固定术 */
    pleura: {
      events: [
        { id: 'px1', d: '2026-06-28', kind: 'thoracentesis', side: '左侧', method: '超声定位下胸腔穿刺', volumeMl: 600, relief: '当日气促减轻', author: 'PATIENT', note: '门诊操作，胸水送生化（见胸水生化页签）' },
        { id: 'px2', d: '2026-07-03', kind: 'drain-tube', side: '左侧', method: '住院置管引流（肋间导管）', volumeMl: 800, relief: '置管当夜可平卧', author: 'PATIENT', note: '住院第 1 天引流量（护士记录，本人誊抄）' },
        { id: 'px3', d: '2026-07-04', kind: 'drain-tube', side: '左侧', method: '置管逐日引流', volumeMl: 450, relief: '夜间可平卧', author: 'PATIENT', note: '护士记录' },
        { id: 'px4', d: '2026-07-05', kind: 'drain-tube', side: '左侧', method: '置管逐日引流', volumeMl: 280, relief: '—', author: 'PATIENT', note: '护士记录' },
        { id: 'px5', d: '2026-07-06', kind: 'drain-tube', side: '左侧', method: '置管逐日引流', volumeMl: 150, relief: '—', author: 'CAREGIVER', note: '照护者代记（护士核对）' },
        { id: 'px6', d: '2026-07-07', kind: 'drain-tube', side: '左侧', method: '置管逐日引流', volumeMl: 80, relief: '—', author: 'CAREGIVER', note: '照护者代记（护士核对）' },
        { id: 'px7', d: '2026-07-08', kind: 'pleurodesis', side: '左侧', method: '滑石粉胸膜固定术（胸腔镜）', volumeMl: null, relief: '术后发热 2 天（记录原文），对症处理后缓解', author: 'CAREGIVER', note: '市胸科医院住院；出院小结已入资料库' },
      ],
      mMRC: [
        { d: '2026-05-05', grade: 1, context: '穿刺前 · 快走或上楼时气促', src: '问诊记录（本人自记）' },
        { d: '2026-06-25', grade: 2, context: '胸水复发期 · 平地行走比同龄人慢、需间歇休息', src: '问诊记录（本人自记）' },
        { d: '2026-08-02', grade: 1, context: '胸膜固定术后 3 周 · 平地如常，上楼略喘', src: '复诊记录（医生问诊原文）' },
        { d: '2026-10-10', grade: 2, context: '化疗第 2 周期后 · 平地走需间歇休息', src: '问诊记录（本人自记）' },
      ],
      symptoms: [
        { d: '2026-06-25', breathless: '上二楼要歇一次', pain: '左胸隐痛 3/10（自评）', note: '胸水复发当天', author: 'PATIENT' },
        { d: '2026-07-08', breathless: '术后卧床，床上活动', pain: '伤口痛 4/10（自评）', note: '固定术当日', author: 'CAREGIVER' },
        { d: '2026-10-10', breathless: '平地走 200 米需停', pain: '偶发刺痛 2/10', note: '化疗后乏力同期记录；症状与治疗并排看，不写因果', author: 'PATIENT' },
      ],
    },
    metrics: null, // 由 expandMetrics 生成
    /* 随访影像（S07）：CT 并列（测量原文/报告原文/当时 mMRC），无判读字段 */
    imaging: [
      { id: 'ct1', d: '2026-05-10', kind: '胸部增强 CT（基线）', measure: '左侧胸膜最厚处约 18mm（报告测量原文）', excerpt: '「左侧胸膜弥漫性增厚伴结节样改变，纵隔胸膜受累，少量胸腔积液」', mMRCAtTime: 1, next: '2–3 周期后复查评估' },
      { id: 'ct2', d: '2026-09-25', kind: '胸部增强 CT（复查）', measure: '左侧胸膜最厚处约 16mm（报告测量原文）', excerpt: '「左侧胸膜增厚范围较前略缩小，胸腔积液较前减少」', mMRCAtTime: 2, next: '已预约 2026-11-16 复诊' },
    ],
    /* 胸水生化（原值照抄，不判漏出液/渗出液） */
    effusionLabs: [
      { d: '2026-06-28', prot: 42, ldh: 286, ada: 18, gluc: 3.1, cells: 920, src: '胸水常规+生化（检验报告原文，合成演示）' },
      { d: '2026-07-03', prot: 39, ldh: 302, ada: 15, gluc: 3.3, cells: 780, src: '胸水常规+生化（检验报告原文，合成演示）' },
    ],
    viewpoints: [
      { role: 'PATIENT', visibility: 'private', date: '2026-09-26', topic: 'MOOD', content: '复查前晚上睡不好，怕又要抽水。想问医生但又怕问出坏消息。' },
      { role: 'CAREGIVER', visibility: 'private', date: '2026-09-27', topic: 'CARE_BURDEN', content: '他嘴上说没事，半夜我听见他叹气。材料的事我先在后面慢慢办，不催他。' },
    ],
    family: [
      { d: '2026-07-12', author: 'CAREGIVER', topic: '材料经办', content: '出院小结原件已存档；职业病材料还差劳动关系证明，按清单逐项来', visibility: 'shared', witnessed: true },
      { d: '2026-10-09', author: 'CAREGIVER', topic: '家事安排', content: '复诊当天女儿请假陪去，我提前把想问的写在纸上', visibility: 'private', witnessed: false },
    ],
    decisions: [
      { topic: '把材料整理的进展同步给子女的时机', status: 'discussed', note: '10 月家宴上说过一次，女儿主动接手了档案查询' },
      { topic: '如果以后需要长期照护安排，想和谁先谈', status: 'open', note: null },
    ],
    rhythm: [
      { item: '血象（每周期 D1 前 + D8）', freq: '每 3 周', guideline: '医嘱原文', next: '2026-10-26 化疗前' },
      { item: '胸部增强 CT', freq: '每 2–3 周期', guideline: '医嘱原文', next: '2026-11-16 已预约' },
      { item: '职业病材料跟进', freq: '每月', guideline: '自行安排', next: '2026-11-01 与原单位人事联系' },
    ],
    documents: [
      { id: 'd1', name: '病理报告 2026-04-28（扫描件）', kind: 'pdf', size: '1.2 MB', status: '已核对' },
      { id: 'd2', name: '出院小结 2026-07-12', kind: 'pdf', size: '0.6 MB', status: '已核对' },
      { id: 'd3', name: 'CT 报告 2026-09-25', kind: 'pdf', size: '0.8 MB', status: '已核对' },
      { id: 'd4', name: '化验单 2026-10-12（手机拍照）', kind: '图片', size: '2.4 MB', status: '待核对' },
    ],
    candidates: [
      { id: 'c1', field: '白细胞 WBC', value: '3.1 ×10⁹/L', src: '化验单 2026-10-12 拍照识别（演示候选）', state: '待核对' },
      { id: 'c2', field: '血红蛋白 HGB', value: '92 g/L', src: '化验单 2026-10-12 拍照识别（演示候选）', state: '待核对' },
      { id: 'c3', field: '血小板 PLT', value: '192 ×10⁹/L', src: '化验单 2026-10-12 拍照识别（演示候选）', state: '待核对' },
    ],
    trials: demoTrialsChemo(),
  };
}

/* ────────────────────────────────────────────────────────────
   DEMO-2 李桂芳 58 女 · 双免路径（照护者代记为主）
   ──────────────────────────────────────────────────────────── */
function buildProfile2() {
  return {
    id: 'demo2',
    name: '李桂芳（演示）',
    age: 58,
    gender: '女',
    diagnosis: '恶性胸膜间皮瘤，双相型 · 左侧胸膜',
    stageLine: '双免疫治疗第 6 周（纳武利尤单抗+伊匹木单抗；分期只引用报告原文）',
    primaryRole: 'CAREGIVER', // 照护者代记为主（双主体）
    cognitiveFlag: 'stable', // 认知无变化；代记因气促与体力
    detour: [
      { d: '2026-05-18', stage: '弯路一段', place: '镇卫生院（演示）', impression: '「左下肺炎症伴胸腔积液」', exams: '抗感染治疗 2 周（门诊输液）', referral: '无', note: '按肺炎治了两周，水没少（妹妹原话，代记）' },
      { d: '2026-06-20', stage: '弯路二段', place: '县医院（演示）', impression: '「结核性胸膜炎待排，试验性抗结核」', exams: '抗结核 1 个月（HRZE，医嘱原文）', referral: '2026-07-25 转省胸科医院', note: '女儿坚持转院' },
      { d: '2026-08-06', stage: '确诊', place: '省胸科医院（演示）', impression: '「（胸膜活检）双相型恶性胸膜间皮瘤（上皮样 + 肉瘤样成分）」', exams: '胸腔镜胸膜活检 + 免疫组化', referral: '转肿瘤内科，讨论双免疫方案', note: '弯路由照护者逐段代记（witnessed 徽章）' },
    ],
    pathology: {
      type: 'biphasic', typeLabel: '双相型（上皮样 + 肉瘤样成分）',
      biopsyDate: '2026-08-06', method: '胸腔镜（VATS）胸膜活检', hospital: '省胸科医院（演示）',
      excerpt: '「肿瘤由上皮样与肉瘤样两种成分组成，肉瘤样成分约占 30%；免疫组化支持间皮源性。」',
      ihc: [
        { name: 'Calretinin', value: '阳性（+）', meaning: '间皮源性的常用免疫组化标记之一' },
        { name: 'WT-1', value: '阳性（+）', meaning: '间皮源性的常用免疫组化标记之一' },
        { name: 'AE1/AE3', value: '阳性（+）', meaning: '上皮源标记，用于成分判断，组合判读归病理医生' },
      ],
    },
    molecular: [
      { marker: 'BAP1', status: 'detected', method: '免疫组化', date: '2026-08-10', value: '核表达丢失（报告原文：提示 BAP1 失活）', explain: 'BAP1 是本瘤种常见的检测项目之一。报告结论照抄；含义与治疗的关系由医生解释，本页只记结果与名词。' },
      { marker: 'SMARCB1（INI1）', status: 'not_tested', method: null, date: null, value: null, explain: '未检测。未检测不等于阴性。' },
      { marker: 'MTAP', status: 'not_detected', method: '免疫组化', date: '2026-08-10', value: '胞质表达完整（报告原文）', explain: '报告结论照抄；是否与方案选择有关由医生解释。' },
      { marker: '间皮素（SMRP）', status: 'not_tested', method: null, date: null, value: null, explain: '未检测。未检测不等于阴性。' },
      { marker: 'PD-L1（22C3 TPS）', status: 'detected', method: '免疫组化', date: '2026-08-10', value: 'TPS 35%（报告原文）', explain: '报告结论照抄；它与治疗方案的关系由医生解释。' },
    ],
    reports: [
      { id: 'r1', d: '2026-08-06', kind: '病理报告', title: '胸膜活检病理诊断报告', excerpt: '「双相型恶性胸膜间皮瘤（上皮样 + 肉瘤样成分，肉瘤样约占 30%）」' },
      { id: 'r2', d: '2026-08-10', kind: '检验报告', title: '分子检测（BAP1 / MTAP / PD-L1）', excerpt: '「BAP1 核表达丢失；MTAP 胞质表达完整；PD-L1 TPS 35%」' },
      { id: 'r3', d: '2026-08-10', kind: '影像报告', title: '胸部 CT（基线）', excerpt: '「左侧胸膜弥漫增厚伴多灶结节，包裹性积液」——原文见影像档案' },
      { id: 'r4', d: '2026-08-18', kind: '出院小结', title: '胸腔置管引流 · 出院小结', excerpt: '「带管出院，夹管观察 48 小时后拔除；拔管前 24 小时引流量 < 150ml」' },
      { id: 'r5', d: '2026-10-12', kind: '影像报告', title: '胸部 CT（双免疫 6 周疗效评估）', excerpt: '「左侧胸膜病灶较前增大……按 irRECIST 评价为未确认进展（iUPD），待下次评估确认」——原文见随访影像' },
    ],
    exposure: [
      { from: '1988-05', to: '2004-12', place: '县纺织厂（演示）', job: '挡车工 · 后调原料仓库', hazard: '疑似接触含石棉的隔热管道与旧厂房保温层（本人回忆口述）', protection: '无防护记录', state: 'recorded', note: '1988 进厂至 2004 年退休' },
    ],
    materials: [
      { id: 'm1', name: '职业史与职业病危害接触史（单位盖章或档案复印件）', why: '诊断材料要素 ①：职业史、在岗时间、工种、岗位', state: 'ready', note: '厂人事档案已调出并盖章' },
      { id: 'm2', name: '劳动关系证明（劳动合同 / 工资条 / 工友证明）', why: '证明在岗时间与工种对应关系', state: 'ready', note: '劳动合同原件在女儿处保管' },
      { id: 'm3', name: '病理诊断证明（胸膜活检报告复印件）', why: '临床表现与辅助检查结果要素', state: 'ready', note: '2026-08-06 病理报告已入资料库' },
      { id: 'm4', name: '影像学资料（CT 原片或光盘）', why: '辅助检查结果要素', state: 'ready', note: '08-10 与 10-12 两次 CT 光盘已借出' },
      { id: 'm5', name: '职业健康检查结果', why: '历年职业体检档案', state: 'partial', note: '查到 1996–2004 段，早年档案待调' },
      { id: 'm6', name: '工作场所历年职业病危害因素检测评价资料', why: '工作场所危害因素情况要素', state: 'todo', note: '需向原单位或档案部门查询' },
      { id: 'm7', name: '身份证明材料', why: '诊断机构受理基本材料', state: 'ready', note: '身份证与户口本复印件已备' },
      { id: 'm8', name: '工友证言（涉第三方个人信息，需专项授权）', why: '接触史的旁证材料', state: 'partial', note: '工友李师傅口头答应，待专项授权后录入（见「问答与跟进」）' },
      { id: 'm9', name: '用人单位工商登记信息', why: '明确责任主体信息的公开可查材料', state: 'ready', note: '公开渠道可查，已打印' },
    ],
    witness: {
      granted: false, visibility: 'private',
      fields: null,
      note: '证言人：李师傅（工友，演示）。涉第三方个人信息：需证言人本人同意（专项授权）后才录入；默认 private，不进导出，也不默认进入 AI 上下文。',
    },
    qa: [
      { d: '2026-10-08', q: '工友的证言材料怎么写？写哪些段？', a: '窗口回复（原文摘录）：按在岗时间、工种、接触方式分段写，由证言人签字。', place: '区卫生健康委职业健康科窗口（演示）' },
      { d: '2026-10-15', q: '厂子搬迁过，检测资料找谁要？', a: '回复（原文摘录）：先问现单位留守处，再查档案移交记录。', place: '电话咨询记录（演示）' },
    ],
    treatment: {
      pathway: 'IMMUNE',
      regimen: '纳武利尤单抗 3mg/kg Q2W + 伊匹木单抗 1mg/kg Q6W（双免疫；用法以医嘱原文为准）',
      chemoCycles: [],
      immuneInfusions: [
        { n: 1, d: '2026-09-14', drugs: 'NIVO + IPI（第 1 次，剂量按体重换算，医嘱原文）', reaction: '输注顺利；当晚低热 37.6℃，次日退（照护者代记）' },
        { n: 2, d: '2026-09-28', drugs: 'NIVO（第 2 次）', reaction: '无不适', author: 'CAREGIVER' },
        { n: 3, d: '2026-10-12', drugs: 'NIVO（第 3 次）', reaction: '轻度乏力（记录原文）', author: 'CAREGIVER' },
      ],
      reactionMode: {
        d: '2026-10-12',
        excerpt: 'irRECIST 未确认进展待评（iUPD）',
        src: '省胸科医院疗效评估报告（原文照抄）',
        pending: '待 2026-12-14 复评确认；本台不判读、不解释倾向',
      },
      nextOn: '2026-10-26（第 4 次 NIVO + 第 2 次 IPI）',
      changes: [
        { d: '2026-10-13', item: '甲状腺功能随访', detail: 'TSH 轻度升高，加做甲功随访（医嘱原文照抄）', note: '免疫治疗监测项目；数值变化由医生解读' },
      ],
    },
    pleura: {
      events: [
        { id: 'px1', d: '2026-08-12', kind: 'drain-tube', side: '左侧', method: '住院置管引流（肋间导管）', volumeMl: 900, relief: '引流后当夜可右侧卧', author: 'CAREGIVER', note: '照护者代记（护士核对）' },
        { id: 'px2', d: '2026-08-13', kind: 'drain-tube', side: '左侧', method: '置管逐日引流', volumeMl: 500, relief: '气促减轻', author: 'CAREGIVER', note: '照护者代记' },
        { id: 'px3', d: '2026-08-14', kind: 'drain-tube', side: '左侧', method: '置管逐日引流', volumeMl: 350, relief: '—', author: 'CAREGIVER', note: '照护者代记' },
        { id: 'px4', d: '2026-08-15', kind: 'drain-tube', side: '左侧', method: '置管逐日引流', volumeMl: 200, relief: '—', author: 'CAREGIVER', note: '照护者代记' },
        { id: 'px5', d: '2026-08-16', kind: 'drain-tube', side: '左侧', method: '置管逐日引流', volumeMl: 120, relief: '—', author: 'CAREGIVER', note: '照护者代记；18 日拔管（出院小结）' },
      ],
      mMRC: [
        { d: '2026-06-15', grade: 2, context: '胸水增长期 · 平地走比同龄人慢', src: '问诊记录（照护者代记）' },
        { d: '2026-08-20', grade: 2, context: '拔管后 2 天 · 平地走仍需间歇', src: '复诊记录（医生问诊原文）' },
        { d: '2026-09-10', grade: 2, context: '双免疫开始前 · 与 8 月相仿', src: '问诊记录（照护者代记）' },
        { d: '2026-10-18', grade: 3, context: '评估报告后 · 平地走约 100 米即需停下喘气', src: '问诊记录（照护者代记）' },
      ],
      symptoms: [
        { d: '2026-08-12', breathless: '说话长句要停顿', pain: '左胸胀痛 4/10（自评）', note: '置管当日', author: 'CAREGIVER' },
        { d: '2026-10-18', breathless: '平地走约 100 米需停下', pain: '偶发隐痛 2/10', note: '与 mMRC 3 级同期记录；症状与治疗并排看，不写因果', author: 'CAREGIVER' },
      ],
    },
    metrics: null,
    imaging: [
      { id: 'ct1', d: '2026-08-10', kind: '胸部 CT（基线）', measure: '左侧胸膜最厚处约 21mm（报告测量原文）', excerpt: '「左侧胸膜弥漫增厚伴多灶结节，包裹性积液」', mMRCAtTime: 2, next: '双免疫 6 周后评估' },
      { id: 'ct2', d: '2026-10-12', kind: '胸部 CT（疗效评估）', measure: '左侧胸膜最厚处约 24mm（报告测量原文）', excerpt: '「左侧胸膜病灶较前增大，新增胸膜结节；按 irRECIST 评价为未确认进展（iUPD），待下次评估确认」', mMRCAtTime: 3, next: '2026-12-14 复评确认' },
    ],
    effusionLabs: [
      { d: '2026-08-12', prot: 45, ldh: 318, ada: 12, gluc: 2.9, cells: 1100, src: '胸水常规+生化（检验报告原文，合成演示）' },
      { d: '2026-08-15', prot: 41, ldh: 296, ada: 11, gluc: 3.2, cells: 850, src: '胸水常规+生化（检验报告原文，合成演示）' },
    ],
    viewpoints: [
      { role: 'CAREGIVER', visibility: 'private', date: '2026-10-16', topic: '赔偿分歧', content: '大伯说先把材料备齐，舅妈说先安心治病。两边都是为我姐好，我把各自的话记下来，等问清楚再定。' },
      { role: 'CAREGIVER', visibility: 'private', date: '2026-10-19', topic: 'MOOD', content: '评估报告上那行字我看不懂，姐姐反倒先安慰我。夜里我还是睡不着。' },
      { role: 'CAREGIVER', visibility: 'shared', date: '2026-10-20', topic: 'DECISION_ACP', content: '和医生谈了 12 月复评的安排，还谈了"如果出现不舒服随时来"的约定——记下来怕忘了。' },
    ],
    family: [
      { d: '2026-08-15', author: 'CAREGIVER', topic: '引流代记', content: '每日引流量由我记录，护士上午核对一次；记录本已拍照存档', visibility: 'shared', witnessed: true },
      { d: '2026-10-16', author: 'CAREGIVER', topic: '材料经办', content: '工友证言需要李师傅本人签字，先问过他本人的意见再录', visibility: 'private', witnessed: false },
      { d: '2026-10-21', author: 'CAREGIVER', topic: '家事安排', content: '10-26 输注日由妹妹陪去，我在家准备材料复印件', visibility: 'shared', witnessed: false },
    ],
    decisions: [
      { topic: '12 月复评前想与医生确认的三件事（复评口径 / 症状预案 / 下一步路径讨论方式）', status: 'discussed', note: '10-20 门诊谈了一部分，剩下的写在问题清单' },
      { topic: '材料与家庭内部的分歧何时摊开谈', status: 'open', note: '等窗口回复后全家谈一次' },
    ],
    rhythm: [
      { item: '双免疫输注（NIVO 每 2 周 / IPI 每 6 周）', freq: '每 2 周', guideline: '医嘱原文', next: '2026-10-26 输注日' },
      { item: '甲功 + 血象 + 肝肾（免疫监测）', freq: '每 2–4 周', guideline: '医嘱原文', next: '2026-10-24 本周已查' },
      { item: '胸部 CT（疗效评估）', freq: '每 6–9 周', guideline: '医嘱原文', next: '2026-12-14 复评确认' },
      { item: '职业病材料跟进', freq: '每月', guideline: '自行安排', next: '2026-11-05 电话跟进窗口回复' },
    ],
    documents: [
      { id: 'd1', name: '病理报告 2026-08-06（扫描件）', kind: 'pdf', size: '1.4 MB', status: '已核对' },
      { id: 'd2', name: '出院小结 2026-08-18', kind: 'pdf', size: '0.5 MB', status: '已核对' },
      { id: 'd3', name: '疗效评估 CT 报告 2026-10-12', kind: 'pdf', size: '0.9 MB', status: '已核对' },
      { id: 'd4', name: '化验单 2026-10-10（手机拍照）', kind: '图片', size: '2.1 MB', status: '待核对' },
      { id: 'd5', name: '引流量记录本 2026-08（拍照）', kind: '图片', size: '3.6 MB', status: '已核对' },
    ],
    candidates: [
      { id: 'c1', field: 'ALT', value: '58 U/L（化验单未印参考上限）', src: '化验单 2026-10-10 拍照识别（演示候选）', state: '待核对' },
      { id: 'c2', field: '体重', value: '52.6 kg', src: '照护者口述（演示候选）', state: '待核对' },
    ],
    trials: demoTrialsImmune(),
  };
}

/* 指标线展开：两档案默认视图同构（两条数值线 + 一个分类序列），红线：mMRC 分类只节点不连线 */
function expandMetrics(p) {
  if (p.id === 'demo1') {
    return {
      numeric: {
        WBC: lab([
          { d: '2026-04-26', v: 8.9, src: '活检期血常规' }, { d: '2026-05-24', v: 7.6 }, { d: '2026-06-21', v: 8.2, src: '胸水复发期' }, { d: '2026-07-05', v: 7.1, src: '住院期' },
          { d: '2026-08-17', v: 6.8, src: '化疗前基线' }, { d: '2026-08-31', v: 4.2, src: 'C1D8' }, { d: '2026-09-14', v: 5.9, src: 'C2 前' }, { d: '2026-09-21', v: 3.6, src: 'C2D8' },
          { d: '2026-10-05', v: 5.4, src: 'C3 前' }, { d: '2026-10-12', v: 3.1, src: 'C3D8（低点）' },
        ]),
        ANC: lab([
          { d: '2026-04-26', v: 6.8 }, { d: '2026-05-24', v: 5.4 }, { d: '2026-06-21', v: 6.0 }, { d: '2026-07-05', v: 5.0 },
          { d: '2026-08-17', v: 4.6 }, { d: '2026-08-31', v: 2.4 }, { d: '2026-09-14', v: 3.7 }, { d: '2026-09-21', v: 1.8 },
          { d: '2026-10-05', v: 3.2 }, { d: '2026-10-12', v: 1.4 },
        ]),
        PLT: lab([
          { d: '2026-04-26', v: 402 }, { d: '2026-05-24', v: 371 }, { d: '2026-06-21', v: 389 }, { d: '2026-07-05', v: 350 },
          { d: '2026-08-17', v: 328 }, { d: '2026-08-31', v: 265 }, { d: '2026-09-14', v: 301 }, { d: '2026-09-21', v: 238 },
          { d: '2026-10-05', v: 276 }, { d: '2026-10-12', v: 192 },
        ]),
        HGB: lab([
          { d: '2026-04-26', v: 121 }, { d: '2026-05-24', v: 118 }, { d: '2026-06-21', v: 112 }, { d: '2026-07-05', v: 106 },
          { d: '2026-08-17', v: 109 }, { d: '2026-08-31', v: 102 }, { d: '2026-09-14', v: 104 }, { d: '2026-09-21', v: 97 },
          { d: '2026-10-05', v: 99 }, { d: '2026-10-12', v: 92 },
        ]),
        ALT: lab([
          { d: '2026-04-26', v: 22, refHigh: 40 }, { d: '2026-06-21', v: 28, refHigh: 40 }, { d: '2026-08-17', v: 31, refHigh: 40 },
          { d: '2026-09-14', v: 47, refHigh: 40 }, { d: '2026-10-12', v: 39, refHigh: null, src: '化验单未印参考上限（原文照抄）' },
        ]),
        WEIGHT: lab([
          { d: '2026-04-26', v: 68.5, src: '家中体重秤（晨重）' }, { d: '2026-05-24', v: 67.8 }, { d: '2026-06-21', v: 66.4, src: '胸水期体重波动语境见营养页说明' },
          { d: '2026-07-05', v: 65.9 }, { d: '2026-08-17', v: 66.8 }, { d: '2026-09-14', v: 66.2 }, { d: '2026-10-12', v: 65.5 },
        ]),
        DRAIN: lab([
          { d: '2026-06-28', v: 600, src: '胸穿引流量（ml）' }, { d: '2026-07-03', v: 800, src: '置管第 1 天（护士记录）' },
          { d: '2026-07-04', v: 450, src: '置管逐日' }, { d: '2026-07-05', v: 280, src: '置管逐日' },
          { d: '2026-07-06', v: 150, src: '置管逐日（照护者代记）' }, { d: '2026-07-07', v: 80, src: '置管逐日（照护者代记）' },
        ]),
        PLEURA_MM: lab([
          { d: '2026-05-10', v: 18, src: 'CT 报告测量原文（胸膜最厚处 mm）' }, { d: '2026-09-25', v: 16, src: 'CT 报告测量原文（胸膜最厚处 mm）' },
        ]),
      },
      qual: {
        MMRC: p.pleura.mMRC.map((x) => ({ d: x.d, label: `mMRC ${x.grade} 级`, v: x.grade, src: x.src })),
      },
    };
  }
  return {
    numeric: {
      WBC: lab([
        { d: '2026-06-12', v: 9.6, src: '感染期' }, { d: '2026-07-10', v: 8.8 }, { d: '2026-08-08', v: 8.2, src: '双免疫前基线' },
        { d: '2026-09-12', v: 7.8 }, { d: '2026-09-26', v: 7.5 }, { d: '2026-10-10', v: 7.3 },
      ]),
      ANC: lab([
        { d: '2026-06-12', v: 6.9 }, { d: '2026-07-10', v: 6.2 }, { d: '2026-08-08', v: 5.8 },
        { d: '2026-09-12', v: 5.4 }, { d: '2026-09-26', v: 5.1 }, { d: '2026-10-10', v: 4.9 },
      ]),
      PLT: lab([
        { d: '2026-06-12', v: 388 }, { d: '2026-07-10', v: 376 }, { d: '2026-08-08', v: 360 },
        { d: '2026-09-12', v: 351 }, { d: '2026-09-26', v: 344 }, { d: '2026-10-10', v: 338 },
      ]),
      HGB: lab([
        { d: '2026-06-12', v: 108 }, { d: '2026-07-10', v: 104 }, { d: '2026-08-08', v: 102 },
        { d: '2026-09-12', v: 100 }, { d: '2026-09-26', v: 98 }, { d: '2026-10-10', v: 96 },
      ]),
      ALT: lab([
        { d: '2026-08-08', v: 26, refHigh: 40, src: '双免疫前基线（免疫性肝损监测）' }, { d: '2026-09-12', v: 33, refHigh: 40 },
        { d: '2026-10-10', v: 58, refHigh: null, src: '外院化验单未印参考上限（原文照抄）' },
      ]),
      WEIGHT: lab([
        { d: '2026-06-12', v: 54.2, src: '照护者代记·家中晨重' }, { d: '2026-07-10', v: 53.6 }, { d: '2026-08-08', v: 53.9 },
        { d: '2026-09-12', v: 53.1 }, { d: '2026-10-10', v: 52.6 },
      ]),
      DRAIN: lab([
        { d: '2026-08-12', v: 900, src: '置管第 1 天（照护者代记，护士核对）' }, { d: '2026-08-13', v: 500, src: '置管逐日' },
        { d: '2026-08-14', v: 350, src: '置管逐日' }, { d: '2026-08-15', v: 200, src: '置管逐日' },
        { d: '2026-08-16', v: 120, src: '置管逐日（18 日拔管）' },
      ]),
      PLEURA_MM: lab([
        { d: '2026-08-10', v: 21, src: 'CT 报告测量原文（胸膜最厚处 mm）' }, { d: '2026-10-12', v: 24, src: 'CT 报告测量原文（胸膜最厚处 mm）' },
      ]),
    },
    qual: {
      MMRC: p.pleura.mMRC.map((x) => ({ d: x.d, label: `mMRC ${x.grade} 级`, v: x.grade, src: x.src })),
    },
  };
}

/* 试验线索：真实登记库样例（title 原样，状态统一"登记状态，未核实"）；
   检索关键词按家族口径：双免 / 石棉相关加权（DIFF-MATRIX） */
function demoTrialsChemo() {
  return [
    { key: 'CTR20212323', title: '比较纳武利尤单抗联合伊匹木单抗与培美曲塞联合顺铂或卡铂作为中国不可切除胸膜间皮瘤一线疗法II 期、随机、开放性试验', phase: 'II', status: '招募中（登记状态，未核实）', source: 'chinadrugtrials' },
    { key: 'CTR20221048', title: 'PM8002联合标准化疗一线治疗恶性间皮瘤II期临床研究', phase: 'II', status: '招募中（登记状态，未核实）', source: 'chinadrugtrials' },
    { key: 'CTR20192180', title: 'HMPL-453酒石酸盐治疗晚期恶性复治间皮瘤的II期研究', phase: 'II', status: '招募中（登记状态，未核实）', source: 'chinadrugtrials' },
  ];
}
function demoTrialsImmune() {
  return [
    { key: 'CTR20170913', title: 'nivolumab联合伊匹木单抗对比化疗治疗一线胸膜间皮瘤的研究', phase: 'III', status: '登记完成（登记状态，未核实）', source: 'chinadrugtrials' },
    { key: 'CTR20212699', title: 'SG001注射液治疗恶性间皮瘤2期临床研究', phase: 'II', status: '招募中（登记状态，未核实）', source: 'chinadrugtrials' },
    { key: 'CTR20212744', title: '评价T3011疱疹病毒静脉给药治疗晚期恶性肿瘤患者的安全性及生物效应研究', phase: 'I/II', status: '招募中（登记状态，未核实）', source: 'chinadrugtrials' },
  ];
}

function finalize() {
  const data = buildDemoProfiles();
  data.profiles = data.profiles.map((p) => ({ ...p, metrics: expandMetrics(p) }));
  return data;
}

/**
 * 直接运行时写产物：prototypes/v0.2/demo-data.js（原型 file:// 直开用）。
 * demo/demo-data.sqlite 留待 G3 冻结 schema 后由同一数据源产出（M3）。
 */
if (process.argv[1] && process.argv[1].endsWith('build-demo-data.mjs')) {
  const data = finalize();
  mkdirSync(dirname(OUT), { recursive: true });
  const js = `// 由 demo/build-demo-data.mjs 生成——唯一数据源，勿手改（PROTOTYPE-BRIEF §1）\nconst DEMO_DATA = ${JSON.stringify(data, null, 2)};\n`;
  writeFileSync(OUT, js + `if (typeof module !== 'undefined') module.exports = DEMO_DATA;\n`);
  console.log(`demo-data.js → ${OUT}（profiles=${data.profiles.length}）`);
}

export { buildDemoProfiles, finalize };
