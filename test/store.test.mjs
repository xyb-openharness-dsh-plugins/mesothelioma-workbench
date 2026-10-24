/* 数据层：迁移幂等 / 播种幂等 / 与 demo-data.js 的 parity / 读模型形状 / MPM 专属断言（M1/M2/M5）。
 *
 * parity 是这一层最重要的断言：开发版 `/api/bootstrap` 的 profiles 必须与定稿原型
 * prototypes/v0.2/demo-data.js 逐字段一致。前端是照着原型的形状写的，
 * 差一个字段就是"某个卡片空白"这种很难定位的 bug。
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { openDatabase, migrate, close } from '../dsh/store.js';
import { seedDemo, hasDemoData } from '../dsh/demo.js';
import { bootstrap, listSubjects, getProfile } from '../dsh/readmodels.js';

const ROOT = new URL('..', import.meta.url).pathname;
const demoSrc = readFileSync(join(ROOT, 'prototypes/v0.2/demo-data.js'), 'utf8');
const DEMO = JSON.parse(demoSrc.slice(demoSrc.indexOf('=') + 1, demoSrc.lastIndexOf('};') + 1));

const tmp = mkdtempSync(join(homedir(), '.xyb-mpm-test-'));
after(() => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 清理失败不影响结果 */ } });

test('① migrate 幂等：第二次执行不重跑已应用的迁移（0001 冻结 27 表 + 0002 增量 7 表）', () => {
  const db = openDatabase(':memory:');
  const first = migrate(db);
  const second = migrate(db);
  assert.deepEqual(first.executed, ['0001_initial.sql', '0002_mpm_dev_columns.sql'], '首次应执行 0001 + 0002');
  assert.deepEqual(second.executed, [], '第二次不应重跑');
  assert.equal(second.applied.length, 2);
  const tables = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> 'schema_migrations'").get().n;
  assert.equal(tables, 34, `27 + 7 = 34 张表（不计迁移台账），实际 ${tables}`);
  close(db);
});

test('② seedDemo 幂等：调两次只写一份档案', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  const a = seedDemo(db);
  const b = seedDemo(db);
  assert.equal(a.skipped, false);
  assert.equal(a.subjects, 2);
  assert.equal(b.skipped, true, '第二次应整批跳过');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profile').get().n, 2);
  close(db);
});

test('③ parity：库里读出的 profiles 与 demo-data.js 逐字段一致（两档案全量 deepStrictEqual）', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  for (const key of ['demo1', 'demo2']) {
    const expect = DEMO.profiles.find((p) => p.id === key);
    assert.ok(expect, `demo-data.js 里要有档案 ${key}`);
    assert.deepStrictEqual(getProfile(db, key), expect, `profiles.${key} 与 demo-data.js 不一致`);
  }
  const payload = bootstrap(db, { version: '0.1.1', build: 'test' });
  assert.equal(payload.profiles.length, 2);
  assert.equal(payload.meta.today, DEMO.meta.today);
  assert.equal(payload.meta.materialNote.includes('不提供法律建议'), true, 'meta 要带零法律建议声明');
  assert.equal(payload.version, '0.1.1');
  close(db);
});

test('④ 读模型形状：指标点按 rowid（插入序）、数值是数字、refHigh 恒在、mMRC 分类派生单源', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'demo1');
  const wbc = p.metrics.numeric.WBC;
  assert.ok(wbc.length >= 10, `WBC 序列应 >=10 点，实际 ${wbc.length}`);
  assert.equal(typeof wbc[0].v, 'number', '数值指标读出来必须是数字');
  const dates = wbc.map((pt) => pt.d);
  assert.deepEqual(dates, [...dates].sort(), '指标点必须按采样日期升序（rowid=插入序）');
  const spanDays = (new Date(dates.at(-1)) - new Date(dates[0])) / 86400000;
  assert.ok(spanDays >= 150, `WBC 序列应覆盖 >=150 天（6 个月演示窗口），实际 ${Math.round(spanDays)} 天`);
  /* refHigh 键恒在（lab() 契约）：ALT 末点缺参考上限 → refHigh: null，不是缺键 */
  const alt = p.metrics.numeric.ALT;
  assert.equal(Object.hasOwn(alt.at(-1), 'refHigh'), true, 'ALT 每个点都要有 refHigh 键（缺上限 = null）');
  assert.equal(alt.at(-1).refHigh, null, '末张化验单未印参考上限 → null，绝不借通用上限');
  assert.equal(alt[0].refHigh, 40);
  /* mMRC：qual.MMRC 从 mmrc_grade 派生（单源）；metric_point 里没有 is_numeric=0 的行 */
  assert.equal(p.metrics.qual.MMRC.length, p.pleura.mMRC.length, 'qual.MMRC 与 pleura.mMRC 同源同长');
  assert.equal(p.metrics.qual.MMRC[0].label, 'mMRC 1 级');
  assert.equal('MMRC' in p.metrics.numeric, false, 'mMRC 不进数值序列（分类卡不连线）');
  const bad = db.prepare('SELECT COUNT(*) AS n FROM metric_point p JOIN metric_def d ON d.code = p.code WHERE d.is_numeric = 0').get().n;
  assert.equal(bad, 0, 'metric_point 不许存分类指标（单源纪律）');
  close(db);
});

test('⑤ 文件库：真实落盘 + 重开后资料仍在（播种只发生一次）', () => {
  mkdirSync(join(tmp, 'nested'), { recursive: true });
  const file = join(tmp, 'nested', 'xyb-mesothelioma.sqlite');
  const db1 = openDatabase(file);
  migrate(db1);
  seedDemo(db1);
  close(db1);
  const db2 = openDatabase(file);
  migrate(db2);
  assert.equal(hasDemoData(db2), true, '重开后档案还在');
  assert.equal(seedDemo(db2).skipped, true, '重开后不应再播种一遍');
  close(db2);
});

test('⑥ M1 分子三态：未检测 ≠ 阴性，三态并存且按三态可数', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  for (const key of ['demo1', 'demo2']) {
    const p = getProfile(db, key);
    const states = new Set(p.molecular.map((m) => m.status));
    assert.ok(states.has('not_tested'), `${key} 必须有「未检测」项（未检测不等于阴性）`);
    for (const m of p.molecular) {
      assert.ok(['detected', 'not_detected', 'not_tested'].includes(m.status), `非法三态：${m.status}`);
      if (m.status === 'not_tested') {
        assert.equal(m.method, null, `未检测项不该有方法：${m.marker}`);
        assert.match(m.explain, /未检测不等于阴性|未检测。未检测不等于阴性/u, `未检测项要带常驻解释：${m.marker}`);
      }
    }
  }
  close(db);
});

test('⑦ M2 胸水事件独立轨道：穿刺/引流/固定术分轨道、引流量在列、mMRC 只在分类卡', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'demo1');
  const kinds = new Set(p.pleura.events.map((e) => e.kind));
  assert.ok(kinds.has('thoracentesis') && kinds.has('drain-tube') && kinds.has('pleurodesis'),
    `三种轨道都要有：${[...kinds].join('/')}`);
  const withVolume = p.pleura.events.filter((e) => typeof e.volumeMl === 'number');
  assert.ok(withVolume.some((e) => e.volumeMl === 600) && withVolume.some((e) => e.volumeMl === 800),
    '演示的 600/800 ml 胸穿引流必须原样还原');
  const authors = new Set(p.pleura.events.map((e) => e.author));
  assert.ok(authors.has('CAREGIVER'), '照护者代记的引流记录要带 author（M5 双主体）');
  close(db);
});

test('⑧ M5 双主体：viewpoints 与 family 分流回两组、visibility 原样、witnessed 徽章数据在', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  const p = getProfile(db, 'demo2');
  assert.ok(p.viewpoints.length >= 3 && p.family.length >= 3, 'demo2 的感受与家事都要还原');
  assert.ok(p.viewpoints.every((v) => ['PATIENT', 'CAREGIVER'].includes(v.role)));
  assert.ok(p.viewpoints.some((v) => v.visibility === 'private'), '私密看法要还原（过滤在前端 sharedOnly 一处做）');
  assert.ok(p.family.every((f) => typeof f.witnessed === 'boolean'), 'witnessed 必须是布尔（代记徽章）');
  assert.ok(p.viewpoints.some((v) => v.topic === '赔偿分歧'), 'COMPENSATION 主题要还原原文标签');
  close(db);
});

test('⑨ listSubjects 与 bootstrap 的档案顺序稳定', () => {
  const db = openDatabase(':memory:');
  migrate(db);
  seedDemo(db);
  assert.deepEqual(listSubjects(db).map((s) => s.id), ['demo1', 'demo2']);
  close(db);
});
