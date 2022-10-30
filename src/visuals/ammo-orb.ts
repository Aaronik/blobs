import * as BABYLON from 'babylonjs'
import 'babylonjs-loaders'
window.CANNON = require('cannon')

// Originally nicked from https://playground.babylonjs.com/#1F4UET#33

const loadMeshes = async function(from: BABYLON.Vector3, to: BABYLON.Vector3, scene: BABYLON.Scene) {
  const orbR = await BABYLON.SceneLoader.LoadAssetContainerAsync("pinkEnergyBall.glb", undefined, scene)
  const res = {
    orbs: [orbR.meshes[0]],
  }

  res.orbs = res.orbs.map((orb, index) => {
    // Create lights
    // const pointLight = new BABYLON.PointLight("light1", new BABYLON.Vector3(0, 3, 0), scene)
    // pointLight.intensity = 0.3

    // Add physics root for spheres
    const sphereOpts = {
      segments: 16,
      diameter: 0.7
    }
    const sphere = BABYLON.MeshBuilder.CreateSphere("s", sphereOpts, scene)
    sphere.isVisible = false
    orb.setParent(sphere)
    // sphere.position.y += 0.3 + (index * 0.3)
    sphere.position = from
    sphere.scaling.scaleInPlace(0.3)
    orb.scaling.scaleInPlace(0.03)
    orb.rotation.set(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI)
    orb.scaling.z *= Math.random() > 0.5 ? -1 : 1
    scene.addMesh(orb, true)
    return sphere
  })

  return res
}

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
  // scene.enablePhysics(new BABYLON.Vector3(0, -9.8 / 3, 0), new BABYLON.AmmoJSPlugin())
  scene.enablePhysics(to.position.subtract(from.position))

  // Load assets
  const assets = await loadMeshes(from.position, to.position, scene)

  // // Create physics impostors
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
  assets.orbs.forEach((orb, i) => {
    orb.physicsImpostor = new BABYLON.PhysicsImpostor(orb, BABYLON.PhysicsImpostor.SphereImpostor, {
      mass: 1,
      restitution: 0.6
    })
    const trail = new BABYLON.TrailMesh('orb trail', orb, scene, 0.2, 30, true)
    const sourceMat = new BABYLON.StandardMaterial('sourceMat', scene)
    let color = BABYLON.Color3.Red()
    if (i == 1) {
      color = BABYLON.Color3.Green()
    } else if (i == 2) {
      color = BABYLON.Color3.Yellow()
    }
    sourceMat.emissiveColor = sourceMat.diffuseColor = color
    sourceMat.specularColor = BABYLON.Color3.Black()

    trail.material = sourceMat
  })
}

/**
* @description Stop the particles that are coming from the supplied mesh
*
* @param {BABYLON.Mesh} mesh The mesh from which the particles should stop emitting
*/
export const stopFor = (mesh: BABYLON.Mesh, scene: BABYLON.Scene) => {
  scene.disablePhysicsEngine() // TODO Betcha this is gonna ruin it for all the other orbs
}
