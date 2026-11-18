(function(root){
  'use strict';
  const DEPTH=.48,BASE=612;
  const tanks=Array.from({length:10},(_,id)=>({id,x:470+id*460,dir:id%3===1?-1:1,width:90+(id%3)*8,period:6.4+(id%4)*.7,delay:id*.63}));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function sample(tank,time){
    const age=Math.max(0,time-tank.delay),drive=clamp(age/3,0,1);
    // Ease to a stop before firing. Never slide backwards or reset the hull at a loop boundary.
    const x=tank.x+tank.dir*26*(1-Math.pow(1-drive,3));
    const sinceShot=age-3.6,cycle=sinceShot<0?-1:sinceShot%tank.period;
    const firstImpact=sinceShot>=.68,impactAge=cycle-.68;
    const targetX=tank.x+tank.dir*(26+150),muzzleX=x+tank.dir*tank.width*.48,muzzleY=BASE-tank.width*.34;
    const flight=cycle>=.18&&cycle<.68?(cycle-.18)/.5:null;
    return{x,base:BASE,dir:tank.dir,width:tank.width,moving:drive<1&&age>0,
      row:cycle>=0&&cycle<.44?1:0,frame:cycle>=0&&cycle<.44?Math.min(3,Math.floor(cycle/.11)):drive<1?Math.floor(age*9)%4:0,
      targetX,targetFrame:firstImpact?Math.min(3,1+Math.floor((sinceShot-.68)*6)):0,
      impactFrame:impactAge>=0&&impactAge<1.35?Math.min(3,Math.floor(impactAge*3)):null,
      smoke:impactAge>=1.35&&impactAge<3?(3-impactAge)/1.65:0,
      shell:flight===null?null:{x:muzzleX+(targetX-muzzleX)*flight,y:muzzleY+(BASE-8-muzzleY)*flight-16*Math.sin(flight*Math.PI)}};
  }
  function flights(time,camera){
    return Array.from({length:4},(_,i)=>{const t=time+i*7.3,dir=i===3?-1:1,lane=(t*(dir===1?65:52))%3300;return{x:(dir===1?lane-300:3000-lane)-camera.x*.18,y:230+i*38-camera.y+Math.sin(t*.5)*7,dir,enemy:i%2===1,t};});
  }
  const api={DEPTH,BASE,tanks,sample,flights};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeBackgroundBattle=api;
})(typeof window!=='undefined'?window:globalThis);
