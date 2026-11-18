const test=require('node:test'),assert=require('node:assert/strict'),T=require('../form-transition'),Z=require('../zombie-form'),P=require('../physics');
function canvas(){return{save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){}};}
test('all 30 directed pairs preserve their real poses, anchors and opaque bodies in all three contexts',()=>{
 for(const mode of ['ground','road','swim'])for(const from of T.FORMS)for(const to of T.FORMS){if(from===to)continue;
  for(const facing of [-1,1])for(const time of [1.2,.9,.6,.2,.001]){const p={form:to,transformFrom:from,transform:time,x:238.2,y:412.4,facing,swimming:mode==='swim',onMotorcycle:mode==='road',vx:50,vy:-30},original=JSON.stringify(p),drawn=[];const c=canvas();c.globalAlpha=1;
   assert.ok(T.compose(c,p,q=>{drawn.push(q.form);assert.equal(q.x,p.x);assert.equal(q.y,p.y);assert.equal(q.transform,0);assert.equal(q.onMotorcycle,mode==='road');assert.equal(q.swimming,mode==='swim');assert.equal(q.submersible,mode==='swim'&&q.form==='tank');assert.equal(c.globalAlpha,1);},mode));
   assert.deepEqual(drawn,time===1.2?[from]:time<=.25?[to]:[from,to]);assert.equal(JSON.stringify(p),original);
  }
 }
});
test('all forms can transform and keep health/ammunition/cooldown in water and on motorcycles',()=>{
 for(const from of T.FORMS)for(const to of T.FORMS){if(from===to)continue;for(const mode of ['road','swim']){const p=Object.assign(P.createPlayer(),{form:from,zombieUnlocked:true,robotUnlocked:true,fighterUnlocked:true,tankUnlocked:true,onMotorcycle:mode==='road',swimming:mode==='swim'}),e={hp:7,won:true,inventory:{owned:[3,5],selected:3,ammo:{3:27,5:50}}},before={x:p.x,y:p.y,hp:e.hp,ammo:e.inventory.ammo[3]};assert.equal(Z.change(e,p,to),true);assert.equal(p.formCooldown,5);assert.equal(p.transformFrom,from);assert.equal(p.form,to);assert.equal(Z.change(e,p,from),false);assert.deepEqual({x:p.x,y:p.y,hp:e.hp,ammo:e.inventory.ammo[3]},before);}}
});
test('inactive, same-form and unknown transitions do not hide the ordinary renderer',()=>{for(const p of [{form:'robot',transform:0,transformFrom:'soldier'},{form:'wolf',transform:1,transformFrom:'wolf'},{form:'bad',transform:1,transformFrom:'soldier'}])assert.equal(T.compose(canvas(),p,()=>assert.fail()),false);});
