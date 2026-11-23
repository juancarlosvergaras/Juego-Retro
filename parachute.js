(function(root){
  'use strict';
  const FLIGHT=4.6,LAND=.55,COLLAPSE=1.2,DURATION=FLIGHT+LAND+COLLAPSE;
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  function sample(age,ground=620){
    const t=Math.max(0,Math.min(age,DURATION)),flight=t<FLIGHT,u=Math.min(1,t/FLIGHT),landing=Math.max(0,t-FLIGHT),collapse=Math.max(0,landing-LAND)/COLLAPSE;
    return{active:t<DURATION,flight,landed:!flight,x:240-80*(1-smooth(u))+Math.sin(u*Math.PI*2)*6*(1-u),y:ground-310*(1-smooth(u)),frame:flight?Math.floor(t*5)%4:4+Math.min(3,Math.floor(collapse*4)),collapse:smooth(collapse),alpha:1-smooth((collapse-.7)/.3),crouch:!flight&&landing<LAND,age:t};
  }
  function advance(age,dt,fast){return Math.min(DURATION,age+Math.max(0,dt)*(fast&&age<FLIGHT?3:1));}
  function drawCanopy(c,image,p,a,zoom=1){
    if(!image)return;
    const w=image.width/4,h=image.height/2,k=.34*zoom;
    const x=p.x-(a.flight?0:65*a.collapse)*zoom,y=p.y-34*(a.flight?1:1-a.collapse)*zoom;
    c.save();c.globalAlpha*=a.alpha;
    c.drawImage(image,a.frame%4*w,Math.floor(a.frame/4)*h,w,h,Math.round(x-192*k),Math.round(y-470*k),384*k,512*k);
    c.restore();
  }
  const api={advance,sample,drawCanopy,FLIGHT,DURATION};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeParachute=api;
})(typeof window!=='undefined'?window:globalThis);
