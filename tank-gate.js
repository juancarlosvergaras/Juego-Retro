(function(root){
 'use strict';
 const WALL={id:'tank-gate',kind:'tankGate',x:4470,y:-40,w:104,thickness:700,solid:true};
 const closed=t=>!!t&&t.hp>0;
 function sync(platforms,t){const index=platforms.findIndex(p=>p.id===WALL.id);if(closed(t)&&index<0)platforms.push({...WALL});else if(!closed(t)&&index>=0)platforms.splice(index,1);}
 function constrain(p,oldX,t){if(!closed(t))return false;const half=(p.w||23)/2,left=WALL.x-half,right=WALL.x+WALL.w+half;let x=p.x;if(oldX<=left&&x>left)x=left;else if(oldX>=right&&x<right)x=right;else if(oldX>left&&oldX<right)x=oldX<WALL.x+WALL.w/2?left:right;if(x===p.x)return false;p.x=x;p.vx=0;if(p.rope?.surface?.id===WALL.id)p.rope=null;return true;}
 let wallTexture;
 function draw(c,t,time,view,image){
  if(!t||!image||(!closed(t)&&t.deathAge>1.4)||view&&(WALL.x>view.right||WALL.x+WALL.w<view.left))return;
  if(!wallTexture){wallTexture=document.createElement('canvas');wallTexture.width=WALL.w;wallTexture.height=660;const ctx=wallTexture.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';for(let y=0;y<660;y+=104)ctx.drawImage(image,0,y,104,104);
   ctx.fillStyle='#111a2180';ctx.fillRect(0,0,5,660);ctx.fillRect(99,0,5,660);ctx.fillStyle='#a99b7a';ctx.fillRect(5,0,2,660);ctx.fillStyle='#343d3d';ctx.fillRect(10,0,4,660);ctx.fillRect(90,0,4,660);for(let y=12;y<660;y+=38){ctx.fillStyle='#afb1a0';ctx.fillRect(11,y,2,2);ctx.fillRect(91,y,2,2);}
   ctx.fillStyle='#1b282cf0';ctx.fillRect(19,545,66,46);ctx.strokeStyle='#8f8055';ctx.strokeRect(19.5,545.5,65,45);ctx.textAlign='center';ctx.fillStyle='#e0bf76';ctx.font='bold 8px monospace';ctx.fillText('BLOQUEADO',52,560);ctx.font='7px monospace';ctx.fillText('DERROTA',52,574);ctx.fillText('AL TANQUE',52,584);
  }
  c.save();c.globalAlpha=closed(t)?1:Math.max(0,1-t.deathAge/1.4);c.drawImage(wallTexture,WALL.x,WALL.y);c.restore();
 }
 const api={WALL,closed,sync,constrain,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeTankGate=api;
})(typeof window!=='undefined'?window:globalThis);
