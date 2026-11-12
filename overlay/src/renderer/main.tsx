import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Game } from '../main'
import { Stage } from './grades'
import { Preview } from './preview'
import { startCapture } from '../capture'
import './overlay.css'

declare global {
  interface Window { api?: { onGame: (cb: (game: Game) => void) => void } }
}

function App() {
  const [game, setGame] = useState<Game>(null)
  useEffect(() => window.api?.onGame(setGame), [])

  // 게임 중일 때만 캡처. 프레임 처리는 1-3(증강 화면 감지)에서 붙인다. #capture면 항상 캡처 (개발 확인용)
  const inGame = useRef(false)
  inGame.current = !!game || location.hash === '#capture'
  useEffect(() => startCapture(() => inGame.current, () => {}), [])

  return (
    <div style={{ position: 'fixed', top: 8, right: 8, color: '#fff', font: '14px sans-serif', textShadow: '0 0 3px #000' }}>
      {game ? `게임 중: ${game.champion} (${game.gameMode})` : '게임 대기 중'}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  location.hash === '#preview' ? <Stage><Preview /></Stage> : <App />
)
