'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere, Environment, Lightformer } from '@react-three/drei';
import { useRef, useState, useEffect, useMemo } from 'react';
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  SRGBColorSpace,
  RepeatWrapping,
  type Mesh,
  type Group,
  type Texture,
} from 'three';

/**
 * Procedurally paints the Cavos "silk" texture (electric-indigo field with
 * brushed diagonal light strands) onto a canvas and returns it as a tileable
 * 3D texture. Same visual language as the cavos-web HeroOrb so the wallet
 * reads as the same brand surface. Runs once on the client; no external asset.
 */
function useSilkTexture(): Texture | null {
  /* eslint-disable react-hooks/purity -- texture is generated once in useMemo; randomized strands are intentional and stable for the component lifetime */
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const S = 1536;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d')!;
    // base indigo gradient (#422CFB family)
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#3622E0');
    g.addColorStop(0.5, '#422CFB');
    g.addColorStop(1, '#5440FF');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const ang = -0.42;
    const drawStrand = (
      opMin: number,
      opMax: number,
      wMin: number,
      wMax: number,
      cols: string[],
      blur: number,
    ) => {
      const x1 = rnd(-S * 0.3, S * 1.3);
      const y1 = rnd(-S * 0.3, S * 1.3);
      const len = S * 2.4;
      const x2 = x1 - Math.cos(ang) * len;
      const y2 = y1 - Math.sin(ang) * len;
      ctx.save();
      ctx.globalAlpha = rnd(opMin, opMax);
      ctx.filter = blur ? `blur(${blur}px)` : 'none';
      ctx.strokeStyle = cols[(Math.random() * cols.length) | 0];
      ctx.lineWidth = rnd(wMin, wMax);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };
    const light = ['#FFFFFF', '#E2D8FF'];
    const dark = ['#241499', '#3422C9'];
    // broad soft sheen bands
    for (let i = 0; i < 28; i++) drawStrand(0.05, 0.11, 30, 80, light, 30);
    for (let i = 0; i < 18; i++) drawStrand(0.05, 0.11, 30, 80, dark, 30);
    // crisp high-frequency silk threads
    for (let i = 0; i < 280; i++) drawStrand(0.05, 0.16, 1.5, 5, light, 1.2);
    for (let i = 0; i < 80; i++) drawStrand(0.04, 0.1, 1.5, 4, dark, 1);

    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.anisotropy = 16;
    return tex;
  }, []);
  /* eslint-enable react-hooks/purity */
}

function Orb({ animate, mobile }: { animate: boolean; mobile: boolean }) {
  const mesh = useRef<Mesh>(null);
  const group = useRef<Group>(null);
  const silk = useSilkTexture();

  // Positioned upper area, behind content — a defined, fully-visible sphere.
  const pos: [number, number, number] = mobile ? [0, 1.7, 0] : [0, 1.3, 0];
  const scale = mobile ? 0.9 : 1.1;
  const baseY = pos[1];

  useFrame((state) => {
    if (!animate) return;
    const t = state.clock.elapsedTime;
    if (mesh.current) {
      mesh.current.rotation.y = t * 0.3;
      mesh.current.rotation.x = Math.sin(t * 0.25) * 0.18;
    }
    if (group.current) {
      group.current.position.y = baseY + Math.sin(t * 0.5) * 0.2;
    }
  });

  return (
    <group ref={group} position={pos} scale={scale}>
      <Sphere ref={mesh} args={[1.5, 256, 256]}>
        <MeshDistortMaterial
          color={silk ? '#ffffff' : '#422CFB'}
          map={silk ?? undefined}
          emissiveMap={silk ?? undefined}
          emissive={silk ? '#3622E0' : '#422CFB'}
          emissiveIntensity={silk ? 0.6 : 0.4}
          roughnessMap={silk ?? undefined}
          distort={animate ? 0.4 : 0.28}
          speed={animate ? 2.0 : 0}
          roughness={0.78}
          metalness={0}
          envMapIntensity={0.5}
          clearcoat={0}
          dithering
        />
      </Sphere>
    </group>
  );
}

/**
 * Cavos silk orb adapted for the dark wallet surface. The indigo glow and the
 * legibility fades resolve to the wallet base (#0A0A0F) instead of white, so
 * the orb sits behind the sign-in content and bleeds into the dark background.
 * Honors prefers-reduced-motion.
 */
export function WalletOrb() {
  const [animate, setAnimate] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mount guard + matchMedia subscription (external system sync)
    setMounted(true);
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileMq = window.matchMedia('(max-width: 767px)');
    const sync = () => {
      setAnimate(!motionMq.matches);
      setMobile(mobileMq.matches);
    };
    sync();
    motionMq.addEventListener('change', sync);
    mobileMq.addEventListener('change', sync);
    return () => {
      motionMq.removeEventListener('change', sync);
      mobileMq.removeEventListener('change', sync);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ background: '#0A0A0F' }}
    >
      {/* indigo glow — contained halo around the orb's upper position */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(42% 38% at 50% 26%, rgba(66,44,251,0.42) 0%, rgba(66,44,251,0.13) 48%, rgba(10,10,15,0) 70%)',
        }}
      />

      <Canvas
        className="!absolute inset-0"
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        frameloop={animate ? 'always' : 'demand'}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[1, 1, 5]} intensity={0.7} color="#ffffff" />

        {/* soft even indigo fill — matte surface */}
        <Environment resolution={256}>
          <Lightformer intensity={1} position={[0, 0, 4]} scale={[14, 14, 1]} color="#6E58FF" />
        </Environment>

        <Orb animate={animate} mobile={mobile} />
      </Canvas>

      {/* legibility fade — vignette edges, keep the orb's upper glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,10,15,0.30) 0%, rgba(10,10,15,0) 30%, rgba(10,10,15,0.30) 55%, rgba(10,10,15,0.85) 80%, #0A0A0F 100%)',
        }}
      />
    </div>
  );
}
