import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Game } from '../main'

declare global {
  interface Window { api: { onGame: (cb: (game: Game) => void) => void } }
}

function App() {
  const [game, setGame] = useState<Game>(null)
  useEffect(() => window.api.onGame(setGame), [])

  return (
    <div style={{ position: 'fixed', top: 8, right: 8, color: '#fff', font: '14px sans-serif', textShadow: '0 0 3px #000' }}>
      {game ? `게임 중: ${game.champion} (${game.gameMode})` : '게임 대기 중'}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
