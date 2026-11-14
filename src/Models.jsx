import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DEFAULT_GARAGE, DEFAULT_RIDER } from './customization.js';

function Tire({z,offroad=false}) {
  return <group position={[0,.33,z]}>
    <mesh rotation={[0,Math.PI/2,0]} castShadow>
      <torusGeometry args={[.28,offroad ? .115 : .083,10,20]}/>
      <meshStandardMaterial color="#151c20" roughness={.94}/>
    </mesh>
    <mesh rotation={[0,0,Math.PI/2]}>
      <cylinderGeometry args={[.15,.15,.12,16]}/>
      <meshStandardMaterial color="#aab4ad" metalness={.7} roughness={.3}/>
    </mesh>
  </group>;
}
export function Rider({ options }) {
  const safe={...DEFAULT_RIDER,...(options&&typeof options==='object'?options:{})};
  return <group>
    <mesh position={[0,1.28,.13]} castShadow>
      <capsuleGeometry args={[.29,.6,4,8]}/>
      <meshStandardMaterial color={safe.jacket}/>
    </mesh>
    <mesh position={[0,1.94,.08]} castShadow>
      <sphereGeometry args={[.225,12,10]}/>
      <meshStandardMaterial color="#dbb995"/>
    </mesh>
    {safe.helmet&&<group>
      <mesh position={[0,2.095,.08]} castShadow>
        <sphereGeometry args={[.24,12,10]}/>
        <meshStandardMaterial color={safe.helmetColor} roughness={.4}/>
      </mesh>
      <mesh position={[0,2.08,-.12]}>
        <boxGeometry args={[.35,.07,.19]}/>
        <meshStandardMaterial color="#51dfaa"/>
      </mesh>
    </group>}
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*.18,.84,.22]} castShadow>
        <capsuleGeometry args={[.09,.46,4,7]}/>
        <meshStandardMaterial color={safe.pants}/>
      </mesh>
      <mesh position={[side*.18,.56,.04]}>
        <boxGeometry args={[.19,.1,.4]}/>
        <meshStandardMaterial color="#e4dcc8"/>
      </mesh>
      <mesh position={[side*.3,1.43,-.28]} rotation={[-.82,0,side*.2]} castShadow>
        <capsuleGeometry args={[.09,.49,4,7]}/>
        <meshStandardMaterial color={safe.jacket}/>
      </mesh>
      <mesh position={[side*.35,1.64,-.75]}>
        <sphereGeometry args={[.09,8,8]}/>
        <meshStandardMaterial color="#dbb995"/>
      </mesh>
    </group>)}
    {safe.watch&&<mesh position={[.352,1.65,-.60]} rotation={[-.82,0,.2]}>
      <boxGeometry args={[.155,.1,.115]}/>
      <meshStandardMaterial color={safe.watchColor} metalness={.65} roughness={.25}/>
    </mesh>}
  </group>;
}
export function Scooter({ options, rider, riderRef, showRider=true, passenger=null }) {
  const safe={...DEFAULT_GARAGE,...(options&&typeof options==='object'?options:{})};
  const sport=safe.model==='sport';
  const classic=safe.model==='classic';
  return <group position={[0,-.33,-.66]}>
    <Tire z={.66} offroad={safe.tires==='offroad'}/>
    <Tire z={-.69} offroad={safe.tires==='offroad'}/>
    <mesh position={[0,.43,.02]} castShadow>
      <boxGeometry args={[sport ? .52 : classic ? .5 : .43,.16,1.35]}/>
      <meshStandardMaterial color={safe.trim} metalness={.4} roughness={.43}/>
    </mesh>
    <mesh position={[0,.53,.02]} castShadow>
      <boxGeometry args={[sport ? .5 : .4,.045,sport ? 1.25 : 1.12]}/>
      <meshStandardMaterial color={safe.body} metalness={.35} roughness={.32}/>
    </mesh>
    {classic&&<mesh position={[0,.58,.02]} castShadow>
      <boxGeometry args={[.38,.055,.55]}/>
      <meshStandardMaterial color="#bc975a" metalness={.15}/>
    </mesh>}
    <mesh position={[0,1.04,-.72]} rotation={[-.07,0,0]} castShadow>
      <cylinderGeometry args={[.055,.065,1.27,10]}/>
      <meshStandardMaterial color={safe.body} metalness={.7} roughness={.28}/>
    </mesh>
    <mesh position={[0,1.67,-.79]} rotation={[0,0,Math.PI/2]} castShadow>
      <cylinderGeometry args={[.05,.05,sport ? 1.01 : .79,10]}/>
      <meshStandardMaterial color={safe.trim}/>
    </mesh>
    <mesh position={[0,1.13,-.79]}>
      <sphereGeometry args={[sport ? .155 : .12,10,10]}/>
      <meshStandardMaterial color={safe.light} emissive={safe.light} emissiveIntensity={.65}/>
    </mesh>
    <mesh position={[0,.47,.72]}>
      <boxGeometry args={[.22,.08,.09]}/>
      <meshStandardMaterial color="#ff4545" emissive="#ff2525" emissiveIntensity={.5}/>
    </mesh>
    {safe.box&&<mesh position={[0,.76,.57]} castShadow>
      <boxGeometry args={[.55,.41,.48]}/>
      <meshStandardMaterial color={safe.trim} metalness={.2} roughness={.5}/>
    </mesh>}
    {safe.underglow&&<group>
      {[-1,1].map(side=><mesh key={side} position={[side*.23,.335,.02]}>
        <boxGeometry args={[.047,.045,1.04]}/>
        <meshStandardMaterial color={safe.glowColor??'#55ffcf'} emissive={safe.glowColor??'#55ffcf'} emissiveIntensity={3.5} toneMapped={false}/>
      </mesh>)}
      <mesh position={[0,.33,-.49]}>
        <boxGeometry args={[.33,.052,.045]}/>
        <meshStandardMaterial color={safe.glowColor??'#55ffcf'} emissive={safe.glowColor??'#55ffcf'} emissiveIntensity={3.5} toneMapped={false}/>
      </mesh>
    </group>}
    {showRider&&<group ref={riderRef}><Rider options={rider}/></group>}
    {/* The buddy rides pillion right behind the rider. */}
    {passenger&&<group position={[0,0,.5]} scale={.95}><Rider options={passenger}/></group>}
  </group>;
}

// Standing / walking figure (feet at y = 0, facing -z). `motion.current` =
// {stride, speed} drives the walk cycle; `wave` raises the right arm to hail.
export function Walker({ options, motion=null, wave=false, cap=null }) {
  const safe={...DEFAULT_RIDER,...(options&&typeof options==='object'?options:{})};
  const body=useRef(),armL=useRef(),armR=useRef(),legL=useRef(),legR=useRef();
  useFrame(({clock})=>{
    if(!body.current)return;
    const m=motion?.current, pace=m?Math.min(1,Math.abs(m.speed)/2):0;
    const swing=m?Math.sin(m.stride*Math.PI*2)*pace*.75:0;
    legL.current.rotation.x=swing;legR.current.rotation.x=-swing;
    armL.current.rotation.x=-swing*.8;
    if(wave){
      armR.current.rotation.set(0,0,2.55+Math.sin(clock.elapsedTime*6)*.32);
    }else armR.current.rotation.set(swing*.8,0,0);
    body.current.position.y=m?Math.abs(Math.cos(m.stride*Math.PI*2))*.035*pace:0;
  });
  const skin='#dbb995';
  return <group ref={body}>
    <mesh position={[0,1.17,0]} castShadow><capsuleGeometry args={[.25,.48,4,10]}/><meshStandardMaterial color={safe.jacket}/></mesh>
    <mesh position={[0,1.7,0]} castShadow><sphereGeometry args={[.205,14,12]}/><meshStandardMaterial color={skin}/></mesh>
    <mesh position={[0,1.69,-.19]}><boxGeometry args={[.2,.045,.04]}/><meshStandardMaterial color="#2a2320"/></mesh>
    {cap?<group>
      <mesh position={[0,1.84,0]}><cylinderGeometry args={[.215,.215,.13,14]}/><meshStandardMaterial color={cap}/></mesh>
      <mesh position={[0,1.79,-.21]}><boxGeometry args={[.3,.035,.2]}/><meshStandardMaterial color="#10151c"/></mesh>
    </group>:safe.helmet?<mesh position={[0,1.76,0]}><sphereGeometry args={[.235,14,12,0,Math.PI*2,0,Math.PI*.58]}/><meshStandardMaterial color={safe.helmetColor} roughness={.35}/></mesh>
      :<mesh position={[0,1.76,.01]}><sphereGeometry args={[.215,14,12,0,Math.PI*2,0,Math.PI*.5]}/><meshStandardMaterial color="#2a2320" roughness={.9}/></mesh>}
    {[[-1,armL],[1,armR]].map(([side,ref])=><group key={side} ref={ref} position={[side*.34,1.45,0]}>
      <mesh position={[0,-.29,0]} castShadow><capsuleGeometry args={[.08,.44,4,8]}/><meshStandardMaterial color={safe.jacket}/></mesh>
      <mesh position={[0,-.6,0]}><sphereGeometry args={[.085,8,8]}/><meshStandardMaterial color={skin}/></mesh>
      {side===1&&safe.watch&&<mesh position={[0,-.5,0]}><cylinderGeometry args={[.095,.095,.06,10]}/><meshStandardMaterial color={safe.watchColor} metalness={.6} roughness={.25}/></mesh>}
    </group>)}
    {[[-1,legL],[1,legR]].map(([side,ref])=><group key={side} ref={ref} position={[side*.13,.88,0]}>
      <mesh position={[0,-.42,0]} castShadow><capsuleGeometry args={[.095,.6,4,8]}/><meshStandardMaterial color={safe.pants}/></mesh>
      <mesh position={[0,-.83,-.06]}><boxGeometry args={[.17,.1,.34]}/><meshStandardMaterial color="#e4dcc8"/></mesh>
    </group>)}
  </group>;
}
