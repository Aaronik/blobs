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
  // orb: BABYLON.AbstractMesh
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

  const velocity = to.position.subtract(from.position).normalize().scale(0.5)

  // sphere.isVisible = false
  // scene.addMesh(sphere)

  // const greenEnergyBall = await BABYLON.SceneLoader.LoadAssetContainerAsync("greenEnergyBall.glb", undefined, scene)
  // const orb = greenEnergyBall.meshes[0]
  // orb.setParent(sphere)
  // orb.scaling.scaleInPlace(0.03)
  // scene.addMesh(orb, true)

  const trail = new BABYLON.TrailMesh('trail', sphere, scene, 0.2, 30, true)
  const sourceMat = new BABYLON.StandardMaterial('sourceMat', scene) // This'll be the material on the trail
  sourceMat.emissiveColor = sourceMat.diffuseColor = color
  sourceMat.specularColor = BABYLON.Color3.Black()
  trail.material = sourceMat
  // trail.position = sphere.position.clone()
  // trail.setParent(sphere)

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
  console.log('removing projectile: ' + pd.id)
  pd.sphere.dispose()
  pd.trail.dispose()
  // pd.orb.dispose()
  // delete projectileData[pd.from.name] // TODO This is wrong, projectileData is for a from.name
  const projectileIndex = projectileData[pd.from.name].findIndex(pdat => pdat.id === pd.id)
  projectileData[pd.from.name].splice(projectileIndex, 1)
}

// Originally nicked from https://playground.babylonjs.com/#1F4UET#33

export const init = (scene: Scene) => {
  scene.onBeforeRenderObservable.add(updateAll(scene))
}

export const start = async (from: Mesh, to: Mesh, scene: Scene) => {
  meshProjectingState[from.name] = true

  // const numProjectiles = from.getBoundingInfo().boundingSphere.radius
  const numProjectiles = 10

  // // Set up new rendering pipeline for glow // TODO This is an important visual effect
  // const pipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene, [camera])
  // scene.imageProcessingConfiguration.toneMappingEnabled = true
  // scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES
  // scene.imageProcessingConfiguration.exposure = 3
  // pipeline.glowLayerEnabled = true
  // pipeline.glowLayer.intensity = 0.5

  // Use Ammo physics plugin
  // This is for gravity at least, possibly also collisions
  // I don't think I need this if I'm using SPS I can just dictate the particles' velocities
  // scene.enablePhysics(new BABYLON.Vector3(0, -9.8 / 3, 0), new BABYLON.AmmoJSPlugin())
  // scene.enablePhysics(to.position.subtract(from.position))

  // orbParentSphere.scaling.scaleInPlace(0.3) // TODO What's this for
  // orb.scaling.scaleInPlace(0.03) // TODO What's this for
  // orb.rotation.set(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI) // TODO What's this for
  // orb.scaling.z *= Math.random() > 0.5 ? -1 : 1 // TODO What's this for

  // orb.physicsImpostor = new BABYLON.PhysicsImpostor(orb, BABYLON.PhysicsImpostor.SphereImpostor, {
  //   mass: 1,
  //   restitution: 0.6
  // })

  for (let i = 0; i < numProjectiles; i++) {
    initProjectile(to, from, scene)
  }

  // from https://doc.babylonjs.com/features/featuresDeepDive/particles/solid_particle_system/sps_animate
  // TODO Make updateAll not need to take a from, it just iterates over all the meshes
  // scene.onBeforeRenderObservable.add(updateAll(scene))

  // // Create physics impostors // This ground looked great in the example
  // const ground = Mesh.CreateBox("Ground", 1, scene)
  // ground.scaling = new BABYLON.Vector3(100, 1, 100)
  // ground.position.y = environment.ground.position.y - (0.5 + 0.001)
  // ground.material = new BABYLON.StandardMaterial("test", scene)
  // ground.material.alpha = 0.99
  // ground.material.alphaMode = BABYLON.Engine.ALPHA_ONEONE
  // ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, {
  //   mass: 0,
  //   restitution: 0.6
  // })
}

/**
* @description Stop the particles that are coming from the supplied mesh
*
* @param {Mesh} mesh The mesh from which the particles should stop emitting
*/
export const stopFor = (mesh: Mesh, scene: Scene) => {
  meshProjectingState[mesh.name] = false
  // scene.onBeforeRenderObservable.clear() // TODO This'll clear all of em but really we just want to clear ours
}

