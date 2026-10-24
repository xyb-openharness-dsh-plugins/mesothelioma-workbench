/* MinerU 解析层（18 号 v2 六部件）：mesoparse 抽取 + parse 编排 + htmlTablesToPipes。
 *
 * 关键回归（每条都对应一次真实事故）：
 * - 反例：先剥标签会把整张 HTML 表压成一行，"指标名后取第一个数"静默串位——必须先转竖线表；
 * - 单位先剥 LaTeX 外壳（$10^9/L$ → 10^9/L），夹具用真实 full.md 片段风格，不手写干净版；
 * - 不等式 <0.5 保留原文、num 留空；两数一格的参考范围整格放弃；
 * - 失败语义：本地格式不发云端；成功写候选不碰事实表；失败（fail）不产候选；重试新增任务行。
 */

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { htmlTablesToPipes, stripLatex, extractLabCandidates, guessReportDate } from '../dsh/mesoparse.js';
import { ImportService, kindOfFile } from '../dsh/parse.js';
import { openDatabase, migrate, close } from '../dsh/store.js';

const tmp = mkdtempSync(join(homedir(), '.xyb-mpm-parse-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ } });

/* 真实 full.md 片段风格（HTML 表 + LaTeX 单位），去患者信息。 */
const FIXTURE_HTML_MD = `# 血常规化验单

2026-10-12 采样。

<table><tr><td>项目</td><td>结果</td><td>单位</td></tr>
<tr><td>白细胞 WBC</td><td>3.1</td><td>$10^9/L$</td></tr>
<tr><td>中性粒细胞 ANC</td><td>1.4</td><td>10^{9}/L</td></tr>
<tr><td>血红蛋白 HGB</td><td>92</td><td>g/L</td></tr>
<tr><td>血小板 PLT</td><td>192</td><td>10^9/L</td></tr>
<tr><td>ALT</td><td>39</td><td>U/L</td></tr>
<tr><td>超敏 CRP</td><td>&lt;0.5</td><td>mg/L</td></tr>
<tr><td>肌酐 CREA</td><td>3.5-9.5</td><td>μmol/L</td></tr>
</table>
`;

test('① htmlTablesToPipes：HTML 表转竖线表 + 补分隔行；colspan 补空位；单元格内 | 不裂列', () => {
  const piped = htmlTablesToPipes('<table><tr><td>a</td><td>b</td></tr><tr><td>1</td><td>2</td></tr></table>');
  const lines = piped.split('\n');
  assert.equal(lines.length, 3, '两行数据 + 一条分隔行');
  assert.match(lines[1], /^\| --- \| --- \|$/, '第二行必须是分隔行（下游按它跳表头）');
  const spanned = htmlTablesToPipes('<table><tr><td colspan="2">wide</td><td>x</td></tr></table>');
  assert.match(spanned, /\| wide \|  \| x \|/, 'colspan=2 要补一个空单元格，否则后续列错位');
  const quoted = htmlTablesToPipes("<table><tr><td colspan='2'>q</td></tr></table>");
  assert.match(quoted, /\| q \|  \|/, "单引号 colspan 也要认（正则写 \"?' 会完全匹配不上）");
  const pipes = htmlTablesToPipes('<table><tr><td>a|b</td></tr></table>');
  assert.match(pipes.split('\n')[0], /\| a\/b \|/, '单元格里的 | 换成 /，一行不许被撑成多列');
});

test('② 反例：先剥标签会把整表压成一行，抽不出任何指标（顺序不能调回去）', () => {
  const strippedFirst = FIXTURE_HTML_MD.replace(/<table[\s\S]*?<\/table>/gi, (b) => b.replace(/<[^>]+>/g, ''));
  const { candidates } = extractLabCandidates(strippedFirst);
  assert.equal(candidates.length, 0, `先剥标签后不该抽出任何指标（实际 ${candidates.length} 条，会静默串位）`);
  const proper = extractLabCandidates(FIXTURE_HTML_MD);
  assert.ok(proper.candidates.length >= 4, '先转竖线表再对齐才能抽出来');
});

test('③ 抽取：位置对齐 + LaTeX 单位剥壳 + 词边界 + 不等式 + 参考范围整格放弃', () => {
  const { candidates, skipped } = extractLabCandidates(FIXTURE_HTML_MD);
  const byKey = Object.fromEntries(candidates.map((c) => [c.key, c]));
  assert.equal(byKey.WBC.value, 3.1);
  assert.equal(byKey.WBC.unit, '10^9/L', '剥掉 $ 外壳再认单位');
  assert.equal(byKey.ANC.unit, '10^9/L', '10^{9}/L 的花括号也要剥');
  assert.equal(byKey.HGB.unit, 'g/L');
  assert.equal(byKey.PLT.value, 192);
  assert.equal(byKey.ALT.value, 39);
  /* 超敏 CRP：词边界——"CRP" 命中的是字典里的 CRP 吗？字典没有 CRP（MPM 版），它不该被抽 */
  assert.equal(byKey.CRP, undefined, 'MPM 指标字典没有的项目不生成候选');
  /* <0.5 不等式在字典项目上才保留原文；不在字典的（CRP）整行跳过不进候选也不误抽 */
  assert.equal(skipped.some((s) => String(s.cell).includes('0.5')), false, 'CRP 不在字典：连数值判定都不做');
  /* 参考范围两数一格：整格放弃 */
  assert.equal(byKey.CR, undefined, '3.5-9.5 不是单一数值，不许抽成结果');
  assert.ok(skipped.some((s) => s.reason.includes('参考范围') || s.reason.includes('不是单一数值')));
});

test('④ stripLatex：只剥壳不推断；guessReportDate 不猜今天', () => {
  assert.equal(stripLatex('$10^9/L$'), '10^9/L');
  assert.equal(stripLatex('\\(10^{9}/L\\)'), '10^9/L');
  assert.equal(stripLatex('\\text{g}/\\mathrm{L}'), 'g/L');
  assert.equal(stripLatex('\\mu mol/L'), 'μmol/L');
  assert.equal(guessReportDate('血常规 2026-10-12'), '2026-10-12');
  assert.equal(guessReportDate('2026年10月12日'), '2026-10-12');
  assert.equal(guessReportDate('没有日期'), null);
});

test('⑤ 文件类型判定：.html 拒收 / PDF 图片走云 / txt md csv 本地', () => {
  assert.equal(kindOfFile('report.html'), 'reject');
  assert.equal(kindOfFile('report.htm'), 'reject');
  assert.equal(kindOfFile('a.PDF'), 'cloud');
  assert.equal(kindOfFile('photo.png'), 'cloud');
  assert.equal(kindOfFile('note.md'), 'local');
  assert.equal(kindOfFile('data.csv'), 'local');
  assert.equal(kindOfFile('noext'), 'reject');
});

test('⑥ 编排：本地 markdown 直读不上云；record 只写候选不碰事实表；accept 只改 confirmed', async () => {
  const db = openDatabase(':memory:');
  migrate(db);
  const localMd = '| 项目 | 结果 | 单位 |\n| --- | --- | --- |\n| 白细胞 WBC | 5.2 | 10^9/L |\n';
  const service = new ImportService(db, { extract: extractLabCandidates });
  const result = await service.parse(Buffer.from(localMd, 'utf8'), { filename: 'lab.txt', profileKey: 'demo1' });
  assert.equal(result.candidates.length, 1, '本地直读不需要 MinerU 客户端');
  const rec = service.record({ profileKey: 'demo1', document: result.document, candidates: result.candidates, bytes: Buffer.from(localMd) });
  assert.equal(rec.candidates, 1);
  assert.equal(db.prepare("SELECT status FROM document WHERE id = ?").get(rec.documentId).status, 'parsed');
  const cand = db.prepare('SELECT confirmed, value_text FROM candidate WHERE parse_job_id = ?').get(rec.jobId);
  assert.equal(cand.confirmed, 0, '候选默认未确认');
  assert.equal(cand.value_text, '5.2');
  /* 事实表零写入（成功不碰事实层） */
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM metric_point WHERE code = ?').get('WBC').n, 0, '解析落库不写 metric_point');
  /* accept 只改 confirmed */
  const id = db.prepare('SELECT id FROM candidate WHERE parse_job_id = ?').get(rec.jobId).id;
  const acc = service.accept(id, '2026-10-24T00:00:00Z');
  assert.equal(acc.changed, 1);
  const after = db.prepare('SELECT confirmed, confirmed_at FROM candidate WHERE id = ?').get(id);
  assert.equal(after.confirmed, 1);
  assert.equal(after.confirmed_at, '2026-10-24T00:00:00Z');
  close(db);
});

test('⑦ 失败语义：fail 不产候选、document=parse_failed；重试新增 parse_job 行（历史保留）', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  const service = new ImportService(db, { extract: extractLabCandidates });
  const bytes = Buffer.from('%PDF-1.4 fake');
  const doc = { name: 'report.pdf', date: '2026-10-12' };
  service.fail({ profileKey: 'demo1', document: doc, bytes, error: { code: 'UNAUTHORIZED', message: '401' } });
  const failed = db.prepare("SELECT id, status FROM document WHERE profile_id = 'demo1' AND file_name = 'report.pdf'").get();
  assert.equal(failed.status, 'parse_failed', '失败置 parse_failed');
  const jobs1 = db.prepare('SELECT state FROM parse_job WHERE document_id = ?').all(failed.id);
  assert.equal(jobs1.length, 1);
  assert.equal(jobs1[0].state, 'failed');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM candidate').get().n, 0, '失败不产候选');
  /* 重试：成功后新增 succeeded 任务行，旧失败记录留着；同一文件不新建 document */
  const rec = service.record({ profileKey: 'demo1', document: doc, candidates: [{ key: 'WBC', name: '白细胞', value: 3.1, unit: '10^9/L' }], bytes });
  assert.equal(rec.documentId, failed.id, '按（档案, 文件哈希）去重：不新建文档、不重置已解析状态');
  const jobs2 = db.prepare('SELECT state FROM parse_job WHERE document_id = ? ORDER BY rowid').all(failed.id);
  assert.equal(jobs2.length, 2, '重试新增一条任务记录');
  assert.deepEqual(jobs2.map((j) => j.state), ['failed', 'succeeded'], '旧的失败记录保留');
  close(db);
});
