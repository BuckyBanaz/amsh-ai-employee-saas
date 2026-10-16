"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// 3D "voice orb": noise-displaced sphere that breathes like a speaking voice,
// wrapped in a wireframe shell, two orbit rings and a particle halo.

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uJiggle;
uniform float uPitch;
uniform float uSpeed;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;
${NOISE}
void main(){
  // Dynamic base wave modulated by pitch (low pitch = broad resonant rolling wave, high pitch = compressed fast ripples)
  float freq = mix(1.6, 3.4, uPitch);
  float n = snoise(normal * freq + uTime * (0.35 + uSpeed * 0.7));
  
  // Formant vocal harmonics
  float n2 = snoise(normal * (freq * 2.2) - uTime * (0.6 + uSpeed * 1.4)) * 0.4;
  
  // High-pitch micro-jiggle (rapid sound wave vibration across vertex surface)
  // High pitch creates dense, lightning-fast acoustic jitters!
  float jiggleFreq = mix(6.5, 16.0, uPitch);
  float jiggleSpeed = mix(3.5, 12.0, uPitch);
  float microJiggle = snoise(normal * jiggleFreq + uTime * jiggleSpeed) * uJiggle;
  
  // Secondary harmonic treble buzz that kicks in on high pitch
  float trebleBuzz = sin(dot(normal, vec3(10.0, 14.0, 12.0)) + uTime * (6.0 + uPitch * 14.0)) * (uJiggle * uPitch * 0.35);

  float d = (n + n2 + microJiggle + trebleBuzz) * uAmp;
  vNoise = d;
  vec3 pos = position + normal * d;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uUserMix;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;
void main(){
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);

  // Blue / Indigo / Cyan palette (Amsh brand theme & AI speaking)
  vec3 cyan = vec3(0.13, 0.83, 0.93);
  vec3 indigo = vec3(0.31, 0.27, 0.90);
  vec3 violet = vec3(0.66, 0.33, 0.97);

  // Emerald / Teal / Mint palette (User speaking with green waves!)
  vec3 emerald = vec3(0.06, 0.72, 0.50);
  vec3 teal = vec3(0.08, 0.82, 0.78);
  vec3 mint = vec3(0.35, 0.98, 0.65);

  vec3 colorA = mix(indigo, emerald, uUserMix);
  vec3 colorB = mix(cyan, mint, uUserMix);
  vec3 colorC = mix(violet, teal, uUserMix);

  float t = clamp(vNoise * 2.2 + 0.5 + sin(uTime * 0.4) * 0.15, 0.0, 1.0);
  vec3 base = mix(colorA, colorB, t);
  base = mix(base, colorC, smoothstep(0.55, 1.0, vNormal.y * 0.5 + 0.5) * 0.6);
  vec3 fresnelTint = mix(vec3(0.6, 0.9, 1.0), vec3(0.6, 1.0, 0.8), uUserMix);
  vec3 col = base * 0.55 + fres * fresnelTint * 0.85;
  gl_FragColor = vec4(col, 0.92);
}`;

// Deterministic PRNG so the halo is stable across renders (and lint-pure).
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeHalo() {
  const rand = mulberry32(7);
  const count = 900;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 1.9 + rand() * 1.1;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return g;
}

export type HeroOrbProps = {
  pointer?: React.RefObject<{ x: number; y: number } | null>;
  animate?: boolean;
  distance?: number;
  isAISpeaking?: boolean;
  isUserSpeaking?: boolean;
  isLiveActive?: boolean;
  audioLevel?: number;
  pitchLevel?: number;
};

export function Orb({
  pointer,
  isAISpeaking,
  isUserSpeaking,
  isLiveActive,
  audioLevel,
  pitchLevel,
}: {
  pointer?: React.RefObject<{ x: number; y: number } | null>;
  isAISpeaking?: boolean;
  isUserSpeaking?: boolean;
  isLiveActive?: boolean;
  audioLevel?: number;
  pitchLevel?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Points>(null);

  const core = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.16 },
      uJiggle: { value: 0.05 },
      uPitch: { value: 0.2 },
      uSpeed: { value: 0.2 },
      uUserMix: { value: 0 },
    }),
    []
  );

  const haloGeo = useMemo(() => makeHalo(), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const u = core.current?.uniforms;
    if (u) {
      u.uTime.value = t;

      let targetAmp = 0.13;
      let targetJiggle = 0.03;
      let targetPitch = 0.15;
      let targetSpeed = 0.2;

      if (isUserSpeaking) {
        // User speaking: acoustic speech cadence with rapid pitch fluctuations & energetic green jiggle
        // Multi-frequency oscillation simulating human vocal tract formant shifts
        const pitchOsc = 0.5 + 0.48 * Math.sin(t * 7.5 + Math.cos(t * 13.0));
        const effectivePitch = pitchLevel !== undefined ? pitchLevel : pitchOsc;
        targetPitch = effectivePitch;

        // High pitch = intense jiggle ripples; low pitch = subtle resonant jiggle
        targetJiggle = 0.4 + effectivePitch * 1.1 + (audioLevel !== undefined ? audioLevel * 0.8 : 0);
        targetSpeed = 1.3 + effectivePitch * 2.6;
        targetAmp = 0.28 + effectivePitch * 0.24 + Math.abs(Math.sin(t * 4.2)) * 0.16;
      } else if (isAISpeaking) {
        // AI speaking: rhythmic TTS cadence with lively speech pitch sweeps
        const pitchOsc = 0.45 + 0.42 * Math.sin(t * 6.2 + Math.sin(t * 11.5) * 0.6);
        const effectivePitch = pitchLevel !== undefined ? pitchLevel : pitchOsc;
        targetPitch = effectivePitch;

        // High pitch = sharp jiggle; low pitch = calm hum
        targetJiggle = 0.3 + effectivePitch * 0.9;
        targetSpeed = 1.1 + effectivePitch * 2.0;
        targetAmp = 0.22 + effectivePitch * 0.2 + Math.abs(Math.sin(t * 3.4)) * 0.12;
      } else if (isLiveActive) {
        // Connected standby
        targetPitch = 0.15;
        targetJiggle = 0.05;
        targetSpeed = 0.3;
        targetAmp = 0.15 + Math.abs(Math.sin(t * 1.4)) * 0.04;
      } else {
        // Default idle breathing
        targetPitch = 0.1;
        targetJiggle = 0.02;
        targetSpeed = 0.15;
        targetAmp = 0.12 + Math.abs(Math.sin(t * 2.1) * Math.sin(t * 0.7)) * 0.1;
      }

      u.uAmp.value = THREE.MathUtils.lerp(u.uAmp.value, targetAmp, 0.14);
      u.uJiggle.value = THREE.MathUtils.lerp(u.uJiggle.value, targetJiggle, 0.18);
      u.uPitch.value = THREE.MathUtils.lerp(u.uPitch.value, targetPitch, 0.16);
      u.uSpeed.value = THREE.MathUtils.lerp(u.uSpeed.value, targetSpeed, 0.14);

      // Smooth color morph: 0.0 = blue theme (AI / idle), 1.0 = green waves (User speaking)
      const targetUserMix = isUserSpeaking ? 1.0 : 0.0;
      u.uUserMix.value = THREE.MathUtils.lerp(u.uUserMix.value, targetUserMix, 0.08);
    }

    if (group.current && pointer?.current) {
      const g = group.current;
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, pointer.current.x * 0.5, 0.05);
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -pointer.current.y * 0.35, 0.05);
    } else if (group.current) {
      // Gentle automatic orbit tilt when no pointer passed
      group.current.rotation.y = Math.sin(t * 0.25) * 0.2;
      group.current.rotation.x = Math.cos(t * 0.2) * 0.15;
    }

    const speedMultiplier = isUserSpeaking || isAISpeaking ? 2.2 : 1.0;
    if (shell.current) shell.current.rotation.y += delta * 0.12 * speedMultiplier;
    if (ringA.current) ringA.current.rotation.z += delta * 0.25 * speedMultiplier;
    if (ringB.current) ringB.current.rotation.z -= delta * 0.18 * speedMultiplier;
    if (halo.current) halo.current.rotation.y += delta * 0.04 * speedMultiplier;

    // Dynamically tint rings and shell toward green when user speaks
    if (shell.current) {
      const mat = shell.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        const targetColor = isUserSpeaking ? new THREE.Color("#6ee7b7") : new THREE.Color("#7dd3fc");
        mat.color.lerp(targetColor, 0.08);
        mat.opacity = isUserSpeaking || isAISpeaking ? 0.22 : 0.12;
      }
    }
    if (ringA.current) {
      const mat = ringA.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        const targetColor = isUserSpeaking ? new THREE.Color("#34d399") : new THREE.Color("#22d3ee");
        mat.color.lerp(targetColor, 0.08);
      }
    }
    if (ringB.current) {
      const mat = ringB.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        const targetColor = isUserSpeaking ? new THREE.Color("#10b981") : new THREE.Color("#a78bfa");
        mat.color.lerp(targetColor, 0.08);
      }
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.15, 64]} />
        <shaderMaterial ref={core} vertexShader={VERTEX} fragmentShader={FRAGMENT} uniforms={uniforms} transparent />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.55, 2]} />
        <meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={0.12} />
      </mesh>
      <mesh ref={ringA} rotation={[Math.PI / 2.4, 0.3, 0]}>
        <torusGeometry args={[1.95, 0.008, 16, 200]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.7} />
      </mesh>
      <mesh ref={ringB} rotation={[Math.PI / 1.7, -0.5, 0]}>
        <torusGeometry args={[2.25, 0.006, 16, 200]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.55} />
      </mesh>
      <points ref={halo} geometry={haloGeo}>
        <pointsMaterial color="#bae6fd" size={0.018} sizeAttenuation transparent opacity={0.8} depthWrite={false} />
      </points>
    </group>
  );
}

export default function HeroOrb({
  pointer,
  animate = true,
  distance = 5.4,
  isAISpeaking,
  isUserSpeaking,
  isLiveActive,
  audioLevel,
  pitchLevel,
}: HeroOrbProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, distance], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={animate ? "always" : "demand"}
      aria-hidden="true"
    >
      <Orb
        pointer={pointer}
        isAISpeaking={isAISpeaking}
        isUserSpeaking={isUserSpeaking}
        isLiveActive={isLiveActive}
        audioLevel={audioLevel}
        pitchLevel={pitchLevel}
      />
    </Canvas>
  );
}
