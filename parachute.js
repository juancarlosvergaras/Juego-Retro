(function(root){
  'use strict';
  const FLIGHT=4.6,LAND=.55,COLLAPSE=1.2,DURATION=FLIGHT+LAND+COLLAPSE;
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  function sample(age,ground=620){
    const t=Math.max(0,Math.min(age,DURATION)),flight=t<FLIGHT,u=Math.min(1,t/FLIGHT),landing=Math.max(0,t-FLIGHT),collapse=Math.max(0,landing-LAND)/COLLAPSE;
    return{active:t<DURATION,flight,landed:!flight,x:240-80*(1-smooth(u))+Math.sin(u*Math.PI*2)*6*(1-u),y:ground-310*(1-smooth(u)),frame:flight?Math.floor(t*5)%4:4+Math.min(3,Math.floor(collapse*4)),collapse:smooth(collapse),alpha:1-smooth((collapse-.7)/.3),crouch:!flight&&landing<LAND,age:t};
  }
  function advance(age,dt,fast){return Math.min(DURATION,age+Math.max(0,dt)*(fast&&age<FLIGHT?3:1));}
  const api={advance,sample,FLIGHT,DURATION};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeParachute=api;
})(typeof window!=='undefined'?window:globalThis);
