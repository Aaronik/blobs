import * as BABYLON from 'babylonjs'
import 'babylonjs-loaders'
window.CANNON = require('cannon')

let RATE_MULTIPLIER = 1

type Mesh = BABYLON.Mesh
type Scene = BABYLON.Scene

// The associated data of a single projectile
type ProjectileDatum = {
  id: string
  from: Mesh
  to: Mesh
  sphere: Mesh
  trail: BABYLON.TrailMesh
  velocity: BABYLON.Vector3
}

const projectileData: { [name: string]: ProjectileDatum[] } = {}

// Is the mesh with this name firing right now?
const meshProjectingState: { [name: string]: boolean } = {}

// TODO This is not working either
const getRandomBoundingPosition = (emitter: Mesh) => {
  const emitterRadius = emitter.getBoundingInfo().boundingSphere.radiusWorld
  const vec = new BABYLON.Vector3(
    1 - (Math.random() * 2),
    1 - (Math.random() * 2),
    1 - (Math.random() * 2)
  ).normalize().scale(emitterRadius)
  return emitter.position.add(vec)
}

const initProjectile = async (to: Mesh, from: Mesh, scene: Scene) => {
  const color = from.metadata.color
  const id = window.crypto.randomUUID() // TODO this doesn't work on http, maybe it's not safe here
  const projectile = BABYLON.MeshBuilder.CreateSphere(id, { segments: 16, diameter: 1 }, scene)
  const material = new BABYLON.StandardMaterial("", scene)
  material.emissiveColor = material.diffuseColor = color
  projectile.material = material
  projectile.bakeCurrentTransformIntoVertices()
  projectile.position = getRandomBoundingPosition(from)
  projectile.computeWorldMatrix(true)

  const velocity = to.position.subtract(from.position).normalize()
  velocity.x = velocity.x * (Math.random())
  velocity.y = velocity.y * (Math.random())
  velocity.z = velocity.z * (Math.random())
  velocity.normalize().scaleInPlace(0.5)

  const trail = new BABYLON.TrailMesh('trail', projectile, scene, 0.2, 30, true)
  const sourceMat = new BABYLON.StandardMaterial('sourceMat', scene) // This'll be the material on the trail
  sourceMat.emissiveColor = sourceMat.diffuseColor = color
  sourceMat.specularColor = BABYLON.Color3.Black()
  trail.material = sourceMat

  const datum = { id, to, from, sphere: projectile, trail, velocity }
  if (projectileData[from.name]) {
    projectileData[from.name].push(datum)
  } else {
    projectileData[from.name] = [datum]
  }

}

// NOTE: Before this is implemented, I showed this to Lex and RayShyne and they both reall loved
// the visuals. So I may not need to do any more on the visual front.
const generateProjectileExplosion = (to: Mesh, from: Mesh, scene: Scene) => {
  // Make 3 - 6 new smaller bits, totaling in size to the projectile
  // Have them moving in random directions along the outer hemisphere from which they came
  // Update each particle:
  // - Decelerate
  // - Fade
  // Remove each particle when the alpha is <= 0

  const numParticles = Math.ceil(Math.random() * 3) + 3

  for (let i = 0; i < numParticles; i++) {
    const id = window.crypto.randomUUID()
    const opts = {
      segments: 16,
      diameter: (Math.random() * 1)
    }
    const particle = BABYLON.MeshBuilder.CreateSphere('explosion-particle-' + id, opts, scene)
  }
}

// TODO This will probably want to be moved to game logic eventually.
// And everything in there to setup logic
const handleCollision = (to: Mesh, from: Mesh) => {
  to?.metadata?.handleShot(from)
}

const update = (pd: ProjectileDatum, scene: Scene) => {
  const sphere = pd.sphere
  const distanceTraveled = sphere.position.subtract(pd.from.position).length()
  const distanceToTravel = pd.to.position.subtract(pd.from.position).length()

  const hasCollidedWithDestination = distanceTraveled > distanceToTravel

  if (hasCollidedWithDestination) {
    const { to, from } = pd
    removeProjectile(pd)
    handleCollision(to, from)
    // generateProjectileExplosion(to, from, scene)

    return
  }

  // Move the projectile based on its velocity
  sphere.position.addInPlace(pd.velocity)

  // Influence projectiles towards their target
  const magnitude = pd.velocity.length()
  const ultimateDirection = pd.to.position.subtract(pd.sphere.position).normalize()
  pd.velocity.addInPlace(ultimateDirection.scale(1 / distanceToTravel)).normalize().scaleInPlace(magnitude)

  return sphere
}

const updateAll = (scene: Scene) => () => {
  Object.values(projectileData).forEach(projectiles => {
    projectiles.forEach(projectileDatum => {
      update(projectileDatum, scene)
    })
  })
}

const removeProjectile = (pd: ProjectileDatum) => {
  pd.sphere.dispose()
  pd.trail.dispose()
  const projectileIndex = projectileData[pd.from.name].findIndex(pdat => pdat.id === pd.id)
  projectileData[pd.from.name].splice(projectileIndex, 1)
}

// Originally nicked from https://playground.babylonjs.com/#1F4UET#33
export const init = (scene: Scene, rateMultiplier: number) => {
  RATE_MULTIPLIER = rateMultiplier
  scene.onBeforeRenderObservable.add(updateAll(scene))
}

// TODO For speed gains, I think these pages will definitely help:
// * https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies
// * https://doc.babylonjs.com/features/featuresDeepDive/mesh/LOD
export const start = async (from: Mesh, to: Mesh, scene: Scene) => {
  meshProjectingState[from.name] = true

  const delayThenFireAndSet = () => {
    const projectileRate = RATE_MULTIPLIER / Math.log(from.metadata.health)

    setTimeout(() => {
      if (!meshProjectingState[from.name]) return
      initProjectile(to, from, scene)
      delayThenFireAndSet()
    }, projectileRate)
  }

  delayThenFireAndSet()

}

/**
* @description Stop the particles that are coming from the supplied mesh
*
* @param {Mesh} mesh The mesh from which the particles should stop emitting
*/
export const stopFor = (mesh: Mesh, scene: Scene) => {
  meshProjectingState[mesh.name] = false
}

