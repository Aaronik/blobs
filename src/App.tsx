import './App.css'
import Canvas from './components/canvas'
import game from './game/game'

const height = window.innerHeight
const width = window.innerWidth

function App() {
  const onCanvas = (canvas: HTMLCanvasElement) => {
    canvas.focus()
    game(canvas)
  }

  return (
    <div className="App">
      <Canvas height={height} width={width} onCanvas={onCanvas} />
    </div>
  )
}

export default App
