const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../mall-world'),C=require('../mission-combat'),N=require('../enemies'),V=require('../powers'),P=require('../physics');
const dt=1/120;
function scene(floor=0){
 const s=M.create({floor,started:true}),p=P.createPlayer(),e=C.create({selected:3,owned:[1,3,4,7],ammo:{3:3,4:2,7:1}});
 M.configure(s,p,e);p.form='soldier';e.enemies=[];s.enemies=e.enemies;
 const powers=V.create(),sounds=[];
 function step(input={}){
  C.update(e,p,input,dt,s.geometry.platforms,powers,{owned:[],levels:{}},{left:0,right:960,top:0,bottom:540},(origin,sound)=>{
   sounds.push(sound);M.hearShot(s,p,origin);
  });M.update(s,p,e,input,dt);
 }
 return {s,p,e,sounds,step};
}
test('only a fired round alerts nearby shoppers and a shotgun blast makes one report',()=>{
 const {s,e,step,sounds}=scene();
 for(const slot of [1,7,3]){e.inventory.selected=slot;e.inventory.ammo[3]=0;e.cooldown=0;step({fire:true});}
 assert.equal(s.departedShoppers.size,0);assert.deepEqual(sounds,[]);
 e.inventory.selected=4;e.cooldown=0;step({fire:true});step({});
 assert.deepEqual(sounds,['shotgun']);assert.deepEqual([...s.departedShoppers],['0-0']);
 assert.equal(s.shoppers[0].escape,1);assert.equal(s.shoppers[1].phase,'browse');
});
test('a guard firing from the right makes a shopper flee left without player input',()=>{
 const {s,p,e,step,sounds}=scene();p.x=365;
 const guard=N.createSoldier({x:419,y:472,facing:-1,kind:'rifle'},0);
 guard.shot=0;s.enemies=e.enemies=[guard];
 for(let i=0;i<180&&!sounds.length;i++)step();
 assert.deepEqual(sounds,['rifle']);assert.equal(s.shoppers[0].escape,-1);assert.equal(s.shoppers[0].door,s.shoppers[0].left);
});
test('the bag detaches once, rises, bounces, rests and disappears independently of its owner',()=>{
 const {s,p,e}=scene(),v=s.shoppers[0];M.hearShot(s,p,p);
 let frames=0,previousVy=-Infinity,bounces=0,maxBags=0,release=null,apex=Infinity,rest=false,entered=false;
 while(frames++<850){
  if(frames%12===0)M.hearShot(s,p,p);
  M.update(s,p,e,{},dt);const b=s.shoppingBags[0];entered||=v.phase==='enter';
  if(!b)continue;
  maxBags=Math.max(maxBags,s.shoppingBags.length);
  if(!release){release={x:b.x,y:b.y};assert.ok(Math.abs(b.x-v.x)<30&&b.y<v.ground-8);}
  if(previousVy>0&&b.vy<0)bounces++;previousVy=b.vy;apex=Math.min(apex,b.y);rest||=b.rest;
 }
 assert.equal(maxBags,1);assert.ok(apex<release.y-12&&bounces>0&&rest&&entered);
 assert.equal(s.shoppingBags.length,0);assert.equal(s.shoppers.includes(v),false);
});
test('shoppers stay with storefronts while the camera moves and remember who fled on resume or retry',()=>{
 const {s,p}=scene(1);p.x=2450;const target=s.shoppers[1];
 const camera=p.x-320,source={x:target.x+camera*(1-.77)-5,y:target.y};
 M.hearShot(s,p,source);assert.deepEqual([...s.departedShoppers],[target.id]);
 for(const next of [M.create(M.snapshot(s,p)),M.retry(s)])assert.ok(next.shoppers.every(v=>v.id!==target.id));
 for(let floor=0;floor<3;floor++){const {s}=scene(floor);assert.ok(s.shoppers.length<=3);assert.ok(s.shoppers.every(v=>v.left<v.x&&v.right>v.x));}
 assert.deepEqual(scene(3).s.shoppers,[]);
});
