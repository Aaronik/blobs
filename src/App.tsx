import './App.css'
import * as BABYLON from 'babylonjs'
import Canvas from './components/canvas'

const height = window.innerHeight - 3
const width = window.innerWidth

const numSpheres = 5

const COLORS3 = {
  green: new BABYLON.Color3(0, 42 / 255, 16 / 255), // dark green
  blue: BABYLON.Color3.Blue()
}

const COLORS4 = {
  green: BABYLON.Color4.FromColor3(COLORS3.green),
  blue: BABYLON.Color4.FromColor3(COLORS3.blue)
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

const createSphere = (id: string, scene: BABYLON.Scene) => {
  const posSpread = 10

  const opts = {
    segments: 32,
    diameter: Math.random() * 2
  }

  const sphere = BABYLON.MeshBuilder.CreateSphere(id, opts, scene)
  sphere.position = new BABYLON.Vector3(Math.random() * posSpread, Math.random() * posSpread, Math.random() * posSpread)

  const material = new BABYLON.StandardMaterial('material', scene)
  material.emissiveColor = COLORS3.green
  sphere.material = material

  return sphere
}

function App() {

  const onCanvas = (canvas: HTMLCanvasElement) => {
    canvas.focus()
    // Load the 3D engine
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    // CreateScene function that creates and return the scene
    const createScene = function() {
      // Create a basic BJS Scene object
      const scene = new BABYLON.Scene(engine)
      // Create a FreeCamera, and set its position to {x: 0, y: 5, z: -10}
      // const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), scene)
      const camera = new BABYLON.ArcRotateCamera('camera1', 10, 10, 10, new BABYLON.Vector3(2.5, 2.5, 2.5), scene)

      new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 1), scene)

      const spheres: BABYLON.Mesh[] = []
      for (let i = 0; i < numSpheres; i++) {
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
          // camera.focusOn([pickInfo.pickedMesh], true)
          const mesh = pickInfo.pickedMesh as BABYLON.Mesh

          if (highlight.hasMesh(mesh)) {
            highlight.removeMesh(mesh)
            const particleSystems = mesh.getEmittedParticleSystems()
            particleSystems.forEach(ps => ps.stop())
          } else {
            highlight.addMesh(mesh, BABYLON.Color3.White())

            // Go through each other sphere
            // If sphere is highlighted
            // * start particle emitter towards other sphere
            // * Remove all highlights
            spheres.forEach(sphere => {
              if (sphere.name === mesh.name) { return }
              if (highlight.hasMesh(sphere)) {

                const particleSystem = new BABYLON.GPUParticleSystem('particles', { capacity: 500 }, scene)
                const particleSize = 0.3
                const toPos = mesh.position.subtract(sphere.position)
                const emitterRadius = sphere.getBoundingInfo().boundingSphere.radius

                const initialSpeed = toPos.length() * 3.3 // Magic number which seems to get particles to stop _near_ their destination

                particleSystem.addLimitVelocityGradient(0, initialSpeed) //speed limit at start of particle lifetime
                particleSystem.addLimitVelocityGradient(1, 0.1) //speed limit at end of particle lifetime

                particleSystem.emitRate = emitterRadius * 100
                particleSystem.particleTexture = new BABYLON.Texture('flare.png')
                particleSystem.emitter = sphere

                // @ts-ignore
                particleSystem.color1 = BABYLON.Color4.FromColor3(sphere.material.emissiveColor)
                // @ts-ignore
                particleSystem.color2 = BABYLON.Color4.FromColor3(sphere.material.emissiveColor)

                // ps.createHemisphericEmitter(1, 1)

                particleSystem.maxSize = particleSize
                particleSystem.minSize = particleSize

                particleSystem.direction1 = toPos
                particleSystem.direction2 = toPos
                particleSystem.gravity = toPos

                particleSystem.start()

                highlight.removeMesh(sphere)
                highlight.removeMesh(mesh)
              }
            })
          }
        }
      }

      // Return the created scene
      return scene
    }
    // call the createScene function
    const scene = createScene()
    // run the render loop
    engine.runRenderLoop(function() {
      scene.render()
    })
  }

  return (
    <div className="App">
      <Canvas height={height} width={width} onCanvas={onCanvas} />
    </div>
  )
}

export default App
