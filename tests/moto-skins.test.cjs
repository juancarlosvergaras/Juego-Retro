const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8'),art=name=>png(path.join(root,'assets/sprites',name));
function png(file){const bytes=fs.readFileSync(file),width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),chunks=[];assert.equal(bytes[24],8);assert.equal(bytes[25],6);for(let p=8;p<bytes.length;){const n=bytes.readUInt32BE(p);if(bytes.toString('ascii',p+4,p+8)==='IDAT')chunks.push(bytes.subarray(p+8,p+8+n));p+=n+12;}const raw=zlib.inflateSync(Buffer.concat(chunks)),stride=width*4,data=new Uint8ClampedArray(stride*height);let p=0;for(let y=0;y<height;y++){const filter=raw[p++];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?data[i-4]:0,u=y?data[i-stride]:0,b=y&&x>=4?data[i-stride-4]:0;let n=0;if(filter===1)n=a;if(filter===2)n=u;if(filter===3)n=Math.floor((a+u)/2);if(filter===4){const v=a+u-b,pa=Math.abs(v-a),pu=Math.abs(v-u),pb=Math.abs(v-b);n=pa<=pu&&pa<=pb?a:pu<=pb?u:b;}data[i]=(raw[p++]+n)&255;}}return{width,height,data};}
// Cuenta píxeles opacos de un recuadro que cumplen una condición de color.
function count(image,[x0,y0,x1,y1],pick){let n=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*image.width+x)*4;if(image.data[i+3]>200&&pick(image.data[i],image.data[i+1],image.data[i+2]))n++;}return n;}
const sickGreen=(r,g,b)=>g>90&&g>r*1.15&&g>b*1.4,blood=(r,g,b)=>r>150&&g<80&&b<80,cyan=(r,g,b)=>b>190&&g>190&&r<190,pale=(r,g,b)=>Math.min(r,g,b)>120&&Math.max(r,g,b)-Math.min(r,g,b)<70;
const CELL=418,before=art('motos-personajes-acciones-v1.png'),after=art('motos-personajes-acciones-v2.png');
// El jinete ocupa la celda salvo la franja izquierda, donde está la luz trasera de la moto.
const rider=row=>[CELL+70,row*CELL,2*CELL,(row+1)*CELL];

test('the zombie on the bike wears the palette of the zombie on foot',()=>{
 for(let row=0;row<3;row++){
  const green=[count(before,rider(row),sickGreen),count(after,rider(row),sickGreen)],red=[count(before,rider(row),blood),count(after,rider(row),blood)],skin=[count(before,rider(row),pale),count(after,rider(row),pale)];
  assert.ok(green[0]>2000,'the old art was bright green (row '+row+'): '+green[0]);
  assert.ok(green[1]<green[0]*.03,'no bright green skin left in row '+row+': '+green);
  // What red remains is the bike's own: the marks on the saddlebag.
  assert.ok(red[1]<red[0]*.3,'no red sores or red eyes in row '+row+': '+red);
  assert.ok(skin[1]>skin[0]+1200,'pale skin in row '+row+': '+skin);
  assert.ok(count(after,rider(row),cyan)>=15,'cyan eyes in row '+row+': '+count(after,rider(row),cyan));
 }
 // The lightning in his hand is the cyan of his eyes, not acid green.
 const hand=[CELL+318,2*CELL,2*CELL,3*CELL];assert.ok(count(after,hand,cyan)>150,'cyan lightning: '+count(after,hand,cyan));
 // On foot he is pale with cyan eyes: the reference this test measures against.
 const foot=art('zombi-soldado-v1.png'),first=[0,0,209,209];assert.ok(count(foot,first,sickGreen)<60,'on foot he is not green either: '+count(foot,first,sickGreen));assert.ok(count(foot,first,cyan)>=6);assert.ok(count(foot,first,pale)>150);
});
test('repainting the zombie did not touch the wolf, the robot or the bikes',()=>{
 assert.equal(after.width,before.width);assert.equal(after.height,before.height);
 for(let y=0;y<before.height;y+=3)for(const [x0,x1] of [[0,CELL],[2*CELL,3*CELL]])for(let x=x0;x<x1;x+=3){const i=(y*before.width+x)*4;for(let k=0;k<4;k++)if(before.data[i+k]!==after.data[i+k])assert.fail('pixel '+x+','+y+' changed');}
 // The bike under the zombie keeps its olive paint and its star.
 const tank=[CELL+215,215,CELL+300,260],star=(r,g,b)=>r>235&&g>235&&b>235;assert.equal(count(after,tank,star),count(before,tank,star));
});
test('no crash frame crosses into the next cell, and the fallen zombie matches too',()=>{
 const sheet=art('caidas-carretera-v3.png'),cuts=[0,.27,.52,.765,1],cw=sheet.width/4,any=()=>true;
 for(let row=0;row<4;row++){const y0=Math.round(sheet.height*cuts[row]),y1=Math.round(sheet.height*cuts[row+1]);
  for(let col=0;col<4;col++){const x0=Math.round(col*cw),x1=Math.round((col+1)*cw);
   assert.ok(count(sheet,[x0+3,y0,x1-3,y1],any)>8000,'frame '+row+','+col+' has its art');
   assert.equal(count(sheet,[x0,y0,x0+3,y1],any)+count(sheet,[x1-3,y0,x1,y1],any),0,'frame '+row+','+col+' stays inside its cell');}}
 const y0=Math.round(sheet.height*cuts[1]),y1=Math.round(sheet.height*cuts[2]),row=[0,y0,sheet.width,y1];
 const old=art('caidas-carretera-v2.png'),oldRow=[0,y0,old.width,y1];
 assert.ok(count(old,oldRow,sickGreen)>4000);assert.ok(count(sheet,row,sickGreen)<120,'fallen zombie is not green: '+count(sheet,row,sickGreen));
 assert.ok(count(sheet,row,blood)<count(old,oldRow,blood)*.3);assert.ok(count(sheet,row,pale)>count(old,oldRow,pale)+4000);assert.ok(count(sheet,row,cyan)>=100);
 // The old sheet let the thrown rider's hand spill into the second frame.
 const edge=Math.round(old.width/4);assert.ok(count(old,[edge,y0,edge+3,y1],any)>0,'the defect this sheet fixes');
});
test('mission 4 rides, falls and shows its cards with the unified skins',()=>{
 const game=read('level-four-game.js'),renderer=read('road-renderer.js');
 assert.ok(game.includes("actions:'assets/sprites/motos-personajes-acciones-v2.png'"));assert.ok(game.includes("crashes:'assets/sprites/caidas-carretera-v3.png'"));
 assert.ok(!game.includes('acciones-v1')&&!game.includes('caidas-carretera-v2'));
 // The character cards use the same art the player rides, not the old green zombie or the bare chrome robot.
 assert.ok(game.includes("zombie:own('actions',renderer.actions,1)"));assert.ok(game.includes("robot:own('mounted',renderer.mounted,0)"));assert.ok(game.includes("fighter=own('mounted',renderer.mounted,4)"));
 assert.ok(renderer.includes('riders,actions,mounted,crashes,rig'),'the renderer exposes the sheets the cards need');
 // Soldier and robot have no crash art of their own: both tumble with the bike they ride.
 assert.ok(renderer.includes("wipeout(c,images.mounted,mounted[0],x,p.lane,104,s.crashAge)"));assert.ok(renderer.includes("wipeout(c,images.riders,riders[0],x,p.lane,104,s.crashAge)"));
});
