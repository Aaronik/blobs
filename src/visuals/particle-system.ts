import * as BABYLON from 'babylonjs'

// ISSUES:
// * Always emits from the same radius no matter size of emitter.
// * Don't know how to detect collisions therefore can't make the game mechanics respond to
//   the animation
export const start = (from: BABYLON.Mesh, to: BABYLON.Mesh, scene: BABYLON.Scene) => {
  const particleSystem = new BABYLON.GPUParticleSystem('particles', { capacity: 5000 }, scene)
  const particleSize = 0.3
  const toPos = to.position.subtract(from.position)
  const emitterRadius = from.getBoundingInfo().boundingSphere.radius

  const initialSpeed = toPos.length() * 3.3 // Magic number which seems to get particles to stop _near_ their destination

  particleSystem.addLimitVelocityGradient(0, initialSpeed) //speed limit at start of particle lifetime
  particleSystem.addLimitVelocityGradient(1, 0.1) //speed limit at end of particle lifetime

  particleSystem.emitRate = emitterRadius * 100
  particleSystem.particleTexture = new BABYLON.Texture('flare.png')
  particleSystem.emitter = from

  // @ts-ignore
  particleSystem.color1 = BABYLON.Color4.FromColor3(from.material.emissiveColor)
  // @ts-ignore
  particleSystem.color2 = BABYLON.Color4.FromColor3(from.material.emissiveColor)

  // particleSystem.createHemisphericEmitter(1, 1)

  particleSystem.maxSize = particleSize
  particleSystem.minSize = particleSize

  particleSystem.direction1 = toPos
  particleSystem.direction2 = toPos
  particleSystem.gravity = toPos

  particleSystem.start()
}

/**
* @description Stop the particles that are coming from the supplied mesh
*
* @param {BABYLON.Mesh} mesh the mesh from which the particles should stop emitting
*/
export const stopFor = (mesh: BABYLON.Mesh) => {
  const particleSystems = mesh.getEmittedParticleSystems()
  particleSystems.forEach(ps => ps.stop())
}
