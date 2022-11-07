import * as BABYLON from 'babylonjs'
import 'babylonjs-loaders'
window.CANNON = require('cannon')

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
  const color = BABYLON.Color3.Green()
  const id = window.crypto.randomUUID() // TODO this doesn't work on http, maybe it's not safe here
  const sphere = BABYLON.MeshBuilder.CreateSphere(id, { segments: 16, diameter: 1 }, scene)
  const material = new BABYLON.StandardMaterial("", scene)
  material.emissiveColor = material.diffuseColor = color
  sphere.material = material
  sphere.bakeCurrentTransformIntoVertices()
  sphere.position = getRandomBoundingPosition(from)
  sphere.computeWorldMatrix(true)

  const velocity = to.position.subtract(from.position).normalize()
  velocity.x = velocity.x * (Math.random())
  velocity.y = velocity.y * (Math.random())
  velocity.z = velocity.z * (Math.random())
  velocity.normalize().scaleInPlace(0.5)

  const trail = new BABYLON.TrailMesh('trail', sphere, scene, 0.2, 30, true)
  const sourceMat = new BABYLON.StandardMaterial('sourceMat', scene) // This'll be the material on the trail
  sourceMat.emissiveColor = sourceMat.diffuseColor = color
  sourceMat.specularColor = BABYLON.Color3.Black()
  trail.material = sourceMat

  const datum = { id, to, from, sphere, trail, velocity }
  if (projectileData[from.name]) {
    projectileData[from.name].push(datum)
  } else {
    projectileData[from.name] = [datum]
  }

}

const update = (pd: ProjectileDatum, scene: Scene) => {
  const sphere = pd.sphere
  const distanceTraveled = sphere.position.subtract(pd.from.position).length()
  const distanceToTravel = pd.to.position.subtract(pd.from.position).length()

  const hasCollidedWithDestination = distanceTraveled > distanceToTravel

  if (hasCollidedWithDestination) {
    const { to, from } = pd
    removeProjectile(pd)

    // If this mesh is still shooting TODO Might need to make this a nested object with [from.name][to.name]
    if (meshProjectingState[from.name]) {
      initProjectile(to, from, scene)
    }

    return
  }

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

export const init = (scene: Scene) => {
  scene.onBeforeRenderObservable.add(updateAll(scene))
}

export const start = async (from: Mesh, to: Mesh, scene: Scene) => {
  meshProjectingState[from.name] = true

  const numProjectiles = Math.ceil(from.getBoundingInfo().boundingSphere.radius) * 5

  let i = 1
  initProjectile(to, from, scene)
  let startInterval = setInterval(() => {
    if (i >= numProjectiles) {
      clearInterval(startInterval)
      return
    }

    initProjectile(to, from, scene)
    i++
  }, 300)

}

/**
* @description Stop the particles that are coming from the supplied mesh
*
* @param {Mesh} mesh The mesh from which the particles should stop emitting
*/
export const stopFor = (mesh: Mesh, scene: Scene) => {
  meshProjectingState[mesh.name] = false
}

