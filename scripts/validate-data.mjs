import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const d=JSON.parse(await readFile(new URL('../site/data/questions.json',import.meta.url),'utf8'));
const profileImageIndex=JSON.parse(await readFile(new URL('../site/data/profile-image-index.json',import.meta.url),'utf8'));
assert.deepEqual(d.metadata.questionScope,['official','independent','other']);
assert.equal(d.metadata.questionCount,d.questions.length);assert.ok(d.questions.length>0);
assert.equal(d.metadata.candidateQuestionCount,d.metadata.questionCount+d.metadata.ineligibleQuestionCount);
assert.equal(d.metadata.coordinateClamp,2);assert.equal(d.metadata.finalPitchCoordinateLimit,1.2);
assert.equal(d.metadata.ineligiblePercent,d.metadata.ineligibleQuestionCount/d.metadata.candidateQuestionCount*100);
assert.ok(d.metadata.questionPitcherCount>0);assert.ok(d.metadata.questionGames>0);
assert.equal(d.metadata.profileImageSource,profileImageIndex.sourceUrl);
assert.equal(d.metadata.profileImageMapEntries,Object.keys(profileImageIndex.playerNameToImageIndex).length);
assert.equal(d.metadata.questionScopeCounts.reduce((n,s)=>n+s.candidateQuestionCount,0),d.metadata.candidateQuestionCount);
assert.equal(d.metadata.questionScopeCounts.reduce((n,s)=>n+s.questionCount,0),d.metadata.questionCount);
assert.deepEqual(new Set(d.metadata.questionScopeCounts.map(s=>s.league)),new Set(d.metadata.questionScope));
assert.equal(new Set(d.metadata.questionScopeCounts.map(s=>JSON.stringify([s.league,s.seasonId]))).size,d.metadata.questionScopeCounts.length);
const ids=new Set();
for(const q of d.questions){
 assert.ok(!ids.has(q.id));ids.add(q.id);assert.ok(d.players[q.pitcherId]&&d.players[q.batterId]);
 assert.ok(d.metadata.questionScope.includes(q.league));
 if(q.league==='official')assert.ok(typeof q.seasonId==='string'&&q.seasonId.length>0);
 else assert.equal(q.seasonId,null);
 assert.ok(['left','right'].includes(q.pitcherHand));assert.ok(['left','right'].includes(q.batterSide));
 assert.equal(q.hr.result,'home_run');assert.ok(['strikeout','ground_out','fly_out'].includes(q.out.result));
 assert.notEqual(q.hr.id,q.out.id);assert.equal(q.hr.pitches.length,q.out.pitches.length);assert.ok(q.hr.pitches.length>0);
 for(const pa of [q.hr,q.out]){assert.equal(pa.pitches[0].count,'0-0');const last=pa.pitches.at(-1);assert.ok(Math.abs(last.x)<=1.2&&Math.abs(last.y)<=1.2);for(const p of pa.pitches){assert.ok(p.type);assert.ok(Number.isFinite(p.speed));assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(Math.abs(p.x)<=2&&Math.abs(p.y)<=2);assert.match(p.count,/^[0-3]-[0-2]$/);}}
}
assert.ok((await readFile(new URL('../site/assets/batter-left.png',import.meta.url))).length>0);
assert.ok((await readFile(new URL('../site/assets/batter-right.png',import.meta.url))).length>0);
for(const p of Object.values(d.players))for(const role of ['pitching','batting'])for(const s of Object.values(p[role])){assert.ok(s.whiffs<=s.swings);assert.ok(s.swings<=s.pitches);assert.equal(Object.values(s.types).reduce((n,v)=>n+v.pitches,0),s.pitches);}
const playersWithProfileImage=Object.values(d.players).filter(p=>p.profileImageUrl);
assert.equal(d.metadata.profileImagePlayerCount,playersWithProfileImage.length);
assert.equal(d.metadata.profileImageUnmatchedCount,Object.keys(d.players).length-playersWithProfileImage.length);
for(const p of playersWithProfileImage){assert.ok(Number.isInteger(p.profileImageId)&&p.profileImageId>0);assert.equal(profileImageIndex.playerNameToImageIndex[p.profileImageSourceName],p.profileImageId);assert.equal(p.profileImageUrl,profileImageIndex.imageUrlTemplate.replace('{index}',p.profileImageId));}
console.log(`Validated ${d.questions.length} questions, ${Object.keys(d.players).length} player hints, and ${playersWithProfileImage.length} profile image mappings.`);
