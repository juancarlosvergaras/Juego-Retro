(function(root){
 'use strict';
 const WIDTH=7800,WORLD={width:WIDTH,ground:620,top:-600,height:1300,floors:0};
 function geometry(){const platforms=[{id:'air-deck',x:0,y:620,w:WIDTH,kind:'ground',thickness:160,noBurrow:true}];for(const [i,[x,y,w]] of [[850,544,150],[1250,480,330],[1910,540,140],[2410,450,390],[3090,535,180],[3560,440,420],[4310,535,170],[4750,465,380],[5440,535,180],[6220,470,170],[7170,470,170]].entries())platforms.push({id:'air-platform-'+i,x,y,w,kind:'deck',solid:w<200&&i<9,thickness:w<200&&i<9?620-y:18,floor:i+1});return{platforms,ladders:[],anchors:[],buildings:[],bridges:[],barricades:[]};}
 function soldiers(defeated=[]){const N=typeof module!=='undefined'&&module.exports?require('./enemies'):root.ArcadeEnemies,spawns=[[670,620,'rifle'],[1100,620,'knife'],[1400,480,'turret'],[1780,620,'rifle'],[2150,620,'knife'],[2580,450,'turret'],[2950,620,'rifle'],[3410,620,'rifle'],[3720,440,'turret'],[4140,620,'knife'],[4880,465,'turret'],[5190,620,'rifle'],[5580,535,'knife'],[5850,620,'rifle']];spawns.push(...[1550,2850,4020,5300,5750].map((x,i)=>[x,390-i%2*55,'jetSoldier']));return spawns.map(([x,y,kind],i)=>{const n=N.createSoldier({x,y,kind,grounded:true,grenadier:kind==='jetSoldier'||kind==='rifle'&&i%3===0},'air-'+i);n.shot=1.2+i*.11;if(defeated.includes(n.id))n.hp=0;return n;});}
 function loot(saved={},platforms=geometry().platforms){return{weapons:[3,5,4,6,5,9,8,6,5,4].map((slot,i)=>{
   const x=380+i*585,box=platforms.find(p=>p.solid&&x>=p.x&&x<=p.x+p.w);
   return {id:7300+i,x,y:(box?.y??WORLD.ground)-24,slot,taken:!!saved.weapons?.includes(7300+i)};
  }),stars:[{x:1370,y:453},{x:3650,y:410},{x:4950,y:435}].map((p,i)=>({...p,id:7400+i,taken:!!saved.stars?.includes(7400+i)})),medkits:[2090,3950,5880].map((x,i)=>({id:7500+i,x,y:604,taken:!!saved.medkits?.includes(7500+i)})),fuelTanks:[1700,4500].map((x,i)=>({id:7600+i,x,y:602,taken:!!saved.fuelTanks?.includes(7600+i)}))};}
 const api={WIDTH,EXTRACTION:7460,WORLD,geometry,soldiers,loot};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeLevelThree=api;
})(typeof window!=='undefined'?window:globalThis);
