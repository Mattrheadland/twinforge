// The v6 board detail pass must not move a single space, and every island must
// really get its detail (tiers, landmark, dense dressing, waterfalls where promised).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER } from '../src/data/characters.js';
import { buildBoard, WORLDS } from '../src/game/campaign.js';
import { layout, pathPoints, detailCounts, edgeDist, pathDist, TALL, DRESS } from '../src/render3d/board-layout.js';

test('board spaces keep their exact positions and order (v5.1 formula)', () => {
  for (const hero of ROSTER) {
    const b = buildBoard(hero);
    assert.equal(b.length, 33, hero);
    const pts = pathPoints(b);
    b.forEach((sp, i) => {
      assert.equal(pts[i].x, i * 130 + sp.world * 120);
      assert.equal(pts[i].z, Math.sin(i * 0.85) * 70);
    });
    assert.deepEqual(layout(b).pts, pts);
  }
});

test('every space sits well inside its own island; bridges join neighbours on the path', () => {
  const b = buildBoard('rex');
  const L = layout(b);
  assert.equal(L.isles.length, WORLDS.length);
  for (const sh of L.isles) for (const i of sh.idx) assert.ok(edgeDist(sh, L.pts[i].x, L.pts[i].z) >= 58, `${sh.name} space ${i}`);
  assert.equal(L.bridges.length, WORLDS.length - 1);
  for (const br of L.bridges) {
    assert.equal(br.bi, br.ai + 1, 'a bridge links consecutive spaces');
    assert.notEqual(b[br.ai].world, b[br.bi].world);
  }
});

test('the detail is there: tiers, landmark, dense props per island; waterfalls on castle and bog', () => {
  const L = layout(buildBoard('rex'));
  const counts = detailCounts(L);
  for (const c of counts) {
    assert.ok(c.tiers >= 1, `${c.name} has a raised tier`);
    assert.ok(c.props >= 40, `${c.name} has ${c.props} props`);
    assert.ok(c.tall >= 8, `${c.name} has ${c.tall} tall props`);
  }
  for (const name of ['castle', 'bog-shack']) assert.ok(counts.find((c) => c.name === name).falls >= 1, `${name} has a waterfall`);
  for (const sh of L.isles) assert.ok(sh.landmark && Number.isFinite(sh.landmark.x), `${sh.name} landmark`);
  assert.ok(L.sea.length >= 20 && L.boats.length >= 2, 'sea rocks, islets and boats');
  assert.ok(L.isles.find((s) => s.name === 'fishing-pier').docks.length >= 2);
  assert.ok(L.isles.find((s) => s.name === 'bog-shack').stilts.length >= 2);
});

test('nothing stands on the path; nothing tall stands in front of it', () => {
  const L = layout(buildBoard('rex'));
  for (const p of L.props) {
    const sh = L.isles.find((s) => s.wi === p.w);
    const pd = pathDist(sh.wpath, p.x, p.z);
    assert.ok(pd.d >= 64, `${p.kind} at ${p.x | 0},${p.z | 0} is ${pd.d | 0} from the path`);
    if (p.z > pd.z && p.zone !== 'tier') assert.ok((TALL[p.kind] || 0) <= 40, `${p.kind} is too tall for the front`);
    assert.ok(TALL[p.kind] !== undefined, `${p.kind} has a height`);
  }
  // the board's shadow-peeker spots (behind the path between spaces) stay clear
  for (const q of L.reserved.filter((c) => c.why === 'peeker')) for (const p of L.props) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) >= q.r, `${p.kind} on a peeker spot`);
  assert.ok(Object.keys(DRESS).length === WORLDS.length);
});

test('layout is deterministic', () => {
  const a = layout(buildBoard('rex')), b = layout(buildBoard('rex'));
  assert.deepEqual(detailCounts(a), detailCounts(b));
  assert.deepEqual(a.props.slice(0, 20), b.props.slice(0, 20));
});
