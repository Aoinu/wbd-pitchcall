import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
// Uses the approved local WBDMV snapshot; never reads production or raw tokens.
const [source, dataset] = process.argv.slice(2);
if (!source || !dataset) throw Error('Usage: node scripts/generate-data.mjs <WBDMV checkout> <dataset ID>');
const {validateDataset, buildCanonicalGames}=await import(pathToFileURL(resolve(source,'scripts/local-analysis.mjs')));
const d=await validateDataset(dataset);
const input=d.manifest.inputs.filter(i=>['official','independent','other'].includes(i.game?.leagueType)&&i.isIncludedInAnalysis!==false);
const {games}=await buildCanonicalGames({...d,manifest:{...d.manifest,inputs:input}});
const groups=new Map(), players={};
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,20);
const known=id=>id&&!id.startsWith('local_player_');
const profileImageIndex=JSON.parse(await readFile(new URL('../site/data/profile-image-index.json',import.meta.url),'utf8'));
const profileNameMap=profileImageIndex.playerNameToImageIndex;
const normalizeProfileName=name=>String(name??'')
 .replace(/[ΟοΑαΕεΗηΙιΚκΜμΝνΡρΤτΥυΧχΖζΒβ]/g,c=>({'Ο':'O','ο':'o','Α':'A','α':'a','Ε':'E','ε':'e','Η':'H','η':'n','Ι':'I','ι':'i','Κ':'K','κ':'k','Μ':'M','μ':'u','Ν':'N','ν':'v','Ρ':'P','ρ':'p','Τ':'T','τ':'t','Υ':'Y','υ':'u','Χ':'X','χ':'x','Ζ':'Z','ζ':'z','Β':'B','β':'b'}[c]??c))
 .replace(/[АаВЕеКкМмНОоРрСсТУуХх]/g,c=>({'А':'A','а':'a','В':'B','Е':'E','е':'e','К':'K','к':'k','М':'M','м':'M','Н':'H','О':'O','о':'o','Р':'P','р':'p','С':'C','с':'c','Т':'T','У':'Y','у':'y','Х':'X','х':'x'}[c]??c))
 .replace(/[ー一]/g,'ー').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
const normalizedProfileMap=new Map();
for(const [name,index] of Object.entries(profileNameMap)){
 const key=normalizeProfileName(name);
 if(key&&!normalizedProfileMap.has(key))normalizedProfileMap.set(key,{sourceName:name,index});
}
const findProfileImage=name=>{
 const exact=Object.hasOwn(profileNameMap,name)?{sourceName:name,index:profileNameMap[name]}:null;
 const match=exact??normalizedProfileMap.get(normalizeProfileName(name));
 return match&&Number.isInteger(match.index)&&match.index>0?match:undefined;
};
const officialSummerPitchers=new Set();
for(const g of games)if(g.leagueType==='official'&&g.seasonId==='official_2026_summer')for(const e of g.events)if(known(e.pitcherId))officialSummerPitchers.add(e.pitcherId);
for(const g of games){
 const pas=new Map();for(const e of g.events){if(!pas.has(e.plateAppearanceId))pas.set(e.plateAppearanceId,[]);pas.get(e.plateAppearanceId).push(e);}
 for(const es of pas.values()){
 const e=es.at(-1);
 if(!['official','independent','other'].includes(g.leagueType)||!officialSummerPitchers.has(e.pitcherId)||!e.terminal||!['home_run','strikeout','ground_out','fly_out'].includes(e.result)||e.result!=='home_run'&&e.batterSafe===true)continue;
 if(g.leagueType==='official'&&!g.seasonId)continue;
 if(es.some(p=>!known(p.pitcherId)||!known(p.batterId)||!p.pitcherHand||!p.batterSide||p.pitcherId!==e.pitcherId||p.batterId!==e.batterId||p.pitcherHand!==e.pitcherHand||p.batterSide!==e.batterSide)||es[0].count!=='0-0'||es.some((p,i)=>p.pitchNumber!==i+1))continue;
 if(es.some(p=>!p.pitchType||!Number.isFinite(p.pitchSpeedKmh)||!p.pitchLocationPoint))throw Error('Missing display data');
 const matchSeasonId=g.leagueType==='official'?g.seasonId:null;
 const key=JSON.stringify([g.leagueType,matchSeasonId,e.pitcherId,e.batterId,e.pitcherHand,e.batterSide,es.length]);
 const id=hash(g.gameId+':'+e.plateAppearanceId);
 const pa={id,date:g.gameDate,matchup:`${g.awayTeamName} @ ${g.homeTeamName}`,result:e.result,batterSide:e.batterSide,confidence:e.resultResolution?.confidence??'unknown',pitches:es.map(p=>({type:p.pitchType,speed:p.pitchSpeedKmh,x:p.pitchLocationPoint.x,y:p.pitchLocationPoint.y,height:p.batterHeightCm??null,count:p.count,call:p.resolvedCall,result:p.pitchResult}))};
 if(!groups.has(key))groups.set(key,{league:g.leagueType,seasonId:matchSeasonId,pitcherId:e.pitcherId,batterId:e.batterId,pitcherName:e.pitcherDisplayName,batterName:e.batterDisplayName,pitcherHand:e.pitcherHand,batterSide:e.batterSide,hr:[],outs:[]});
 groups.get(key)[e.result==='home_run'?'hr':'outs'].push(pa);
 }
}
const questions=[];
for(const g of groups.values())for(const hr of g.hr)for(const out of g.outs){
 for(const [id,name] of [[g.pitcherId,g.pitcherName],[g.batterId,g.batterName]]){
  players[id]??={name,pitching:{},batting:{}};
  const profileImage=findProfileImage(name);
  if(profileImage&&!players[id].profileImageUrl){
   players[id].profileImageId=profileImage.index;
   players[id].profileImageUrl=profileImageIndex.imageUrlTemplate.replace('{index}',profileImage.index);
   players[id].profileImageSourceName=profileImage.sourceName;
  }
 }
 questions.push({id:hash(hr.id+':'+out.id),league:g.league,seasonId:g.seasonId,pitcherId:g.pitcherId,batterId:g.batterId,pitcherHand:g.pitcherHand,batterSide:g.batterSide,out,hr});
}
const candidateQuestionCount=questions.length;
const eligibleQuestions=questions.filter(q=>[q.out,q.hr].every(pa=>{
 const p=pa.pitches.at(-1);return Math.abs(p.x)<=1.2&&Math.abs(p.y)<=1.2;
}));
const ineligibleQuestionCount=candidateQuestionCount-eligibleQuestions.length;
const scopeCounts=new Map();
for(const q of questions){
 const key=JSON.stringify([q.league,q.seasonId]);
 const counts=scopeCounts.get(key)??{league:q.league,seasonId:q.seasonId,candidateQuestionCount:0,questionCount:0};
 counts.candidateQuestionCount++;
 scopeCounts.set(key,counts);
}
for(const q of eligibleQuestions)scopeCounts.get(JSON.stringify([q.league,q.seasonId])).questionCount++;
for(const q of eligibleQuestions)for(const pa of [q.out,q.hr])for(const pitch of pa.pitches){
 pitch.x=Math.max(-2,Math.min(2,pitch.x));
 pitch.y=Math.max(-2,Math.min(2,pitch.y));
}
// Hints retain matchup handedness and include every available season in the three scopes.
for(const g of games)for(const e of g.events){
 for(const [id,role,side] of [[e.pitcherId,'pitching',e.batterSide],[e.batterId,'batting',e.pitcherHand]]){
 if(!players[id]||!side)continue;
 const split=players[id][role][side]??={pitches:0,swings:0,whiffs:0,plateAppearances:0,homeRuns:0,strikeouts:0,types:{}};
 split.pitches++;
 const type=split.types[e.pitchType??'不明']??={pitches:0,swings:0,whiffs:0,speedSum:0,speedCount:0};type.pitches++;
 const swing=['swing','contact'].includes(e.resolvedCall)||e.pitchResult==='foul';
 if(swing){split.swings++;type.swings++;}if(e.resolvedCall==='swing'){split.whiffs++;type.whiffs++;}
 if(Number.isFinite(e.pitchSpeedKmh)){type.speedSum+=e.pitchSpeedKmh;type.speedCount++;}
 if(e.terminal){split.plateAppearances++;if(e.result==='home_run')split.homeRuns++;if(e.result==='strikeout')split.strikeouts++;}
 }
}
const dates=games.map(g=>g.gameDate).sort();
const profileImagePlayerCount=Object.values(players).filter(p=>p.profileImageUrl).length;
const metadata={schemaVersion:1,title:'WBD Pitchcall',generatedAt:new Date().toISOString(),snapshotAt:d.manifest.createdAt,sourceBuild:d.manifest.source.activeBuildId,candidateQuestionCount,questionCount:eligibleQuestions.length,ineligibleQuestionCount,ineligiblePercent:candidateQuestionCount?ineligibleQuestionCount/candidateQuestionCount*100:0,finalPitchCoordinateLimit:1.2,coordinateClamp:2,questionScope:['official','independent','other'],questionScopeCounts:[...scopeCounts.values()].sort((a,b)=>a.league.localeCompare(b.league)||(a.seasonId??'').localeCompare(b.seasonId??'')),questionPitcherFilter:'At least one recorded pitch in Official 2026 Summer',questionPitcherCount:officialSummerPitchers.size,questionGames:games.length,questionDates:[dates[0],dates.at(-1)],hintScope:['official','independent','other'],hintGames:games.length,hintDates:[dates[0],dates.at(-1)],profileImageSource:profileImageIndex.sourceUrl,profileImageMapEntries:Object.keys(profileNameMap).length,profileImagePlayerCount,profileImageUnmatchedCount:Object.keys(players).length-profileImagePlayerCount,coordinateSystem:'WBD zoneX/zoneY; pitcher view',selection:'Same pitcher/batter IDs, handedness and pitch count. Official pairs also require the same season; Independent and Other pairs require the same league because season is not recorded. Complete sequences only. Excludes batter-safe outs, double plays and unfinished appearances.'};
eligibleQuestions.sort((a,b)=>a.id.localeCompare(b.id));
await writeFile('site/data/questions.json',JSON.stringify({metadata,players,questions:eligibleQuestions},null,2)+'\n');
console.log(JSON.stringify({candidateQuestionCount,questionCount:eligibleQuestions.length,ineligibleQuestionCount,ineligiblePercent:metadata.ineligiblePercent,questionPitcherCount:officialSummerPitchers.size,questionGames:games.length,questionScopeCounts:metadata.questionScopeCounts,hintGames:games.length,players:Object.keys(players).length,profileImageMapEntries:metadata.profileImageMapEntries,profileImagePlayerCount,profileImageUnmatchedCount:metadata.profileImageUnmatchedCount}));
