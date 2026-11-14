import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Game } from '../main'
import { Stage } from './grades'
import { Overlay } from './view'
import { Preview } from './preview'
import { startCapture } from '../capture'
import './overlay.css'

declare global {
  interface Window {
    api?: { onGame: (cb: (game: Game) => void) => void; onF7: (cb: () => void) => void; setClickable: (on: boolean) => void; setFocus: (on: boolean) => void; ocr: (png: Uint8Array) => Promise<string> }
  }
}

function App() {
  const [game, setGame] = useState<Game>(null)
  const [f7Open, setF7Open] = useState(false)
  const [cards] = useState<(number | null)[] | null>(null) // 떠 있는 증강 3장 (못 알아본 카드는 null). 1-5에서 인식 결과로 채운다
  const [picked] = useState<number[]>([]) // 고른 증강. 3-3에서 채운다

  useEffect(() => {
    window.api?.onGame(setGame)
    window.api?.onF7(() => setF7Open((o) => !o))
  }, [])

  // 게임 중일 때만 캡처. 프레임 처리는 1-3(증강 화면 감지)에서 붙인다. #capture면 항상 캡처 (개발 확인용)
  const inGame = useRef(false)
  inGame.current = !!game || location.hash === '#capture'
  useEffect(() => startCapture(() => inGame.current, () => {}), [])

  if (!game) return null
  return (
    <Stage>
      <Overlay key={game.alias} alias={game.alias} cards={cards} picked={picked} f7Open={f7Open} onBuildPicked={() => setF7Open(false)} />
    </Stage>
  )
}

const hash = location.hash.slice(1)
createRoot(document.getElementById('root')!).render(
  hash.startsWith('preview') ? <Stage><Preview screen={hash.split('-')[1] ?? '02'} /></Stage> : <App />
)
