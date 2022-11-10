import * as BABYLON from 'babylonjs'
// import * as particleSystem from '../visuals/particle-system'
import * as ammoOrbs from '../visuals/ammo-orb'

const NUM_SPHERES = 5
const SPHERE_MAX_SIZE = 1
const SPHERE_MIN_SIZE = 0.5
const SPHERE_MAX_HEALTH = 1000
const SPHERE_POSITION_SPREAD = (Math.log(SPHERE_MAX_SIZE) + 1) * 100
const INITIAL_CAMERA_DISTANCE = SPHERE_POSITION_SPREAD * 1.5
const PROJECTILE_RATE_MULTIPLIER = (SPHERE_MAX_HEALTH) * 0.5 // The higher the slower

const COLORS3 = {
  darkGreen: new BABYLON.Color3(0, 42 / 255, 16 / 255), // dark green
  green: BABYLON.Color3.Green(),
  yellow: BABYLON.Color3.Yellow(),
  pink: BABYLON.Color3.Red(),
}

type Side = 'pink' | 'yellow' | 'green'

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

const getRandomPosition = () => {
  return new BABYLON.Vector3(
    Math.random() * SPHERE_POSITION_SPREAD,
    Math.random() * SPHERE_POSITION_SPREAD,
    Math.random() * SPHERE_POSITION_SPREAD
  )
}

// TODO This does not work and I'm tired of figuring it out. The issue is that intersectsMesh ALWAYS returns true.
const ensureNoOverlap = (sphere: BABYLON.Mesh, existingSpheres: BABYLON.Mesh[]) => {
  const hasIntersections = existingSpheres.some(existingSphere => existingSphere.intersectsMesh(sphere, true, true))
  if (hasIntersections) {
    console.log('found collision making ' + sphere.name)
    sphere.position = getRandomPosition()
    // ensureNoOverlap()
  }
}

const assignOrbToSphere = async (sphere: BABYLON.Mesh, side: Side, scene: BABYLON.Scene) => {
  const energyBall = await BABYLON.SceneLoader.LoadAssetContainerAsync(side + "EnergyBall.glb", undefined, scene)
  const orb = energyBall.meshes[0]
  orb.name = 'orb-' + sphere.name
  orb.setParent(sphere)
  scene.addMesh(orb, true)
  orb.setAbsolutePosition(sphere.getAbsolutePosition())
}

const removeOrbFromSphere = (sphere: BABYLON.Mesh) => {
  sphere.getChildMeshes().forEach(child => {
    sphere.removeChild(child)
    child.dispose()
  })
}

const createSphere = async (scene: BABYLON.Scene, existingSpheres: BABYLON.Mesh[]) => {
  const id = window.crypto.randomUUID()

  const opts = {
    segments: 16,
    diameter: 1,
    updatable: true
  }

  const sphere = BABYLON.MeshBuilder.CreateSphere('sphere-' + id, opts, scene)

  let color: Side = 'green'
  if (Math.random() > 0.6) color = 'pink'
  if (Math.random() > 0.6) color = 'yellow'

  sphere.metadata = {
    health: 5,
    side: color,
    color: color === 'green' ? COLORS3.green : color === 'yellow' ? COLORS3.yellow : COLORS3.pink,
    async handleShot(from: BABYLON.Mesh) {
      console.log(sphere.metadata)
      // @ts-ignore
      window.sphere = sphere

      if (from.metadata.side === sphere.metadata.side) {
        // Same side, add to health
        sphere.metadata.health = sphere.metadata.health < SPHERE_MAX_HEALTH ? sphere.metadata.health + 1 : SPHERE_MAX_HEALTH
      } else {
        // Other side, remove health
        sphere.metadata.health = sphere.metadata.health - 1
        if (sphere.metadata.health <= 0) {
          // Out of health, change sides
          sphere.metadata.side = from.metadata.side
          sphere.metadata.color = from.metadata.color
          // Ok, removing the sphere entirely and creating a new one of new side in its place is a good idea
          // but then we need to reinitializing whoever is firing at it to be firing back at it. It'd be so much
          // easier if we could just replace the color of the sphere.
          //
          // What if we loaded in each orb only once and assigned it to the sphere based on what side it currently has?

          console.log('before:', sphere.position)
          removeOrbFromSphere(sphere)
          await assignOrbToSphere(sphere, from.metadata.side, scene)
          console.log('after:', sphere.position)

          sphere.scaling = BABYLON.Vector3.Zero()
          sphere.metadata.updateSize()
        }
      }
      this.updateSize()
    },
    updateSize() {
      const sphereSizeSpread = SPHERE_MAX_SIZE - SPHERE_MIN_SIZE
      const percentageOfMaxHealth = this.health / SPHERE_MAX_HEALTH
      const healthSpreadRatio = percentageOfMaxHealth * sphereSizeSpread
      const finalSize = healthSpreadRatio + SPHERE_MIN_SIZE

      sphere.scaling.x = finalSize
      sphere.scaling.y = finalSize
      sphere.scaling.z = finalSize
    },
  }

  sphere.isVisible = false

  await assignOrbToSphere(sphere, color, scene)

  sphere.position = getRandomPosition()
  sphere.metadata.updateSize()

  // ensureNoOverlap(sphere, existingSpheres)

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
  ammoOrbs.init(scene, PROJECTILE_RATE_MULTIPLIER)

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
