(function(root){
 'use strict';
 const seabed=x=>Math.min(3060,650+x*.22);
 const left=5230,right=6890;
 // Top and bottom silhouette sampled every 1/64 of the rock sprite, in its 128-pixel cell.
 const outline=[[77,77],[74,80],[72,80],[71,82],[69,88],[68,94],[62,93],[64,92],[62,94],[59,104],[50,95],[39,93],[39,104],[48,104],[62,114],[58,122],[59,117],[56,108],[51,104],[52,109],[48,101],[40,95],[40,96],[31,98],[37,102],[43,97],[43,115],[44,127],[43,108],[39,104],[34,94],[28,111],[17,98],[13,93],[0,100],[13,97],[32,113],[25,113],[38,127],[47,110],[47,98],[38,102],[44,101],[49,115],[43,112],[37,96],[34,94],[50,101],[56,100],[55,111],[60,118],[57,104],[52,97],[47,105],[57,97],[52,95],[60,95],[61,87],[62,89],[69,85],[69,88],[71,83],[74,81],[75,80],[76,77]];
 function shelf(start,end,depth,height,mirror=false){
  const sections=outline.map((_,i)=>{
   const x=start+(end-start)*i/(outline.length-1);
   const [top,bottom]=outline[mirror?outline.length-1-i:i],origin=seabed(x)+depth-height*.5;
   return {x,top:origin+height*top/128,bottom:origin+height*bottom/128};
  });
  return {start,end,depth,height,mirror,sections};
 }
 const rocks=[
  shelf(left,right,-690,162),
  shelf(left-45,5800,-425,92,true),shelf(left+44,5700,-220,85),
  shelf(6440,right+40,-435,98),shelf(6500,right-20,-216,85,true)
 ];
 function interval(rock,lo,hi){
  if(hi<rock.start||lo>rock.end)return null;
  const a=rock.sections,last=a.length-1,scale=last/(rock.end-rock.start);
  const first=Math.max(0,Math.floor((lo-rock.start)*scale)-1),end=Math.min(last,Math.ceil((hi-rock.start)*scale)+1);
  let top=Infinity,bottom=-Infinity;
  for(let i=first;i<end;i++){
   const p=a[i],q=a[i+1],from=Math.max(lo,p.x),to=Math.min(hi,q.x);
   if(to<from)continue;
   for(const x of [from,to]){
    const t=(x-p.x)/(q.x-p.x);
    top=Math.min(top,p.top+(q.top-p.top)*t);
    bottom=Math.max(bottom,p.bottom+(q.bottom-p.bottom)*t);
   }
  }
  return top<=bottom?{top,bottom}:null;
 }
 // y is the swimmer's lower edge, like the existing sea actors.
 function freeY(x,y,radius=0,height=0){
  if(x<left-60-radius||x>right+60+radius)return y;
  for(const rock of rocks){
   const span=interval(rock,x-radius,x+radius);
   if(span&&y>span.top&&y-height<span.bottom){
    const above=span.top,below=span.bottom+height;
    return y-above<below-y?above:below;
   }
  }
  return y;
 }
 function inCave(x,y){return x>=left&&x<=right&&y>seabed(x)-706&&y<seabed(x);}
 function floorBelow(x,y){
    let floor=seabed(x);
    for(const rock of rocks){const span=interval(rock,x,x);if(span&&span.top>=y)floor=Math.min(floor,span.top);}
    return floor;
  }
  const api={left,right,rocks,seabed,freeY,inCave,floorBelow};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeSeaReef=api;
})(typeof window!=='undefined'?window:globalThis);
