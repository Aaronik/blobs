import * as BABYLON from 'babylonjs'
// import * as particleSystem from '../visuals/particle-system'
import * as ammoOrbs from '../visuals/ammo-orb'

const NUM_SPHERES = 5
const MAX_SPHERE_SIZE = 4
const SPHERE_POSITION_SPREAD = MAX_SPHERE_SIZE * 20
const INITIAL_CAMERA_DISTANCE = SPHERE_POSITION_SPREAD * 1.5

const COLORS3 = {
  green: new BABYLON.Color3(0, 42 / 255, 16 / 255), // dark green
  blue: BABYLON.Color3.Blue()
}

// const COLORS4 = {
//   green: BABYLON.Color4.FromColor3(COLORS3.green),
//   blue: BABYLON.Color4.FromColor3(COLORS3.blue)
// }

const getAveragePosition = (objects: { position: BABYLON.Vector3 }[]) => {
  const sumVec = objects.reduce((sum, object) => {
    return {
      x: object.position.x + sum.x,
      y: object.position.y + sum.y,
      z: object.position.z + sum.z
    }
  }, { x: 0, y: 0, z: 0 })

  return new BABYLON.Vector3(
    sumVec.x / objects.length,
    sumVec.y / objects.length,
    sumVec.z / objects.length,
  )
}

const createSphere = async (scene: BABYLON.Scene, existingSpheres: BABYLON.Mesh[]) => {
  const id = window.crypto.randomUUID()

  const opts = {
    segments: 32,
    diameter: Math.round(Math.random() * MAX_SPHERE_SIZE)
  }

  const sphere = BABYLON.MeshBuilder.CreateSphere('sphere-' + id, opts, scene)

  sphere.isVisible = false

  // This is great but it's a little buggy. I'm starting to wonder if babylon.js isn't just very buggy.
  const greenEnergyBall = await BABYLON.SceneLoader.LoadAssetContainerAsync("greenEnergyBall.glb", undefined, scene)
  const orb = greenEnergyBall.meshes[0]
  orb.name = 'orb-' + id
  orb.setParent(sphere)
  scene.addMesh(orb, true)

  sphere.scaling.scaleInPlace(0.1).scaleInPlace(opts.diameter)

  const getRandomPosition = () => {
    return new BABYLON.Vector3(
      Math.random() * SPHERE_POSITION_SPREAD,
      Math.random() * SPHERE_POSITION_SPREAD,
      Math.random() * SPHERE_POSITION_SPREAD
    )
  }

  sphere.position = getRandomPosition()

  // TODO This does not work and I'm tired of figuring it out. The issue is that intersectsMesh ALWAYS returns true.
  const ensureNoOverlap = () => {
    const hasIntersections = existingSpheres.some(existingSphere => existingSphere.intersectsMesh(sphere, true, true))
    if (hasIntersections) {
      console.log('found collision making ' + sphere.name)
      sphere.position = getRandomPosition()
      // ensureNoOverlap()
    }
  }

  ensureNoOverlap()

  return sphere
}

const createScene = async (engine: BABYLON.Engine, canvas: HTMLCanvasElement) => {
  // Create a basic BJS Scene object
  const scene = new BABYLON.Scene(engine)
  // Create a FreeCamera, and set its position to {x: 0, y: 5, z: -10}
  // const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), scene)
  const camera = new BABYLON.ArcRotateCamera('camera1', 0, 0, INITIAL_CAMERA_DISTANCE, BABYLON.Vector3.Zero(), scene)

  const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 1), scene)
  light.intensity = 0.3

  // TODO https://playground.babylonjs.com/#1F4UET#33 has a ground that I think would be nice to have
  // // Create physics impostors // This ground looked great in the example
  // const ground = Mesh.CreateBox("Ground", 1, scene)
  // ground.scaling = new BABYLON.Vector3(100, 1, 100)
  // ground.position.y = environment.ground.position.y - (0.5 + 0.001)
  // ground.material = new BABYLON.StandardMaterial("test", scene)
  // ground.material.alpha = 0.99
  // ground.material.alphaMode = BABYLON.Engine.ALPHA_ONEONE

  // // Set up new rendering pipeline for glow // TODO This is an important visual effect
  // const pipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene, [camera])
  // scene.imageProcessingConfiguration.toneMappingEnabled = true
  // scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES
  // scene.imageProcessingConfiguration.exposure = 3
  // pipeline.glowLayerEnabled = true
  // pipeline.glowLayer.intensity = 0.5

  const spheres: BABYLON.Mesh[] = []
  for (let i = 0; i < NUM_SPHERES; i++) {
    spheres.push(await createSphere(scene, spheres))
  }
  // @ts-ignore
  window.spheres = spheres

  // Target the camera to scene origin
  camera.setTarget(getAveragePosition(spheres))
  // Attach the camera to the canvas
  camera.attachControl(canvas, false)

  // Glow layer so everything glows
  const glow = new BABYLON.GlowLayer('glow', scene)
  glow.intensity = 0.5

  // Make highlight layer, for when things are clicked on
  const highlight = new BABYLON.HighlightLayer('hl1', scene)

  // Get them projectiles set up
  ammoOrbs.init(scene)

  // Focus camera on sphere that's clicked on. Uses ArcRotateCamera
  scene.onPointerDown = function(_evt, pickInfo) {
    if (pickInfo.hit && pickInfo.pickedMesh) {
      const mesh = pickInfo.pickedMesh as BABYLON.Mesh
      const pickedSphere = mesh.parent!.parent! as BABYLON.Mesh

      if (highlight.hasMesh(mesh)) {
        highlight.removeMesh(mesh)
        ammoOrbs.stopFor(pickedSphere, scene)
      } else {
        highlight.addMesh(mesh, BABYLON.Color3.White())

        // Go through each other sphere
        // If sphere is highlighted
        // * start particle emitter towards other sphere
        // * Remove all highlights
        spheres.forEach(sphere => {
          const sphereHighlightedMesh = sphere.getChildMeshes()[3] as BABYLON.Mesh

          // If this sphere is the clicked sphere
          if (sphere.name === pickedSphere.name) {
            return
          }

          // If one sphere is clicked then another
          if (highlight.hasMesh(sphereHighlightedMesh)) {
            ammoOrbs.start(sphere, pickedSphere, scene)
            highlight.removeAllMeshes()
          }
        })
      }
    }
  }

  // Return the created scene
  return scene
}
const game = async (canvas: HTMLCanvasElement) => {
  // Load the 3D engine
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
  // CreateScene function that creates and return the scene

  // call the createScene function
  const scene = await createScene(engine, canvas)

  // run the render loop
  engine.runRenderLoop(function() {
    scene.render()
  })
}

export default game
