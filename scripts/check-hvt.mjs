#!/usr/bin/env node
/**
 * HVT 交互路径一致性 X1–X4（15-HVT-REVIEW §X；基准=docs/INTERACTION-DESIGN.md v1）。
 *
 * X1 页面覆盖：SCENES（13 场景路径 = 看板入口 + 落地页 + 逐 data-step）的并集必须盖满
 *   10 线 30 页签（孤儿=0）。dash 为路径枢纽不占页签名；chart 由 S07 步骤覆盖。
 * X2 路径逐字走通：从看板逐 key 点「场景直达」chip → 落地页 → 逐个"查询→点击→再查询"
 *   data-step → 每站必须有 data-product 锚 → 点「回到看板」一步回首页。两档案各走一遍。
 * X3 编辑入口 ≤1：每 (view,sub) 打开表单/弹窗的显式编辑入口 ≤1（FORM_ACTIONS）。
 * X4 AI 产出候选闭环：ai-draft → 候选卡 → 确认入事实层 / 不对改一下 / 不用这条 三步。
 *
 * 用法：node scripts/check-hvt.mjs；退出码 0/1。依赖本机 Chrome。
 */
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, stopChrome, sleep } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CDP_PORT = Number(process.env.MPM_HVT_CDP_PORT || 9359);
const URL_APP = `file://${join(ROOT, 'prototypes', 'v0.2', 'index.html')}`;

/* 与 app.js SCENES 同源的静态表（检查器单持一份，避免读页面内变量做判定） */
const SCENES = [
  ['S01', 'tumor', 'detour', ['to-pathology', 'to-reports']],
  ['S02', 'tumor', 'molecular', ['to-questions']],
  ['S03', 'asbestos', 'exposure', ['to-qanda']],
  ['S04', 'asbestos', 'checklist', ['to-witness']],
  ['S05', 'pleura', 'drainage', ['to-events', 'to-pleurodesis']],
  ['S06', 'treatment', 'calendar', ['to-cycles', 'to-reaction', 'to-changes']],
  ['S07', 'imaging', 'parallel', ['to-questions', 'to-archive', 'to-chart']],
  ['S08', 'followup', 'prepare', ['to-schedule', 'to-decisions']],
  ['S09', 'labs', 'blood', ['to-effusion', 'to-mmrc']],
  ['S10', 'pleura', 'symptoms', ['to-mmrc']],
  ['S11', 'care', 'intake', ['to-feelings', 'to-family']],
  ['S12', 'followup', 'trials', []],
  ['S13', 'followup', 'library', ['to-candidates']]
];
const ALL_SUBS = [
  ['tumor', 'detour'], ['tumor', 'pathology'], ['tumor', 'molecular'], ['tumor', 'reports'],
  ['asbestos', 'exposure'], ['asbestos', 'checklist'], ['asbestos', 'qanda'],
  ['treatment', 'cycles'], ['treatment', 'immune'], ['treatment', 'changes'], ['treatment', 'calendar'],
  ['pleura', 'events'], ['pleura', 'drainage'], ['pleura', 'pleurodesis'], ['pleura', 'symptoms'],
  ['labs', 'blood'], ['labs', 'effusion'], ['labs', 'mmrc'],
  ['imaging', 'parallel'], ['imaging', 'questions'], ['imaging', 'archive'], ['chart', ''],
  ['care', 'feelings'], ['care', 'intake'], ['care', 'family'], ['care', 'decisions'],
  ['followup', 'schedule'], ['followup', 'library'], ['followup', 'candidates'], ['followup', 'prepare'], ['followup', 'trials']
];
/* data-step → (page,sub) 落点（与 app.js 内 data-step 属性一一对应） */
const STEP_TARGET = {
  'to-family': ['care', 'family'], 'to-pathology': ['tumor', 'pathology'], 'to-reports': ['tumor', 'reports'],
  'to-questions': ['imaging', 'questions'], 'to-qanda': ['asbestos', 'qanda'], 'to-witness': ['asbestos', 'qanda'],
  'to-events': ['pleura', 'events'], 'to-pleurodesis': ['pleura', 'pleurodesis'],
  'to-cycles': ['treatment', 'cycles'], 'to-reaction': ['treatment', 'immune'], 'to-changes': ['treatment', 'changes'],
  'to-archive': ['imaging', 'archive'], 'to-chart': ['chart', ''],
  'to-schedule': ['followup', 'schedule'], 'to-decisions': ['care', 'decisions'],
  'to-effusion': ['labs', 'effusion'], 'to-mmrc': ['labs', 'mmrc'], 'to-feelings': ['care', 'feelings'],
  'to-candidates': ['followup', 'candidates']
};
/* 打开表单/弹窗的显式编辑入口（X3 口径：开表单=编辑入口；勾选/单选/收藏/一键快捷动作不算） */
const FORM_ACTIONS = ['drain-add', 'tx-add', 'pld-add', 'sym-add', 'quick-add', 'q-add', 'mri-add', 'feel-add', 'fam-add', 'doc-add', 'expo-add', 'detour-add', 'qa-add'];

const ch = await launchChrome({ port: CDP_PORT });
const { cdp } = ch;
const errorsBefore = cdp.errors.length;
const out = {
  X1: {}, X2: { failures: [], walked: 0 }, X3: { over: [], max: 0, perPage: {} }, X4: {}
};

try {
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(500);
  for (let i = 0; i < 60 && !(await cdp.eval("document.body && document.body.getAttribute('data-booted') === '1'")); i += 1) await sleep(150);

  /* ── X1：路径并集 vs 30 页签 ── */
  const covered = new Set();
  const coverBy = {};
  for (const [key, landing, landingSub, steps] of SCENES) {
    covered.add(`${landing}/${landingSub}`);
    (coverBy[`${landing}/`] = coverBy[`${landing}/`] || []).push(key);
    for (const st of steps) {
      const [pg, sb] = STEP_TARGET[st];
      covered.add(`${pg}/${sb}`);
      (coverBy[`${pg}/${sb}`] = coverBy[`${pg}/${sb}`] || []).push(key);
    }
  }
  const orphans = ALL_SUBS.map(([pg, sb]) => `${pg}/${sb}`).filter((k) => !covered.has(k));
  out.X1 = {
    totalSubs: ALL_SUBS.length,
    covered: ALL_SUBS.map(([pg, sb]) => `${pg}/${sb}`).filter((k) => covered.has(k)).length,
    orphans: orphans.length,
    orphanList: orphans,
    multiCovered: Object.keys(coverBy).filter((k) => coverBy[k].length > 1).length
  };

  /* ── X2：从看板逐 key 走通（两档案各一遍） ── */
  async function walkScenes(pid) {
    let ok = 0;
    for (const [key, landing, landingSub, steps] of SCENES) {
      await cdp.eval(`(() => { state.profileId=${JSON.stringify(pid)}; state.page='dash'; state.sub={}; render(); })()`);
      await sleep(60);
      const chip = await cdp.eval(`(() => { const b = document.querySelector('#main .scene-chip[data-scene=${JSON.stringify(key)}]'); if (!b) return null; b.click(); return true; })()`);
      if (chip === null) { out.X2.failures.push(`${pid}/${key}: 看板无场景 chip`); continue; }
      await sleep(60);
      let cur = await cdp.eval(`state.page + '/' + (state.sub[state.page] || '')`);
      if (cur !== `${landing}/${landingSub}`) { out.X2.failures.push(`${pid}/${key}: 落地页=${cur} 期望=${landing}/${landingSub}`); continue; }
      let products = await cdp.eval(`[...document.querySelectorAll('#main [data-product]')].map((e) => e.dataset.product)`);
      if (!products.length) { out.X2.failures.push(`${pid}/${key}: 落地页无 data-product 锚`); continue; }
      let allOk = true;
      for (const st of steps) {
        const hit = await cdp.eval(`(() => { const b = document.querySelector('#main [data-step=${JSON.stringify(st)}]'); if (!b) return null; b.click(); return true; })()`);
        await sleep(60);
        const [pg, sb] = STEP_TARGET[st];
        cur = await cdp.eval(`state.page + '/' + (state.sub[state.page] || '')`);
        const prods = await cdp.eval(`[...document.querySelectorAll('#main [data-product]')].map((e) => e.dataset.product)`);
        if (hit === null || cur !== `${pg}/${sb}` || !prods.length) {
          out.X2.failures.push(`${pid}/${key}: 步骤 ${st} 失败（hit=${hit} 落点=${cur} 期望=${pg}/${sb} 产品锚=${prods.length}）`);
          allOk = false; break;
        }
        products = products.concat(prods);
      }
      // 回首页一步
      await cdp.eval(`(() => { const b = document.querySelector('#main .back-row [data-action="go"][data-page="dash"]') || document.querySelector('#main [data-action="go"][data-page="dash"]'); if (b) b.click(); })()`);
      await sleep(60);
      const back = await cdp.eval("state.page === 'dash'");
      if (!back) { out.X2.failures.push(`${pid}/${key}: 无法一步回看板`); allOk = false; }
      if (allOk) ok += 1;
    }
    return ok;
  }
  out.X2.demo1 = await walkScenes('demo1');
  out.X2.demo2 = await walkScenes('demo2');
  out.X2.walked = out.X2.demo1 + out.X2.demo2;

  /* ── X3：编辑入口 ≤1（30 页签 × 2 档案逐页数） ── */
  const VIEWS = ['dash', ...new Set(ALL_SUBS.map(([pg]) => pg))]; /* dash 也是一级页：AI 示例按钮覆盖检查含看板 */
  let maxEntries = 0;
  for (const pid of ['demo1', 'demo2']) {
    for (const [pg, sb] of ALL_SUBS) {
      await cdp.eval(`(() => { state.profileId=${JSON.stringify(pid)}; state.page=${JSON.stringify(pg)}; state.sub[${JSON.stringify(pg)}]=${JSON.stringify(sb)}; render(); })()`);
      await sleep(40);
      const n = await cdp.eval(`document.querySelectorAll('#main [data-action]').length ? [...document.querySelectorAll('#main [data-action]')].filter((b) => ${JSON.stringify(FORM_ACTIONS)}.includes(b.dataset.action)).length : 0`);
      const key = `${pg}/${sb}`;
      out.X3.perPage[`${key}/${pid}`] = n;
      if (n > maxEntries) maxEntries = n;
      if (n > 1) out.X3.over.push(`${key}/${pid}: ${n} 个编辑入口`);
    }
  }
  out.X3.max = maxEntries;
  out.X3.pagesChecked = ALL_SUBS.length * 2;

  /* ── X4：AI 产出候选闭环 ── */
  await cdp.eval("(() => { state.page='dash'; state.sub={}; state.profileId='demo1'; render(); })()");
  await sleep(80);
  await cdp.eval("ACTIONS['ai-draft']({ dataset: { ai: 'pleura' } })");
  await sleep(200);
  out.X4.candShown = await cdp.eval("!!document.querySelector('[data-testid=agent-cand]')");
  out.X4.draftButtons = await cdp.eval("document.querySelectorAll('[data-testid=agent-cand] .actions button').length");
  out.X4.privateNote = await cdp.eval("document.querySelector('.agent-body').textContent.includes('默认不进入 AI 上下文')");
  await cdp.eval("document.querySelector('[data-testid=agent-cand] [data-action=cand-ok]').click()");
  out.X4.confirmToast = await cdp.eval("document.getElementById('toast').classList.contains('visible')");
  await cdp.eval("document.querySelector('[data-testid=agent-cand] [data-action=cand-fix]').click()");
  out.X4.fixToast = await cdp.eval("document.getElementById('toast').classList.contains('visible')");
  await cdp.eval("document.querySelector('[data-testid=agent-cand] [data-action=cand-reject]').click()");
  await sleep(100);
  out.X4.rejectClears = await cdp.eval("state.agent.draft === null && !document.querySelector('[data-testid=agent-cand]')");
  // AI 示例按钮每条一级线至少 1 个（每级页 AI 协助示例按钮）
  const aiPages = [];
  for (const pg of VIEWS) {
    await cdp.eval(`(() => { state.page=${JSON.stringify(pg)}; state.sub={}; render(); })()`);
    await sleep(40);
    const has = await cdp.eval("!!document.querySelector('#main [data-action=ai-draft]')");
    if (has) aiPages.push(pg);
  }
  out.X4.aiBtnPages = aiPages.length;
  out.X4.aiBtnMissing = VIEWS.filter((v) => !aiPages.includes(v));

  out.jsErrors = cdp.errors.length - errorsBefore;
  const pass = out.X1.orphans === 0 && out.X2.failures.length === 0 && out.X2.walked === 26
    && out.X3.over.length === 0 && out.X3.max <= 1
    && out.X4.candShown && out.X4.draftButtons === 3 && out.X4.rejectClears && out.X4.aiBtnPages === 10 && out.jsErrors === 0;
  console.log(JSON.stringify(out, null, 2));
  console.log(pass ? '✓ HVT X1–X4 通过' : '✗ HVT X1–X4 未达门槛');
  process.exitCode = pass ? 0 : 1;
} finally {
  await stopChrome(ch);
}
