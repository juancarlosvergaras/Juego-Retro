(function(root){
 'use strict';
 // Keep native display refresh and 120 Hz physics. Only the DOM is throttled;
 // a frozen paused world does not need to be redrawn at every display frame.
 function create(){let lastHud=-Infinity,previous='';
  return{plan(t,{paused=false,hidden=false,width=0,height=0}={}){
   const key=[paused,hidden,width,height].join('|'),changed=key!==previous;previous=key;
   if(hidden){lastHud=-Infinity;return{render:false,hud:false};}
   const render=changed||!paused,hud=changed||!paused&&t-lastHud>=50-.25;
   if(hud)lastHud=changed||!Number.isFinite(lastHud)?t:lastHud+Math.max(1,Math.floor((t-lastHud+.25)/50))*50;
   return{render,hud};
  }};
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeFrameBudget=api;
})(typeof window!=='undefined'?window:globalThis);
