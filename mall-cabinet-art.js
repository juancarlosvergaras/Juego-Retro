(function(root){
 'use strict';
 // Machine graphics are rasterized at 240×270 and shown with nearest-neighbour scaling.
 const buffers=new WeakMap();
 const amber='#ffcf68',white='#e6f5ed',ink='#0a1021',aqua='#59f5d0';
 const palettes={maze:['#0d1832','#4272ae','#60f7ca'],pinball:['#211734','#974c8a','#ffc76a'],race:['#131d32','#5a849b','#ffb958']};
 function rect(c,col,x,y,w,h){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 function line(c,col,w,points){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.stroke();}
 function poly(c,col,points){c.fillStyle=col;c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();c.fill();}
 function label(c,text,x,y,col,size=14,align='center'){c.fillStyle=col;c.font='bold '+size+'px monospace';c.textAlign=align;c.fillText(text,x,y);}
 const figures={
  bot:['   22    ','  2112   ',' 233332  ','23344332 ','23544532 ',' 233332  ','  2662   '],
  eye:['   11    ',' 122221  ','12233221 ','12344321 ','12233221 ',' 122221  ',' 113311  ',' 1    1  '],
  car:[
   '    11111111    ','   1222222221   ','  132223322231  ',' 13222233222231 ',
   ' 12222233222221 ','1122122332212211','1122122332212211','1122222222222211',
   ' 12444444444421 ','1244455555444421','1244555554444421',' 12444444444421 ',
   ' 12222233222221 ',' 12222233222221 ',' 12222233222221 ',' 12222233222221 ',
   '1124444444444211','1124455554444211','1122444444442211','1122222222222211',
   ' 16222233222261 ',' 16622233222661 ',' 12211111111221 ','  111111111111  '
  ]
 };
 function sprite(c,key,palette,x,y,k){
  const pattern=figures[key];
  for(let r=0;r<pattern.length;r++)for(let j=0;j<pattern[r].length;j++){
   const n=Number(pattern[r][j]);if(n)rect(c,palette[n-1],x+j*k,y+r*k,k,k);
  }
 }
 function runner(c,s,n,enemy,index){
  const t=Math.floor(s.time*9)%8;
  const progress=n.prevX===undefined?1:Math.min(1,(s.time-(n.movedAt||0))/(enemy?.28:.13));
  const x=18+26*((n.prevX??n.x)+(n.x-(n.prevX??n.x))*progress)+1;
  const y=86+26*((n.prevY??n.y)+(n.y-(n.prevY??n.y))*progress)+3;
  const colors=enemy?[ink,['#ea6478','#d888c3','#f4a44d'][index],white,'#8c243f']:['#09242e','#297b80','#58dbc1','#163445',white,amber];
  sprite(c,enemy?'eye':'bot',colors,x,y,2.6);
  const lift=[0,1,2,1,0,-1,-2,-1][t];
  rect(c,colors[1],x+3,y+19+lift,6,3);rect(c,colors[2],x+13,y+19-lift,5,3);
 }
 function mazeDraw(c,s,map){
  const cell=26,ox=18,oy=86;
  rect(c,'#070d20',9,75,462,360);
  for(let y=0;y<map.length;y++)for(let x=0;x<map[y].length;x++){
   const px=ox+x*cell,py=oy+y*cell;
   if(map[y][x]==='#'){
    rect(c,'#172c50',px,py,26,26);
    for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
     if(map[y+dy]?.[x+dx]==='#')continue;
     const hx=px+(dx>0?23:0),hy=py+(dy>0?23:0);
     rect(c,'#368bc1',hx,hy,dx?3:26,dy?3:26);
     rect(c,'#79e2ff',hx+1,hy+1,dx?1:22,dy?1:22);
    }
    if((x+y*3)%6===0){rect(c,'#284771',px+9,py+9,8,6);rect(c,'#7796b4',px+11,py+10,2,2);}
   }else if(s.dots.has(x+','+y)){
    rect(c,'#ac6b3f',px+9,py+10,9,6);rect(c,amber,px+10,py+9,7,4);rect(c,'#fff0ac',px+11,py+9,2,2);
   }
  }
  s.sentries.forEach((n,i)=>runner(c,s,n,true,i));
  if(s.safe<=0||Math.floor(s.time*9)%2===0)runner(c,s,s,false,0);
  label(c,'C I R C U I T O   F U G I T I V O',240,64,aqua,16);
  label(c,'CIRCUITOS   '+String(s.dots.size).padStart(3,'0'),124,470,white);
  label(c,'TIEMPO   '+Math.ceil(Math.max(0,150-s.time)),354,470,amber);
  rect(c,'#203757',27,493,426,5);rect(c,'#53c5b3',27,493,426*Math.max(0,1-s.time/150),5);
 }
 function orb(c,x,y,r,color){
  const disk=(dx,dy,rad,col)=>{const pts=Array.from({length:12},(_,i)=>[x+dx+Math.cos(i*Math.PI/6)*rad,y+dy+Math.sin(i*Math.PI/6)*rad]);poly(c,col,pts);};
  disk(0,3,r+3,'#080f25');disk(0,0,r,'#71859d');disk(0,-1,r-3,white);disk(0,0,r-6,color);disk(-2,-2,r*.43,'#402f5b');
  rect(c,white,x-r*.4,y-r*.64,r*.48,3);
 }
 function pinDraw(c,s,flipper){
  rect(c,'#100f26',24,38,432,492);
  for(let i=0;i<60;i++){const x=33+(i*83)%405,y=48+(i*101)%445;rect(c,i%4?'#69566e':'#d7c08e',x,y,i%4?2:4,2);}
  line(c,'#775581',6,[[35,321],[35,75],[75,41],[400,41],[445,89],[445,322]]);
  line(c,'#ffc36b',2,[[39,321],[39,77],[77,46],[396,46],[441,91],[441,322]]);
  for(let i=0;i<4;i++){
   const pts=Array.from({length:31},(_,n)=>{const a=n*Math.PI/15;return [236+Math.cos(a)*(57+i*12),239+Math.sin(a)*(120+i*8)+Math.cos(a)*29];});
   line(c,i===2?'#985d91':'#453854',2,pts);
  }
  label(c,'Ó R B I T A',240,100,'#e2b1cf',22);
  line(c,'#6e6783',4,[[422,463],[422,326],[431,289]]);
  for(let i=0;i<6;i++)rect(c,i===Math.floor(s.time*6)%6?amber:'#8b6b73',59+i*13,305+i*7,6,3);
  for(const x of [47,431])for(const y of [90,321,486]){rect(c,'#beb6bb',x,y,5,5);rect(c,'#2b2a41',x+1,y+2,3,1);}
  for(const [i,b] of s.bumpers.entries()){orb(c,b.x,b.y,b.r,s.lit===i&&s.flash>0?'#fff2a8':'#d86f9f');label(c,'✦',b.x,b.y+5,amber,17);}
  for(const sign of [-1,1]){
   const x=240+sign*192,end=240+sign*129;
   poly(c,'#643854',[[x,345],[end,454],[x,454]]);
   line(c,'#dc95bb',5,[[x,345],[end,454]]);
   for(let j=0;j<3;j++)rect(c,'#ffa85e',x-sign*(9+j*9),389+j*14,4,4);
   const f=flipper(s,sign<0);
   line(c,'#462b49',17,[[f.x,f.y+3],[f.tipX,f.tipY+3]]);
   line(c,amber,13,[[f.x,f.y],[f.tipX,f.tipY]]);
   line(c,'#fff0a8',3,[[f.x,f.y-4],[f.tipX,f.tipY-4]]);
   rect(c,'#624162',f.x-3,f.y-3,6,6);
  }
  rect(c,'#526879',425,465,20,5);for(let i=0;i<5;i++)rect(c,'#87aab2',430,477+i*6,12,2);
  orb(c,s.ball.x,s.ball.y,9,'#b7dfec');
  label(c,s.ready?'LANZAR BOLA':'META  1000',240,509,s.ready?aqua:white,13);
 }
 function raceDraw(c,s){
  rect(c,'#283652',0,36,480,504);
  for(let side=0;side<2;side++)for(let i=-1;i<8;i++){
   const x=side?431:0,y=i*88+s.distance%88;
   rect(c,'#172539',x,y,48,78);rect(c,'#405068',x+4,y+6,38,54);
   for(let j=0;j<3;j++)rect(c,j%2?'#b78065':'#78b7b2',x+8+j*10,y+12,5,3);
   rect(c,'#101e31',x+11,y+25,25,23);rect(c,'#4c6571',x+13,y+26,20,3);
  }
  rect(c,'#34404a',54,37,372,503);
  for(let i=-1;i<16;i++){const y=Math.floor(i*44+s.distance%44);for(const x of [48,424]){rect(c,'#ebe0bd',x,y,8,22);rect(c,'#d47669',x,y+22,8,22);}}
  for(let lane=1;lane<5;lane++)for(let y=-80;y<540;y+=90)rect(c,'#9da9a2',52+lane*75,y+s.distance%90,3,32);
  const car=(x,y,body,steer=0)=>{
   c.save();c.translate(Math.round(x),Math.round(y));c.rotate(steer*.075);
   sprite(c,'car',['#101927',body,'#f9d88c','#34485e','#a7dddf','#bc5255'],-24,-36,3);
   if(s.speed>200){const flame=[2,5,3,7,4,6,3,4][Math.floor(s.time*14)%8];rect(c,amber,-13,36,3,flame);rect(c,'#ed9654',9,36,3,flame);}
   c.restore();
  };
  for(const n of s.cars)car(n.x,n.y,['#d47765','#af83b3','#dba749'][n.color]);
  if(s.safe<=0||Math.floor(s.time*12)%2)car(s.x,430,'#52c4a3',s.steer);
  rect(c,'#111e32',68,48,134,24);label(c,Math.round(s.speed)+' km/h',80,65,amber,14,'left');
  rect(c,'#101a28',270,52,134,9);rect(c,aqua,272,54,130*Math.min(1,s.distance/9000),5);
 }
 function paint(c,s,map,flipper){
  const [bg,trim,accent]=palettes[s.kind];rect(c,bg,0,0,480,540);
  if(s.kind==='maze')mazeDraw(c,s,map);
  else if(s.kind==='pinball')pinDraw(c,s,flipper);
  else raceDraw(c,s);
  rect(c,'#0a1021',0,0,480,36);rect(c,trim,0,32,480,3);
  label(c,'1UP',15,22,accent,15,'left');label(c,String(s.score).padStart(6,'0'),55,22,white,18,'left');
  label(c,'VIDAS',367,22,accent,14,'right');
  for(let i=0;i<s.lives;i++)poly(c,amber,[[378+i*25,24],[386+i*25,9],[394+i*25,24]]);
  if(s.over){rect(c,'#091526',40,210,400,103);rect(c,accent,40,210,400,3);label(c,s.won?'¡RETO COMPLETADO!':'FIN DE PARTIDA',240,253,accent,24);label(c,s.score+' PUNTOS',240,288,white,18);}
 }
 function draw(c,s,map,flipper){
  let buffer=buffers.get(c);
  if(!buffer){buffer=document.createElement('canvas');buffer.width=240;buffer.height=270;buffers.set(c,buffer);}
  const g=buffer.getContext('2d');g.save();g.scale(.5,.5);paint(g,s,map,flipper);g.restore();
  c.save();c.imageSmoothingEnabled=false;c.drawImage(buffer,0,0,480,540);c.restore();
 }
 root.ArcadeMallCabinetArt={draw};
})(window);
