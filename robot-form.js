(function(root){
 'use strict';
 let sheet,frames,loading,mobility,mobilityFrames;
 // The sheet is a 6×4 grid, but several figures overlap the row above them: a
 // helmet from one row sits inside the cell of the previous one. Measuring each
 // cell on its own made those frames float 8 px. Every row has a floor line;
 // a frame is whatever lies between the previous row's floor and its own.
 const COLS=6,ROWS=4,CELL=256,FLOORS=[224,231,224,229],HEIGHT=54,SOURCE_HEIGHT=217,SCALE=HEIGHT/SOURCE_HEIGHT;
 // Fists and eye in sheet pixels, relative to the cell centre (x) and the row's
 // floor (y). Measured from the artwork; the upper fist carries the main weapon.
 const FISTS={
  stand:[[86,-155],[64,-118]],
  // While moving the second gun rides lower, at the hip, so both stay readable.
  walk:[[[46,-112],[32,-88]],[[47,-110],[34,-86]],[[48,-113],[36,-88]],[[52,-120],[38,-94]],[[47,-112],[34,-87]],[[46,-110],[33,-86]]],
  crouch:[[[42,-88],[30,-66]],[[62,-94],[48,-72]]],
  rise:[[76,-112],[64,-100]],fall:[[72,-102],[60,-92]]
 };
 const EYES={stand:[23,-164],walk:[[35,-157],[40,-157],[42,-156],[34,-157],[39,-155],[40,-155]],crouch:[[31,-120],[46,-125]],rise:[41,-146],fall:[52,-130]};
 // Which drawing the robot is in. Pure: the renderer, the weapons and the
 // muzzles all read the same answer, so guns stay in the fists in every pose.
 function pose(p,encounter){
  const moving=Math.abs(p.vx||0)>8;
  if(p.crouching){const i=moving?1:0;return{name:'crouch',row:1,col:2+i,fists:FISTS.crouch[i],eye:EYES.crouch[i]};}
  if(p.grounded===false)return p.vy<0?{name:'rise',row:1,col:4,fists:FISTS.rise,eye:EYES.rise,lift:35}:{name:'fall',row:1,col:5,fists:FISTS.fall,eye:EYES.fall};
  if(moving){const col=Math.floor((((p.walkCycle||0)%1)+1)%1*COLS);return{name:'walk',row:0,col,fists:FISTS.walk[col],eye:EYES.walk[col]};}
  return{name:'stand',row:2,col:0,fists:FISTS.stand,eye:EYES.stand};
 }
 // Fist positions in game pixels from the feet, x measured forward.
 function hands(p,encounter){const q=pose(p,encounter),lift=(q.lift||0)*SCALE;return q.fists.map(([x,y])=>({x:x*SCALE,y:y*SCALE-lift}));}
 function eye(p,encounter){const q=pose(p,encounter);return{x:q.eye[0]*SCALE,y:q.eye[1]*SCALE-(q.lift||0)*SCALE};}
 // Breathing at rest, a stride bob, a squash on landing and a kick when firing.
 function motion(p,encounter){
  const fired=encounter?.weaponAction&&encounter.weaponAction.age<.09?1-encounter.weaponAction.age/.09:0;
  if(p.landing>0)return{stretch:1-.08*Math.min(1,p.landing/.24),bob:0,kick:fired};
  if(p.grounded===false||p.crouching)return{stretch:1,bob:0,kick:fired};
  if(Math.abs(p.vx||0)>8)return{stretch:1,bob:-Math.abs(Math.sin((p.walkCycle||0)*Math.PI*2))*1.2,kick:fired};
  return{stretch:1+Math.sin((p.anim||0)*2.2)*.012,bob:0,kick:fired};
 }
 function setSheet(image){
  sheet=image;frames=[];const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);const data=g.getImageData(0,0,c.width,c.height).data;
  const cw=c.width/COLS,ch=c.height/ROWS,opaque=(x,y)=>data[(y*c.width+x)*4+3]>=200;
  for(let row=0;row<ROWS;row++){const list=[];for(let col=0;col<COLS;col++){
   const x0=Math.round(col*cw),x1=Math.round((col+1)*cw),floor=Math.round(row*ch+FLOORS[row]*ch/CELL),ceiling=row?Math.round((row-1)*ch+FLOORS[row-1]*ch/CELL)+1:0;
   let l=x1,r=x0,t=floor,b=ceiling;for(let y=ceiling;y<=floor;y++)for(let x=x0;x<x1;x++)if(opaque(x,y)){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
   // `lift` is how far the soles are above the floor line (a jump drawn in mid-air).
   list.push([l,t,r-l+1,b-t+1,floor-b]);}frames.push(list);}
  root.ArcadeFormTransition?.setEndpoint('robot',sheet,frames[1][0].slice(0,4),HEIGHT);return sheet;
 }
 function load(){if(sheet&&mobility)return Promise.resolve(sheet);if(loading)return loading;loading=Promise.all(['assets/sprites/robot-soldado-v2.png','assets/sprites/robot-movilidad-v2.png'].map((path,index)=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>{const image=root.prepareWhiteDeath(i);if(index){mobility=image;mobilityFrames=root.ArcadeAdvancedForms.atlas(image,4,3);}else setSheet(image);resolve(image);};i.onerror=()=>{loading=null;reject(Error(path));};i.src=path;}))).then(()=>sheet);return loading;}
 function movement(c,p){if(!mobility||!p.swimming&&!p.onMotorcycle)return false;const i=p.crash>0?8+Math.min(3,Math.floor((p.crashAge||0)/.55)):p.onMotorcycle?4+(p.grounded===false?2:p.landing>0?3:p.roadBoost?1:0):Math.floor((p.anim||0)*8)%4,f=mobilityFrames[i],k=(p.onMotorcycle?104:94)/mobilityFrames[p.onMotorcycle?4:0][2];c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(p.x),Math.round(p.y));c.scale(p.facing||1,1);c.drawImage(mobility,...f,-Math.round(f[2]*k/2),-Math.round(f[3]*k),Math.round(f[2]*k),Math.round(f[3]*k));c.restore();return true;}
 function icon(){return sheet&&{image:sheet,frame:frames[1][0].slice(0,4)};}
 // Draws one frame with its soles on the floor line, mirrored around the cell centre.
 function blit(c,f,col,stretch=1){const cw=sheet.width/COLS,x=Math.round((f[0]-col*cw-cw/2)*SCALE),h=Math.round(f[3]*SCALE*stretch),lift=Math.round((f[4]||0)*SCALE);c.drawImage(sheet,f[0],f[1],f[2],f[3],x,-h-lift,Math.round(f[2]*SCALE),h);}
 function transition(c,p,t){if(!sheet||t<.18||t>.88)return false;const progress=(t-.18)/.7,col=Math.min(5,Math.floor((p.form==='robot'?progress:1-progress)*6));c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(p.x),Math.round(p.y));c.scale(p.facing,1);blit(c,frames[3][col],col);c.restore();return true;}
 function draw(c,p,encounter){
  if(p.form!=='robot'||!sheet)return false;if(movement(c,p))return true;
  const q=pose(p,encounter),m=motion(p,encounter),f=frames[q.row][q.col];
  c.save();c.imageSmoothingEnabled=false;
  if(p.grounded!==false){c.fillStyle='#10161a55';c.fillRect(Math.round(p.x)-15,Math.round(p.y),30,2);c.fillRect(Math.round(p.x)-10,Math.round(p.y)+2,20,1);}
  c.translate(Math.round(p.x)-Math.round(m.kick*1.5)*(p.facing||1),Math.round(p.y+m.bob));c.scale(p.facing||1,1);blit(c,f,q.col,m.stretch);
  // The optic burns steadily and flares when the guns fire.
  const e=eye(p,encounter),pulse=Math.floor((p.anim||0)*6)%5===0;c.fillStyle='#ff3b2a';c.fillRect(Math.round(e.x)-1,Math.round(e.y*m.stretch)-1,3,2);c.fillStyle=m.kick>0||pulse?'#ffd9c9':'#ff8a6a';c.fillRect(Math.round(e.x),Math.round(e.y*m.stretch)-1,1,1);
  c.restore();return true;
 }
 // Light sources for the scene's light map: the optic, brighter while firing.
 function lights(p,encounter){if(p.form!=='robot')return[];const e=eye(p,encounter),hot=encounter?.flash>0;return[{x:p.x+e.x*(p.facing||1),y:p.y+e.y,r:hot?70:42,a:.6,glow:'255,80,60',ga:hot?.22:.12}];}
 function secondary(inv){const guns=inv.owned.filter(n=>n>=3);return guns.includes(inv.secondary)?inv.secondary:guns.includes(inv.selected)?inv.selected:guns[0];}
 function cycle(inv){const guns=inv.owned.filter(n=>n>=3).sort((a,b)=>a-b);if(!guns.length)return;inv.secondary=guns[(guns.indexOf(secondary(inv))+1)%guns.length];return inv.secondary;}
 function installDock(player,encounter,onSave){const dock=document.getElementById('weapon-slots');if(!dock)return;const b=document.createElement('button');b.className='secondary';b.type='button';b.id='robot-second-weapon';b.onclick=()=>{cycle(encounter.inventory);onSave?.();refresh();document.querySelector('canvas[tabindex]')?.focus();};dock.after(b);function refresh(){b.hidden=player.form!=='robot';const slot=secondary(encounter.inventory);b.textContent='Brazo secundario: '+(root.ArcadeArsenal.weapons[slot]?.name||'sin arma')+' · '+(encounter.inventory.ammo[slot]||0)+' balas · L / Cambiar';}refresh();return refresh;}
 const api={SCALE,FLOORS,FISTS,pose,hands,eye,motion,lights,movement,load,setSheet,icon,draw,transition,secondary,cycle,installDock};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeRobotForm=api;
})(typeof window!=='undefined'?window:globalThis);
