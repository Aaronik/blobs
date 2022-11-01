import * as BABYLON from 'babylonjs'
import 'babylonjs-loaders'
window.CANNON = require('cannon')

// I wish I could get these from the scene object but I haven't figured out how
// TODO see http://www.babylonjs.com.cn/how_to/solid_particle_system.html section Particle Intersections
const particleSystems: { [name: string]: BABYLON.SolidParticleSystem } = {}

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

  /************* THESE ARE THE GOODS *******************/

  // const orbParentSphere = BABYLON.MeshBuilder.CreateSphere("s", { segments: 16, diameter: 0.7 }, scene)
  // orbParentSphere.isVisible = false

  // TODO This goes to initParticles
  // orb.setParent(orbParentSphere)

  // orbParentSphere.bakeCurrentTransformIntoVertices()
  // orbParentSphere.computeWorldMatrix(true)

  // orbParentSphere.scaling.scaleInPlace(0.3) // TODO What's this for
  // orb.scaling.scaleInPlace(0.03) // TODO What's this for
  // orb.rotation.set(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI) // TODO What's this for
  // orb.scaling.z *= Math.random() > 0.5 ? -1 : 1 // TODO What's this for

  // orb.physicsImpostor = new BABYLON.PhysicsImpostor(orb, BABYLON.PhysicsImpostor.SphereImpostor, {
  //   mass: 1,
  //   restitution: 0.6
  // })

  /**************** THE GOODS ***************************/

  // // TODO COnsider whether this is necessary
  // scene.addMesh(orbParentSphere)

  const SPS = new BABYLON.SolidParticleSystem("SPS-" + from.name, scene, { useModelMaterial: true })
  particleSystems[from.name] = SPS
  SPS.computeParticleRotation = false

  const orbParentSphere = BABYLON.MeshBuilder.CreateSphere('sphere', { segments: 16, diameter: 1 }, scene)
  SPS.addShape(orbParentSphere, numParticles)
  orbParentSphere.dispose()

  const trail = new BABYLON.TrailMesh('trail', orbParentSphere, scene, 0.2, 30, true)
  const sourceMat = new BABYLON.StandardMaterial('sourceMat', scene) // This'll be the material on the trail
  const color = BABYLON.Color3.Red()
  sourceMat.emissiveColor = sourceMat.diffuseColor = color
  sourceMat.specularColor = BABYLON.Color3.Black()
  trail.material = sourceMat
  SPS.addShape(trail, numParticles)
  trail.dispose()

  const pinkEnergyBall = await BABYLON.SceneLoader.LoadAssetContainerAsync("pinkEnergyBall.glb", undefined, scene)
  const orb = pinkEnergyBall.meshes[0]
  orb.setParent(orbParentSphere)
  // SPS.addShape(orb as BABYLON.Mesh, numParticles) // TODO This casting may cause issues

  SPS.buildMesh() // finally builds and displays the SPS mesh

  const getRandomBoundingPosition = (mesh: BABYLON.Mesh) => {
    const emitterRadius = from.getBoundingInfo().boundingSphere.radiusWorld
    const vec = new BABYLON.Vector3(
      1 - (Math.random() * 2),
      1 - (Math.random() * 2),
      1 - (Math.random() * 2)
    ).normalize().scale(emitterRadius)
    return mesh.position.add(vec)
  }

  const recycleParticle = (particle: BABYLON.SolidParticle) => {
    particle.position = getRandomBoundingPosition(from)
    particle.velocity = to.position.subtract(particle.position).normalize().scale(Math.random() * 0.1)
    return particle
  }

  SPS.initParticles = () => {
    for (let p = 0; p < SPS.nbParticles; p++) {
      const particle = SPS.particles[p]
      recycleParticle(particle)
    }
  }

  SPS.updateParticle = (particle) => {
    const distanceTraveled = particle.position.subtract(from.position).length()
    const distanceToTravel = to.position.subtract(from.position).length()

    const hasCollidedWithDestination = distanceTraveled > distanceToTravel

    if (hasCollidedWithDestination) {
      return recycleParticle(particle)
    }

    particle.position.addInPlace(particle.velocity)

    return particle
  }

  SPS.initParticles()
  SPS.setParticles()

  // from https://doc.babylonjs.com/features/featuresDeepDive/particles/solid_particle_system/sps_animate
  scene.onBeforeRenderObservable.add(() => {
    SPS.setParticles()
  })

  scene.onAfterRenderObservable.add(() => {
    SPS.setParticles()
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
  scene.onAfterRenderObservable.clear()
  scene.onBeforeRenderObservable.clear()

  const SPS = particleSystems[mesh.name]
  SPS?.dispose()
  delete particleSystems[mesh.name]
}
