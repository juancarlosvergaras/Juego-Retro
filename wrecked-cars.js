(function(root){
 'use strict';
 const frames=[[[10,72,511,182],[537,108,490,146],[1048,183,474,72]],[[10,300,511,199],[537,340,494,159],[1048,428,477,72]],[[10,534,516,190],[538,554,497,173],[1047,651,477,80]],[[12,740,524,237],[544,758,496,219],[1045,887,479,89]]];
 const stage=c=>c.hp<=0?3:c.hp<=4?2:c.hp<=7?1:0;
 function restore(cars,saved=[]){for(const c of cars){const hp=saved?.[c.id];c.hp=Number.isFinite(hp)?Math.max(0,Math.min(10,Math.ceil(hp))):10;c.hits=new Set();}return cars;}
 function hit(c,shot){if(!c||c.hp<=0||shot!=null&&c.hits.has(shot))return false;if(shot!=null){c.hits.add(shot);if(c.hits.size>32)c.hits.delete(c.hits.values().next().value);}c.hp--;return true;}
 function sync(cars,platforms,pickups=[]){for(const c of cars){const s=stage(c);if(s===c.collisionStage)continue;c.collisionStage=s;const max=Math.max(...c.platforms.map(p=>p.originalHeight??p.thickness));const height=s?frames[c.id][s-1][3]*c.w/frames[c.id][s-1][2]:max;for(const p of c.platforms){p.originalHeight??=p.thickness;p.thickness=p.originalHeight*Math.min(1,height/max);p.y=c.y-p.thickness;}if(!c.hp)for(let i=platforms.length-1;i>=0;i--)if(platforms[i].kind==='wreck'&&platforms[i].car===c.id)platforms.splice(i,1);for(const item of pickups){if(item.taken||item.x<c.x||item.x>c.x+c.w||item.y<c.y-max-16||item.y>=c.y)continue;const under=c.platforms.filter(p=>item.x>=p.x&&item.x<=p.x+p.w);if(under.length)item.y=(c.hp?Math.min(...under.map(p=>p.y)):c.y)-12;}}}
 function blast(cars,x,y,r,shot){for(const c of cars||[]){const top=Math.min(...c.platforms.map(p=>p.y)),dx=x-Math.max(c.x,Math.min(c.x+c.w,x)),dy=y-Math.max(top,Math.min(c.y,y));if(Math.hypot(dx,dy)<=r)hit(c,shot);}}
 function draw(ctx,c,image,original){const s=stage(c),f=s?frames[c.id][s-1]:c.frame,scale=c.w/f[2],y=s?c.y-f[3]*scale:c.y-(c.baseline-f[1])*scale;ctx.drawImage(s?image:original,...f,c.x,y,c.w,f[3]*scale);}
 const api={frames,stage,restore,hit,sync,blast,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeWreckedCars=api;
})(typeof window!=='undefined'?window:globalThis);
