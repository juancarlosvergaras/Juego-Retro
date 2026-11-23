(function(root){
  'use strict';
  // The order also identifies each row of the illustrated fleet.
  const fleet=[
    {id:'aguja',name:'Aguja',hp:3,span:12,reload:3.1,turn:1.26,speed:54,offsets:[[0,0]]},
    {id:'manta',name:'Manta',hp:5,span:18,reload:4.4,turn:.76,speed:44,offsets:[[-.19,0],[0,0],[.19,0]]},
    {id:'martillo',name:'Martillo',hp:10,span:19,reload:4.7,turn:.52,speed:32,offsets:[[0,0]]},
    {id:'avispa',name:'Avispa',hp:4,span:14,reload:3.4,turn:1.46,speed:61,offsets:[[-.055,0],[.055,0]]},
    {id:'centinela',name:'Centinela',hp:8,span:14,reload:4.8,turn:.7,speed:36,offsets:[[0,0]]},
    {id:'tijera',name:'Tijera',hp:7,span:17,reload:4.2,turn:.88,speed:42,offsets:[[-.13,.025],[.13,-.025]]},
    {id:'espectro',name:'Espectro',hp:5,span:16,reload:3.8,turn:1.62,speed:57,offsets:[[0,0]]}
  ];
  function model(n){return fleet.find(v=>v.id===n.model)||fleet[n.kind==='hunter'?2:0];}
  const armor=difficulty=>Math.round(560*difficulty);
  const patterns={
    fan:{label:'Abanico de proa',wind:1.05,count:2,gap:.4},
    sweep:{label:'Barrido lateral',wind:.95,count:7,gap:.16},
    cross:{label:'Fuego cruzado',wind:.9,count:4,gap:.24},
    lance:{label:'Lanza de plasma',wind:1.15,count:3,gap:.44}
  };
  const collapseLength=3.25;
  function mount(b,x,y){
    return {x:b.x+Math.cos(b.yaw)*x,y:b.y+y,z:b.z-Math.sin(b.yaw)*x};
  }
  // Aim in fortress coordinates so the spread remains correct after any approach heading.
  function shotAt(s,b,fire,x,y,target,side,height,speed,kind){
    const from=mount(b,x,y),dx=target.x+Math.cos(b.yaw)*side-from.x,dy=target.y+height-from.y,
      dz=target.z-Math.sin(b.yaw)*side-from.z,d=Math.hypot(dx,dy,dz)||1;
    fire(s,from,{x:dx/d,y:dy/d,z:dz/d},speed,kind,true);
  }
  function updateBoss(s,b,dt,fire){
    const stage=b.hp>b.maxHp*.68?1:b.hp>b.maxHp*.34?2:3;
    const p=s.player,side=(p.x-b.x)*Math.cos(b.yaw)-(p.z-b.z)*Math.sin(b.yaw);
    const range=Math.hypot(p.x-b.x,p.z-b.z),target={x:p.x,y:p.y,z:p.z};
    if(b.stage!==stage){
      b.stage=stage;b.coreOpen=stage>1;
      if(stage>1)s.events.push({type:'radio',text:stage===2?'Vega · Cénit cambia de batería. Mira qué motor carga.':'Vega · Cénit al límite. Cambia de altura cuando cargue el núcleo.'});
    }
    // An exposed pilot can break this independent lock by changing lane or altitude.
    if(stage>=2){
      const anchor=b.track;
      if(!anchor||Math.hypot(p.x-anchor.x,p.y-anchor.y,p.z-anchor.z)>12){
        b.track=target;b.tracking=0;
      }else b.tracking=(b.tracking||0)+dt;
      if(b.lockPulse>0){
        b.lockPulse-=dt;
        if(b.lockPulse<=0){
          shotAt(s,b,fire,0,0,b.lockAim,0,0,139,'plasma');b.tracking=-1.1;
          s.events.push({type:'cenitVolley',attack:'lance'});
        }
      }else if(b.tracking>1.05){
        b.lockAim=target;b.lockPulse=.9;s.events.push({type:'cenitCharge',attack:'lance'});
      }
    }
    if(!b.attack){
      if(b.fire>0)return;
      const previous=b.lastAttack;
      const order=range<132?['fan','cross','sweep','lance']:Math.abs(side)>32?['cross','sweep','fan','lance']:['sweep','fan','cross','lance'];
      const pool=stage===1?order.filter(id=>id!=='lance'):order;
      let id=pool[b.salvo%pool.length];
      if(id===previous)id=pool[(b.salvo+1)%pool.length];
      b.attack=id;b.lastAttack=id;b.salvo++;b.fired=0;b.aim=target;b.sweepSign=side<0?-1:1;
      b.fire=patterns[id].wind;s.events.push({type:'cenitCharge',attack:id});return;
    }
    if(b.fire>0)return;
    const attack=b.attack,pattern=patterns[attack],i=b.fired,aim=b.aim;
    const speed=stage===3?117:101;
    switch(attack){
      case 'fan':
        for(let j=-2;j<=2;j++)shotAt(s,b,fire,i?17:-17,-3,aim,(j+(i?.4:0))*16,0,speed,'bolt');
        break;
      case 'sweep':
        shotAt(s,b,fire,b.sweepSign*(-36+i*12),2,aim,b.sweepSign*(-42+i*14),0,speed+8,'bolt');break;
      case 'cross':
        for(const d of [-1,1])shotAt(s,b,fire,32*d,5,aim,-d*(19-i*8),d*(i-1)*4,speed,'bolt');
        break;
      case 'lance':
        shotAt(s,b,fire,0,0,aim,0,0,155,'plasma');
        // The next pulse has a fresh aim point, locked for the whole warning interval.
        b.aim=target;break;
    }
    b.fired++;
    if(i===0)s.events.push({type:'cenitVolley',attack});
    if(b.fired<pattern.count)b.fire=pattern.gap;
    else{b.attack=null;b.fire=(stage===1?1.62:stage===2?1.22:.95)/Math.sqrt(s.difficulty);}
  }
  function wingFire(s,n,fire){
    const p=s.player,m=model(n),dx=p.x-n.x,dy=p.y-n.y,dz=p.z-n.z,d=Math.hypot(dx,dy,dz)||1;
    const fx=dx/d,fy=dy/d,fz=dz/d;
    const plasma=m.id==='martillo'||m.id==='centinela',speed=(plasma?38:54)+(s.blend||0)*28;
    for(const [side,y] of m.offsets){
      const origin=m.id==='tijera'?mount(n,Math.sign(side)*4,0):n;
      const cross=side*(m.id==='tijera'?-1:1);
      fire(s,origin,{x:fx+fz*cross,y:fy+y,z:fz-fx*cross},speed,plasma?'plasma':'bolt',true);
      s.shots[s.shots.length-1].vz+=s.speed*(1-s.blend);
    }
    n.fire=m.reload/Math.sqrt(s.difficulty);
    if(m.id==='espectro'&&!n.echo){n.fire=.36;n.echo=true;}else n.echo=false;
  }
  const api={fleet,model,patterns,mount,armor,collapseLength,updateBoss,wingFire};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeCenit=api;
})(typeof window!=='undefined'?window:globalThis);
