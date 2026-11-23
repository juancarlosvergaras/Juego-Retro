(function(root){
  'use strict';
  const DURATION=13;
  function phase(age){return age<3?'signal':age<7?'extraction':age<10?'flight':'departure';}
  function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
  function draw(c,images,state,w,h){
    const age=state.endingAge||0,t=state.time,stage=phase(age),scale=Math.min(w/960,h/540);
    c.save();c.imageSmoothingEnabled=false;c.fillStyle='#182a36';c.fillRect(0,0,w,h);
    c.translate((w-960*scale)/2,(h-540*scale)/2);c.scale(scale,scale);
    const sky=c.createLinearGradient(0,0,0,540);
    sky.addColorStop(0,'#304c66');sky.addColorStop(1,'#e3bd83');
    c.fillStyle=sky;c.fillRect(0,0,960,540);
    const flight=ease((age-7)/6),shipX=80-flight*800,shipY=130+Math.sin(t)*3+flight*100;
    for(let i=0;i<3;i++){
      const x=1050-(i*480+age*(14+i*5)+flight*240)%1500;
      c.drawImage(images.airAtlas,16,576,570,164,x,76+i*80,410,118);
    }
    c.drawImage(images.carrier,0,140,1536,690,shipX,shipY,800,360);
    const hover=395,heliX=105+(hover-105)*ease(age/2.8)+flight*540;
    const heliY=135+Math.sin(t*1.6)*2-flight*55,deck=shipY+360*.392;
    const cableTop=heliY+24,actorX=hover+10,lift=ease((age-3.6)/2.8);
    const actorScale=.67,actorHeight=state.player.h*actorScale,feet=deck+(cableTop+actorHeight*.40-deck)*lift;
    if(age<6.5){
      const cableX=heliX+10,end=cableTop+(feet-actorHeight*.75-cableTop)*ease((age-1.7)/1.7);
      c.strokeStyle='#554638';c.lineWidth=2;c.beginPath();c.moveTo(cableX,cableTop);c.lineTo(cableX,Math.max(cableTop,end));c.stroke();
      const actor={...state.player,x:0,y:0,vx:0,vy:0,anim:t,grounded:lift===0,facing:1,
        jetpack:false,heroFlight:false,rope:null,ladder:null,crouching:false,transform:0,
        cloak:0,hurt:0,respawnProtection:0,jumpTurn:null,aim:{x:1,y:0}};
      c.save();c.translate(Math.round(actorX),Math.round(feet));c.scale(actorScale,actorScale);
      root.ArcadeMissionKit.drawShooter(c,actor,{},state.combat,images,{},[]);c.restore();
    }
    root.ArcadePatrolHelicopter.draw(c,images.patrolHeli,heliX,heliY,242-flight*130,t);
    c.fillStyle='#101b28ed';c.fillRect(0,0,960,64);c.fillRect(0,450,960,90);c.textAlign='center';
    c.fillStyle='#f3d28d';c.font='bold 15px monospace';c.fillText('MISIÓN 03 COMPLETADA',480,29);
    c.fillStyle='#f2f4e9';c.font='bold 29px monospace';c.fillText(age<7?'EL CENTINELA HA CAÍDO':'RUMBO AL PUERTO',480,492);
    const captions={signal:'Vega · Te tengo a la vista, Cap.',extraction:'Cap · Tengo la carta náutica. Sube el cable.',
      flight:'Vega · Coordenadas recibidas.',departure:'Un submarino del Consorcio espera frente al puerto.'};
    c.font='13px monospace';c.fillStyle='#cbd7d3';c.fillText(captions[stage],480,520);c.restore();
  }
  const api={DURATION,phase,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionEndings=api;
})(typeof window!=='undefined'?window:globalThis);
