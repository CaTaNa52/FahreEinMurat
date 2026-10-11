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
export function Rider({ options=DEFAULT_RIDER }) {
  return <group>
    <mesh position={[0,1.28,.13]} castShadow>
      <capsuleGeometry args={[.29,.6,4,8]}/>
      <meshStandardMaterial color={options.jacket}/>
    </mesh>
    <mesh position={[0,1.94,.08]} castShadow>
      <sphereGeometry args={[.225,12,10]}/>
      <meshStandardMaterial color="#dbb995"/>
    </mesh>
    {options.helmet&&<group>
      <mesh position={[0,2.095,.08]} castShadow>
        <sphereGeometry args={[.24,12,10]}/>
        <meshStandardMaterial color={options.helmetColor} roughness={.4}/>
      </mesh>
      <mesh position={[0,2.08,-.12]}>
        <boxGeometry args={[.35,.07,.19]}/>
        <meshStandardMaterial color="#51dfaa"/>
      </mesh>
    </group>}
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*.18,.84,.22]} castShadow>
        <capsuleGeometry args={[.09,.46,4,7]}/>
        <meshStandardMaterial color={options.pants}/>
      </mesh>
      <mesh position={[side*.18,.56,.04]}>
        <boxGeometry args={[.19,.1,.4]}/>
        <meshStandardMaterial color="#e4dcc8"/>
      </mesh>
      <mesh position={[side*.3,1.43,-.28]} rotation={[-.82,0,side*.2]} castShadow>
        <capsuleGeometry args={[.09,.49,4,7]}/>
        <meshStandardMaterial color={options.jacket}/>
      </mesh>
      <mesh position={[side*.35,1.64,-.75]}>
        <sphereGeometry args={[.09,8,8]}/>
        <meshStandardMaterial color="#dbb995"/>
      </mesh>
    </group>)}
    {options.watch&&<mesh position={[.352,1.65,-.60]} rotation={[-.82,0,.2]}>
      <boxGeometry args={[.155,.1,.115]}/>
      <meshStandardMaterial color={options.watchColor} metalness={.65} roughness={.25}/>
    </mesh>}
  </group>;
}
export function Scooter({ options=DEFAULT_GARAGE, rider=DEFAULT_RIDER, riderRef, showRider=true }) {
  const sport=options.model==='sport';
  const classic=options.model==='classic';
  return <group position={[0,-.33,-.66]}>
    <Tire z={.66} offroad={options.tires==='offroad'}/>
    <Tire z={-.69} offroad={options.tires==='offroad'}/>
    <mesh position={[0,.43,.02]} castShadow>
      <boxGeometry args={[sport ? .52 : classic ? .5 : .43,.16,1.35]}/>
      <meshStandardMaterial color={options.trim} metalness={.4} roughness={.43}/>
    </mesh>
    <mesh position={[0,.53,.02]} castShadow>
      <boxGeometry args={[sport ? .5 : .4,.045,sport ? 1.25 : 1.12]}/>
      <meshStandardMaterial color={options.body} metalness={.35} roughness={.32}/>
    </mesh>
    {classic&&<mesh position={[0,.58,.02]} castShadow>
      <boxGeometry args={[.38,.055,.55]}/>
      <meshStandardMaterial color="#bc975a" metalness={.15}/>
    </mesh>}
    <mesh position={[0,1.04,-.72]} rotation={[-.07,0,0]} castShadow>
      <cylinderGeometry args={[.055,.065,1.27,10]}/>
      <meshStandardMaterial color={options.body} metalness={.7} roughness={.28}/>
    </mesh>
    <mesh position={[0,1.67,-.79]} rotation={[0,0,Math.PI/2]} castShadow>
      <cylinderGeometry args={[.05,.05,sport ? 1.01 : .79,10]}/>
      <meshStandardMaterial color={options.trim}/>
    </mesh>
    <mesh position={[0,1.13,-.79]}>
      <sphereGeometry args={[sport ? .155 : .12,10,10]}/>
      <meshStandardMaterial color={options.light} emissive={options.light} emissiveIntensity={.65}/>
    </mesh>
    <mesh position={[0,.47,.72]}>
      <boxGeometry args={[.22,.08,.09]}/>
      <meshStandardMaterial color="#ff4545" emissive="#ff2525" emissiveIntensity={.5}/>
    </mesh>
    {options.box&&<mesh position={[0,.76,.57]} castShadow>
      <boxGeometry args={[.55,.41,.48]}/>
      <meshStandardMaterial color={options.trim} metalness={.2} roughness={.5}/>
    </mesh>}
    {options.underglow&&<mesh position={[0,.29,.04]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[.78,1.7]}/>
      <meshBasicMaterial color={options.body} transparent opacity={.65} depthWrite={false}/>
    </mesh>}
    {showRider&&<group ref={riderRef}><Rider options={rider}/></group>}
  </group>;
}
