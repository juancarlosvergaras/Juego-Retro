(function(root){
 'use strict';
 const DURATION=13;
 function phase(age){return age<3?'signal':age<7?'extraction':age<10?'flight':'road';}
 function draw(c,images,state,w,h){const age=state.endingAge||0,t=state.time,stage=phase(age);c.save();c.imageSmoothingEnabled=false;c.fillStyle='#182a36';c.fillRect(0,0,w,h);const scale=Math.min(w/960,h/540);c.translate((w-960*scale)/2,(h-540*scale)/2);c.scale(scale,scale);const sky=c.createLinearGradient(0,0,0,540);sky.addColorStop(0,'#304c66');sky.addColorStop(1,'#e3bd83');c.fillStyle=sky;c.fillRect(0,0,960,540);
  const shipX=80-Math.max(0,age-7)*110,shipY=130+Math.sin(t)*4;c.drawImage(images.carrier,0,140,1536,690,shipX,shipY,800,360);
  // The engines remain part of the carrier sprite; sparks mark the defeated reactor.
  for(let i=0;i<14;i++){const q=(age*1.4+i*.17)%1;c.fillStyle=i%3?'#fba45b':'#ffe1a1';c.fillRect(shipX+540+Math.sin(i*2.4)*q*40,shipY+90-q*70,3,3);}
  const heliX=stage==='signal'?110+age*90:stage==='extraction'?380+(age-3)*15:440+(age-7)*100,heliY=stage==='signal'?120:stage==='extraction'?120-(age-3)*3:108-(age-7)*13;
  c.drawImage(images.airAtlas,936,640,600,240,heliX-120,heliY-35,240,96);c.fillStyle='#d0d8cf';const rotor=Math.sin(t*80)*112;c.fillRect(heliX-rotor,heliY-27,rotor*2,3);
  if(age>=2&&age<6.8){const rope=Math.max(0,150-(age-3)*40);c.strokeStyle='#c9ba8e';c.lineWidth=2;c.beginPath();c.moveTo(heliX+5,heliY+45);c.lineTo(heliX+5,heliY+45+rope);c.stroke();root.ArcadeRobotForm?.draw(c,{...state.player,form:'robot',x:heliX+5,y:heliY+rope+70,facing:1,grounded:false,crouching:false,vy:-20,vx:0});}
  if(age>=10){const fade=Math.min(1,(age-10)*1.4);c.globalAlpha=fade;const road=images.endingRoad;c.drawImage(road,0,0,road.width,road.height,0,0,960,540);const r=images.endingRiders;c.drawImage(r,0,0,r.width/4,r.height/3,120+(age-10)*115,365,160,142);c.globalAlpha=1;}
  c.fillStyle='#101b28ed';c.fillRect(0,0,960,64);c.fillRect(0,450,960,90);c.textAlign='center';c.fillStyle='#f3d28d';c.font='bold 15px monospace';c.fillText(age<10?'MISIÓN 3 COMPLETADA':'MISIÓN 4',480,29);c.fillStyle='#f2f4e9';c.font='bold 29px monospace';c.fillText(age<10?'EL CENTINELA HA CAÍDO':'FURIA EN LA CARRETERA',480,492);c.font='13px monospace';c.fillStyle='#cbd7d3';c.fillText(stage==='signal'?'Señal de extracción recibida.':stage==='extraction'?'Robot de combate recuperado · Dos armas disponibles':stage==='flight'?'El convoy enemigo escapa por la autopista.':'Arranca el motor. La persecución continúa.',480,520);c.restore();
 }
 const api={DURATION,phase,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionEndings=api;
})(typeof window!=='undefined'?window:globalThis);
