import { useMemo } from 'react';
import * as THREE from 'three';

export function GroundUnderglow({ tint, forwardedRef, quality }) {
  const uniforms=useMemo(()=>({uTint:{value:new THREE.Color(tint)}}),[tint]);
  return <group ref={forwardedRef}>
    {/* Two smooth light pools and a broad falloff on the physical road surface.
        Transparent additive pixels disappear gradually rather than showing a
        sharp plane-shaped decal. Fixed in world space while riding or wheelying. */}
    <mesh position={[0,.014,-.28]} rotation={[-Math.PI/2,0,0]} renderOrder={3}>
      <planeGeometry args={[9.2,8.4]}/>
      <shaderMaterial key={tint} transparent depthWrite={false} depthTest
        blending={THREE.AdditiveBlending} toneMapped={false} uniforms={uniforms}
        vertexShader={`varying vec2 vUv; void main(){
          vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        }`}
        fragmentShader={`uniform vec3 uTint; varying vec2 vUv; void main(){
          vec2 p=(vUv-vec2(.5))*vec2(2.0,1.95);
          float wide=exp(-dot(p,p)*3.8);
          float center=exp(-dot(p*vec2(1.65,1.0),p*vec2(1.65,1.0))*13.);
          float underDeck=exp(-dot(p*vec2(3.1,1.45),p*vec2(3.1,1.45))*14.);
          float alpha=clamp(wide*.32+center*.28+underDeck*.28,0.,.86);
          gl_FragColor=vec4(uTint*1.12,alpha);
        }`}/>
    </mesh>
    {/* Real dynamic light on MeshStandardMaterial asphalt, sidewalk and the
        scooter frame; only one light on mobile to avoid too many GPU lights. */}
    <pointLight position={[0,.72,-.12]} color={tint}
      intensity={quality==='low'?6:12} distance={8.5} decay={2}/>
    {quality==='high'&&<pointLight position={[0,.65,-.84]} color={tint}
      intensity={3.2} distance={5.5} decay={2}/>}
  </group>;
}

