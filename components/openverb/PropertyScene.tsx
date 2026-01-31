"use client";

import { useRef, useMemo, useEffect, useState, Suspense, Component, ErrorInfo, ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrthographicCamera, Text } from "@react-three/drei";
import * as THREE from "three";
import type { WorldState, Entity, RobotEvent } from "@/src/world/model";
import { AlertCircle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SimulationErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Simulation Rendering Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center p-6 bg-muted/20 rounded-lg">
          <div className="max-w-md p-6 bg-background border border-destructive/50 rounded-lg shadow-lg text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-destructive">Simulation Error</h3>
            <p className="text-sm text-muted-foreground">The 3D simulation failed to render. This can happen due to WebGL issues or asset loading failures.</p>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32 text-left">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Property dimensions matching grid (32x24 grid)
const PROPERTY_WIDTH = 32;
const PROPERTY_DEPTH = 24;
// No offset needed - entities and house structure both use same grid-to-world conversion
const HOUSE_OFFSET_X = 0;
const HOUSE_OFFSET_Z = 0;

// Convert grid coords to world position (1 grid unit = 1 meter)
function gridToWorld(x: number, y: number): [number, number, number] {
  return [x - PROPERTY_WIDTH / 2, 0, y - PROPERTY_DEPTH / 2];
}

// ============================================================================
// HUMANOID ROBOT WITH ARTICULATED LIMBS
// ============================================================================

interface RobotProps {
  position: [number, number, number];
  targetPosition: [number, number, number] | null;
  isMoving: boolean;
  isReaching: boolean;
  reachTarget: [number, number, number] | null;
  carrying: string | null;
}

function HumanoidRobot({ position, targetPosition, isMoving, isReaching, reachTarget, carrying }: RobotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const [walkCycle, setWalkCycle] = useState(0);
  const prevPosRef = useRef(position);
  const [rotation, setRotation] = useState(0);

  // Robot follows the server-computed position (which follows the A* path)
  // We only interpolate slightly for smoothness and calculate rotation from movement direction
  useFrame((_, delta) => {
    // Calculate direction from previous position to current position
    const dx = position[0] - prevPosRef.current[0];
    const dz = position[2] - prevPosRef.current[2];
    const moved = Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001;

    if (moved) {
      // Face direction of movement
      setRotation(Math.atan2(dx, dz));
      // Update walk cycle when actually moving
      setWalkCycle((prev) => (prev + delta * 10) % (Math.PI * 2));
    }

    prevPosRef.current = position;

    // Apply leg animation
    if (leftLegRef.current && rightLegRef.current) {
      if (isMoving && moved) {
        leftLegRef.current.rotation.x = Math.sin(walkCycle) * 0.5;
        rightLegRef.current.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
      } else {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      }
    }

    // Apply arm animation
    if (leftArmRef.current && rightArmRef.current) {
      if (isReaching && reachTarget) {
        // Extend arm toward target
        const armDx = reachTarget[0] - position[0];
        const armDz = reachTarget[2] - position[2];
        const armAngle = Math.atan2(armDx, armDz) - rotation;
        rightArmRef.current.rotation.z = -Math.PI / 2;
        rightArmRef.current.rotation.y = armAngle;
      } else if (isMoving && moved) {
        // Natural arm swing while walking
        leftArmRef.current.rotation.x = Math.sin(walkCycle + Math.PI) * 0.3;
        rightArmRef.current.rotation.x = Math.sin(walkCycle) * 0.3;
        leftArmRef.current.rotation.z = 0;
        rightArmRef.current.rotation.z = 0;
      } else {
        leftArmRef.current.rotation.x = 0;
        rightArmRef.current.rotation.x = 0;
        leftArmRef.current.rotation.z = 0;
        rightArmRef.current.rotation.z = 0;
      }
    }

    // Update group position and rotation - use server position directly
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      groupRef.current.rotation.y = rotation;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body/Torso */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.4, 0.5, 0.25]} />
        <meshStandardMaterial color="#2563eb" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Eyes/Sensors */}
      <mesh position={[0.05, 1.32, 0.12]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.05, 1.32, 0.12]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>

      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.28, 1.05, 0]}>
        {/* Upper arm */}
        <mesh position={[-0.1, -0.12, 0]}>
          <boxGeometry args={[0.1, 0.25, 0.1]} />
          <meshStandardMaterial color="#1e40af" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Lower arm */}
        <mesh position={[-0.1, -0.35, 0]}>
          <boxGeometry args={[0.08, 0.2, 0.08]} />
          <meshStandardMaterial color="#1e3a8a" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Hand/Gripper */}
        <mesh position={[-0.1, -0.5, 0]}>
          <boxGeometry args={[0.12, 0.08, 0.06]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.28, 1.05, 0]}>
        {/* Upper arm */}
        <mesh position={[0.1, -0.12, 0]}>
          <boxGeometry args={[0.1, 0.25, 0.1]} />
          <meshStandardMaterial color="#1e40af" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Lower arm */}
        <mesh position={[0.1, -0.35, 0]}>
          <boxGeometry args={[0.08, 0.2, 0.08]} />
          <meshStandardMaterial color="#1e3a8a" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Hand/Gripper */}
        <mesh position={[0.1, -0.5, 0]}>
          <boxGeometry args={[0.12, 0.08, 0.06]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.12, 0.55, 0]}>
        {/* Upper leg */}
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.12, 0.3, 0.12]} />
          <meshStandardMaterial color="#1e40af" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Lower leg */}
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.1, 0.25, 0.1]} />
          <meshStandardMaterial color="#1e3a8a" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.55, 0.03]}>
          <boxGeometry args={[0.12, 0.05, 0.18]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.12, 0.55, 0]}>
        {/* Upper leg */}
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.12, 0.3, 0.12]} />
          <meshStandardMaterial color="#1e40af" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Lower leg */}
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.1, 0.25, 0.1]} />
          <meshStandardMaterial color="#1e3a8a" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.55, 0.03]}>
          <boxGeometry args={[0.12, 0.05, 0.18]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Carrying indicator */}
      {carrying && (
        <group position={[0.35, 0.8, 0.2]}>
          <mesh>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          <Text
            position={[0, 0.2, 0]}
            fontSize={0.1}
            color="#000"
            anchorX="center"
            anchorY="bottom"
          >
            {carrying}
          </Text>
        </group>
      )}

      {/* Shadow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="#000" opacity={0.3} transparent />
      </mesh>
    </group>
  );
}

// ============================================================================
// PROPERTY GROUND AND SURFACES
// ============================================================================

function PropertyGround() {
  // Grid to world conversion helper
  const gx = (x: number) => x - PROPERTY_WIDTH / 2;
  const gz = (y: number) => y - PROPERTY_DEPTH / 2;

  return (
    <group>
      {/* Main grass lawn - entire property base */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PROPERTY_WIDTH, PROPERTY_DEPTH]} />
        <meshStandardMaterial color="#5a8f3e" /> {/* Natural lawn green */}
      </mesh>

      {/* Front walkway - from sidewalk to front door (at grid x=16, y=18-23) */}
      <mesh position={[gx(16), 0.01, gz(20.5)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 5]} />
        <meshStandardMaterial color="#9e9585" /> {/* Concrete walkway */}
      </mesh>

      {/* Driveway (right side of property) */}
      <mesh position={[gx(28), 0.01, gz(20)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 8]} />
        <meshStandardMaterial color="#8a8279" /> {/* Asphalt gray */}
      </mesh>

      {/* Back patio/deck area */}
      <mesh position={[gx(15), 0.01, gz(1.5)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 3]} />
        <meshStandardMaterial color="#9c8060" /> {/* Wood deck */}
      </mesh>

      {/* Outdoor trash bin area (grid x=2, y=20) */}
      <mesh position={[gx(2), 0.01, gz(20)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#7a756e" /> {/* Concrete pad */}
      </mesh>

      {/* Property boundary lines */}
      <mesh position={[0, 0.02, -PROPERTY_DEPTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PROPERTY_WIDTH, 0.1]} />
        <meshBasicMaterial color="#6b635a" />
      </mesh>
      <mesh position={[0, 0.02, PROPERTY_DEPTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PROPERTY_WIDTH, 0.1]} />
        <meshBasicMaterial color="#6b635a" />
      </mesh>
      <mesh position={[-PROPERTY_WIDTH / 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[PROPERTY_DEPTH, 0.1]} />
        <meshBasicMaterial color="#6b635a" />
      </mesh>
      <mesh position={[PROPERTY_WIDTH / 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[PROPERTY_DEPTH, 0.1]} />
        <meshBasicMaterial color="#6b635a" />
      </mesh>

      {/* Yard labels */}
      <Text
        position={[gx(2), 0.04, gz(5)]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="#4a4540"
        anchorX="center"
        anchorY="middle"
      >
        BACKYARD
      </Text>
      <Text
        position={[gx(16), 0.04, gz(22)]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="#4a4540"
        anchorX="center"
        anchorY="middle"
      >
        FRONT YARD
      </Text>
      <Text
        position={[gx(28), 0.04, gz(20)]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color="#4a4540"
        anchorX="center"
        anchorY="middle"
      >
        DRIVEWAY
      </Text>
    </group>
  );
}

// ============================================================================
// HOUSE STRUCTURE
// ============================================================================

function HouseStructure() {
  const wallHeight = 0.35;
  const wallThickness = 0.15;

  // Grid to world conversion helper (matches gridToWorld but local)
  const gx = (x: number) => x - PROPERTY_WIDTH / 2;
  const gz = (y: number) => y - PROPERTY_DEPTH / 2;

  // Room bounds from init.ts (grid coordinates)
  // Kitchen: x: 4-14, y: 4-11
  // Living: x: 15-26, y: 4-11
  // Hallway: x: 4-18, y: 11-18
  // Bedroom: x: 19-22, y: 11-18
  // Bathroom: x: 23-26, y: 11-18

  const kitchenCenter = { x: gx(9), z: gz(7.5) };
  const livingCenter = { x: gx(20.5), z: gz(7.5) };
  const hallwayCenter = { x: gx(11), z: gz(14.5) };
  const bedroomCenter = { x: gx(20.5), z: gz(14.5) };
  const bathroomCenter = { x: gx(24.5), z: gz(14.5) };

  return (
    <group>
      {/* FULL HOUSE FOUNDATION - covers entire interior so no grass shows through */}
      {/* House bounds: x: 4-26, y: 4-18 -> width: 22, height: 14 */}
      <mesh position={[gx(15), 0.015, gz(11)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 14]} />
        <meshStandardMaterial color="#c9b896" /> {/* Base floor color */}
      </mesh>

      {/* FLOOR SURFACES - layered on top */}

      {/* Kitchen floor - ceramic tile (x: 4-14, y: 4-11) */}
      <mesh position={[gx(9), 0.025, gz(7.5)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 7]} />
        <meshStandardMaterial color="#e8e0d5" /> {/* Warm cream tile */}
      </mesh>

      {/* Living room floor - hardwood (x: 15-26, y: 4-11) */}
      <mesh position={[gx(20.5), 0.025, gz(7.5)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[11, 7]} />
        <meshStandardMaterial color="#c4a36a" /> {/* Oak wood */}
      </mesh>

      {/* Hallway floor - hardwood (x: 4-18, y: 11-18) */}
      <mesh position={[gx(11), 0.025, gz(14.5)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial color="#b8956e" /> {/* Darker wood */}
      </mesh>

      {/* Bedroom floor - carpet (x: 19-22, y: 11-18) */}
      <mesh position={[gx(20.5), 0.025, gz(14.5)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 7]} />
        <meshStandardMaterial color="#a89880" /> {/* Beige carpet */}
      </mesh>

      {/* Bathroom floor - stone tile (x: 23-26, y: 11-18) */}
      <mesh position={[gx(24.5), 0.025, gz(14.5)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 7]} />
        <meshStandardMaterial color="#d5cfc5" /> {/* Light stone */}
      </mesh>

      {/* EXTERIOR WALLS */}
      {/* Top wall (y=4) */}
      <mesh position={[gx(15), wallHeight / 2, gz(4)]}>
        <boxGeometry args={[22, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#5d534a" />
      </mesh>

      {/* Bottom wall (y=18) with front door gap at x=16 */}
      <mesh position={[gx(10), wallHeight / 2, gz(18)]}>
        <boxGeometry args={[12, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#5d534a" />
      </mesh>
      <mesh position={[gx(21), wallHeight / 2, gz(18)]}>
        <boxGeometry args={[10, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#5d534a" />
      </mesh>

      {/* Left wall (x=4) */}
      <mesh position={[gx(4), wallHeight / 2, gz(11)]}>
        <boxGeometry args={[wallThickness, wallHeight, 14]} />
        <meshStandardMaterial color="#5d534a" />
      </mesh>

      {/* Right wall (x=26) */}
      <mesh position={[gx(26), wallHeight / 2, gz(11)]}>
        <boxGeometry args={[wallThickness, wallHeight, 14]} />
        <meshStandardMaterial color="#5d534a" />
      </mesh>

      {/* INTERIOR WALLS */}
      {/* Kitchen/Living divider (x=14, y=4-9) with opening */}
      <mesh position={[gx(14), wallHeight / 2, gz(6.5)]}>
        <boxGeometry args={[wallThickness, wallHeight, 5]} />
        <meshStandardMaterial color="#7a7067" />
      </mesh>

      {/* Horizontal wall between top rooms and bottom rooms (y=11) with opening at x=8 */}
      <mesh position={[gx(6), wallHeight / 2, gz(11)]}>
        <boxGeometry args={[4, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#7a7067" />
      </mesh>
      <mesh position={[gx(15), wallHeight / 2, gz(11)]}>
        <boxGeometry args={[14, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#7a7067" />
      </mesh>

      {/* Bedroom wall (x=19) with door at y=15 */}
      <mesh position={[gx(19), wallHeight / 2, gz(13)]}>
        <boxGeometry args={[wallThickness, wallHeight, 4]} />
        <meshStandardMaterial color="#7a7067" />
      </mesh>
      <mesh position={[gx(19), wallHeight / 2, gz(17)]}>
        <boxGeometry args={[wallThickness, wallHeight, 2]} />
        <meshStandardMaterial color="#7a7067" />
      </mesh>

      {/* Bathroom wall (x=23) with door at y=13 */}
      <mesh position={[gx(23), wallHeight / 2, gz(12)]}>
        <boxGeometry args={[wallThickness, wallHeight, 2]} />
        <meshStandardMaterial color="#7a7067" />
      </mesh>
      <mesh position={[gx(23), wallHeight / 2, gz(16)]}>
        <boxGeometry args={[wallThickness, wallHeight, 4]} />
        <meshStandardMaterial color="#7a7067" />
      </mesh>

      {/* DOOR MARKERS */}
      {/* Front door mat */}
      <mesh position={[gx(16), 0.03, gz(18.5)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 1]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>

      {/* Room Labels */}
      <Text
        position={[kitchenCenter.x, 0.04, kitchenCenter.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.6}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        KITCHEN
      </Text>
      <Text
        position={[livingCenter.x, 0.04, livingCenter.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.6}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        LIVING ROOM
      </Text>
      <Text
        position={[hallwayCenter.x, 0.04, hallwayCenter.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        HALLWAY
      </Text>
      <Text
        position={[bedroomCenter.x, 0.04, bedroomCenter.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        BEDROOM
      </Text>
      <Text
        position={[bathroomCenter.x, 0.04, bathroomCenter.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        BATHROOM
      </Text>
    </group>
  );
}

// ============================================================================
// FURNITURE AND OBJECTS
// ============================================================================

interface FurnitureProps {
  entity: Entity;
  isSelected: boolean;
  onClick: () => void;
}

function Furniture({ entity, isSelected, onClick }: FurnitureProps) {
  const [x, , z] = gridToWorld(entity.pos.x, entity.pos.y);
  const worldX = x;
  const worldZ = z;

  const renderObject = () => {
    switch (entity.type) {
      case "fridge":
        return (
          <group>
            <mesh position={[0, 0.9, 0]}>
              <boxGeometry args={[0.8, 1.8, 0.7]} />
              <meshStandardMaterial color="#f1f5f9" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Handle */}
            <mesh position={[0.35, 0.9, 0.36]}>
              <boxGeometry args={[0.05, 0.4, 0.05]} />
              <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        );

      case "table":
        return (
          <group>
            {/* Tabletop */}
            <mesh position={[0, 0.75, 0]}>
              <boxGeometry args={[1.2, 0.05, 0.8]} />
              <meshStandardMaterial color="#92400e" />
            </mesh>
            {/* Legs */}
            {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map(([lx, lz], i) => (
              <mesh key={i} position={[lx, 0.35, lz]}>
                <boxGeometry args={[0.08, 0.7, 0.08]} />
                <meshStandardMaterial color="#78350f" />
              </mesh>
            ))}
          </group>
        );

      case "shelf":
        return (
          <group>
            <mesh position={[0, 0.6, 0]}>
              <boxGeometry args={[1, 1.2, 0.4]} />
              <meshStandardMaterial color="#a16207" />
            </mesh>
            {/* Shelf dividers */}
            {[0.2, 0.6, 1].map((y, i) => (
              <mesh key={i} position={[0, y, 0.05]}>
                <boxGeometry args={[0.9, 0.03, 0.3]} />
                <meshStandardMaterial color="#854d0e" />
              </mesh>
            ))}
          </group>
        );

      case "trash":
        return (
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.2, 0.25, 0.6, 16]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        );

      case "light":
        return (
          <group>
            <mesh position={[0, 2.5, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial
                color={entity.isOn ? "#fef08a" : "#a1a1aa"}
                emissive={entity.isOn ? "#fef08a" : "#000"}
                emissiveIntensity={entity.isOn ? 0.8 : 0}
              />
            </mesh>
            {entity.isOn && (
              <pointLight position={[0, 2.5, 0]} intensity={50} color="#fef9c3" />
            )}
          </group>
        );

      case "faucet":
        return (
          <group>
            {/* Sink basin */}
            <mesh position={[0, 0.85, 0]}>
              <boxGeometry args={[0.6, 0.15, 0.5]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Faucet */}
            <mesh position={[0, 1, 0.15]}>
              <cylinderGeometry args={[0.03, 0.03, 0.3, 12]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.05} />
            </mesh>
            <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.2, 12]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.05} />
            </mesh>
            {entity.isOn && (
              <mesh position={[0, 0.5, -0.05]}>
                <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
                <meshStandardMaterial color="#60a5fa" transparent opacity={0.6} />
              </mesh>
            )}
          </group>
        );

      case "book":
        return (
          <mesh position={[0, 0.8, 0]} rotation={[0, 0.1, 0]}>
            <boxGeometry args={[0.2, 0.03, 0.15]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
        );

      case "package":
        return (
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#d97706" />
          </mesh>
        );

      case "bed":
        return (
          <group>
            {/* Frame */}
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[1.4, 0.3, 2]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
            {/* Mattress */}
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[1.3, 0.2, 1.9]} />
              <meshStandardMaterial color="#f5f5f4" />
            </mesh>
            {/* Pillow */}
            <mesh position={[0, 0.6, 0.75]}>
              <boxGeometry args={[0.8, 0.15, 0.4]} />
              <meshStandardMaterial color="#fafafa" />
            </mesh>
            {/* Headboard */}
            <mesh position={[0, 0.7, 0.95]}>
              <boxGeometry args={[1.4, 0.6, 0.1]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
          </group>
        );

      case "sofa":
        return (
          <group>
            {/* Base */}
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[1.8, 0.4, 0.8]} />
              <meshStandardMaterial color="#6366f1" />
            </mesh>
            {/* Back */}
            <mesh position={[0, 0.55, 0.3]}>
              <boxGeometry args={[1.8, 0.5, 0.2]} />
              <meshStandardMaterial color="#6366f1" />
            </mesh>
            {/* Arms */}
            <mesh position={[-0.85, 0.4, 0]}>
              <boxGeometry args={[0.15, 0.3, 0.8]} />
              <meshStandardMaterial color="#6366f1" />
            </mesh>
            <mesh position={[0.85, 0.4, 0]}>
              <boxGeometry args={[0.15, 0.3, 0.8]} />
              <meshStandardMaterial color="#6366f1" />
            </mesh>
          </group>
        );

      case "tv":
        return (
          <group>
            {/* Screen */}
            <mesh position={[0, 0.8, 0]}>
              <boxGeometry args={[1.2, 0.7, 0.05]} />
              <meshStandardMaterial color={entity.isOn ? "#1e293b" : "#0f172a"} />
            </mesh>
            {entity.isOn && (
              <mesh position={[0, 0.8, 0.03]}>
                <planeGeometry args={[1.1, 0.6]} />
                <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.3} />
              </mesh>
            )}
            {/* Stand */}
            <mesh position={[0, 0.35, 0]}>
              <boxGeometry args={[0.3, 0.2, 0.15]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        );

      case "plant":
        return (
          <group>
            {/* Pot */}
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.15, 0.12, 0.3, 16]} />
              <meshStandardMaterial color="#92400e" />
            </mesh>
            {/* Plant */}
            <mesh position={[0, 0.45, 0]}>
              <sphereGeometry args={[0.25, 12, 12]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
          </group>
        );

      case "mailbox":
        return (
          <group>
            {/* Post */}
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[0.1, 1, 0.1]} />
              <meshStandardMaterial color="#78716c" />
            </mesh>
            {/* Box */}
            <mesh position={[0, 1.1, 0]}>
              <boxGeometry args={[0.25, 0.3, 0.4]} />
              <meshStandardMaterial color="#1e3a8a" />
            </mesh>
          </group>
        );

      case "car":
        return (
          <group>
            {/* Body */}
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[1.8, 0.5, 4]} />
              <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Cabin */}
            <mesh position={[0, 0.9, -0.3]}>
              <boxGeometry args={[1.6, 0.5, 2]} />
              <meshStandardMaterial color="#1e40af" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Windows */}
            <mesh position={[0, 0.9, -0.3]}>
              <boxGeometry args={[1.4, 0.4, 1.8]} />
              <meshStandardMaterial color="#7dd3fc" transparent opacity={0.7} />
            </mesh>
            {/* Wheels */}
            {[[-0.8, 1.3], [-0.8, -1.3], [0.8, 1.3], [0.8, -1.3]].map(([wx, wz], i) => (
              <mesh key={i} position={[wx, 0.2, wz]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                <meshStandardMaterial color="#1f2937" />
              </mesh>
            ))}
          </group>
        );

      default:
        return (
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.4, 0.5, 0.4]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
        );
    }
  };

  return (
    <group
      position={[worldX, 0, worldZ]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {renderObject()}

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.7, 32]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      )}

      {/* Label */}
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.2}
        color="#1e293b"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#fff"
      >
        {entity.name}
      </Text>
    </group>
  );
}

// ============================================================================
// OUTDOOR ELEMENTS
// ============================================================================

function OutdoorElements() {
  // Grid to world conversion helper
  const gx = (x: number) => x - PROPERTY_WIDTH / 2;
  const gz = (y: number) => y - PROPERTY_DEPTH / 2;

  return (
    <group>
      {/* Trees in backyard area */}
      {[
        [gx(2), gz(2)],   // Back left
        [gx(28), gz(2)],  // Back right
        [gx(30), gz(10)], // Side right
      ].map(([x, z], i) => (
        <group key={`tree-d-${i}`} position={[x, 0, z]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 1.2, 12]} />
            <meshStandardMaterial color="#5d4037" />
          </mesh>
          <mesh position={[0, 1.8, 0]}>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshStandardMaterial color="#2e7d32" />
          </mesh>
        </group>
      ))}

      {/* Shrubs along house front */}
      {[
        [gx(6), gz(18.5)],
        [gx(12), gz(18.5)],
        [gx(20), gz(18.5)],
        [gx(24), gz(18.5)],
      ].map(([x, z], i) => (
        <mesh key={`bush-${i}`} position={[x, 0.25, z]}>
          <sphereGeometry args={[0.4, 12, 12]} />
          <meshStandardMaterial color="#3d6b35" />
        </mesh>
      ))}

      {/* Wooden fence around backyard */}
      {/* Back fence (y=0) */}
      <mesh position={[gx(15), 0.35, gz(0)]}>
        <boxGeometry args={[20, 0.7, 0.1]} />
        <meshStandardMaterial color="#6d5841" />
      </mesh>
      {/* Left fence */}
      <mesh position={[gx(0), 0.35, gz(6)]}>
        <boxGeometry args={[0.1, 0.7, 12]} />
        <meshStandardMaterial color="#6d5841" />
      </mesh>
      {/* Right fence (partial, not blocking driveway) */}
      <mesh position={[gx(31), 0.35, gz(6)]}>
        <boxGeometry args={[0.1, 0.7, 12]} />
        <meshStandardMaterial color="#6d5841" />
      </mesh>

      {/* Fence posts */}
      {[0, 5, 10, 15, 20, 25, 30].map((gridX, i) => (
        <mesh key={`post-${i}`} position={[gx(gridX), 0.45, gz(0)]}>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshStandardMaterial color="#5a4a3a" />
        </mesh>
      ))}

      {/* Patio furniture in backyard */}
      <group position={[gx(15), 0, gz(1.5)]}>
        {/* Outdoor table */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
          <meshStandardMaterial color="#8d7560" />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.35, 8]} />
          <meshStandardMaterial color="#6d5545" />
        </mesh>
        {/* Chairs */}
        {[[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]].map(([cx, cz], i) => (
          <mesh key={`chair-${i}`} position={[cx, 0.22, cz]}>
            <boxGeometry args={[0.35, 0.04, 0.35]} />
            <meshStandardMaterial color="#8d7560" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ============================================================================
// PATH VISUALIZATION
// ============================================================================

interface PathVisualizationProps {
  path: [number, number][];
}

function PathVisualization({ path }: PathVisualizationProps) {
  if (!path || path.length < 2) return null;

  // Render path as a series of small spheres (waypoint markers)
  return (
    <group>
      {path.map(([x, y], i) => {
        if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
          return null;
        }
        const [wx, , wz] = gridToWorld(x, y);
        return (
          <mesh key={`path-${i}`} position={[wx, 0.1, wz]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshBasicMaterial color="#f97316" />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// MAIN SCENE COMPONENT
// ============================================================================

interface PropertySceneProps {
  world: WorldState;
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  robotPath?: [number, number][];
  isRobotMoving?: boolean;
  isRobotReaching?: boolean;
  reachTargetId?: string | null;
}

export function PropertyScene(props: PropertySceneProps) {
  return (
    <SimulationErrorBoundary>
      <PropertySceneInner {...props} />
    </SimulationErrorBoundary>
  );
}

function PropertySceneInner({
  world,
  selectedEntityId,
  onSelectEntity,
  robotPath = [],
  isRobotMoving = false,
  isRobotReaching = false,
  reachTargetId = null,
}: PropertySceneProps) {
  // Convert Record<string, Entity> to array
  const entitiesArray = useMemo(() => Object.values(world.entities), [world.entities]);
  const otherEntities = useMemo(() => entitiesArray.filter((e) => e.type !== "robot"), [entitiesArray]);

  // Robot position - use current interpolated position from world state
  const robotPos = useMemo<[number, number, number]>(() => {
    const [x, , z] = gridToWorld(world.robot.pos.x, world.robot.pos.y);
    return [x, 0, z];
  }, [world.robot.pos.x, world.robot.pos.y]);

  // Target position from world's movement state or passed-in path
  const targetPos = useMemo<[number, number, number] | null>(() => {
    // Prefer world's movement state
    if (world.robot.movement?.targetPos) {
      const [x, , z] = gridToWorld(world.robot.movement.targetPos.x, world.robot.movement.targetPos.y);
      return [x, 0, z];
    }
    // Fallback to passed-in path
    if (robotPath.length >= 2) {
      const [px, py] = robotPath[robotPath.length - 1];
      const [wx, , wz] = gridToWorld(px, py);
      return [wx, 0, wz];
    }
    return null;
  }, [world.robot.movement, robotPath]);

  // Detect if robot is moving from world state
  const actuallyMoving = !!world.robot.movement || isRobotMoving;

  // Path visualization - use world's path or passed-in path
  const displayPath = useMemo<[number, number][]>(() => {
    if (world.robot.movement?.path) {
      return world.robot.movement.path.map((p) => [p.x, p.y] as [number, number]);
    }
    return robotPath;
  }, [world.robot.movement, robotPath]);

  const reachTarget = useMemo<[number, number, number] | null>(() => {
    if (!reachTargetId) return null;
    const target = world.entities[reachTargetId];
    if (!target) return null;
    const [x, , z] = gridToWorld(target.pos.x, target.pos.y);
    return [x, 0, z];
  }, [reachTargetId, world.entities]);

  return (
    <div className="w-full h-full min-h-[500px] rounded-lg overflow-hidden border border-border">
      <Canvas shadows>
        <Suspense fallback={null}>
          <OrthographicCamera
            makeDefault
            position={[0, 100, 0]}
            zoom={18}
            near={0.1}
            far={300}
            rotation={[-Math.PI / 2, 0, 0]}
          />

          {/* Lighting */}
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[10, 30, 10]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />

          {/* Neutral background - not blue */}
          <color attach="background" args={["#d4cfc7"]} />

          {/* Property elements */}
          <PropertyGround />
          <HouseStructure />
          <OutdoorElements />

          {/* Path visualization */}
          <PathVisualization path={displayPath} />

          {/* Entities */}
          {otherEntities.map((entity) => (
            <Furniture
              key={entity.id}
              entity={entity}
              isSelected={entity.id === selectedEntityId}
              onClick={() => onSelectEntity(entity.id)}
            />
          ))}

          {/* Robot */}
          <HumanoidRobot
            position={robotPos}
            targetPosition={targetPos}
            isMoving={actuallyMoving}
            isReaching={isRobotReaching}
            reachTarget={reachTarget}
            carrying={world.robot.carrying}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
