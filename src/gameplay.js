// Pure game rules: no React, external services or client-side timers.
export const roadX = z => Math.sin(z * .004) * 48 + Math.sin(z * .012) * 10;
export const CHALLENGES = {
  slalom: { id:'slalom', name:'SLALOM-SPRINT', reward:1000, limit:40, x:roadX(-24), z:-24, radius:5 },
  wheelie: { id:'wheelie', name:'WHEELIE-BALANCE', reward:1000, limit:35, goal:4, x:roadX(-240), z:-240, radius:6 },
  hunt: { id:'hunt', name:'GOLDENE SCHLÜSSELSUCHE', reward:1250, limit:120, x:roadX(-445), z:-445, radius:6 },
};
export const WORKSHOPS = {
  garage: { x:roadX(74)+12, z:74, radius:9, name:'MURAT GARAGE' },
  home: { x:roadX(158)-12, z:158, radius:9, name:'ZUHAUSE' },
};
export const PLACES = { ...CHALLENGES, ...WORKSHOPS };
export const SLALOM_CONES = Array.from({length:7},(_,i)=>{
  const z=-40-i*11;
  return { x:roadX(z), z, side:i%2===0?1:-1 };
});
export const SLALOM_FINISH=-122;
export const MAX_WHEELIE_PITCH=.87;
export const WHEELIE_BAND=[.23,.7];
// The collectible sits near the road, beyond the hunt zone, away from other zones.
export const TREASURE_SPAWNS = [-480,-496,-512,-529,-545,-561].flatMap((z,i)=>
  [ {x:roadX(z)+8.5+(i%3),z}, {x:roadX(z)-8.5-(i%2),z:z-(i%2?3:0)} ]);
export function nextTreasureIndex(previous=-1,random=Math.random) {
  const length=TREASURE_SPAWNS.length;
  const index=Math.min(length-2,Math.max(0,Math.floor(random()*(length-1))));
  return previous<0?Math.min(length-1,Math.floor(random()*length)):(index>=previous?index+1:index);
}
export function updateWheelie(p,holding,braking,dt) {
  const speedFactor=Math.max(0,Math.min(1,(p.speed-2)/8));
  const torque=holding&&!braking?3.45*speedFactor:0;
  const gravity=.57+1.8*Math.sin(p.pitch);
  p.pitchVel+=(torque-gravity-(braking?5:0))*dt;
  p.pitchVel*=Math.exp(-1.65*dt);
  p.pitch+=p.pitchVel*dt;
  if(p.pitch<=0){p.pitch=0;p.pitchVel=Math.max(0,p.pitchVel);}
  return p.pitch>=MAX_WHEELIE_PITCH;
}
export function createChallengeState() {
  return {active:null,remaining:0,progress:0,held:0,lastZone:null,uiTimer:0,target:null,lastTreasureIndex:-1};
}
function crossingX(before,after,z){
  if(!(before.z>z&&after.z<=z))return null;
  const fraction=(before.z-z)/(before.z-after.z);
  return before.x+(after.x-before.x)*fraction;
}
function result(state,type,reason,emit){
  const id=state.active;
  state.active=null; state.target=null;state.uiTimer=0;
  emit({type,id,reason,progress:state.progress,total:id==='slalom'?SLALOM_CONES.length:id==='wheelie'?CHALLENGES.wheelie.goal:1});
}
export function failChallenge(state,reason,emit){
  if(state.active)result(state,'failed',reason,emit);
}
export function updateChallenges(state,before,player,dt,emit,random=Math.random){
  const zone=Object.values(CHALLENGES).find(c=>Math.hypot(player.x-c.x,player.z-c.z)<=c.radius)?.id??null;
  if(!state.active&&zone&&zone!==state.lastZone&&!player.fallen){
    state.active=zone;state.remaining=CHALLENGES[zone].limit;
    state.progress=0;state.held=0;state.uiTimer=0;
    if(zone==='hunt'){
      state.lastTreasureIndex=nextTreasureIndex(state.lastTreasureIndex,random);
      state.target=TREASURE_SPAWNS[state.lastTreasureIndex];
    }
    emit({type:'start',id:zone,remaining:state.remaining,progress:0,
      target:zone==='hunt'?{...state.target}:null});
  }
  state.lastZone=zone;
  if(!state.active)return;
  state.remaining=Math.max(0,state.remaining-dt);
  if(state.remaining<=0){result(state,'failed','Zeit abgelaufen!',emit);return;}
  if(state.active==='slalom'){
    const next=SLALOM_CONES[state.progress];
    if(next){
      const x=crossingX(before,player,next.z);
      if(x!==null){
        const distance=(x-next.x)*next.side;
        if(distance<1.12||distance>5.15){result(state,'failed','Falsche Seite! Folge den grünen Markierungen.',emit);return;}
        state.progress++;
        emit({type:'progress',id:'slalom',progress:state.progress,remaining:state.remaining,total:SLALOM_CONES.length});
      }
    }
    for(const cone of SLALOM_CONES){
      if(Math.hypot(player.x-cone.x,player.z-cone.z)<.75){
        result(state,'failed','Hütchen berührt!',emit);return;
      }
    }
    if(crossingX(before,player,SLALOM_FINISH)!==null){
      result(state,state.progress===SLALOM_CONES.length?'won':'failed',
        state.progress===SLALOM_CONES.length?'':'Nicht alle Hütchen umfahren!',emit);return;
    }
  } else if(state.active==='wheelie'){
    const balanced=player.speed>3&&player.pitch>=WHEELIE_BAND[0]&&player.pitch<=WHEELIE_BAND[1];
    state.held=balanced?state.held+dt:0;
    state.progress=Math.min(CHALLENGES.wheelie.goal,state.held);
    if(state.progress>=CHALLENGES.wheelie.goal){result(state,'won','',emit);return;}
  } else if(state.active==='hunt'&&state.target){
    if(Math.hypot(player.x-state.target.x,player.z-state.target.z)<2.7){
      state.progress=1;result(state,'won','',emit);return;
    }
  }
  state.uiTimer+=dt;
  if(state.uiTimer>=.14){
    state.uiTimer=0;
    // Hunt deliberately exposes no distance, arrow, bearing or target marker to the HUD.
    emit({type:'progress',id:state.active,remaining:state.remaining,progress:state.progress,
      total:state.active==='slalom'?SLALOM_CONES.length:state.active==='wheelie'?CHALLENGES.wheelie.goal:1,
      pitch:player.pitch});
  }
}
