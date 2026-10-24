#!/usr/bin/env node
/**
 * 原型无头实测（M2 自验：必须出数字，不口头说"没问题"）。
 *
 * 数字：
 *  - 10 一级 × 30 二级 × 2 档案逐页签走查（aria-selected 与内容指纹匹配；逐个"查询→点击→再查询"，
 *    不预抓全部按钮——render 会重建 DOM）；
 *  - 每页 body.scrollWidth vs innerWidth、控制台 error、网络 4xx；
 *  - AI 面板：默认 35% / Home 45% / End 25% / 收起（aria-valuenow 同步）；
 *  - 一图秀：数值线与 mMRC 分类节点（只节点不连线）、末点标签=序列数、归一化水印、
 *    关治疗图层后 path[d] 不变（C4）；
 *  - 指标卡 3D 翻转：固定高度 rect 不位移、aria-pressed 独立（C11/C12）；
 *  - AI 候选闭环（X4）：ai-draft → 候选卡 → 确认/改一下/拒收 三步走通。
 * 截图存 docs/shots/{view}-{sub}-{profile}.png（dash/chart 无二级 → {view}-main-{profile}.png）。
 *
 * 用法：node scripts/probe-proto.mjs；退出码 0/1。依赖本机 Chrome（file:// 直开）。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, stopChrome, sleep } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'docs', 'shots');
mkdirSync(SHOTS, { recursive: true });
const CDP_PORT = Number(process.env.MPM_PROBE_CDP_PORT || 9353);
const URL_APP = `file://${join(ROOT, 'prototypes', 'v0.2', 'index.html')}`;

const VIEW_SUBS = [
  ['dash', ''], ['chart', ''],
  ['tumor', 'detour'], ['tumor', 'pathology'], ['tumor', 'molecular'], ['tumor', 'reports'],
  ['asbestos', 'exposure'], ['asbestos', 'checklist'], ['asbestos', 'qanda'],
  ['treatment', 'cycles'], ['treatment', 'immune'], ['treatment', 'changes'], ['treatment', 'calendar'],
  ['pleura', 'events'], ['pleura', 'drainage'], ['pleura', 'pleurodesis'], ['pleura', 'symptoms'],
  ['labs', 'blood'], ['labs', 'effusion'], ['labs', 'mmrc'],
  ['imaging', 'parallel'], ['imaging', 'questions'], ['imaging', 'archive'],
  ['care', 'feelings'], ['care', 'intake'], ['care', 'family'], ['care', 'decisions'],
  ['followup', 'schedule'], ['followup', 'library'], ['followup', 'candidates'], ['followup', 'prepare'], ['followup', 'trials']
];

const ch = await launchChrome({ port: CDP_PORT });
const { cdp } = ch;
const errors = cdp.errors;
const badResponses = cdp.badResponses;
const out = { tabs: 0, screenshots: 0, overflow: [], ariaMismatch: [], dupFingerprint: [], flipIssues: [], chart: {}, agent: {}, aiLoop: {}, navButtons: 0 };

try {
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(500);
  const bootedExpr = "document.body && document.body.getAttribute('data-booted') === '1'";
  for (let i = 0; i < 60 && !(await cdp.eval(bootedExpr)); i += 1) await sleep(150);

  out.navButtons = await cdp.eval("document.querySelectorAll('#nav .nav-button').length");

  async function shot(name) {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(r.data, 'base64'));
    out.screenshots += 1;
  }
  async function goto(page, sub) {
    await cdp.eval(`location.hash = ${JSON.stringify('#' + page + (sub ? '/' + sub : ''))}`);
    await sleep(60);
    await cdp.eval('window.scrollTo(0,0)');
    await sleep(60);
  }

  /* ── 逐 (view,sub) × 2 档案：逐 tab 查询→点击→再查询（render 重建 DOM，禁止预抓按钮列表） ── */
  for (const pid of ['demo1', 'demo2']) {
    for (const [page, sub0] of VIEW_SUBS) {
      await cdp.eval(`(() => { state.profileId = ${JSON.stringify(pid)}; state.pin = null; state.flipped = new Set(); })()`);
      await goto(page, sub0 || '');
      const subs = sub0 ? [sub0] : [''];
      if (!sub0) {
        subs.push(...(await cdp.eval(`(SUBPAGES[${JSON.stringify(page)}] || []).map((x) => x[0])`)));
      }
      const fingerprints = [];
      for (const sub of subs) {
        if (sub === '') {
          // dash / chart 无二级：直接走查本页（无 subnav 可点）
          const chk0 = await cdp.eval(`(() => { const html = document.getElementById('main').innerHTML; return JSON.stringify({ len: html.length, fp: html.replace(/\\s+/g, '').slice(120, 320) }); })()`);
          const d0 = JSON.parse(chk0);
          fingerprints.push({ sub: '(本页)', len: d0.len, fp: d0.fp });
          const diff0 = await cdp.eval('document.body.scrollWidth - window.innerWidth');
          if (diff0 > 1) out.overflow.push(`${page}/(本页)/${pid}(+${diff0}px)`);
          await shot(`${page}-main-${pid}`);
          out.tabs += 1;
          continue;
        }
        // 查询 → 点击 → 再查询（关键：每次点击后重新抓按钮，render 重建 DOM）
        const sel1 = await cdp.eval(`(() => { const b = document.querySelector('.subnav button[data-sub=${JSON.stringify(sub)}]'); if (!b) return null; b.click(); return true; })()`);
        if (sel1 === null) { out.ariaMismatch.push(`${page}/${sub}/${pid}: subnav 按钮未找到`); continue; }
        await sleep(50);
        const chk = await cdp.eval(`(() => {
          const b = document.querySelector('.subnav button[data-sub=${JSON.stringify(sub)}]');
          const sel = b ? b.getAttribute('aria-selected') : null;
          const stateSub = state.sub[${JSON.stringify(page)}];
          const bc = document.getElementById('breadcrumb').textContent;
          const html = document.getElementById('main').innerHTML;
          return JSON.stringify({ sel, stateSub, bc, len: html.length, fp: html.replace(/\\s+/g, '').slice(120, 320) });
        })()`);
        const d = JSON.parse(chk);
        if (d.sel !== 'true' || d.stateSub !== sub) out.ariaMismatch.push(`${page}/${sub}/${pid}: aria-selected=${d.sel} state.sub=${d.stateSub}`);
        fingerprints.push({ sub, len: d.len, fp: d.fp });
        const diff = await cdp.eval('document.body.scrollWidth - window.innerWidth');
        if (diff > 1) out.overflow.push(`${page}/${sub}/${pid}(+${diff}px)`);
        await shot(`${page}-${sub}-${pid}`);
        out.tabs += 1;
      }
      // 同一 view 的各 tab 内容指纹必须互不相同（19 号 §5.14：二级页签分流渲染）
      for (let i = 0; i < fingerprints.length; i += 1) {
        for (let j = i + 1; j < fingerprints.length; j += 1) {
          if (fingerprints[i].fp === fingerprints[j].fp) out.dupFingerprint.push(`${page}/${pid}: 「${fingerprints[i].sub}」与「${fingerprints[j].sub}」内容指纹相同`);
        }
      }
    }
  }

  /* ── AI 面板三态（默认 35 / Home 45 / End 25 / 收起） ── */
  await goto('dash', '');
  await cdp.eval("document.getElementById('agent-toggle').click()");
  await sleep(350);
  out.agent.defaultPct = await cdp.eval('state.agent.w');
  out.agent.openHidden = await cdp.eval("document.getElementById('agent-pane').hidden");
  out.agent.ariaNow = await cdp.eval("document.getElementById('agent-splitter').getAttribute('aria-valuenow')");
  await cdp.eval("document.getElementById('agent-splitter').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));");
  out.agent.widePct = await cdp.eval('state.agent.w');
  await cdp.eval("document.getElementById('agent-splitter').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));");
  out.agent.narrowPct = await cdp.eval('state.agent.w');
  const panePx = await cdp.eval("Math.round(document.getElementById('agent-pane').getBoundingClientRect().width)");
  const stagePx = await cdp.eval("document.querySelector('.stage').getBoundingClientRect().width");
  out.agent.panePctOfStage = Math.round((panePx / stagePx) * 10) / 10;
  await cdp.eval("document.getElementById('agent-hide').click()");
  out.agent.collapsedHidden = await cdp.eval("document.getElementById('agent-pane').hidden");
  out.agent.collapsedLabel = await cdp.eval("document.getElementById('agent-toggle').textContent");

  /* ── AI 候选闭环（X4）：ai-draft → 候选卡出现 → 确认 / 改一下 / 拒收 ── */
  await cdp.eval("ACTIONS['ai-draft']({ dataset: { ai: 'dash' } })");
  await sleep(250);
  out.aiLoop.candVisible = await cdp.eval("!!document.querySelector('[data-testid=agent-cand]')");
  out.aiLoop.candButtons = await cdp.eval("document.querySelectorAll('[data-testid=agent-cand] .actions button').length");
  out.aiLoop.inputFilled = await cdp.eval("(() => { const i = document.querySelector('.agent-foot input'); return i ? i.value.length > 0 : false; })()");
  await cdp.eval("document.querySelector('[data-testid=agent-cand] [data-action=cand-ok]').click()");
  out.aiLoop.okToast = await cdp.eval("document.getElementById('toast').classList.contains('visible')");
  await cdp.eval("document.querySelector('[data-testid=agent-cand] [data-action=cand-fix]').click()");
  await cdp.eval("document.querySelector('[data-testid=agent-cand] [data-action=cand-reject]').click()");
  await sleep(120);
  out.aiLoop.rejectedCleared = await cdp.eval("state.agent.draft === null && !document.querySelector('[data-testid=agent-cand]')");
  await shot('agent-pane-open-demo1');

  /* ── 一图秀（16 号 C2/C4/C5/C11/C12 抽断言） ── */
  await cdp.eval("setAgent(false)");
  await goto('chart', '');
  await sleep(120);
  out.chart = await cdp.eval(`(() => {
    const svg = document.querySelector('.chart-wrap svg.chart');
    if (!svg) return { lines: 0, pts: 0, mmrcPts: 0, mmrcPath: -1, endLabels: 0, watermark: false };
    const pts = [...svg.querySelectorAll('circle.pt')];
    const aria = svg.getAttribute('aria-label');
    const mmrcColor = '#7C99A8';
    const mmrcPts = pts.filter((c) => c.getAttribute('fill') === mmrcColor).length;
    const mmrcPath = [...svg.querySelectorAll('path.line')].filter((p) => p.getAttribute('stroke') === mmrcColor).length;
    return {
      lines: svg.querySelectorAll('path.line').length,
      pts: pts.length,
      mmrcPts,
      mmrcPath,
      endLabels: svg.querySelectorAll('text.delta-tag').length,
      watermark: svg.textContent.includes('不代表不同指标数值可比'),
      ariaMmrc: aria.includes('mMRC')
    };
  })()`);
  // C4：关治疗图层不改曲线
  const before = await cdp.eval("[...document.querySelectorAll('.chart path.line')].map((p) => p.getAttribute('d')).join('|')");
  await cdp.eval("state.toggles.treatment = false; render();");
  await sleep(80);
  const after = await cdp.eval("[...document.querySelectorAll('.chart path.line')].map((p) => p.getAttribute('d')).join('|')");
  out.chart.treatmentToggleKeepsPaths = before === after;
  await cdp.eval("state.toggles.treatment = true; render();");
  await shot('chart-main-demo1');

  /* ── 指标卡 3D 翻转（固定高度 rect 不位移；单卡独立） ── */
  await goto('dash', '');
  await sleep(120);
  out.flipIssues = await cdp.eval(`(() => {
    const issues = [];
    const cards = [...document.querySelectorAll('button.mcard')].slice(0, 3);
    if (!cards.length) { issues.push('dash 无可翻转指标卡'); return issues; }
    const r0 = cards[0].getBoundingClientRect();
    cards[0].click();
    const r1 = document.querySelector('button.mcard').getBoundingClientRect();
    if (['x','y','width','height'].some((k) => Math.abs(r0[k] - r1[k]) > 0.5)) issues.push('翻转后卡片位移');
    const pressed = cards[0].getAttribute('aria-pressed');
    const othersStill = [...document.querySelectorAll('button.mcard')].filter((c) => c !== cards[0] && c.getAttribute('aria-pressed') === 'true').length;
    if (pressed !== 'true') issues.push('aria-pressed 未置 true');
    if (othersStill !== 0) issues.push('其他卡被连带翻转');
    return issues;
  })()`);

  /* ── 版本首屏 + 空态抽查（DEMO-2 双免档案：周期为空 / 固定术为空） ── */
  out.version = {
    chip: await cdp.eval("document.getElementById('ver-chip').textContent"),
    footer: await cdp.eval("document.getElementById('app-version').textContent"),
    title: await cdp.eval('document.title')
  };
  await cdp.eval("state.profileId='demo2'; render();");
  await goto('treatment', 'cycles');
  out.emptyStates = await cdp.eval(`(() => {
    const empties = [...document.querySelectorAll('#main .empty')].map((e) => e.textContent.slice(0, 40));
    return { cyclesEmpty: empties.some((t) => t.includes('双免疫路径')) };
  })()`);
  await goto('pleura', 'pleurodesis');
  out.emptyStates.pleurodesisEmpty = await cdp.eval("[...document.querySelectorAll('#main .empty')].some((e) => e.textContent.includes('没有胸膜固定术记录'))");
  await cdp.eval("state.profileId='demo1'; render();");
  await goto('treatment', 'immune');
  out.emptyStates.immuneEmptyForDemo1 = await cdp.eval("[...document.querySelectorAll('#main .empty')].some((e) => e.textContent.includes('化疗路径'))");

  /* ── 网络与错误 ── */
  out.jsErrors = errors.length;
  out.consoleErrorSamples = errors.slice(0, 3);
  out.netFailed = badResponses.length;

  await shot('99-final-dash-demo1');
  console.log(JSON.stringify(out, null, 2));
  const pass = out.jsErrors === 0 && out.netFailed === 0 && out.overflow.length === 0 && out.ariaMismatch.length === 0
    && out.dupFingerprint.length === 0 && out.flipIssues.length === 0 && out.navButtons === 10
    && out.agent.defaultPct === 35 && out.agent.widePct === 45 && out.agent.narrowPct === 25
    && out.agent.collapsedHidden === true && out.aiLoop.candVisible === true && out.aiLoop.rejectedCleared === true
    && out.tabs === 64 && out.chart.mmrcPath === 0 && out.chart.mmrcPts > 0 && out.chart.watermark === true
    && out.chart.treatmentToggleKeepsPaths === true
    && out.emptyStates.cyclesEmpty && out.emptyStates.pleurodesisEmpty && out.emptyStates.immuneEmptyForDemo1;
  console.log(`截图目录：${SHOTS}`);
  console.log(pass ? '✓ 无头实测通过' : '✗ 无头实测未达门槛');
  process.exitCode = pass ? 0 : 1;
} finally {
  await stopChrome(ch);
}
