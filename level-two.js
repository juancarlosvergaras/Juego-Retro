(function(root){
  'use strict';
  const WORLD={top:-640,width:18000,height:800,ground:620,roof:120,floors:0};
  const AIRSHIP={x:8600,w:800,y:-230,sourceWidth:2172,sourceDeck:566,deckLeft:720,deckRight:1390,rewardX:9000};
  function airshipPlatform(){const s=AIRSHIP.w/AIRSHIP.sourceWidth;return{id:5000,x:AIRSHIP.x+AIRSHIP.deckLeft*s,y:AIRSHIP.y,w:(AIRSHIP.deckRight-AIRSHIP.deckLeft)*s,kind:'deck',thickness:12,airship:true};}
  const INTERIOR_WIDTH=2500,ENTRANCE=17440;
  // The sprite is wider at the bottom steps; only the upper cornice supports feet.
  const PEDESTAL={x:2055,y:524,w:250,h:96,topInset:26};
  function pedestalPlatform(){return{id:4200,x:PEDESTAL.x+PEDESTAL.topInset,y:PEDESTAL.y,w:PEDESTAL.w-PEDESTAL.topInset*2,kind:'deck',thickness:12,pedestal:true};}
  const CRATER={x:5550,w:347.52,road:620,surface:628,profile:[[5550,620],[5598,620],[5614,622.56],[5630,628.96],[5654,643.84],[5678,651.68],[5710,652.32],[5742,652.8],[5774,652.64],[5798,649.12],[5822,635.36],[5838,620],[5897.52,620]]};
  // Extend only the basin: the banks retain their original slope and rock scale.
  const LONG_CRATER={x:8280,w:1120,road:620,surface:628};
  LONG_CRATER.profile=CRATER.profile.map(([x,y])=>{const offset=x-CRATER.x,left=128,right=217.6,extra=LONG_CRATER.w-CRATER.w;return[LONG_CRATER.x+offset+(offset<=left?0:offset>=right?extra:extra*(offset-left)/(right-left)),y];});
  const CRATERS=[CRATER,LONG_CRATER];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function smooth(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
  function atmosphere(x,inside=false){return{rain:inside?0:smooth(7700,9500,x),dusk:inside?1:smooth(8100,11000,x),cemetery:smooth(8000,9700,x),mechas:smooth(2700,3400,x)};}
  function zone(x,inside=false){return inside?'El mausoleo del rey':x<3300?'Ciudad en ruinas':x<8100?'Los gigantes dormidos':x<9700?'La última avenida':x<16500?'Cementerio de los caídos':'El umbral del rey';}
  function barricades(){return[
    {id:'city',image:'barricadeCity',x:2340,y:620,w:420,frame:[16,218,2142,400],baseline:616,guardLedges:[4,6],ledges:[[28,130,534],[130,260,458],[260,363,382],[363,524,334],[524,1010,270],[1010,1165,354],[1165,1650,270],[1650,1810,334],[1810,1913,382],[1913,2045,458],[2045,2144,534]]},
    {id:'cemetery',image:'barricadeCemetery',x:12900,y:620,w:520,frame:[16,230,2140,386],baseline:614,guardLedges:[3,7],ledges:[[32,105,554],[105,225,480],[225,350,370],[350,816,245],[816,885,488],[885,1115,400],[1115,1360,488],[1360,1820,245],[1820,1960,392],[1960,2065,493],[2065,2145,562]]}
  ].map(b=>({...b,platforms:b.ledges.map(([left,right,top],i)=>({id:1000+(b.id==='city'?0:100)+i,x:b.x+(left-b.frame[0])*b.w/b.frame[2],y:b.y-(b.baseline-top)*b.w/b.frame[2],w:(right-left)*b.w/b.frame[2],kind:'barricade',solid:true,thickness:(b.baseline-top)*b.w/b.frame[2],barricade:b.id}))}));}
  function wreckedCars(){return[
    {x:1265,w:155,frame:[14,208,743,239],baseline:446,smoke:[663,324],ledges:[[30,142,300],[142,222,254],[222,452,215],[452,535,269],[535,699,286],[699,744,337]]},
    {x:5310,w:163,frame:[787,172,736,275],baseline:446,smoke:[1430,296],ledges:[[800,1058,275],[1058,1240,181],[1240,1330,237],[1330,1455,254],[1455,1510,323]]},
    {x:6660,w:164,frame:[11,688,746,255],baseline:942,smoke:[646,819],ledges:[[28,74,817],[74,143,733],[143,475,715],[475,578,779],[578,690,783],[690,748,843]]},
    {x:7150,w:170,frame:[778,601,748,341],baseline:941,smoke:[1450,796],ledges:[[790,818,751],[818,905,633],[905,1300,622],[1300,1380,708],[1380,1493,743],[1493,1516,810]]}
  ].map((car,id)=>{const scale=car.w/car.frame[2],y=WORLD.ground;return{...car,id,y,smoke:{x:car.x+(car.smoke[0]-car.frame[0])*scale,y:y-(car.baseline-car.smoke[1])*scale},platforms:car.ledges.map(([left,right,top],i)=>({id:2000+id*10+i,x:car.x+(left-car.frame[0])*scale,y:y-(car.baseline-top)*scale,w:(right-left)*scale,thickness:(car.baseline-top)*scale,kind:'wreck',solid:true,car:id}))};});}
  function scaffolds(){return [[900,250],[1280,250]].map(([x,w],i)=>{
    const frame=[36,89,1465,819],scale=w/frame[2],base=908,at=(sx,sy)=>({x:x+(sx-frame[0])*scale,y:WORLD.ground-(base-sy)*scale}),id=4100+i*10;
    const ledges=[[50,1490,600,true],[176,1354,144,false],[66,184,90,true],[1354,1470,90,true]],platforms=ledges.map(([left,right,top,solid],j)=>({...at(left,top),id:id+j,w:(right-left)*scale,kind:solid?'scaffold':'deck',solid,thickness:solid?(base-top)*scale:12*scale,scaffold:i}));
    const roosts=[{...at(128,255),side:-1},{...at(1406,255),side:1}];return{id:i,x,w,y:WORLD.ground,frame,scale,platforms,roost:roosts[0],roosts};
  });}
  function geometry(inside=false){
    // Source-space ledges match the opaque masonry, excluding rubble and sloped glass edges.
    const styles=[
      {width:384,frame:[11,13,376,534],ledges:[[35,367,419],[35,367,307],[35,367,197],[50,367,90]]},
      {width:376,frame:[399,22,364,527],ledges:[[420,739,420],[420,739,307],[420,739,197],[445,739,84]]},
      {width:400,frame:[774,8,398,541],ledges:[[870,1119,421],[870,1119,308],[870,1119,197],[871,1137,78]]},
      {width:346,frame:[1189,9,338,541],ledges:[[1213,1502,420],[1213,1502,308],[1213,1502,199],[1213,1502,82]]}
    ];
    const groups=[[720,[0,1],.7],[1660,[2,3],.7],[2800,[1,0,3],.68],[4700,[2,1],.72],[5930,[3,0],.7],[7430,[1,2,3],.68]];
    const buildings=[];
    if(!inside)for(const [start,variants,scale] of groups){let x=start;for(const art of variants){const style=styles[art],w=style.width*scale,[sx,sy,sw,sh]=style.frame;
      const decks=style.ledges.map(([left,right,y])=>({x:x+(left-sx)*w/sw,y:WORLD.ground-(sy+sh-y)*scale,w:(right-left)*w/sw}));
      const floors=decks.map(d=>d.y),y=floors[floors.length-1];buildings.push({x,w,h:WORLD.ground-y,y,art,scale,floors,decks});x+=w;}}
    if(!inside){
      const x=9450,scale=.62,w=376*scale,extraFloors=4,repeat=113*scale,offset=extraFloors*repeat;
      const decks=[{x:x+24*scale,y:620-128*scale,w:332*scale},...Array.from({length:extraFloors},(_,i)=>({x:x+24*scale,y:620-128*scale-(i+1)*repeat,w:332*scale})),...[307,197,90].map(y=>({x:x+24*scale,y:620-(547-y)*scale-offset,w:332*scale}))];
      const floors=decks.map(d=>d.y),y=floors.at(-1);buildings.push({x,w,h:620-y,y,art:0,scale,decks,floors,tall:true,extraFloors});
    }
    const ground={id:0,x:0,y:WORLD.ground,w:inside?INTERIOR_WIDTH:WORLD.width,kind:'ground',thickness:36};
    if(!inside)ground.terrain=CRATERS.flatMap(a=>a.profile);
    const barriers=inside?[]:barricades(),cars=inside?[]:wreckedCars(),interiorScaffolds=inside?scaffolds():[];
    const bridges=[];
    if(!inside){
      // Keep the original bridge first so saved guard IDs remain stable.
      // The second spans the blue wreck between the brick block and offices.
      for(const [leftBuilding,rightBuilding] of [[8,9],[1,2]]){
        const left=buildings[leftBuilding].decks[2],right=buildings[rightBuilding].decks[2],x=left.x+left.w-10,end=right.x+10;
        bridges.push({id:3000+bridges.length,x,y:right.y,w:end-x,kind:'deck',floor:3,thickness:18,bridge:true,leftBuilding,rightBuilding,terrain:[[x,left.y],[end,right.y]]});
      }
    }
    const platforms=[ground,...buildings.flatMap((b,i)=>b.decks.map((d,f)=>({id:i*4+f+1,...d,kind:'deck',thickness:7,building:i,floor:f+1}))),...barriers.flatMap(b=>b.platforms),...cars.flatMap(car=>car.platforms),...bridges,...interiorScaffolds.flatMap(s=>s.platforms),...(inside?[pedestalPlatform()]:[airshipPlatform()])];
    const ladders=buildings.flatMap(b=>b.decks.map((d,i)=>{const below=i?b.decks[i-1]:d,left=Math.max(d.x,below.x),right=Math.min(d.x+d.w,below.x+below.w);return{x:i%2?right-24:left+24,top:d.y,bottom:i?below.y:WORLD.ground};}));
    return{buildings,platforms,ladders,barricades:barriers,cars,bridges,scaffolds:interiorScaffolds};
  }
  function solidWalls(){/* Open rooms: only the one-way floor platforms collide. */}
  function createCivilians(){return Array.from({length:9},(_,i)=>({id:i,variant:i%4,sex:i%2,x:130+i*108,y:WORLD.ground,speed:88+(i%3)*13,phase:i*.31,age:0,shouted:false}));}
  function updateCivilians(civilians,dt,shout=()=>{}){for(const p of civilians){p.age+=dt;p.x-=p.speed*dt;p.phase+=p.speed*dt/52;if(!p.shouted&&p.age>.2+p.id*.25){p.shouted=true;shout(p);}}return civilians.filter(p=>p.x>-80);}
  function canEnter(p,inside){return !inside&&Math.abs(p.x-ENTRANCE)<60&&Math.abs(p.y-WORLD.ground)<10;}
  function finishClimb(p,ladder,g){
    if(!ladder||p.ladder||Math.abs(p.y-ladder.top)>.5)return;
    const roof=g.platforms.find(s=>s.kind==='deck'&&s.y===ladder.top&&ladder.x>=s.x-15&&ladder.x<=s.x+s.w+15);
    if(!roof)return;
    p.x=clamp(p.x,roof.x+p.w/2+2,roof.x+roof.w-p.w/2-2);p.y=roof.y;p.vx=0;p.vy=0;p.grounded=true;p.ground=roof;p.jumps=0;p.fallPeak=p.y;
  }
  function canExit(p,inside){return inside&&p.x<170&&Math.abs(p.y-WORLD.ground)<10;}
  const api={WORLD,INTERIOR_WIDTH,ENTRANCE,PEDESTAL,pedestalPlatform,CRATER,CRATERS,AIRSHIP,airshipPlatform,geometry,barricades,scaffolds,wreckedCars,atmosphere,zone,solidWalls,finishClimb,canEnter,canExit,createCivilians,updateCivilians};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeLevelTwo=api;
})(typeof window!=='undefined'?window:globalThis);
