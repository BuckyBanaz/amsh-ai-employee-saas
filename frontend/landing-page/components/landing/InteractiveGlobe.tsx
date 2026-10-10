"use client";

import { useRef, useEffect, useCallback } from "react";

interface GlobeProps {
  className?: string;
  dotColor?: string;
  arcColor?: string;
  markerColor?: string;
  autoRotateSpeed?: number;
}

const GLOBAL_CLINIC_NODES = [
  { lat: 40.71, lng: -74.0, label: "New York, USA" },
  { lat: 37.77, lng: -122.41, label: "San Francisco, USA" },
  { lat: 51.5, lng: -0.12, label: "London, UK" },
  { lat: 25.2, lng: 55.27, label: "Dubai, UAE" },
  { lat: 19.07, lng: 72.87, label: "Mumbai, India" },
  { lat: 28.61, lng: 77.2, label: "Delhi, India" },
  { lat: 1.35, lng: 103.81, label: "Singapore" },
  { lat: -33.86, lng: 151.2, label: "Sydney, Australia" },
  { lat: 43.65, lng: -79.38, label: "Toronto, Canada" },
  { lat: 48.85, lng: 2.35, label: "Paris, France" },
];

const GLOBAL_ARCS: { from: [number, number]; to: [number, number] }[] = [
  { from: [40.71, -74.0], to: [51.5, -0.12] },       // NY -> London
  { from: [51.5, -0.12], to: [25.2, 55.27] },        // London -> Dubai
  { from: [25.2, 55.27], to: [19.07, 72.87] },       // Dubai -> Mumbai
  { from: [19.07, 72.87], to: [1.35, 103.81] },      // Mumbai -> Singapore
  { from: [1.35, 103.81], to: [-33.86, 151.2] },     // Singapore -> Sydney
  { from: [37.77, -122.41], to: [40.71, -74.0] },    // SF -> NY
  { from: [40.71, -74.0], to: [43.65, -79.38] },     // NY -> Toronto
  { from: [51.5, -0.12], to: [48.85, 2.35] },        // London -> Paris
  { from: [28.61, 77.2], to: [25.2, 55.27] },        // Delhi -> Dubai
];

function latLngToXYZ(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function rotateY(x: number, y: number, z: number, angle: number): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

function rotateX(x: number, y: number, z: number, angle: number): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
}

function project(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  fov: number
): [number, number, number] {
  const scale = fov / (fov + z);
  return [x * scale + cx, y * scale + cy, z];
}

export default function InteractiveGlobe({
  className = "",
  dotColor = "rgba(37, 99, 235, ALPHA)",
  arcColor = "rgba(59, 130, 246, 0.45)",
  markerColor = "#2563EB",
  autoRotateSpeed = 0.003,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotYRef = useRef(0.6);
  const rotXRef = useRef(0.25);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startRotY: number;
    startRotX: number;
  }>({ active: false, startX: 0, startY: 0, startRotY: 0, startRotX: 0 });
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const dotsRef = useRef<[number, number, number][]>([]);

  useEffect(() => {
    const dots: [number, number, number][] = [];
    const numDots = 1300;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < numDots; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / numDots);
      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.cos(phi);
      const z = Math.sin(theta) * Math.sin(phi);
      dots.push([x, y, z]);
    }
    dotsRef.current = dots;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.40;
    const fov = 650;

    if (!dragRef.current.active) {
      rotYRef.current += autoRotateSpeed;
    }

    timeRef.current += 0.015;
    const time = timeRef.current;

    ctx.clearRect(0, 0, w, h);

    // Subtle atmospheric ambient glow behind the globe
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.35);
    glowGrad.addColorStop(0, "rgba(37, 99, 235, 0.05)");
    glowGrad.addColorStop(1, "rgba(37, 99, 235, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Globe subtle spherical ring outline
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const ry = rotYRef.current;
    const rx = rotXRef.current;

    // Draw Fibonacci Sphere dots
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      let [x, y, z] = dots[i];
      x *= radius;
      y *= radius;
      z *= radius;

      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);

      if (z > 0) continue; // back-face cull for 3D depth

      const [sx, sy] = project(x, y, z, cx, cy, fov);
      const depthAlpha = Math.max(0.12, 1 - (z + radius) / (2 * radius));
      const dotSize = 1.1 + depthAlpha * 0.9;

      ctx.beginPath();
      ctx.arc(sx, sy, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = dotColor.replace("ALPHA", (depthAlpha * 0.85).toFixed(2));
      ctx.fill();
    }

    // Draw Connections Arcs between Global Clinic Nodes
    for (const conn of GLOBAL_ARCS) {
      const [lat1, lng1] = conn.from;
      const [lat2, lng2] = conn.to;

      let [x1, y1, z1] = latLngToXYZ(lat1, lng1, radius);
      let [x2, y2, z2] = latLngToXYZ(lat2, lng2, radius);

      [x1, y1, z1] = rotateX(x1, y1, z1, rx);
      [x1, y1, z1] = rotateY(x1, y1, z1, ry);
      [x2, y2, z2] = rotateX(x2, y2, z2, rx);
      [x2, y2, z2] = rotateY(x2, y2, z2, ry);

      if (z1 > radius * 0.35 && z2 > radius * 0.35) continue;

      const [sx1, sy1] = project(x1, y1, z1, cx, cy, fov);
      const [sx2, sy2] = project(x2, y2, z2, cx, cy, fov);

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const midZ = (z1 + z2) / 2;
      const midLen = Math.sqrt(midX * midX + midY * midY + midZ * midZ);
      const arcHeight = radius * 1.28;
      const elevX = (midX / midLen) * arcHeight;
      const elevY = (midY / midLen) * arcHeight;
      const elevZ = (midZ / midLen) * arcHeight;
      const [scx, scy] = project(elevX, elevY, elevZ, cx, cy, fov);

      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.quadraticCurveTo(scx, scy, sx2, sy2);
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Traveling light particle along the arc
      const t = (Math.sin(time * 1.5 + lat1 * 0.1) + 1) / 2;
      const tx = (1 - t) * (1 - t) * sx1 + 2 * (1 - t) * t * scx + t * t * sx2;
      const ty = (1 - t) * (1 - t) * sy1 + 2 * (1 - t) * t * scy + t * t * sy2;

      ctx.beginPath();
      ctx.arc(tx, ty, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "#2563EB";
      ctx.shadowColor = "#3B82F6";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Location Markers & Pulsing Rings
    for (const marker of GLOBAL_CLINIC_NODES) {
      let [x, y, z] = latLngToXYZ(marker.lat, marker.lng, radius);
      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);

      if (z > 0) continue; // culled on back

      const [sx, sy] = project(x, y, z, cx, cy, fov);
      const pulse = (Math.sin(time * 2.5 + marker.lat) + 1) / 2;

      // Pulsing outer ring
      ctx.beginPath();
      ctx.arc(sx, sy, 3 + pulse * 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(37, 99, 235, ${(0.6 - pulse * 0.5).toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Solid Center Marker
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = markerColor;
      ctx.fill();

      // Subtle Label
      if (marker.label && z < -radius * 0.2) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.font = "10px 'Sora', sans-serif";
        ctx.fillText(marker.label, sx + 7, sy + 3);
      }
    }
  }, [dotColor, arcColor, markerColor, autoRotateSpeed]);

  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  // Mouse & Touch Drag Controls
  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startRotY: rotYRef.current,
      startRotX: rotXRef.current,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    rotYRef.current = dragRef.current.startRotY + dx * 0.005;
    rotXRef.current = Math.max(-1.1, Math.min(1.1, dragRef.current.startRotX - dy * 0.005));
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  return (
    <div className={`relative w-full aspect-square max-w-[500px] mx-auto select-none cursor-grab active:cursor-grabbing ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full block"
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono-ui text-[10px] text-slate-400 uppercase tracking-widest pointer-events-none bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
        Drag to rotate globe
      </div>
    </div>
  );
}
