const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('../encounter'),P=require('../physics'),F=require('../final-boss'),W=require('../powers'),X=require('../extraction');
test('lethal orbital finishes its beam and all boss death poses before rescue',()=>{
 const e=E.createEncounter(),p=P.createPlayer(),s=W.create(),profile={owned:['orbital'],equipped:'orbital'};e.won=true;e.boss.hp=0;e.enemies=[];Object.assign(e.finalBoss,{stage:2,hp:20,maxHp:64,active:true,phase:'chase'});p.x=e.finalBoss.x;p.y=e.finalBoss.y;
 let sawBeamAfterKill=false,sawCorpse=false;const poses=new Set();
 for(let i=0;i<320;i++){W.update(s,e,p,profile,i===0,.01);F.update(e,p,.01,()=>{});if(e.finalWon){const pose=F.deathPose(e.finalBoss);poses.add(pose.row+':'+pose.frame);if(s.beams.length){sawBeamAfterKill=true;assert.equal(X.ready(e,s),false);}if(e.finalBoss.death>0){assert.equal(X.ready(e,s),false);sawCorpse ||= pose.frame===3&&pose.row===3;}}}
 assert.ok(sawBeamAfterKill);assert.ok(sawCorpse);assert.equal(poses.size,4);assert.equal(s.beams.length,0);assert.equal(X.ready(e,s),true);
 e.extraction={};assert.equal(X.ready(e,s),false);
});
test('rescue also waits for a beam that outlasts a completed death animation',()=>{const e=E.createEncounter();e.finalWon=true;e.finalBoss.death=0;assert.equal(X.ready(e,{beams:[{age:1}]}),false);assert.equal(X.ready(e,{beams:[]}),true);});
