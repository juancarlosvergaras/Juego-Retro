(function(root){
 'use strict';
 // The three paintings share a 576 × 384 reference grid. Door coordinates
 // describe the moving leaves, measured from the top left of each painting.
 const referenceWidth=576,parallax=.88;
 const floors=[
  {tile:416,threshold:453,sill:312,cornice:152,height:42,walkway:5,
   doors:[[109,34,241],[289,52,240],[472,47,239]]},
  {tile:364,threshold:451,sill:328,cornice:168,height:40,walkway:5,
   doors:[[139,42,242],[351,48,243],[540,42,242]]},
  {tile:398,threshold:445,sill:257,cornice:84,height:39,walkway:8,
   doors:[[167,32,181],[407,32,181]]}
 ];
 function storefront(floor){
  const layout=floors[floor];
  if(!layout)return null;
  const scale=layout.tile/referenceWidth;
  return {...layout,scale,top:Math.round(layout.threshold-(layout.sill-layout.cornice)*scale),
   ground:layout.threshold+layout.walkway};
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
 const api={referenceWidth,parallax,storefront,exits};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMallInterior=api;
})(typeof window!=='undefined'?window:globalThis);
