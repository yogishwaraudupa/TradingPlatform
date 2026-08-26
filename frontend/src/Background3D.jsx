import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, PerspectiveCamera } from '@react-three/drei'

function FloatingCoin({ position, color, scale=1 }){
  const ref = useRef()
  useFrame((state)=>{
    if(!ref.current) return
    ref.current.rotation.y += 0.008
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime*0.3 + position[0])*0.2
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime*0.5 + position[0])*0.3
  })
  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}>
      <mesh ref={ref} position={position} scale={scale}>
        <cylinderGeometry args={[0.7,0.7,0.15,32]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
    </Float>
  )
}

function GridFloor(){
  return (
    <gridHelper args={[30,30, '#2b3139','#1e2329']} position={[0,-2,0]} />
  )
}

function Scene(){
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5,8,5]} intensity={1.2} color="#f0b90b" />
      <pointLight position={[-5,3,-5]} intensity={0.8} color="#00bfff" />
      <PerspectiveCamera makeDefault position={[0,3,10]} fov={55} />
      <GridFloor />
      <FloatingCoin position={[-4,0.5,-3]} color="#f0b90b" scale={0.9} />
      <FloatingCoin position={[4,0.8,-2]} color="#0ecb81" scale={0.7} />
      <FloatingCoin position={[0,1.2,-4]} color="#00bfff" scale={0.6} />
      <FloatingCoin position={[-2,0.3,-5]} color="#a78bfa" scale={0.5} />
      {/* wireframe icosahedron for depth */}
      <Float speed={0.8} rotationIntensity={0.4}>
        <mesh position={[2,-0.5,-6]} scale={1.2}>
          <icosahedronGeometry args={[0.8,1]} />
          <meshStandardMaterial color="#2b3139" wireframe transparent opacity={0.15} />
        </mesh>
      </Float>
    </>
  )
}

export default function Background3D(){
  return (
    <div style={{position:'fixed', inset:0, zIndex:-1, opacity:0.35, pointerEvents:'none'}}>
      <Canvas dpr={[1,1.5]} gl={{ antialias:true, alpha:true }}>
        <Scene />
      </Canvas>
      <div style={{position:'absolute', inset:0, background:'radial-gradient(800px 500px at 50% 0%, rgba(240,185,11,0.08), transparent 70%), linear-gradient(180deg, rgba(11,14,17,0.2) 0%, rgba(11,14,17,0.95) 100%)'}} />
    </div>
  )
}
