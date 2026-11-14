import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Game } from '../main'
import { Stage } from './grades'
import { Overlay } from './view'
import { Preview } from './preview'
import { recognizer, startCapture } from '../capture'
import './overlay.css'

declare global {
  interface Window {
    api?: { onGame: (cb: (game: Game) => void) => void; onF7: (cb: () => void) => void; setClickable: (on: boolean) => void; setFocus: (on: boolean) => void; ocr: (png: Uint8Array) => Promise<string>
      onSnap: (cb: () => void) => void; saveFrame: (png: Uint8Array) => Promise<number> }
  }
}

function App() {
  const [game, setGame] = useState<Game>(null)
  const [f7Open, setF7Open] = useState(false)
  const [cards, setCards] = useState<(number | null)[] | null>(null) // 떠 있는 증강 3장 (못 알아본 카드는 null)
  const [picked] = useState<number[]>([]) // 고른 증강. 3-3에서 채운다
  const [saved, setSaved] = useState<number | null>(null) // 수집 모드: 방금 저장한 장 수 (1초 표시)
  const snap = useRef(false)

  useEffect(() => {
    window.api?.onGame(setGame)
    window.api?.onF7(() => setF7Open((o) => !o))
    window.api?.onSnap(() => (snap.current = true))
  }, [])

  useEffect(() => {
    if (saved == null) return
    const t = setTimeout(() => setSaved(null), 1000)
    return () => clearTimeout(t)
  }, [saved])

  // 게임 중일 때만 캡처해 인식. #capture면 항상 캡처 (개발 확인용)
  const inGame = useRef(false)
  inGame.current = !!game || location.hash === '#capture'
  useEffect(() => {
    // 같은 결과면 상태를 바꾸지 않는다 (재렌더·검색 팝업 초기화 방지)
    const recognize = recognizer((ids) => setCards((old) => (old?.join() === ids?.join() ? old : ids)))
    startCapture(() => inGame.current, (f) => {
      // F9 (수집 모드): 인식기가 보는 프레임 그대로 저장. 프레임은 곧 닫히므로 그리기는 지금 한다
      if (snap.current) {
        snap.current = false
        const c = new OffscreenCanvas(f.width, f.height)
        c.getContext('2d')!.drawImage(f, 0, 0)
        c.convertToBlob({ type: 'image/png' })
          .then(async (b) => setSaved(await window.api!.saveFrame(new Uint8Array(await b.arrayBuffer()))))
          .catch((e) => console.error('[collect]', e))
      }
      return recognize(f)
    })
  }, [])

  const savedToast = saved != null && <div className="toast glass"><span className="tick" />저장했어요 ({saved}장)</div>
  if (!game) return savedToast ? <Stage>{savedToast}</Stage> : null
  return (
    <Stage>
      {savedToast}
      <Overlay key={game.alias} alias={game.alias} cards={cards} picked={picked} f7Open={f7Open} onBuildPicked={() => setF7Open(false)} />
    </Stage>
  )
}

const hash = location.hash.slice(1)
createRoot(document.getElementById('root')!).render(
  hash.startsWith('preview') ? <Stage><Preview screen={hash.split('-')[1] ?? '02'} /></Stage> : <App />
)
