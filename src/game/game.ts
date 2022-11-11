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

export type Side = keyof typeof COLORS3
export type Color = typeof COLORS3[keyof typeof COLORS3]
type Sphere = BABYLON.Mesh

const COLORS3 = {
  darkGreen: new BABYLON.Color3(0, 42 / 255, 16 / 255), // dark green
  green: BABYLON.Color3.Green(),
  yellow: BABYLON.Color3.Yellow(),
  pink: BABYLON.Color3.Red(),
}

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
const ensureNoOverlap = (sphere: Sphere, existingSpheres: Sphere[]) => {
  const hasIntersections = existingSpheres.some(existingSphere => existingSphere.intersectsMesh(sphere, true, true))
  if (hasIntersections) {
    console.log('found collision making ' + sphere.name)
    sphere.position = getRandomPosition()
    // ensureNoOverlap()
  }
}

const assignOrbToSphere = async (sphere: Sphere, side: Side, scene: BABYLON.Scene) => {
  const energyBall = await BABYLON.SceneLoader.LoadAssetContainerAsync(side + "EnergyBall.glb", undefined, scene)
  const orb = energyBall.meshes[0]
  orb.name = 'orb-' + sphere.name
  orb.setParent(sphere)
  scene.addMesh(orb, true)
  orb.setAbsolutePosition(sphere.getAbsolutePosition())
  return orb
}

const removeOrbFromSphere = (sphere: Sphere) => {
  sphere.getChildMeshes().forEach(child => {
    sphere.removeChild(child)
    child.dispose()
  })
}

const explodeOrb = async (sphere: Sphere, scene: BABYLON.Scene) => {
  const orb = sphere.getChildMeshes()[3]!
  const frameRate = 10
  const expandX = new BABYLON.Animation("xSlide", "scaling.x", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE)
  const expandY = new BABYLON.Animation("ySlide", "scaling.y", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE)
  const expandZ = new BABYLON.Animation("zSlide", "scaling.z", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE)
  const fade = new BABYLON.Animation("fade", "visibility", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE)

  const expandKeyframes = [
    { frame: 0, value: orb.scaling.x },
    { frame: 1, value: orb.scaling.x * 1.2 },
    { frame: 5, value: orb.scaling.x * 2 },
  ]

  const visiblityKeyframes = [
    { frame: 0, value: 1 },
    { frame: 1, value: 0.8 },
    { frame: 5, value: 0 }
  ]

  expandX.setKeys(expandKeyframes)
  expandY.setKeys(expandKeyframes)
  expandZ.setKeys(expandKeyframes)
  fade.setKeys(visiblityKeyframes)

  orb.animations.push(expandX, expandY, expandZ, fade)

  return new Promise(resolve => {
    scene.beginAnimation(orb, 0, 2 * frameRate, false, undefined, () => {
      resolve(true)
    })
  })
}

const createSphere = async (scene: BABYLON.Scene, existingSpheres: Sphere[]) => {
  const id = window.crypto.randomUUID()

  const opts = {
    segments: 16,
    updatable: true
  }

  const sphere = BABYLON.MeshBuilder.CreateSphere('sphere-' + id, opts, scene)

  let side: Side = 'green'
  if (Math.random() > 0.6) side = 'pink'
  if (Math.random() > 0.6) side = 'yellow'

  sphere.metadata = {
    health: 5,
    side: side,
    color: COLORS3[side],
    async handleShot(side: Side) {
      console.log(sphere.metadata)
      // @ts-ignore
      window.sphere = sphere

      if (side === sphere.metadata.side) {
        // Same side, add to health
        sphere.metadata.health = Math.max(sphere.metadata.health + 1, SPHERE_MAX_SIZE)
      } else {
        // Other side, remove health
        sphere.metadata.health = sphere.metadata.health - 1
        if (sphere.metadata.health <= 0) {
          // Out of health, change sides
          ammoOrbs.stopFor(sphere)
          sphere.metadata.side = side
          sphere.metadata.color = COLORS3[side]
          sphere.metadata.health = 10 // Otherwise it gets messed up toggling quickly between multiple colors
          await explodeOrb(sphere, scene)
          removeOrbFromSphere(sphere)
          const orb = await assignOrbToSphere(sphere, side, scene)
          // The orb here always comes in at size 1, but it needs to be the sphere's minimum size
          orb.scaling.scaleInPlace(SPHERE_MIN_SIZE)
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
  // const mat = new BABYLON.StandardMaterial('sourceMat', scene)
  // mat.emissiveColor = COLORS3[color]
  // mat.specularColor = BABYLON.Color3.Black()
  // sphere.material = mat

  await assignOrbToSphere(sphere, side, scene)

  sphere.position = getRandomPosition()
  sphere.metadata.updateSize()

  ensureNoOverlap(sphere, existingSpheres)

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

  const spheres: Sphere[] = []
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
      const pickedSphere = mesh.parent!.parent! as Sphere

      if (highlight.hasMesh(mesh)) {
        highlight.removeMesh(mesh)
        ammoOrbs.stopFor(pickedSphere)
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
