import * as BABYLON from 'babylonjs'
import 'babylonjs-loaders'
window.CANNON = require('cannon')

// I wish I could get these from the scene object but I haven't figured out how
// TODO
const particleSystems: { [name: string]: BABYLON.SolidParticleSystem } = {}

// Originally nicked from https://playground.babylonjs.com/#1F4UET#33

export const start = async (from: BABYLON.Mesh, to: BABYLON.Mesh, scene: BABYLON.Scene) => {

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
  // const pinkEnergyBall = await BABYLON.SceneLoader.LoadAssetContainerAsync("pinkEnergyBall.glb", undefined, scene)
  // const orb = pinkEnergyBall.meshes[0]
  // const orbParentSphere = BABYLON.MeshBuilder.CreateSphere("s", { segments: 16, diameter: 0.7 }, scene)
  // orbParentSphere.isVisible = false
  // orb.setParent(orbParentSphere)
  // orbParentSphere.position = from.position
  // orbParentSphere.scaling.scaleInPlace(0.3) // TODO What's this for
  // orb.scaling.scaleInPlace(0.03) // TODO What's this for
  // orb.rotation.set(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI) // TODO What's this for
  // orb.scaling.z *= Math.random() > 0.5 ? -1 : 1 // TODO What's this for

  // orb.physicsImpostor = new BABYLON.PhysicsImpostor(orb, BABYLON.PhysicsImpostor.SphereImpostor, {
  //   mass: 1,
  //   restitution: 0.6
  // })

  // const trail = new BABYLON.TrailMesh('orb trail', orb, scene, 0.2, 30, true)

  // const sourceMat = new BABYLON.StandardMaterial('sourceMat', scene) // This'll be the material on the trail

  // const color = BABYLON.Color3.Red()

  // sourceMat.emissiveColor = sourceMat.diffuseColor = color
  // sourceMat.specularColor = BABYLON.Color3.Black()

  // trail.material = sourceMat
  /**************** THE GOODS ***************************/

  // // TODO Doubt we need this here
  // scene.addMesh(orb, true)

  const SPS = new BABYLON.SolidParticleSystem("SPS-" + from.name, scene)
  particleSystems[from.name] = SPS
  SPS.computeParticleRotation = false

  const orbParentSphere = BABYLON.MeshBuilder.CreateSphere('particle-sphere', { segments: 16, diameter: 1 }, scene)

  // If I use orb as BABYLON.Mesh here it'll jump out fast, but then i get an error, and it still doesn't look right.
  SPS.addShape(orbParentSphere, 20)

  orbParentSphere.dispose() // free memory

  const mesh = SPS.buildMesh() // finally builds and displays the SPS mesh

  const recycleParticle = (particle: BABYLON.SolidParticle) => {
    particle.position = from.position.clone()
    return particle
  }

  SPS.initParticles = () => {
    for (let p = 0; p < SPS.nbParticles; p++) {
      const particle = SPS.particles[p]
      //Place particles at random positions with a cube
      // particle.position.x = BABYLON.Scalar.RandomRange(-50, 50)
      // particle.position.y = BABYLON.Scalar.RandomRange(-50, 50)
      // particle.position.z = BABYLON.Scalar.RandomRange(-50, 50)

      particle.position = from.position.clone()
      particle.velocity = to.position.subtract(from.position).normalize().scale(Math.random())
    }
  }

  SPS.updateParticle = (particle) => {
    // let hasCollidedWithDestination: boolean = false
    // const boundingInfo = particle.getBoundingInfo()

    // if (!!boundingInfo) { // The bounding info never seems to come from these
    //   alert('got that bounding info')
    //   hasCollidedWithDestination = particle.position.equals(to.position)
    // }

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

  // let orbs = [pinkEnergyBall.meshes[0]]

  // orbs = orbs.map(orb => {
  //   // Create lights
  //   // const pointLight = new BABYLON.PointLight("light1", new BABYLON.Vector3(0, 3, 0), scene)
  //   // pointLight.intensity = 0.3

  //   // Add physics root for spheres
  //   const sphereOpts = {
  //     segments: 16,
  //     diameter: 0.7
  //   }

  //   const sphere = BABYLON.MeshBuilder.CreateSphere("s", sphereOpts, scene)
  //   sphere.isVisible = false
  //   orb.setParent(sphere)
  //   sphere.position = from.position
  //   sphere.scaling.scaleInPlace(0.3)
  //   orb.scaling.scaleInPlace(0.03)
  //   orb.rotation.set(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI)
  //   orb.scaling.z *= Math.random() > 0.5 ? -1 : 1
  //   scene.addMesh(orb, true)
  //   return sphere
  // })

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

  // Add trail to orbs
  // orbs.forEach((orb, i) => {
  //   orb.physicsImpostor = new BABYLON.PhysicsImpostor(orb, BABYLON.PhysicsImpostor.SphereImpostor, {
  //     mass: 1,
  //     restitution: 0.6
  //   })
  //   const trail = new BABYLON.TrailMesh('orb trail', orb, scene, 0.2, 30, true)
  //   const sourceMat = new BABYLON.StandardMaterial('sourceMat', scene)
  //   let color = BABYLON.Color3.Red()
  //   if (i == 1) {
  //     color = BABYLON.Color3.Green()
  //   } else if (i == 2) {
  //     color = BABYLON.Color3.Yellow()
  //   }
  //   sourceMat.emissiveColor = sourceMat.diffuseColor = color
  //   sourceMat.specularColor = BABYLON.Color3.Black()

  //   trail.material = sourceMat
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
