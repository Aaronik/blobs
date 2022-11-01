import * as BABYLON from 'babylonjs'
import 'babylonjs-loaders'
window.CANNON = require('cannon')

type ProjectileDatum = {
  fromMesh: BABYLON.Mesh
  sphere: BABYLON.Mesh
  trail: BABYLON.TrailMesh
  orb: BABYLON.AbstractMesh
  velocity: BABYLON.Vector3
}

const projectileData: { [name: string]: ProjectileDatum[] } = {}

// Originally nicked from https://playground.babylonjs.com/#1F4UET#33

export const start = async (from: BABYLON.Mesh, to: BABYLON.Mesh, scene: BABYLON.Scene) => {

  // const numParticles = from.getBoundingInfo().boundingSphere.radius
  const numParticles = 10

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

  const getRandomBoundingPosition = (mesh: BABYLON.Mesh) => {
    const emitterRadius = from.getBoundingInfo().boundingSphere.radiusWorld
    const vec = new BABYLON.Vector3(
      1 - (Math.random() * 2),
      1 - (Math.random() * 2),
      1 - (Math.random() * 2)
    ).normalize().scale(emitterRadius)
    return mesh.position.add(vec)
  }

  const recycleProjectile = (pd: ProjectileDatum) => {
    pd.sphere.position = getRandomBoundingPosition(from)
    pd.velocity = to.position.subtract(pd.fromMesh.position).normalize().scale(0.5)
  }

  const initParticles = async () => {
    for (let i = 0; i < numParticles; i++) {

      const sphere = BABYLON.MeshBuilder.CreateSphere('projectile-sphere-' + i, { segments: 16, diameter: 1 }, scene)
      sphere.isVisible = false
      scene.addMesh(sphere)

      const trail = new BABYLON.TrailMesh('trail', sphere, scene, 0.2, 30, true)
      const sourceMat = new BABYLON.StandardMaterial('sourceMat', scene) // This'll be the material on the trail
      const color = BABYLON.Color3.Red()
      sourceMat.emissiveColor = sourceMat.diffuseColor = color
      sourceMat.specularColor = BABYLON.Color3.Black()
      trail.material = sourceMat

      const pinkEnergyBall = await BABYLON.SceneLoader.LoadAssetContainerAsync("pinkEnergyBall.glb", undefined, scene)
      const orb = pinkEnergyBall.meshes[0]
      orb.setParent(sphere)
      orb.scaling.scaleInPlace(0.03)
      scene.addMesh(orb, true)

      const datum = { fromMesh: from, sphere, trail, orb, velocity: BABYLON.Vector3.Zero() }
      if (projectileData[from.name]) {
        projectileData[from.name].push(datum)
      } else {
        projectileData[from.name] = [datum]
      }

      recycleProjectile(datum)
    }
  }

  const update = (projectileDatum: ProjectileDatum) => {
    const sphere = projectileDatum.sphere
    const distanceTraveled = sphere.position.subtract(from.position).length()
    const distanceToTravel = to.position.subtract(from.position).length()

    const hasCollidedWithDestination = distanceTraveled > distanceToTravel

    if (hasCollidedWithDestination) {
      return recycleProjectile(projectileDatum)
    }

    sphere.position.addInPlace(projectileDatum.velocity)

    return sphere
  }

  initParticles()

  // from https://doc.babylonjs.com/features/featuresDeepDive/particles/solid_particle_system/sps_animate
  scene.onBeforeRenderObservable.add(() => {
    projectileData[from.name]?.forEach(projectileDatum => {
      update(projectileDatum)
    })
  })

  // // Create physics impostors // This ground looked great in the example
  // const ground = BABYLON.Mesh.CreateBox("Ground", 1, scene)
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
* @param {BABYLON.Mesh} mesh The mesh from which the particles should stop emitting
*/
export const stopFor = (mesh: BABYLON.Mesh, scene: BABYLON.Scene) => {
  scene.onBeforeRenderObservable.clear() // TODO This'll clear all of em but really we just want to clear ours
  const pd = projectileData[mesh.name]
  pd.forEach(d => {
    d.sphere.dispose() // TODO Introduce "cancel" or something whereby this is marked for deletion and recycle deletes it after it finishes its final path
    d.trail.dispose()
    d.orb.dispose()
  })
  delete projectileData[mesh.name]
}

