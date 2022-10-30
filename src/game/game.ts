import * as BABYLON from 'babylonjs'
// import * as particleSystem from '../visuals/particle-system'
import * as ammoOrbs from '../visuals/ammo-orb'

const NUM_SPHERES = 5
const MAX_SPHERE_SIZE = 4
const SPHERE_POSITION_SPREAD = MAX_SPHERE_SIZE * 3
const INITIAL_CAMERA_DISTANCE = MAX_SPHERE_SIZE * 10

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

const createSphere = (id: string, scene: BABYLON.Scene) => {
  const opts = {
    segments: 32,
    diameter: Math.round(Math.random() * MAX_SPHERE_SIZE)
  }

  const sphere = BABYLON.MeshBuilder.CreateSphere(id, opts, scene)

  sphere.position = new BABYLON.Vector3(
    Math.random() * SPHERE_POSITION_SPREAD,
    Math.random() * SPHERE_POSITION_SPREAD,
    Math.random() * SPHERE_POSITION_SPREAD
  )

  const material = new BABYLON.StandardMaterial('material', scene)
  material.emissiveColor = COLORS3.green
  sphere.material = material

  return sphere
}

const createScene = (engine: BABYLON.Engine, canvas: HTMLCanvasElement) => {
  // Create a basic BJS Scene object
  const scene = new BABYLON.Scene(engine)
  // Create a FreeCamera, and set its position to {x: 0, y: 5, z: -10}
  // const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), scene)
  const camera = new BABYLON.ArcRotateCamera('camera1', 0, 0, INITIAL_CAMERA_DISTANCE, BABYLON.Vector3.Zero(), scene)

  const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 1), scene)
  light.intensity = 0.3

  // TODO https://playground.babylonjs.com/#1F4UET#33 has a ground that I think would be nice to have

  const spheres: BABYLON.Mesh[] = []
  for (let i = 0; i < NUM_SPHERES; i++) {
    spheres.push(createSphere('sphere-' + i, scene))
  }

  // Target the camera to scene origin
  camera.setTarget(getAveragePosition(spheres))
  // Attach the camera to the canvas
  camera.attachControl(canvas, false)

  // // Glow layer so everything glows
  // const glow = new BABYLON.GlowLayer('glow', scene)
  // glow.intensity = 1

  // Make highlight layer, for when things are clicked on
  const highlight = new BABYLON.HighlightLayer('hl1', scene)

  // Focus camera on sphere that's clicked on. Uses ArcRotateCamera
  scene.onPointerDown = function(_evt, pickInfo) {
    if (pickInfo.hit && pickInfo.pickedMesh) {
      const mesh = pickInfo.pickedMesh as BABYLON.Mesh

      if (highlight.hasMesh(mesh)) {
        highlight.removeMesh(mesh)
        ammoOrbs.stopFor(mesh, scene)
      } else {
        highlight.addMesh(mesh, BABYLON.Color3.White())

        // Go through each other sphere
        // If sphere is highlighted
        // * start particle emitter towards other sphere
        // * Remove all highlights
        spheres.forEach(sphere => {
          if (sphere.name === mesh.name) { return }
          if (highlight.hasMesh(sphere)) {
            ammoOrbs.start(sphere, mesh, scene)

            // In attempts to prevent the screen from going bonkers
            setTimeout(() => {
              highlight.removeMesh(sphere)
              highlight.removeMesh(mesh)
            }, 1)
          }
        })
      }
    }
  }

  // Return the created scene
  return scene
}
const game = (canvas: HTMLCanvasElement) => {
  // Load the 3D engine
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
  // CreateScene function that creates and return the scene

  // call the createScene function
  const scene = createScene(engine, canvas)

  // run the render loop
  engine.runRenderLoop(function() {
    scene.render()
  })
}

export default game
