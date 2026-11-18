(function(root){
  'use strict';
  const R=root.FugaRoad,W=960,H=540,tiles={hero:0,boss:1,sedan:2,turret:3,truck:4,traffic:5};
  const names=['BAHÍA COBALTO','VIADUCTO SUR','PASO DEL SOL'];
  function create(c,art){
    function scenery(index,p,meters){
      const w=p.k*meters,h=w*224/256;
      c.drawImage(art.verge,index%2*256,Math.floor(index/2)*224,256,224,p.x-w/2,p.y-h,w,h);
    }
    function poly(color,coords){c.fillStyle=color;c.beginPath();c.moveTo(coords[0],coords[1]);for(let i=2;i<coords.length;i+=2)c.lineTo(coords[i],coords[i+1]);c.closePath();c.fill();}
    function label(str,x,y,font,color,align='left'){c.font=font+'px Consolas,monospace';c.textAlign=align;c.fillStyle=color;c.fillText(str,x,y);c.textAlign='left';}
    function draw(s,ui='race',end=0){
      c.save();c.imageSmoothingEnabled=false;
      if(s.shake>0)c.translate(Math.sin(s.age*91)*s.shake*11,Math.cos(s.age*75)*s.shake*6);
      const horizon=200+Math.sin(s.z/340)*8,base=R.center(s.z),heading=R.slope(s.z),camX=s.x*.76,zone=s.z<2280?0:s.z<4510?1:2;
      function project(z,x=0){const d=z-s.z,k=780/Math.max(4,d+9);
        return {x:480+(R.center(z)-base-heading*d+x-camX)*k,y:horizon+2470/Math.max(4,d+9),k};}
      const sky=art.sky,sw=sky.width*.72,sx=(sky.width-sw)*(.5+Math.min(.48,Math.max(-.48,heading*1.1)));
      c.drawImage(sky,sx,0,sw,sky.height,0,0,W,horizon+14);
      const colors=zone===0?['#c09273','#c49575']:zone===1?['#4f636b','#536770']:['#9b785d','#a57d61'];
      c.fillStyle=colors[0];c.fillRect(0,horizon+9,W,H-horizon);
      const strip=4,near=Math.floor((s.z-3)/strip)*strip;
      for(let j=140;j>=0;j--){
        const z=near+j*strip,a=project(z),b=project(z+strip),shade=Math.floor(z/12)%2===0;
        if(a.y<=b.y)continue;
        const top=Math.floor(b.y),bottom=Math.ceil(a.y);
        function band(lo,hi,color){poly(color,[a.x+lo*a.k,bottom,a.x+hi*a.k,bottom,b.x+hi*b.k,top,b.x+lo*b.k,top]);}
        c.fillStyle=colors[+shade];c.fillRect(0,top,W,bottom-top);
        band(-6.9,6.9,shade?'#968078':'#a08a7c');band(-6.25,6.25,shade?'#ffe2bc':'#b95449');band(-5.8,5.8,shade?'#535463':'#50515f');
        for(const x of [-5.55,5.5])band(x,x+.055,'#ead2ac');
        if(shade)for(const x of [-1.92,1.92])band(x,x+.09,'#e3d5c0');
        if(zone===1){band(-7.4,-7,'#cad1c5');band(7,7.4,'#b1b5b2');}
        if(shade&&j<30){const dust=Math.sin(Math.floor(z/4)*328)*4;band(dust,dust+.045,'#62616b');}
      }
      function tire(mark,side){
        const turn=Math.sin(mark.yaw);
        return project(mark.z+.12+side*.08*turn,mark.x-.76*turn+side*(1.05-.06*Math.abs(turn)));
      }
      for(let i=1;i<s.skids.length;i++){
        const b=s.skids[i],a=s.skids[i-1];if(!b.join||b.z<s.z-4)continue;
        for(const side of [-1,1]){
          const p=tire(a,side),q=tire(b,side),l=p.k*.075,r=q.k*.075;
          poly('#31323cc4',[p.x-l,p.y,p.x+l,p.y,q.x+r,q.y,q.x-r,q.y]);
        }
      }
      function tireSmoke(p,yaw){
        const density=Math.min(1,Math.abs(s.slip)/.55);
        if(density<.16)return;
        for(const side of [-1,1]){
          const axle=tire({x:s.x,z:s.z,yaw},side);
          for(let j=4;j>=0;j--){
            const age=(s.age*2.8+j/5+(side+1)*.12)%1;
            const radius=(.045+.22*age)*p.k*density;
            const x=axle.x+(side*.25-Math.sin(yaw)*.81)*p.k*age;
            const y=axle.y+age*(22-17*age)-radius*.48;
            c.save();c.translate(Math.round(x),Math.round(y));c.scale(radius,radius);
            c.globalAlpha=(1-age)*density*.65;
            poly('#a29ca2',[-1,.16,-.94,-.32,-.60,-.43,-.53,-.73,.05,-.81,.29,-.56,.76,-.53,.98,-.04,.78,.31,.16,.43,-.47,.39]);
            poly('#dfd8cd',[-.86,-.18,-.70,-.4,-.44,-.4,-.36,-.65,.05,-.68,.31,-.36,-.04,-.33,-.28,-.12]);c.restore();
          }
        }
      }
      function vehicle(n){
        const p=project(n.z,n.x),idx=tiles[n.kind],w=p.k*(n.kind==='truck'?3.95:n.kind==='turret'?3.25:2.65),h=w*176/256;
        c.fillStyle='#16162091';c.beginPath();c.ellipse(p.x,p.y-w*.032,w*.45,Math.max(1,w*.055),0,0,7);c.fill();
        c.save();c.translate(p.x,p.y);if(n.crash)c.rotate(Math.sin(n.spin)*.8);else if(n.bump)c.rotate(n.vx*.017);
        if(n.kind==='hero'&&s.boost){for(const d of [-1,1])poly('#66e8fd',[d*w*.33,-h*.11,d*w*.24,-h*.11,d*w*.30,8+8*Math.sin(s.age*62)]);}
        if(n.kind==='hero'){
          const yaw=s.slip+Math.atan2(s.vx,Math.max(25,s.speed))*.42;
          const pose=Math.min(12,Math.round(Math.abs(yaw)*12/.66)),bodyWidth=w*392/256;
          c.scale(yaw<0?-1:1,1);c.drawImage(art.drift,pose%7*392,Math.floor(pose/7)*176,392,176,-bodyWidth/2,-h,bodyWidth,h);
          c.restore();tireSmoke(p,yaw);
        }else{
          c.drawImage(art.cars,(idx%3)*256,Math.floor(idx/3)*176,256,176,-w/2,-h,w,h);c.restore();
        }
        if(n.flash>0||n.crash){const size=Math.min(43,p.k*(n.crash?1.6:.52)),cx=p.x+(n.kind==='sedan'?.38:0)*w,cy=p.y-h*.63;c.fillStyle='#ffb143';c.beginPath();for(let k=0;k<12;k++){const r=k%2?size*.32:size,a=k*Math.PI/6+s.age*5;c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}c.fill();c.fillStyle='#fff6c7';c.fillRect(cx-size*.2,cy-size*.2,size*.4,size*.4);}
        if(n.kind==='boss'&&ui==='race'&&n.z-s.z>12){label('▼',p.x,p.y-h-4,15,'#fff0a2','center');}
      }
      const objects=[];
      for(let z=Math.ceil((s.z-1)/21)*21;z<s.z+550;z+=21){
        const i=Math.round(z/21),side=i%2?-1:1;objects.push({z,draw:()=>{const p=project(z,side*(i%3?8.3:7)),k=p.k;
          if(i%13===4){scenery(2,project(z,side*13.5),10.5);}
          else if(zone===1&&i%4===1){scenery(3,project(z,side*13),11);}
          else if(zone!==1&&i%3!==0){scenery(zone===2&&i%2?1:0,p,zone===2&&i%2?5.2:8.4);}
          else if(i%7===0){c.fillStyle='#434654';c.fillRect(p.x-k*.11,p.y-3*k,.22*k,3*k);c.fillStyle='#173f45';c.fillRect(p.x-1.45*k,p.y-4.1*k,2.9*k,1.3*k);if(k>7)label('➜',p.x,p.y-3.1*k,Math.max(8,k),'#ffdf99','center');}
          else{c.fillStyle='#e1caae';c.fillRect(p.x-.11*k,p.y-.95*k,.22*k,k);c.fillStyle='#c65544';c.fillRect(p.x-.11*k,p.y-.77*k,.22*k,.27*k);}
        }});
      }
      for(let z=Math.ceil(s.z/39)*39;z<s.z+340;z+=39){
        const i=Math.floor(z/39),side=i%2?-1:1;
        objects.push({z,draw:()=>scenery(i%6===2?2:1,project(z,side*(14+i%5)),i%6===2?9:4.5+i%3)});
      }
      for(const post of s.posts){
        const z=post.z,elapsed=post.hitAt===null?0:s.time-post.hitAt;
        const debrisTravel=post.hitAt!==null&&elapsed<.9?post.impactSpeed*elapsed*(1-.42*elapsed):0;
        if(z+debrisTravel<s.z-4||z>s.z+530)continue;
        objects.push({z:z+debrisTravel,draw:()=>{
          const p=project(z+debrisTravel,post.x),w=3.48*p.k,h=w*art.barrier.height/art.barrier.width;
          if(post.hitAt===null){
            c.fillStyle='#23242f67';c.beginPath();c.ellipse(p.x,p.y,w*.47,h*.11,0,0,Math.PI*2);c.fill();
            c.drawImage(art.barrier,p.x-w/2,p.y-h,w,h);
          }else if(elapsed<.9){
            for(let i=0;i<4;i++){
              const dx=(i-1.5)*(.25+elapsed*1.85)*w,jump=elapsed*(3.4-elapsed*5)*p.k;
              c.save();c.translate(p.x+dx,p.y-h*.5-jump);c.rotate((i-1.5)*elapsed*3);
              c.drawImage(art.barrier,i*art.barrier.width/4,0,art.barrier.width/4,art.barrier.height,-w/8,-h/2,w/4,h);c.restore();
            }
          }
        }});
        if(z+1.55<s.z-3)continue;
        objects.push({z:z+1.55,draw:()=>{
          const p=project(z+1.55,post.officerX),running=post.phase==='run';
          const frame=running?1+Math.floor(post.steps/1.95*8)%8:0,face=running?post.side:-post.side;
          const scale=p.k*1.76/88;
          c.fillStyle='#22202d7d';c.beginPath();c.ellipse(p.x,p.y,p.k*.28,p.k*.07,0,0,Math.PI*2);c.fill();
          c.save();c.translate(p.x,p.y);c.scale(scale*face,scale);
          c.drawImage(art.officer,frame*96,0,96,100,-48,-96,96,100);c.restore();
          if(post.phase==='alert')label('!',p.x,p.y-1.94*p.k,Math.max(8,p.k*.55),'#ffe4a0','center');
        }});
      }
      const boss=ui==='ending'?{...s.boss,z:s.z+3,x:2.6}:s.boss;
      for(const n of [...s.cars,boss,{kind:'hero',x:s.x,z:s.z}])if(n.z>s.z-4&&n.z<s.z+860)objects.push({z:n.z,draw:()=>vehicle(n)});
      for(const shot of s.shots)if(shot.z>=s.z)objects.push({z:shot.z,draw:()=>{const p=project(shot.z,shot.x);c.fillStyle='#ffe48b';c.fillRect(p.x,p.y-p.k*.64,Math.max(2,p.k*.07),Math.max(3,p.k*.18));}});
      objects.sort((a,b)=>b.z-a.z).forEach(o=>o.draw());
      c.restore();if(ui==='ready')return;
      if(ui==='ending'){label('INTERCEPCIÓN CONFIRMADA',480,110,24,'#fff4cf','center');return;}
      c.fillStyle='#16212ce8';c.fillRect(18,17,225,48);label('COSTA SUR   /   0'+(zone+1),30,35,12,'#ffc589');label(names[zone],30,55,17,'#fff3d9');
      c.fillStyle='#16212ce8';c.fillRect(697,17,245,48);label('DISTANCIA AL FUGITIVO',711,34,12,'#f8c68e');label(Math.ceil(Math.max(0,s.boss.z-s.z))+' m',927,55,21,'#fff1ce','right');
      c.fillStyle='#16212ce8';c.fillRect(18,469,155,54);label('KM/H',120,508,12,'#e2c593');label(String(Math.round(s.speed*3.6)).padStart(3,'0'),30,509,36,'#fff1d3');
      c.fillStyle='#16212ce8';c.fillRect(735,468,207,55);for(const [j,key,val,color] of [[0,'CARROCERÍA',s.hp/100,'#ffb46c'],[1,'NITRO',s.nitro,'#68e4df']]){label(key,746,488+j*21,12,'#e2dfd2');c.fillStyle='#43505b';c.fillRect(827,480+j*21,101,7);c.fillStyle=color;c.fillRect(827,480+j*21,101*val,7);}
      if(s.mode==='launch')label('EL FUGITIVO SE ADELANTA',480,115,20,'#fff5d7','center');
    }
    return {draw};
  }root.FugaRenderer={create};
})(window);
