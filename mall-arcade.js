(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // Original circuit layout, robot courier and square sentries: no borrowed characters or board.
 const maze=['#################','#...#.......#...#','#.#.#.#####.#.#.#','#.#...#...#...#.#','#.###.#.#.###.#.#','#.....#.#.....#.#','###.###.###.###.#','#...#.......#...#','#.#.#.###.#.#.#.#','#.#...#...#...#.#','#.#####.#####.#.#','#...............#','#################'];
 const titles={maze:'Circuito Fugitivo',pinball:'Órbita de Acero',race:'Ruta Neón'};
 function create(kind){if(!titles[kind])throw Error('Juego desconocido');const s={kind,time:0,score:0,lives:3,over:false,won:false,wait:0,seed:7301,flash:0};if(kind==='maze'){s.x=s.prevX=1;s.y=s.prevY=1;s.dir={x:0,y:0};s.dots=new Set();maze.forEach((r,y)=>[...r].forEach((v,x)=>{if(v==='.')s.dots.add(x+','+y);}));s.dots.delete('1,1');s.sentries=[{x:15,y:1},{x:15,y:11},{x:7,y:7}];s.enemyWait=.4;s.safe=2;s.moveWait=0;}else if(kind==='pinball'){s.ball={x:435,y:470,vx:0,vy:0};s.ready=true;s.bumpers=[{x:150,y:160,r:28},{x:310,y:160,r:28},{x:230,y:265,r:34}];s.left=false;s.right=false;s.bumpWait=0;}else{s.x=240;s.speed=140;s.distance=0;s.cars=[];s.spawn=1.2;s.safe=0;}return s;}
 function rand(s){s.seed=(s.seed*1664525+1013904223)>>>0;return s.seed/4294967296;}
 function mazeStep(s,i,dt){s.safe=Math.max(0,s.safe-dt);s.moveWait-=dt;s.enemyWait-=dt;const desired=i.left?{x:-1,y:0}:i.right?{x:1,y:0}:i.up?{x:0,y:-1}:i.down?{x:0,y:1}:null;const open=(x,y)=>maze[y]?.[x]==='.';if(desired)s.want=desired;if(s.moveWait<=0){if(s.want&&open(s.x+s.want.x,s.y+s.want.y))s.dir=s.want;if(open(s.x+s.dir.x,s.y+s.dir.y)){s.prevX=s.x;s.prevY=s.y;s.movedAt=s.time;s.x+=s.dir.x;s.y+=s.dir.y;const key=s.x+','+s.y;if(s.dots.delete(key))s.score+=10;}s.moveWait=.14;}
  if(s.enemyWait<=0){for(const n of s.sentries){const choices=[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>({x:n.x+x,y:n.y+y})).filter(p=>open(p.x,p.y));choices.sort((a,b)=>Math.abs(a.x-s.x)+Math.abs(a.y-s.y)-Math.abs(b.x-s.x)-Math.abs(b.y-s.y));const next=choices[Math.min(choices.length-1,rand(s)<.23?1:0)];if(next)Object.assign(n,{prevX:n.x,prevY:n.y,movedAt:s.time},next);}s.enemyWait=.39;}
  if(s.safe<=0&&s.sentries.some(n=>n.x===s.x&&n.y===s.y)){s.lives--;s.safe=2;s.x=s.prevX=1;s.y=s.prevY=1;s.dir={x:0,y:0};s.want=null;s.flash=.5;}
  if(!s.dots.size){s.won=true;s.over=true;}if(s.lives<=0||s.time>=150)s.over=true;
 }
 function flipper(s,left){
  const x=left?110:370,y=450,t=(left?s.leftLift:s.rightLift)||0;
  const angle=.21-.60*t,dir=left?1:-1;
  return {x,y,tipX:x+dir*Math.cos(angle)*111,tipY:y+Math.sin(angle)*111};
 }
 function pinStep(s,i,dt){s.left=!!(i.left||i.fire);s.right=!!(i.right||i.kick);for(const [key,raised] of [['leftLift',s.left],['rightLift',s.right]]){
   s[key]=clamp((s[key]||0)+(raised?15:-9)*dt,0,1);
  }
  s.bumpWait=Math.max(0,s.bumpWait-dt);const b=s.ball;if(s.ready){if(i.jumpPressed||i.up||i.fire){s.ready=false;b.vx=-105;b.vy=-700;}return;}
  b.vy+=410*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<30){b.x=30;b.vx=Math.abs(b.vx)*.95;}if(b.x>450){b.x=450;b.vx=-Math.abs(b.vx)*.95;}if(b.y<40){b.y=40;b.vy=Math.abs(b.vy);}
  for(const bumper of s.bumpers){const dx=b.x-bumper.x,dy=b.y-bumper.y,d=Math.hypot(dx,dy)||1;if(d<bumper.r+8){const nx=dx/d,ny=dy/d,dot=b.vx*nx+b.vy*ny;b.x=bumper.x+nx*(bumper.r+9);b.y=bumper.y+ny*(bumper.r+9);b.vx=clamp(b.vx-2*dot*nx+nx*140,-500,500);b.vy=clamp(b.vy-2*dot*ny+ny*140,-750,650);if(s.bumpWait<=0){s.score+=100;s.lit=s.bumpers.indexOf(bumper);s.bumpWait=.12;s.flash=.2;}}}
  // Side gutters guide the ball toward the two independent flippers.
  if(b.y>345&&b.y<454){const left=48+(b.y-345)*.58,right=432-(b.y-345)*.58;if(b.x<left){b.x=left;b.vx=Math.abs(b.vx)*.7+35;}if(b.x>right){b.x=right;b.vx=-Math.abs(b.vx)*.7-35;}}
  for(const left of [true,false]){
   const f=flipper(s,left),u=(b.x-f.x)/(f.tipX-f.x);
   if(u<0||u>1||b.vy<=0)continue;
   const surface=f.y+(f.tipY-f.y)*u,dy=b.y-surface;
   if(dy < -16||dy>12)continue;
   b.y=surface-14;
   if(left?s.left:s.right){b.vy=-480-120*u;b.vx=(left?1:-1)*(75+120*u);s.score+=25;}
   else{b.vy=-Math.abs(b.vy)*.28;b.vx+=(left?1:-1)*24;}
  }
  if(b.y>535){s.lives--;s.ball={x:435,y:470,vx:0,vy:0};s.ready=true;}if(s.lives<=0||s.time>=100){s.over=true;s.won=s.score>=1000;}
 }
 function raceStep(s,i,dt){s.safe=Math.max(0,s.safe-dt);s.speed=clamp(s.speed+(i.down?-200:i.up?120:25)*dt,90,300);s.steer=(i.right?1:0)-(i.left?1:0);s.x=clamp(s.x+s.steer*260*dt,78,402);s.distance+=s.speed*dt;s.score=Math.floor(s.distance/12);s.spawn-=dt;if(s.spawn<=0){s.spawn=.8+rand(s)*.7;s.cars.push({x:90+Math.floor(rand(s)*5)*75,y:-60,color:Math.floor(rand(s)*3)});}for(const car of s.cars){car.y+=(s.speed+50)*dt;if(s.safe<=0&&Math.abs(car.x-s.x)<35&&Math.abs(car.y-430)<59){s.lives--;s.safe=1.3;s.speed=95;s.flash=.4;car.y=600;}}s.cars=s.cars.filter(c=>c.y<610);if(s.distance>=9000){s.over=true;s.won=true;s.score+=500;}if(s.lives<=0)s.over=true;}
 function update(s,i,dt){if(s.over)return;s.time+=dt;dt=clamp(dt,0,.033);s.flash=Math.max(0,s.flash-dt);if(s.kind==='maze')mazeStep(s,i,dt);else if(s.kind==='pinball')pinStep(s,i,dt);else raceStep(s,i,dt);}
 function draw(c,s){root.ArcadeMallCabinetArt.draw(c,s,maze,flipper);}
 const api={create,update,draw,titles,maze,flipper};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMallArcade=api;
})(typeof window!=='undefined'?window:globalThis);
