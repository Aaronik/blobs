import React from 'react'
import './App.css'
import * as BABYLON from 'babylonjs'
import Canvas from './components/canvas'

const height = window.innerHeight - 3
const width = window.innerWidth

const numSpheres = 5

const createSphere = (scene: BABYLON.Scene) => {
  const opts = {
    segments: 32,
    diameter: Math.random() * 2
  }

  const sphere = BABYLON.MeshBuilder.CreateSphere('sphere1', opts, scene)
  sphere.position = new BABYLON.Vector3(Math.random() * 5, Math.random() * 5, Math.random() * 5)

  return sphere
}

function App() {

  const onCanvas = (canvas: HTMLCanvasElement) => {
    // Load the 3D engine
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    // CreateScene function that creates and return the scene
    const createScene = function() {
      // Create a basic BJS Scene object
      const scene = new BABYLON.Scene(engine)
      // Create a FreeCamera, and set its position to {x: 0, y: 5, z: -10}
      const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), scene)
      // Target the camera to scene origin
      camera.setTarget(BABYLON.Vector3.Zero())
      // Attach the camera to the canvas
      camera.attachControl(canvas, false)
      // Create a basic light, aiming 0, 1, 0 - meaning, to the sky
      new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene)
      // Create a built-in "sphere" shape its constructor takes 6 params: name, segment, diameter, scene, updatable, sideOrientation
      for (let i = 0; i < numSpheres; i++) {
        createSphere(scene)
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
