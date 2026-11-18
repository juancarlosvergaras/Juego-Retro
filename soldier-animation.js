(function(root){
  'use strict';
  // Interior morph poses use the current soldier's costume and pixel detail.
  // The two endpoints are the actual gameplay sprites, not redrawn stand-ins.
  const transformationFrames=[[[127,85,195,353],[532,122,239,316],[982,118,252,320],[1395,89,265,353],[73,558,318,274],[484,500,328,333],[901,467,356,370],[1367,467,335,370]]];
  function transformation(frame){
    frame=Math.max(0,Math.min(7,frame));
    if(frame===0)return{sheet:'soldier',row:0,frame:0,scale:46/145};
    if(frame===7)return{sheet:'wolf',row:0,frame:7,scale:.48};
    const heights=[46,41,43,49,50,58,65,65.76];
    return{sheet:'transformation',row:0,frame,scale:heights[frame]/transformationFrames[0][frame][3]};
  }
  function meleeFrame(action,slot){
    if(!action||action.slot!==slot||action.age>=action.duration)return 0;
    const t=Math.max(0,action.age/action.duration);
    return t<.14?1:t<.28?2:t<.43?3:t<.57?4:t<.73?5:t<.9?6:7;
  }
  const wolfJumpFrames=[[[10,238,345,205],[390,206,350,237],[770,205,438,238],[1208,198,320,245],[13,639,364,251],[398,640,353,250],[768,700,377,190],[1168,672,356,218]]];
  function wolfAirPose(p){
    if(p.wolfSprintJump&&!p.rope&&!p.ladder&&!p.jetpack&&!(p.hurt>0)){
      if(p.grounded)return p.landing>0?{sheet:'jump',row:0,frame:p.landing>.12?6:7}:null;
      return{sheet:'jump',row:0,frame:p.vy< -430?0:p.vy< -310?1:p.vy< -110?2:p.vy<110?3:p.vy<350?4:5};
    }
    if(p.grounded)return p.landing>0?{row:3,frame:p.landing>.14?5:p.landing>.06?6:7}:null;
    // Separate launch, apex, descent and impact; row 3 / frame 4 is a standing pose.
    if(p.vy< -240)return{row:2,frame:3};
    if(p.vy< -70)return{row:2,frame:4};
    if(p.vy<70)return{row:2,frame:5};
    return{row:3,frame:p.vy<250?0:p.vy<450?1:2};
  }
  // Fixed scale and row baselines preserve body size while the head folds down.
  const wolfRamFrames=[[[39,199,432,251,null,220],[542,206,382,244,null,195],[1021,224,473,226,null,225],[39,619,423,248,null,205],[526,637,455,230,null,218],[1034,619,461,248,null,235]]];
  const wolfRamScale=.20;
  const wolfComboScale=.31;
  const wolfComboFrames=[
    [[29,33,198,212,null,116],[273,33,208,212,null,116],[517,39,264,206,null,121],[793,36,266,209,null,100],[1073,34,221,211,null,94],[1318,36,184,209,null,97]],
    [[28,283,198,213,null,117],[273,283,202,213,null,116],[531,285,211,211,null,107],[789,289,275,207,null,104],[1077,288,216,208,null,90],[1315,286,189,210,null,100]],
    [[28,600,235,153,null,117],[290,553,207,200,null,99],[527,517,211,236,null,111],[784,513,209,240,null,109],[1065,544,191,209,null,102],[1315,540,189,213,null,100]],
    [[31,778,195,215,null,114],[284,778,171,215,null,105],[538,778,182,215,null,100],[767,779,288,214,null,126],[1066,779,194,214,null,101],[1307,779,191,214,null,108]]
  ];
  // Tight, non-overlapping crops; every row shares a floor and hip origin.
  const wolfActionScale=.31;
  const wolfActionFrames=[
    [[28,37,191,213,null,112],[291,37,192,213,null,109],[548,35,184,215,null,107],[801,25,174,225,null,109],[1050,44,188,206,null,115],[1307,37,191,213,null,113]],
    [[32,298,197,207,null,108],[294,275,176,230,null,106],[539,273,179,232,null,116],[796,271,167,234,null,114],[1042,316,184,189,null,123],[1308,291,191,214,null,112]],
    [[38,531,192,215,null,102],[296,527,171,219,null,104],[539,524,175,222,null,116],[788,524,239,222,null,122],[1059,530,181,216,null,106],[1312,530,189,216,null,108]],
    [[44,785,178,217,null,96],[293,775,223,227,null,107],[539,772,246,230,null,116],[806,774,168,228,null,104],[1053,789,173,213,null,112],[1310,789,189,213,null,110]]
  ];
  function wolfIdlePose(p,mode={}){
    if(p.form!=='wolf'||!p.grounded||Math.abs(p.vx)>15||p.sprinting||p.ladder||p.rope||p.jetpack||p.transform>0||p.hurt>0||p.landing>0||p.claw>0||p.kick>0||p.slide>0||p.ram||p.wolfAttack||mode.crouching||mode.sliding)return null;
    const pose={row:0,frame:0,scale:wolfActionScale,lift:0};
    if((p.idleTime||0)<6)return pose;
    const phase=(p.idleTime-6)%14;
    if(phase<2.5)pose.frame=phase<.3?0:phase<.6?1:phase<.8?2:phase<1.8?3:phase<2.15?4:5;
    else if(phase>=7&&phase<8){const t=phase-7;pose.row=1;pose.frame=t<.16?0:t<.29?1:t<.48?2:t<.66?3:t<.84?4:5;pose.lift=t>.16&&t<.66?Math.sin((t-.16)/.5*Math.PI)*7:0;}
    return pose;
  }
  function wolfComboPose(p){
    const a=p.wolfAttack;if(p.form!=='wolf'||!a)return null;
    const t=Math.max(0,Math.min(.999,a.age/a.duration));
    if(a.kind==='kick')return{sheet:'actions',row:p.kickAir?3:2,frame:p.kickAir?(t<.12?0:t<.25?1:t<.60?2:t<.76?3:t<.90?4:5):(t<.12?0:t<.24?1:t<.34?2:t<.64?3:t<.84?4:5),scale:wolfActionScale};
    return{sheet:'combo',row:a.kind==='kick'?3:a.stage-1,frame:t<.14?0:t<.3?1:t<.43?2:t<.64?3:t<.83?4:5,scale:wolfComboScale};
  }
  function wolfRamPose(p){
    if(p.form!=='wolf'||!p.ram)return null;
    const age=Math.max(0,.36-p.ram.remaining);
    return{row:0,frame:age<.045?0:age<.09?1:age<.16?2:age<.23?3:age<.30?4:5};
  }
  function wolfSprintPose(p){
    if(p.ram)return null;
    if(p.form!=='wolf'||!p.sprinting||!p.grounded||Math.abs(p.vx)<30||p.ladder||p.rope||p.jetpack||p.transform>0||p.hurt>0||p.landing>0||p.claw>0||p.kick>0||p.slide>0)return null;
    return{row:0,frame:Math.floor(((p.sprintCycle||0)%1+1)%1*8)};
  }
  function wolfWalkPose(p,mode={}){
    if(p.form!=='wolf'||!p.grounded||Math.abs(p.vx)<=15||p.sprinting||p.ladder||p.rope||p.jetpack||p.transform>0||p.hurt>0||p.landing>0||p.claw>0||p.kick>0||p.slide>0||mode.crouching||mode.sliding)return null;
    return{row:0,frame:Math.floor(((p.walkCycle||0)%1+1)%1*8)};
  }
  function pose(p,mode={},encounter={}){
    // Position drives the climbing cycle, so stopping on a rung freezes the pose.
    if(p.ladder)return{sheet:'mobility',row:0,frame:((Math.floor(p.y/6.5)%4)+4)%4,armed:false};
    if(p.rope?.mantle)return{sheet:'mobility',row:0,frame:Math.floor(p.rope.mantle.age*8)%2,armed:false};
    if(p.rope)return{sheet:'mobility',row:1,frame:p.rope.surface?Math.floor(p.hangCycle||0)%4:Math.floor((p.anim||0)*4)%4,armed:false};
    const slot=encounter.inventory?.selected,action=encounter.weaponAction;
    const melee=slot===1||slot===2,attacking=!!action&&action.slot===slot&&action.age<action.duration;
    if(melee&&!mode.sliding&&!mode.crouching&&!(p.landing>0)&&(p.grounded||p.jetpack||attacking))return{sheet:'melee',row:slot-1,frame:meleeFrame(action,slot),armed:false};
    if(p.jetpack){const a=p.aim||{x:p.facing,y:0};return{row:a.y?(a.y<0?6:7):5,frame:a.y?(Math.abs(a.x)>.2?3:0):attacking&&action.age<.1?1:0,armed:true};}
    const moving=Math.abs(p.vx)>15,cycle=Math.floor((p.walkCycle||0)*6)%6;
    if(mode.sliding&&p.grounded)return{sheet:'slide',row:0,frame:Math.min(5,Math.floor((1-p.slide/.44)*6)),armed:false};
    if(p.landing>0&&p.grounded)return{row:4,frame:p.landing>.14?3:p.landing>.06?4:5,armed:false};
    if(!p.grounded){
      const action=encounter.weaponAction;
      const firing=action&&(!encounter.inventory||action.slot===encounter.inventory.selected)&&action.age<Math.max(.26,Math.min(action.duration||0,.4));
      if(firing){
        const aim=p.aim||{x:p.facing,y:0};
        if(aim.y)return{row:aim.y<0?6:7,frame:Math.abs(aim.x)>.2?3:0,armed:true};
        return{row:3,frame:1,armed:true};
      }
      return p.vy>0?{row:4,frame:p.vy<220?0:p.vy<450?1:2,armed:false}:{row:3,frame:p.vy< -200?1:2,armed:false};
    }
    // Rest on the current low step: changing atlases here changes body proportions.
    if(mode.crouching)return{sheet:'crouch',row:0,frame:cycle,armed:false};
    if(mode.sliding)return{row:3,frame:0,armed:false};
    if(p.idleGesture)return{row:0,frame:Math.floor((p.idleTime||0)*2)%6,armed:false};
    const a=p.aim||{x:p.facing,y:0};
    if(a.y)return{row:a.y<0?6:7,frame:(Math.abs(a.x)>.2?3:0)+Math.floor(p.anim*3)%3,armed:true};
    if(moving)return{row:Math.abs(p.vx)>170?2:1,frame:cycle,armed:true};
    const age=encounter.weaponAction?encounter.weaponAction.age:10;
    return{row:5,frame:age<.1?1:age<.2?2:0,armed:true};
  }
  function grip(p,mode={},encounter={}){
    const f=pose(p,mode,encounter);
    const points={1:[[10,-24],[11,-24],[12,-24],[11,-24],[12,-24],[12,-24]],2:[[16,-25],[18,-24],[16,-25],[16,-27],[19,-24],[16,-25]],5:[[13,-30],[13,-33],[13,-30],[13,-30],[13,-33],[13,-30]],6:[[6,-45],[6,-44],[6,-44],[13,-39],[13,-39],[14,-39]],7:[[7,-19],[7,-19],[7,-19],[10,-21],[10,-21],[10,-21]]};
    points[3]=[[12,-24],[13,-32],[13,-26],[13,-26],[12,-24],[12,-24]];
    const [x,y]=(points[f.row]||points[5])[f.frame]||points[5][0];
    if(encounter.inventory?.selected===7){const aim=p.aim||{x:p.facing||1,y:0},angle=Math.atan2(aim.y,aim.x*(p.facing||1));return{x:x+Math.cos(angle)*9,y:y+Math.sin(angle)*9};}
    return{x,y};
  }
  function weaponGrip(slot){return slot<=2?{x:13,y:0}:slot===3?{x:18,y:3}:slot===7?{x:25,y:0}:slot===8?{x:12,y:3}:slot===9?{x:16,y:0}:{x:12,y:3};}
  function gait(p,mode={}){
    if(p.ladder||p.rope||p.transform>0||p.form==='wolf')return null;
    if(p.jetpack)return{row:4,frame:0,split:21,bob:0,flight:true};
    if(!p.grounded||Math.abs(p.vx)<=15||p.landing>0||mode.crouching||mode.sliding)return null;
    const phase=((p.walkCycle||0)%1+1)%1;
    return{row:Math.abs(p.vx)>170?2:1,frame:Math.floor(phase*6),split:21,bob:-(Math.sin(phase*Math.PI*2)**2)*1.2};
  }
  function advanceWalk(p,dt){
    if(p.grounded)p.walkCycle=(p.walkCycle||0)+Math.abs(p.vx)*dt/(p.form==='wolf'?110:Math.abs(p.vx)>170?82:52);
  }
  // All missions compose the equipped torso over the same distance-driven feet.
  // In particular, a melee sheet must not bypass locomotion with its idle legs.
  function drawGait(ctx,p,steps,drawLegs,drawTorso,melee=null){
    if(!steps)return drawTorso(0);
    ctx.save();ctx.beginPath();ctx.rect(p.x-80,p.y-steps.split,160,steps.split+3);ctx.clip();
    if(steps.flight){const sway=Math.max(-.08,Math.min(.08,(p.vx||0)/3500))+Math.sin((p.anim||0)*4)*.025;ctx.translate(p.x,p.y-steps.split);ctx.rotate(sway);ctx.translate(-p.x,-(p.y-steps.split));}
    drawLegs(steps.frame);ctx.restore();
    ctx.save();ctx.beginPath();ctx.rect(p.x-80,p.y-100,160,100-steps.split+1);
    // Low-held blades and a downward axe swing extend below the belt, in front
    // of the legs. Keep that part of the original art instead of cutting it off.
    if(melee){
      const knife=[[-10,-22],[-9,-14],[-2,-14],[0,-16],[10,-18],[12,-22]];
      const axe=[[-2,-23],[0,-16],[8,-15],[13,-17],[17,-14],[25,-14],[25,-25]];
      const chop=[[2,-23],[4,-16],[20,-7],[29,-1],[49,-1],[52,-30],[25,-30]];
      const blade=melee.row===0?(melee.frame===5?[[1,-23],[12,-16],[15,-18],[9,-23]]:knife):([3,4].includes(melee.frame)?chop:axe);
      const contour=blade.map(([x,y])=>[p.x+x*(p.facing||1),p.y+y+steps.bob]);
      if(contour.reduce((sum,[x,y],i)=>{const next=contour[(i+1)%contour.length];return sum+x*next[1]-next[0]*y;},0)<0)contour.reverse();
      contour.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x,y));ctx.closePath();
    }
    ctx.clip();
    const height=drawTorso(steps.bob);ctx.restore();return height;
  }
  const api={wolfJumpFrames,pose,grip,weaponGrip,gait,advanceWalk,drawGait,meleeFrame,wolfIdlePose,wolfActionFrames,wolfActionScale,wolfAirPose,wolfComboPose,wolfComboFrames,wolfComboScale,wolfRamPose,wolfRamFrames,wolfRamScale,wolfSprintPose,wolfWalkPose,transformation,transformationFrames};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeSoldierAnimation=api;
})(typeof window!=='undefined'?window:globalThis);

