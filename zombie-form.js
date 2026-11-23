(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const apiOf=(name,file)=>common?require(file):root[name];
 const label=form=>form==='hero'?'Centella Azul':form==='tank'?'Mini tanque':form==='fighter'?'Luchador':form==='robot'?'Robot':form==='zombie'?'Zombi':form==='wolf'?'Lobo':'Soldado';
 function forms(p,won){return ['soldier',...(won||p.zombieUnlocked?['wolf']:[]),...(p.zombieUnlocked?['zombie']:[]),...(p.robotUnlocked?['robot']:[]),...(p.tankUnlocked?['tank']:[]),...(p.fighterUnlocked?['fighter']:[]),...(p.heroUnlocked?['hero']:[])];}
 // Movement, collisions and save restoration must agree on each silhouette.
 function setBody(p,form){
  const heights={soldier:46,wolf:64,zombie:68,robot:54,tank:53,fighter:57,hero:46};
  p.form=Object.hasOwn(heights,form)?form:'soldier';
  p.h=heights[p.form];p.w=p.form==='tank'?64:24;
 }
 function restoreBody(p,form,won=false){
  setBody(p,forms(p,won).includes(form)?form:'soldier');
 }
 function change(e,p,target){
  const list=forms(p,e.won),from=p.form||'soldier';target=target||list[(list.indexOf(from)+1)%list.length];
  if(e.dead||p.transform>0||p.formCooldown>0||p.burrow||p.rope||p.ladder||target===from||!list.includes(target))return false;
  e.robotWait=null;p.wolfSprintJump=false;p.ramCooldown=0;p.ramBuffer=0;p.idleTime=0;p.idleGesture=false;p.transformFrom=from;setBody(p,target);p.transform=1.2;p.formCooldown=5;
  if(target==='robot'&&e.inventory?.selected<3)e.inventory.selected=e.inventory.owned.find(n=>n>=3)||e.inventory.selected;
  p.fighterImpact=null;p.fighterPose=0;p.fighterFreeze=0;p.heroFlight=false;p.jetpack=false;p.claw=0;p.kick=0;p.slide=0;p.ram=null;p.wolfAttack=null;p.wolfQueued=null;p.vx=0;e.weaponAction=null;e.cooldown=0;
  return true;
 }
 function tick(p,dt){apiOf('ArcadeAdvancedForms','./advanced-forms')?.tick(p,dt);p.formCooldown=Math.max(0,(p.formCooldown||0)-dt);p.zombiePose=Math.max(0,(p.zombiePose||0)-dt);p.emerging=Math.max(0,(p.emerging||0)-dt);}
 function step(p,input,dt,platforms,world,surfaceY){
  if(p.form!=='zombie'){p.burrow=null;p.burrowLatch=false;return null;}
  if(!input.down)p.burrowLatch=false;
  const support=p.ground||platforms.find(s=>s.kind==='ground'&&p.x>=s.x&&p.x<=s.x+s.w&&Math.abs(surfaceY(s,p.x)-p.y)<2);
  if(!p.burrow&&input.down&&!input.up&&!input.fire&&!input.kick&&!input.jumpPressed&&!p.burrowLatch&&p.grounded&&support?.kind==='ground'&&!support.noBurrow&&!p.transform&&!p.hurt&&!p.rope&&!p.ladder){p.burrow={age:0,ground:support,startX:p.x};p.burrowLatch=true;p.jetpack=false;p.slide=0;}
  if(!p.burrow){p.zombieCrouch=!!input.down&&p.grounded;return null;}
  const b=p.burrow;b.age+=dt;p.anim+=dt;p.vx=((input.right?1:0)-(input.left?1:0))*(input.run?260:180)*(p.speedBonus||1);if(p.vx)p.facing=Math.sign(p.vx);
  p.x=Math.max(Math.max(p.w/2,b.ground.x+p.w/2),Math.min(Math.min(world.width-p.w/2,b.ground.x+b.ground.w-p.w/2),p.x+p.vx*dt));
  p.y=surfaceY(b.ground,p.x);p.vy=0;p.grounded=true;p.ground=b.ground;p.jumps=0;p.fallDamage=0;p.fallPeak=p.y;
  if(b.age>=3||input.up||input.jumpPressed){
   // Emerge next to solid rubble, never inside it or snapped onto its roof.
   const left=Math.max(p.w/2,b.ground.x+p.w/2),right=Math.min(world.width-p.w/2,b.ground.x+b.ground.w-p.w/2),solids=platforms.filter(s=>s.solid);
   const clear=x=>x>=left&&x<=right&&!solids.some(s=>x+p.w/2>s.x&&x-p.w/2<s.x+s.w&&surfaceY(b.ground,x)>s.y&&surfaceY(b.ground,x)-p.h<s.y+(s.thickness||12));
   if(!clear(p.x)){const candidates=[b.startX,...solids.flatMap(s=>[s.x-p.w/2-.1,s.x+s.w+p.w/2+.1])].filter(x=>Number.isFinite(x)&&clear(x)).sort((a,c)=>Math.abs(a-p.x)-Math.abs(c-p.x));if(candidates.length)p.x=candidates[0];p.y=surfaceY(b.ground,p.x);p.vx=0;p.fallPeak=p.y;}
   p.burrow=null;p.emergeDepth=Math.min(1,b.age/.5);p.emerging=.35;p.burrowLatch=true;p.zombieCrouch=false;p.buffer=0;
  }
  return{crouching:true,underground:!!p.burrow};
 }
 function targets(e){return [...(e.enemies||[]),...[e.boss,e.finalBoss,e.tank,e.king].filter(n=>n&&n.hp>0&&(n.active||n===e.tank))].filter(n=>n.hp>0&&!(n.kind==='king'&&['descend','crack','roar','death'].includes(n.phase)));}
 function damage(e,n,amount){
  if(n===e.tank)return apiOf('ArcadeCityTank','./city-tank').damage(n,amount);
  if(n===e.finalBoss)return apiOf('ArcadeFinalBoss','./final-boss').damage(n,amount);
  if(n===e.boss){n.hp=Math.max(0,n.hp-amount);n.hit=.18;return;}
  return apiOf('ArcadeEnemies','./enemies').damage(n,amount);
 }
 function pool(e,x,surface){
  const P=apiOf('ArcadePhysics','./physics'),y=P.surfaceY(surface,x),pools=e.playerPools||(e.playerPools=[]),old=pools.find(a=>a.surface===surface&&Math.abs(a.x-x)<35);
  if(old){old.life=4.5;old.radius=Math.min(56,old.radius+8);return;}
  pools.push({x,y,surface,age:0,life:4.5,radius:34});if(pools.length>18)pools.shift();
 }
 function updatePools(e,dt,platforms){
  const P=apiOf('ArcadePhysics','./physics');e.playerPools=(e.playerPools||[]).filter(a=>{a.life-=dt;a.age+=dt;if(a.life<=0||!platforms.includes(a.surface))return false;const radius=Math.min(a.radius,9+a.age*85);for(const n of targets(e))if(Math.abs(n.x-a.x)<radius+(n.w||28)/2&&Math.abs(n.y-P.surfaceY(a.surface,n.x))<12)n.sticky=Math.max(n.sticky||0,.8);return true;});
 }
 function advancePlasma(e,p,dt,platforms){
  const E=apiOf('ArcadeEncounter','./encounter');
  updatePools(e,dt,platforms);
  e.zombieEffects=(e.zombieEffects||[]).filter(f=>(f.life-=dt)>0);
  for(const n of targets(e))if(n.sticky>0){const active=Math.min(dt,n.sticky);n.sticky=Math.max(0,n.sticky-dt);n.stickyTick=(n.stickyTick||0)+active;while(n.stickyTick>=.5-1e-9){n.stickyTick=Math.max(0,n.stickyTick-.5);damage(e,n,.3);}}
  const blobs=e.playerPlasma||(e.playerPlasma=[]);
  for(const b of blobs){b.trail=b.trail||[];b.trail.push({x:b.x,y:b.y});if(b.trail.length>9)b.trail.shift();b.life-=dt;b.vy+=220*dt;const dx=b.vx*dt,dy=b.vy*dt;let first=1,target=null,blocked=false,hitSurface=null;
   for(const s of platforms){const t=E.segmentHit(b.x,b.y,dx,dy,{x:s.x,y:s.y,w:s.w,h:s.thickness||12,terrain:s.terrain});if(t!==null&&t<=first){first=t;blocked=true;hitSurface=s;}}
   for(const n of targets(e)){const t=E.segmentHit(b.x,b.y,dx,dy,{x:n.x-(n.w||28)/2,y:n.y-(n.h||64),w:n.w||28,h:n.h||64});if(t!==null&&t<first){first=t;target=n;hitSurface=null;blocked=true;}}
   b.x+=dx*first;b.y+=dy*first;
   if(blocked){if(hitSurface){const P=apiOf('ArcadePhysics','./physics'),surfaceY=P.surfaceY(hitSurface,b.x);if(dy>=0&&Math.abs(b.y-surfaceY)<10)pool(e,b.x,hitSurface);else{const ground=platforms.filter(s=>s!==hitSurface&&b.x>=s.x&&b.x<=s.x+s.w&&P.surfaceY(s,b.x)>=b.y).sort((a,c)=>P.surfaceY(a,b.x)-P.surfaceY(c,b.x))[0];if(ground)e.plasmaDrips=(e.plasmaDrips||[]).concat({x:b.x,y:b.y,vy:10,surface:ground,life:2}).slice(-24);}}b.life=0;e.zombieEffects.push({kind:'splash',x:b.x,y:b.y,life:.4});if(target){damage(e,target,1*(p.damageBonus||1));if(target.hp>0)target.sticky=4;}}
  }e.playerPlasma=blobs.filter(b=>b.life>0);
  e.plasmaDrips=(e.plasmaDrips||[]).filter(d=>{d.life-=dt;d.vy+=440*dt;d.y+=d.vy*dt;const y=apiOf('ArcadePhysics','./physics').surfaceY(d.surface,d.x);if(d.y>=y){pool(e,d.x,d.surface);return false;}return d.life>0;});
 }
 function combat(e,p,input,dt,platforms){
  const E=apiOf('ArcadeEncounter','./encounter');
  advancePlasma(e,p,dt,platforms);
  p.plasmaWait=Math.max(0,(p.plasmaWait||0)-dt);p.rayWait=Math.max(0,(p.rayWait||0)-dt);
  if(p.form!=='zombie'||p.burrow||p.transform>0||p.hurt>0||e.dead)return;
  const aim=p.aim||{x:p.facing||1,y:0};
  const beginCast=action=>{p.zombieAction=action;p.zombiePose=action==='plasma'?.45:.28;p.castAim={...aim};p.castFacing=aim.x?Math.sign(aim.x):p.facing||1;return castOrigin(p);};
  if(input.kick&&p.plasmaWait<=0){const {x,y}=beginCast('plasma');p.plasmaWait=.85;e.playerPlasma.push({x,y,vx:aim.x*360,vy:aim.y*360-20,life:2.4,trail:[]});e.zombieEffects.push({kind:'cast',x,y,life:.16});e.flash=.08;}
  else if(input.fire&&p.rayWait<=0){const {x,y}=beginCast('ray');p.rayWait=Math.max(.5,.7/(p.rateBonus||1));let distance=440,carSurface=null;
   for(const s of platforms){const t=E.segmentHit(x,y,aim.x*distance,aim.y*distance,{x:s.x,y:s.y,w:s.w,h:s.thickness||12,terrain:s.terrain});if(t!==null){distance*=t;carSurface=s.kind==='wreck'?s.car:null;}}
   const hits=targets(e).map(n=>({n,t:E.segmentHit(x,y,aim.x*distance,aim.y*distance,{x:n.x-(n.w||28)/2,y:n.y-(n.h||64),w:n.w||28,h:n.h||64})})).filter(a=>a.t!==null).sort((a,b)=>a.t-b.t);
   if(hits.length){damage(e,hits[0].n,1.2*(p.damageBonus||1));distance*=hits[0].t;carSurface=null;e.zombieEffects.push({kind:'electrocute',target:hits[0].n,life:.48});}
   if(carSurface!==null)e.damageCar?.(carSurface);
   e.zombieEffects.push({kind:'ray',x,y,tx:x+aim.x*distance,ty:y+aim.y*distance,life:.16,caster:p});e.flash=.08;
  }
 }
 let atlas=null,extra=null,playerAtlas=null,playerExtra=null,playerIdle=null,playerRun=null,shockSheet=null,castSheet=null,formsArt={};
 // Native pixel anchors: palm, boots and helmet-to-boot height, independent of raised arms.
 const castRows=[
  {top:0,bottom:421,base:401,height:280,palms:[[176,141],[520,66],[901,113]]},
  {top:421,bottom:777,base:754,height:284,palms:[[297,509],[678,480],[1030,505]]},
  {top:777,bottom:1091,base:1064,height:270,palms:[[294,872],[698,880],[1030,880]]},
  {top:1091,bottom:1448,base:1390,height:273,palms:[[294,1262],[675,1284],[1027,1282]]}
 ];
 function setCastSheet(image){castSheet=image;}
 function castPose(p){
  const aim=p.zombiePose>0&&p.castAim?p.castAim:p.aim||{x:p.facing||1,y:0};
  const row=aim.y<-.9?0:aim.y<-.1?1:aim.y>.1?3:2,duration=p.zombieAction==='plasma'?.45:.28,age=duration-(p.zombiePose||duration);
  const frame=age<duration-.12?1:age<duration-.04?2:0,r=castRows[row],s=68/r.height;
  return{cast:true,row,frame,scale:s,x:[0,362,774][frame],y:r.top,w:[362,412,312][frame],h:r.bottom-r.top,base:r.base,pivot:[185,540,904][frame],palm:r.palms[frame],facing:p.zombiePose>0&&p.castFacing?p.castFacing:p.facing||1};
 }
 function setRunSheet(image){playerRun=prepare(image,1,[0,image.height]);playerRun.scale=64/407;return playerRun;}
 function setShockSheet(image){shockSheet=image;}
 function setForms(soldier,soldierFrame,wolf,wolfFrame){formsArt={soldier:{image:soldier,frame:soldierFrame,height:46},wolf:{image:wolf,frame:wolfFrame,height:64}};const T=apiOf('ArcadeFormTransition','./form-transition');T?.setEndpoint('soldier',soldier,soldierFrame,46);T?.setEndpoint('wolf',wolf,wolfFrame,wolfFrame[3]*.48);}
 function prepare(image,rowCount,bands,cuts={},anchorBoots=false){
  const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data,rows=[];
  for(let row=0;row<rowCount;row++){const frames=[];for(let col=0;col<6;col++){const xs=cuts.x?.[row],x0=xs?xs[col]:Math.round(col*c.width/6),x1=xs?xs[col+1]:Math.round((col+1)*c.width/6),y0=Math.round((cuts.y?.[row]?.[col]??bands[row])*c.height/bands.at(-1)),y1=Math.round((cuts.y?.[row+1]?.[col]??bands[row+1])*c.height/bands.at(-1));let l=x1,r=x0,t=y1,b=y0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(d[(y*c.width+x)*4+3]>190){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}frames.push({x:l,y:t,w:r-l+1,h:b-t+1,pivot:(col+.5)*c.width/6,base:b+1});}if(anchorBoots){
      for(const f of frames){
        let left=f.x+f.w,right=f.x;
        for(let y=f.base-Math.ceil(f.h*.1);y<f.base;y++)for(let x=f.x;x<f.x+f.w;x++){
          if(d[(y*c.width+x)*4+3]>190){left=Math.min(left,x);right=Math.max(right,x);}
        }
        if(right>=left)f.pivot=(left+right)/2;
      }
    }
    rows.push(frames);}
  return {image,rows,scale:68/rows[0][0].h};
 }
 function setSheet(image){atlas=prepare(image,6,[0,226,440,643,855,1080,1254],{x:{3:[0,209,418,627,836,1060,1254],4:[0,209,418,627,836,1060,1254]}});return atlas;}
 function setExtra(image){extra=prepare(image,4,[0,280,530,775,1024],{x:{0:[0,256,506,748,995,1248,1536],1:[0,256,512,750,1024,1280,1536]},y:{3:[775,775,747,740,775,775]}});return extra;}
 function setPlayerSheets(image,extras){
  const cuts=Object.fromEntries(Array.from({length:6},(_,i)=>[i,[0,210,427,639,859,1080,1254]]));
  playerAtlas=prepare(image,6,[0,230,462,680,891,1100,1254],{x:cuts});
  const f=playerAtlas.rows[0][0];apiOf('ArcadeFormTransition','./form-transition')?.setEndpoint('zombie',image,[f.x,f.y,f.w,f.h],68,f.pivot);
  playerExtra=prepare(extras,4,[0,280,530,774,1024],{x:Object.fromEntries(Array.from({length:4},(_,i)=>[i,[0,254,499,750,1036,1275,1536]]))});
 }
 function setIdleSheet(image){
  playerIdle=prepare(image,4,[0,260,512,764,1024],{x:Object.fromEntries(Array.from({length:4},(_,i)=>[i,[0,300,550,800,1040,1300,1536]]))},true);
  return playerIdle;
 }
 function idlePose(p){
  if(p.form!=='zombie'||p.kind==='stormZombie'||!p.grounded||Math.abs(p.vx||0)>8||p.hurt>0||p.transform>0||p.burrow||p.emerging>0||p.zombieCrouch||p.zombiePose>0||p.rope||p.ladder||(p.idleTime||0)<6)return null;
  const elapsed=p.idleTime-6,cycle=Math.floor(elapsed/12),age=elapsed%12,gesture=cycle%2,duration=gesture?3:3.6;if(age>=duration)return null;
  let index=Math.min(11,Math.floor(age/duration*12));if(gesture&&index===9)index=10;return{idle:true,gesture:gesture?'head':'hand',row:gesture*2+Math.floor(index/6),frame:index%6};
 }
 function icon(){const a=playerAtlas||atlas,f=a?.rows[0][0];return f?{image:a.image,frame:[f.x,f.y,f.w,f.h]}:null;}
 function burial(p){const h=(p.h||68)+12;return p.burrow?{hidden:p.burrow.age>=.5,depth:h*Math.min(1,p.burrow.age/.5)}:{hidden:false,depth:p.emerging>0?h*Math.min(1,p.emerging/.35)*(p.emergeDepth??1):0};}
 function castOrigin(p){const q=castPose(p);return apiOf('ArcadePhysics','./physics').jumpTurn.point(p,{x:Math.round(p.x)+q.facing*(q.palm[0]-q.pivot)*q.scale,y:Math.round(p.y)+(q.palm[1]-q.base)*q.scale});}
 function pose(p){if(p.form==='zombie'&&p.kind!=='stormZombie'&&p.zombiePose>0&&!p.transform&&!p.burrow&&!p.emerging)return castPose(p);if(p.kind==='stormZombie'&&p.hp<=0)return{extra:true,row:0,frame:Math.min(5,Math.floor((1-p.death/1.5)*6))};if(p.transform>0)return{extra:true,row:3,frame:Math.min(5,Math.floor((1-p.transform/1.2)*6))};if(p.phase==='ring'&&p.hp>0)return{extra:true,row:1,frame:Math.min(5,Math.floor(p.age/1.55*6))};if(p.kind==='stormZombie'&&p.phase!=='idle')return{row:p.phase==='plasma'?4:3,frame:Math.min(5,Math.floor(p.age/1.55*6))};if(!p.grounded&&!p.burrow&&!p.rope&&!p.ladder)return{extra:true,row:2,frame:p.vy< -120?1:p.vy<0?2:p.vy<120?3:4};if(p.burrow)return{row:5,frame:0};if(p.emerging>0)return{row:5,frame:0};if(p.zombieCrouch)return{row:5,frame:0};if(p.zombiePose>0)return{row:p.zombieAction==='plasma'?4:3,frame:Math.min(5,2+Math.floor((1-p.zombiePose/(p.zombieAction==='plasma'?.45:.28))*4))};const idle=idlePose(p);if(idle)return idle;return{row:Math.abs(p.vx)>170?2:Math.abs(p.vx)>8?1:0,frame:Math.floor((p.anim||0)*(Math.abs(p.vx)>8?10:4))%6};}
 function draw(c,p,scale=1){
  const playable=p.kind!=='stormZombie',base=playable&&playerAtlas?playerAtlas:atlas,additional=playable&&playerExtra?playerExtra:extra;if(!base)return;
  const q=pose(p),running=playable&&playerRun&&!q.cast&&!q.idle&&!q.extra&&q.row===2,sheet=running?playerRun:q.idle&&playerIdle?playerIdle:q.extra&&additional?additional:base,f=sheet.rows[running||q.idle&&!playerIdle?0:q.row][running?Math.floor((p.zombieStride||0)*6)%6:q.idle&&!playerIdle?0:q.frame],s=sheet.scale*scale,buried=playable?burial(p):{hidden:false,depth:0};
  if(playable&&scale===1&&!q.cast&&!q.extra&&!q.idle&&q.row<=2&&!buried.depth&&!p.swimming&&!p.onMotorcycle&&!p.hurt&&!p.ladder&&!p.rope){
   const row=q.row===0?2:q.row-1,phase=q.row===0?(p.anim||0)*.6:(p.zombieStride||0);
   if(root.ArcadeSoldierAnimation?.baseSprite?.(c,p,row,phase))return;
  }
  if(buried.hidden)return;
  if(playable&&castSheet&&p.zombiePose>0&&!p.transform&&!p.burrow&&!p.emerging){const a=castPose(p);c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(p.x),Math.round(p.y));c.scale(a.facing,1);if(p.hurt>0)c.filter='brightness(1.6)';c.drawImage(castSheet,a.x,a.y,a.w,a.h,(a.x-a.pivot)*a.scale,(a.y-a.base)*a.scale,a.w*a.scale,a.h*a.scale);c.restore();return;}
  c.save();c.imageSmoothingEnabled=false;if(buried.depth){c.beginPath();c.rect(p.x-100,p.y-180,200,180);c.clip();}c.translate(Math.round(p.x),Math.round(p.y+buried.depth));c.scale(p.facing||1,1);if(playable&&(p.hit>0||p.hurt>0))c.filter='brightness(1.6)';apiOf('ArcadeImpact','./impact-effects').hitSprite(c,playable?0:p.hit,sheet.image,f.x,f.y,f.w,f.h,(f.x-f.pivot)*s,-(running?600-f.y:f.h)*s,f.w*s,f.h*s);c.restore();
 }
 function drawSoil(c,p){const age=p.burrow?.age||0;c.save();for(let i=0;i<11;i++){const x=p.x-17+i*3,y=p.y-1-Math.sin(i/10*Math.PI)*3;c.fillStyle=i%3?'#5c5140':'#93826a';c.fillRect(Math.round(x),Math.round(y),4,3);if(Math.abs(p.vx)>10&&i%3===0){c.globalAlpha=.55;c.fillRect(Math.round(x-Math.sign(p.vx)*5),Math.round(y-3-Math.abs(Math.sin(age*9+i))*3),2,2);c.globalAlpha=1;}}c.restore();}
 function drawPlayer(c,p){if(apiOf('ArcadeFormTransition','./form-transition')?.draw(c,p))return true;if(apiOf('ArcadeAdvancedForms','./advanced-forms')?.draw(c,p))return true;if(p.form!=='zombie'&&!(p.transform>0&&p.transformFrom==='zombie'))return false;
  c.save();const opacity=c.globalAlpha??1;let other=null,mix=0;if(p.transform>0){const t=Math.max(0,Math.min(1,1-p.transform/1.2));other=formsArt[p.form==='zombie'?p.transformFrom:p.form];mix=other?Math.max(0,Math.min(1,p.form==='zombie'?1-t/.28:(t-.65)/.35)):0;}
  c.globalAlpha=opacity*(1-mix);draw(c,p);if(p.burrow||p.emerging>0)drawSoil(c,p);
  if(other&&mix>0){const f=other.frame,s=other.height/f[3];c.globalAlpha=opacity*mix;c.save();c.translate(Math.round(p.x),Math.round(p.y));c.scale(p.facing||1,1);c.drawImage(other.image,...f.slice(0,4),-f[2]*s/2,-f[3]*s,f[2]*s,f[3]*s);c.restore();}
  if(p.transform>0){c.globalAlpha=opacity;c.strokeStyle='#8cf2bd';c.lineWidth=3;c.beginPath();c.ellipse(p.x,p.y-30,22+Math.sin(p.transform*10)*4,45,0,0,Math.PI*2);c.stroke();}c.restore();return true;}
 function drawEffects(c,e){c.save();
  const P=apiOf('ArcadePhysics','./physics');
  for(const a of e.playerPools||[]){const r=Math.min(a.radius,9+a.age*85),left=Math.max(a.surface.x,a.x-r),right=Math.min(a.surface.x+a.surface.w,a.x+r);c.globalAlpha=Math.min(1,a.life/.8);for(let x=Math.ceil(left/2)*2;x<right;x+=2){const edge=Math.sqrt(Math.max(0,1-((x-a.x)/r)**2)),y=Math.round(P.surfaceY(a.surface,x)),h=Math.ceil(edge*5);c.fillStyle='#244c30';c.fillRect(x,y-h,2,h+2);c.fillStyle='#58aa39';c.fillRect(x,y-h,2,Math.max(1,h-1));if(Math.floor(x/6+a.age*7)%5===0){c.fillStyle='#bcf270';c.fillRect(x,y-h,2,1);}}for(let i=0;i<3;i++){const x=a.x+Math.sin(i*9)*r*.7,y=P.surfaceY(a.surface,x)-5-Math.abs(Math.sin(a.age*4+i))*4;c.fillStyle='#93d94a';c.fillRect(Math.round(x),Math.round(y),2,2);}}
  c.globalAlpha=1;for(const d of e.plasmaDrips||[]){c.fillStyle='#88d946';c.fillRect(Math.round(d.x)-2,Math.round(d.y)-5,4,9);}
for(const n of targets(e))if(n.sticky>0){c.fillStyle='#6fcc5370';c.fillRect(n.x-(n.w||28)/2,n.y-8,n.w||28,5);for(let i=0;i<4;i++)c.fillRect(n.x-12+i*8,n.y-15-(i%2)*9,3,10);}
  for(const b of e.playerPlasma||[]){
   const trail=b.trail||[],speed=Math.hypot(b.vx,b.vy)||1,ux=b.vx/speed,uy=b.vy/speed;
   for(let i=0;i<trail.length;i++){const t=trail[i],r=1+i/trail.length*1.5;c.globalAlpha=.2+.5*i/trail.length;c.fillStyle='#79b943';for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)if(x*x+y*y<=r*r)c.fillRect(Math.round(t.x+x),Math.round(t.y+y),1,1);}c.globalAlpha=1;
   // Small shaded liquid silhouette follows velocity; no square core or floating orb.
   for(let y=-7;y<=7;y++)for(let x=-7;x<=7;x++){const along=x*ux+y*uy,across=-x*uy+y*ux,shape=along*along/42+across*across/13;if(shape>1)continue;c.fillStyle=shape>.75?'#3b6c29':y< -1&&x<2?'#d2ee92':y>1?'#639c35':'#9dce56';c.fillRect(Math.round(b.x)+x,Math.round(b.y)+y,1,1);}

  }
  for(const f of e.zombieEffects||[]){
   c.globalAlpha=Math.min(1,f.life*8);
   if(f.kind==='electrocute'){
    if(shockSheet){const n=f.target,frame=Math.min(5,Math.floor((.48-f.life)/.08)),h=(n.h||64)+14,s=h/512,w=shockSheet.width/6;c.save();c.imageSmoothingEnabled=false;c.globalAlpha=.88;c.drawImage(shockSheet,frame*w,100,w,512,Math.round(n.x-w*s/2),Math.round(n.y-h+5),Math.round(w*s),Math.round(h));c.restore();}
   }else if(f.kind==='ray'){
    const origin=f.caster?.form==='zombie'&&f.caster.zombiePose>0?castOrigin(f.caster):f,dx=f.tx-origin.x,dy=f.ty-origin.y,len=Math.hypot(dx,dy)||1,n=Math.max(2,Math.ceil(len/12)),nx=-dy/len,ny=dx/len,points=[];
    for(let i=0;i<=n;i++){const t=i/n,j=i===0||i===n?0:Math.sin(i*13.71+Math.floor(f.life*70))*3.4;points.push({x:Math.round(origin.x+dx*t+nx*j),y:Math.round(origin.y+dy*t+ny*j)});}
    for(const [width,color,alpha] of [[7,'#27979d',.17],[3,'#63dbdf',.65],[1,'#eaffdf',1]]){c.globalAlpha=Math.min(1,f.life*8)*alpha;c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.stroke();}
    c.globalAlpha=Math.min(1,f.life*8)*.6;c.lineWidth=1;c.strokeStyle='#91dee0';for(let i=4;i<n;i+=7){const a=points[i],side=i%2?1:-1;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(a.x+nx*side*7-dx/len*3,a.y+ny*side*7-dy/len*3);c.lineTo(a.x+nx*side*10-dx/len*8,a.y+ny*side*10-dy/len*8);c.stroke();}
    c.globalAlpha=Math.min(1,f.life*8);c.fillStyle='#e4ffd3';c.fillRect(Math.round(origin.x)-2,Math.round(origin.y)-2,4,4);for(let i=0;i<6;i++){const a=i*Math.PI/3,r=(.16-f.life)*80;c.fillStyle=i%2?'#c9f6b5':'#63babc';c.fillRect(Math.round(f.tx+Math.cos(a)*r),Math.round(f.ty+Math.sin(a)*r),2,2);}
   }else if(f.kind==='cast'){c.fillStyle='#a9dc62';c.fillRect(Math.round(f.x)-2,Math.round(f.y)-2,4,3);c.fillStyle='#daf4a2';c.fillRect(Math.round(f.x)-1,Math.round(f.y)-1,2,2);}
   else{const age=.4-f.life;for(let i=0;i<9;i++){const a=i*2.4,speed=20+(i%4)*14,x=f.x+Math.cos(a)*speed*age,y=f.y-Math.abs(Math.sin(a))*speed*age+100*age*age;c.fillStyle=i%2?'#9bd946':'#538833';c.fillRect(Math.round(x),Math.round(y),i%3===0?3:2,3);}}
  }c.restore();}

 const api={forms,label,setBody,restoreBody,change,tick,step,combat,advancePlasma,targets,setSheet,setExtra,setPlayerSheets,setIdleSheet,setRunSheet,setShockSheet,setCastSheet,castPose,castRows,setForms,icon,pose,idlePose,burial,castOrigin,draw,drawPlayer,drawEffects};if(common)module.exports=api;else root.ArcadeZombieForm=api;
})(typeof window!=='undefined'?window:globalThis);
