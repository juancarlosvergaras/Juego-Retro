(function(root){
 'use strict';
 // The three paintings share a 576 × 384 reference grid. Door coordinates
 // describe the moving leaves, measured from the top left of each painting.
 const referenceWidth=576,parallax=.88;
 // Opening in the atrium painting, in the same reference grid as the doors.
 const arcadeFront={bay:2,x:27.5,y:212,width:157.5,height:100.5};
 const floors=[
  {tile:416,threshold:453,sill:312,cornice:152,height:42,walkway:5,ride:{bay:1,left:28,top:215,span:64,width:34},rail:.815,deck:.855,
   doors:[[109,34,241],[289,52,240],[472,47,239]]},
  {tile:364,threshold:451,sill:328,cornice:168,height:40,walkway:5,rail:.844,deck:.887,
   doors:[[139,42,242],[351,48,243],[540,42,242]]},
  {tile:398,threshold:445,sill:257,cornice:84,height:39,walkway:8,ride:{bay:4,left:20,top:151,span:107,width:38},rail:.833,deck:.877,
   doors:[[167,32,181],[407,32,181]]}
 ];
 function storefront(floor){
  const layout=floors[floor];
  if(!layout)return null;
  const scale=layout.tile/referenceWidth;
  return {...layout,scale,top:Math.round(layout.threshold-(layout.sill-layout.cornice)*scale),
   ground:layout.threshold+layout.walkway};
 }
 const atrium=storefront(0);
 const arcadeLeft=arcadeFront.bay*atrium.tile+arcadeFront.x*atrium.scale;
 function atArcadeFront(worldX,cameraX){
  const facadeX=worldX-cameraX*(1-parallax);
  return facadeX>=arcadeLeft&&facadeX<=arcadeLeft+arcadeFront.width*atrium.scale;
 }
 function exits(layout,bay,shopX){
  const result=[];
  for(let i=bay-1;i<=bay+1;i++){
   for(const [center,width,top] of layout.doors){
    result.push({x:i*layout.tile+center*layout.scale,width:width*layout.scale,
     height:(layout.sill-top)*layout.scale,center,sourceWidth:width,sourceTop:top});
   }
  }
  return {left:result.filter(door=>door.x<shopX).at(-1),right:result.find(door=>door.x>shopX)};
 }
 const distantParallax=.72;
 const swings=[0,0,1,2,3,4,3,2,1,2,3,4,5,5,6,7],lastPose=(swings.length-1)/4.5;
 const purseFrame=age=>swings[Math.min(swings.length-1,Math.floor(age*4.5))];
 const visitTimes=new WeakMap();
 function restorePurseScenes(saved){
  return floors.map((_,i)=>{
   const scene=saved?.[i];
   return Number.isFinite(scene?.x)&&Number.isFinite(scene.age)?{x:scene.x,age:Math.max(0,Math.min(lastPose,scene.age))}:null;
  });
 }
 function visitPurse(s,focusX,tile){
  const scroll=s.camera.x*distantParallax;
  let scene=s.purseScenes[s.floor];
  if(!scene){
   // Pick a clear bay ahead of the player on the painted, alternating panorama.
   const aim=scroll+focusX+100+Math.random()*85,bay=Math.floor(aim/tile);
   const centers=[.10,.25,.49,.74,.90].map(n=>(bay+(bay%2?1-n:n))*tile);
   const x=centers.reduce((a,b)=>Math.abs(aim-a)<Math.abs(aim-b)?a:b);
   scene=s.purseScenes[s.floor]={x,age:0};
  }
  const dt=s.time-(visitTimes.get(scene)??s.time);
  visitTimes.set(scene,s.time);
  if(dt>=0&&dt<=.5&&Math.abs(scene.x-scroll-focusX)<320)scene.age=Math.min(lastPose,scene.age+dt);
 }
 const api={referenceWidth,parallax,distantParallax,arcadeFront,atArcadeFront,storefront,exits,visitPurse,purseFrame,restorePurseScenes};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMallInterior=api;
})(typeof window!=='undefined'?window:globalThis);
