import { Canvas } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { Scooter, Rider } from './Models.jsx';
import { GroundUnderglow } from './Underglow.jsx';
import { PALETTE, MODEL_OPTIONS, TIRES_OPTIONS, upgradeCost, upgradeId, normalizeProfile } from './customization.js';

function Studio({room,profile,angle}) {
  return <Canvas frameloop="demand" dpr={[1,1.25]}
    camera={{fov:42,position:[3.8,2.7,5.2],near:.1,far:40}}
    gl={{antialias:false,powerPreference:'low-power'}}
    fallback={<p>3D-Vorschau benötigt WebGL.</p>}>
    <color attach="background" args={['#112420']}/>
    <ambientLight intensity={2.2}/>
    <hemisphereLight intensity={2} color="#e6ffed" groundColor="#1a2b23"/>
    <directionalLight position={[-3,7,5]} intensity={2.8}/>
    <mesh position={[0,-.08,0]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[14,14]}/>
      <meshStandardMaterial color="#43504a" roughness={.89}/>
    </mesh>
    <gridHelper args={[11,11,'#9db9a4','#627b6f']} position={[0,-.07,0]}/>
    {room==='garage'&&profile.garage.underglow&&
      <group position={[0,-.09,0]}>
        <GroundUnderglow tint={profile.garage.glowColor??'#55ffcf'} quality="low"/>
      </group>}
    <group rotation={[0,angle,0]} position={[0,room === 'garage' ? .37 : 0,0]}>
      {room==='garage'
        ? <group scale={1.25}><Scooter options={profile.garage} showRider={false}/></group>
        : <Rider options={profile.rider}/>}
    </group>
  </Canvas>;
}
function ColorPicker({label,value,onChoose}){
  return <div className="picker-section">
    <strong>{label}</strong>
    <div className="color-swatches">
      {PALETTE.map(color=><button type="button" key={color}
        className={'swatch'+(value===color?' selected':'')}
        aria-label={label+' '+color} aria-pressed={value===color}
        style={{background:color}} onClick={()=>onChoose(color)}/>)}
    </div>
  </div>;
}
function OptionSet({label,items,value,room,field,profile,onChange}){
  return <div className="picker-section">
    <strong>{label}</strong>
    <div className="choice-set">
      {items.map(item=>{
        const cost=upgradeCost(room,field,item.value);
        const owned=profile.owned.includes(upgradeId(room,field,item.value));
        const affordable=owned||cost<=profile.coins;
        return <button key={String(item.value)} type="button"
          className={'choice'+(item.value===value?' selected':'')}
          disabled={!affordable}
          onClick={()=>onChange(room,field,item.value)}>
          {item.label}{cost&&!owned?' · '+cost.toLocaleString('de-DE')+' 🪙':''}
          {cost&&owned?' · ✓':''}
        </button>;
      })}
    </div>
  </div>;
}
export default function Customizer({room,profile,onChange,onClose,message}){
  const [angle,setAngle]=useState(.45);
  const dragging=useRef(null);
  const garage=room==='garage';
  const category=garage?'garage':'rider';
  const safeProfile=normalizeProfile(profile);
  const values=safeProfile[category];
  return <div className="customizer-layer" role="dialog" aria-modal="true"
    aria-label={garage?'Murat Garage':'Zuhause'}>
    <section className="customizer-window">
      <header className="customizer-head">
        <div><span className="eyebrow">{garage?'SCOOTER WERKSTATT':'CHARAKTER STUDIO'}</span>
          <h2>{garage?'🛠️ MURAT GARAGE':'🏠 ZUHAUSE'}</h2>
          <p>{garage?'Gestalte deinen Scooter nach deinem Geschmack.':'Dein Fahrer, dein Style.'}</p></div>
        <button type="button" className="close-studio" onClick={onClose} aria-label="Schließen">✕</button>
      </header>
      <div className="studio-columns">
        <div className="studio-display">
          <div className="studio-canvas" role="img" aria-label="Drehbares 3D-Modell"
            onPointerDown={e=>{dragging.current={id:e.pointerId,x:e.clientX};e.currentTarget.setPointerCapture(e.pointerId);}}
            onPointerMove={e=>{
              if(dragging.current?.id!==e.pointerId)return;
              const delta=e.clientX-dragging.current.x;
              dragging.current.x=e.clientX;setAngle(x=>x+delta/115);
            }}
            onPointerUp={()=>{dragging.current=null;}}
            onPointerCancel={()=>{dragging.current=null;}}>
            <Studio room={room} profile={safeProfile} angle={angle}/>
          </div>
          <div className="studio-turn">
            <button type="button" onClick={()=>setAngle(v=>v-.42)} aria-label="Modell links drehen">↶</button>
            <span>MIT DEM FINGER DREHEN · 3D-ANSICHT</span>
            <button type="button" onClick={()=>setAngle(v=>v+.42)} aria-label="Modell rechts drehen">↷</button>
          </div>
        </div>
        <div className="studio-options">
          <div className="studio-wallet">🪙 {safeProfile.coins.toLocaleString('de-DE')} MURAT-COINS</div>
          {garage?<>
            <OptionSet room={category} profile={safeProfile} field="model" label="Scooter-Modell"
              items={MODEL_OPTIONS} value={values.model} onChange={onChange}/>
            <ColorPicker label="Scooter-Farbe" value={values.body}
              onChoose={v=>onChange(category,'body',v)}/>
            <ColorPicker label="Akzentfarbe / Deck" value={values.trim}
              onChoose={v=>onChange(category,'trim',v)}/>
            <ColorPicker label="Frontlicht" value={values.light}
              onChoose={v=>onChange(category,'light',v)}/>
            <OptionSet room={category} profile={safeProfile} field="tires" label="Reifen"
              items={TIRES_OPTIONS} value={values.tires} onChange={onChange}/>
            <OptionSet room={category} profile={safeProfile} field="underglow" label="Unterbodenbeleuchtung"
              items={[{value:false,label:'Aus'},{value:true,label:'Neon an'}]}
              value={values.underglow} onChange={onChange}/>
            <ColorPicker label="Neon-Farbe" value={values.glowColor??'#55ffcf'}
              onChoose={v=>onChange(category,'glowColor',v)}/>
            <OptionSet room={category} profile={safeProfile} field="box" label="Gepäckbox"
              items={[{value:false,label:'Ohne'},{value:true,label:'Mit Box'}]}
              value={values.box} onChange={onChange}/>
          </>:<>
            <OptionSet room={category} profile={safeProfile} field="helmet" label="Helm"
              items={[{value:false,label:'Abnehmen'},{value:true,label:'Anziehen'}]}
              value={values.helmet} onChange={onChange}/>
            <ColorPicker label="Helmfarbe" value={values.helmetColor}
              onChoose={v=>onChange(category,'helmetColor',v)}/>
            <ColorPicker label="Oberkörper / Jacke" value={values.jacket}
              onChoose={v=>onChange(category,'jacket',v)}/>
            <ColorPicker label="Hose" value={values.pants}
              onChoose={v=>onChange(category,'pants',v)}/>
            <OptionSet room={category} profile={safeProfile} field="watch" label="Armbanduhr"
              items={[{value:false,label:'Abnehmen'},{value:true,label:'Anziehen'}]}
              value={values.watch} onChange={onChange}/>
            <ColorPicker label="Uhrenfarbe" value={values.watchColor}
              onChoose={v=>onChange(category,'watchColor',v)}/>
          </>}
          {message&&<p className="studio-message" role="status">{message}</p>}
          <button className="studio-done" type="button" onClick={onClose}>✓ FERTIG · ZURÜCK INS SPIEL</button>
        </div>
      </div>
    </section>
  </div>;
}
