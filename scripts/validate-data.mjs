import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const d=JSON.parse(await readFile(new URL('../site/data/questions.json',import.meta.url),'utf8'));
assert.equal(d.metadata.season,'official_2026_summer');assert.equal(d.metadata.league,'official');
assert.equal(d.metadata.questionCount,d.questions.length);assert.ok(d.questions.length>0);
const ids=new Set();
for(const q of d.questions){
 assert.ok(!ids.has(q.id));ids.add(q.id);assert.ok(d.players[q.pitcherId]&&d.players[q.batterId]);
 assert.ok(['left','right'].includes(q.pitcherHand));assert.ok(['left','right'].includes(q.batterSide));
 assert.equal(q.hr.result,'home_run');assert.ok(['strikeout','ground_out','fly_out'].includes(q.out.result));
 assert.notEqual(q.hr.id,q.out.id);assert.equal(q.hr.pitches.length,q.out.pitches.length);assert.ok(q.hr.pitches.length>0);
 for(const pa of [q.hr,q.out]){assert.equal(pa.pitches[0].count,'0-0');for(const p of pa.pitches){assert.ok(p.type);assert.ok(Number.isFinite(p.speed));assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.match(p.count,/^[0-3]-[0-2]$/);}}
}
for(const p of Object.values(d.players))for(const role of ['pitching','batting'])for(const s of Object.values(p[role])){assert.ok(s.whiffs<=s.swings);assert.ok(s.swings<=s.pitches);assert.equal(Object.values(s.types).reduce((n,v)=>n+v.pitches,0),s.pitches);}
console.log(`Validated ${d.questions.length} questions and ${Object.keys(d.players).length} player hints.`);
