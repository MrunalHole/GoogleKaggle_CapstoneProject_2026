import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Float } from "@react-three/drei";
import * as THREE from "three";
import { brainRegions, type BrainRegion } from "../../data/brainRegions";

/**
 * Procedurally constructs a stylized, organic brain-like form by
 * displacing an icosphere with layered noise. This avoids depending on
 * an external .glb asset (per the project brief's note that 3D models
 * are normally authored in Blender and exported as glTF/GLB — swap
 * <BrainMesh> for a <primitive object={gltf.scene} /> once a real
 * model is exported, the hotspot/interaction logic stays the same).
 */
function useBrainGeometry(detail = 4) {
  return useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, detail);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = v.clone().normalize();

      // Central longitudinal fissure (the groove between hemispheres)
      const fissure = Math.exp(-Math.pow(n.x * 9, 2)) * 0.1;

      // Lobulation — layered sine noise to fake sulci/gyri folds
      const folds =
        Math.sin(n.x * 11 + n.y * 4) * 0.035 +
        Math.sin(n.y * 14 + n.z * 6) * 0.028 +
        Math.sin(n.z * 9 - n.x * 7) * 0.022;

      // Flatten the underside slightly (brainstem area) and taper front/back
      const underTaper = n.y < -0.3 ? (n.y + 0.3) * 0.25 : 0;
      const frontTaper = Math.max(0, n.z - 0.6) * 0.18;

      const displacement = 1 + folds - fissure + underTaper - frontTaper;
      v.multiplyScalar(displacement);
      pos.setXYZ(i, v.x * 1.35, v.y * 1.05, v.z * 1.15);
    }
    geo.computeVertexNormals();
    return geo;
  }, [detail]);
}

interface BrainMeshProps {
  dopamineLevel: number; // 0-100
  activeRegion: string | null;
  onSelectRegion: (id: string) => void;
  autoRotate: boolean;
}

function BrainMesh({
  dopamineLevel,
  activeRegion,
  onSelectRegion,
  autoRotate,
}: BrainMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useBrainGeometry(5);
  const [hovered, setHovered] = useState<string | null>(null);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.18;
    }
  });

  // Dopamine loss visualized as cooling color + reduced "glow" intensity
  const healthMix = dopamineLevel / 100;
  const surfaceColor = new THREE.Color().lerpColors(
    new THREE.Color("#9a8f86"), // depleted: muted, ashy
    new THREE.Color("#e8b8ab"), // healthy: warm, vital
    healthMix
  );

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={surfaceColor}
          roughness={0.55}
          metalness={0.05}
          emissive={surfaceColor}
          emissiveIntensity={0.08 + healthMix * 0.1}
        />
      </mesh>

      {/* Inner glow core, dims as dopamine level drops */}
      <mesh scale={0.62}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#f0a2a1"
          transparent
          opacity={0.06 + healthMix * 0.16}
        />
      </mesh>

      {brainRegions.map((region) => (
        <RegionHotspot
          key={region.id}
          region={region}
          isActive={activeRegion === region.id}
          isHovered={hovered === region.id}
          onHover={setHovered}
          onSelect={onSelectRegion}
        />
      ))}
    </group>
  );
}

function RegionHotspot({
  region,
  isActive,
  isHovered,
  onHover,
  onSelect,
}: {
  region: BrainRegion;
  isActive: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const scale = isActive ? 1.5 : isHovered ? 1.25 : 1;
  return (
    <Float speed={2} rotationIntensity={0} floatIntensity={0.4}>
      <mesh
        position={region.position}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(region.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(region.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshBasicMaterial color={region.color} />
        {(isHovered || isActive) && (
          <Html distanceFactor={6} center style={{ pointerEvents: "none" }}>
            <div className="region-tooltip">{region.name}</div>
          </Html>
        )}
      </mesh>
    </Float>
  );
}

interface BrainSceneProps {
  dopamineLevel?: number;
  activeRegion?: string | null;
  onSelectRegion?: (id: string) => void;
  autoRotate?: boolean;
  interactive?: boolean;
}

export default function BrainScene({
  dopamineLevel = 85,
  activeRegion = null,
  onSelectRegion = () => {},
  autoRotate = true,
  interactive = true,
}: BrainSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.3, 3.4], fov: 42 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} castShadow />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#f0a2a1" />
      <pointLight position={[0, 0, 2]} intensity={0.4} color="#fffdfc" />

      <BrainMesh
        dopamineLevel={dopamineLevel}
        activeRegion={activeRegion}
        onSelectRegion={onSelectRegion}
        autoRotate={autoRotate}
      />

      {interactive && (
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2.2}
          maxDistance={5}
          autoRotate={false}
        />
      )}
    </Canvas>
  );
}
