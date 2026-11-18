const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),T=require('../form-transition'),Z=require('../zombie-form'),P=require('../physics');
test('all six transformations follow their own pair, reverse every intermediate and end in the real target',()=>{
 for(const [a,b]of T.PAIRS){const sequences=[];for(const [from,to]of [[a,b],[b,a]]){const p={form:to,transformFrom:from,transform:1.2};assert.equal(T.pose(p).endpoint,from);const frames=[];for(let i=0;i<6;i++){p.transform=1.2*(1-(.07+(i+.5)*.85/6));const q=T.pose(p);assert.equal(q.row,T.PAIRS.findIndex(pair=>pair.includes(a)&&pair.includes(b)));frames.push(q.frame);}sequences.push(frames);p.transform=.001;assert.equal(T.pose(p).endpoint,to);p.transform=0;assert.equal(T.pose(p),null);}assert.deepEqual(sequences[0],sequences[1].reverse());}
 assert.equal(T.pose({form:'wolf',transformFrom:'wolf',transform:1}),null);
});
test('rendering keeps opaque feet anchored in both directions without changing player state',()=>{
 const oldDocument=global.document,pixels=new Uint8ClampedArray(60*40*4).fill(255);
 try{global.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})})};T.setSheet({width:60,height:40});}finally{global.document=oldDocument;}
 for(const form of ['soldier','zombie','wolf'])T.setEndpoint(form,{},[0,0,30,60]);
 for(const [from,to]of T.PAIRS.flatMap(([a,b])=>[[a,b],[b,a]]))for(const facing of [-1,1])for(const transform of [1.2,.95,.6,.2,.001]){
  const p={form:to,transformFrom:from,transform,facing,x:120,y:620},before=JSON.stringify(p);let calls=0;
  const c={globalAlpha:1,save(){},restore(){},translate(x,y){assert.equal(x,120);assert.equal(y,620);},scale(x,y){assert.equal(x,facing);assert.equal(y,1);},fillRect(){},drawImage(...args){calls++;const r=args.slice(-4);assert.ok(r.every(Number.isInteger));assert.equal(r[1]+r[3],0);assert.equal(this.imageSmoothingEnabled,false);assert.equal(this.globalAlpha,1);}};
  assert.equal(T.draw(c,p),true);assert.equal(calls,1);assert.equal(JSON.stringify(p),before);
 }
});
test('visual transitions preserve the five second lock, health, ammunition and world position',()=>{
 for(const [from,to]of T.PAIRS.flatMap(([a,b])=>[[a,b],[b,a]])){const p=Object.assign(P.createPlayer(),{form:from,zombieUnlocked:true}),e={hp:7,won:true,inventory:{ammo:{3:27}}},before={x:p.x,y:p.y,hp:e.hp,ammo:e.inventory.ammo[3]};assert.equal(Z.change(e,p,to),true);assert.equal(p.transform,1.2);assert.equal(p.formCooldown,5);assert.equal(p.transformFrom,from);assert.equal(Z.change(e,p,from),false);assert.deepEqual({x:p.x,y:p.y,hp:e.hp,ammo:e.inventory.ammo[3]},before);}
});
test('both missions preload and route the shared transformation sprites',()=>{
 for(const page of ['index.html','level-two.html']){const source=fs.readFileSync(page,'utf8');assert.ok(source.indexOf('form-transition.js')<source.indexOf('zombie-form.js'));}
 for(const runtime of ['game.js','level-two-game.js']){const source=fs.readFileSync(runtime,'utf8');assert.match(source,/transformaciones-jugador-v3\.png/);assert.match(source,/ArcadeFormTransition\?\.setSheet/);assert.match(source,/ArcadeZombieForm.drawPlayer/);}
 const main=fs.readFileSync('game.js','utf8');assert.equal(Number(main.match(/ArcadeLoading\?\.begin\((\d+),loadLevel\)/)[1]),[...main.matchAll(/imageLoad\(/g)].length-1);
});
