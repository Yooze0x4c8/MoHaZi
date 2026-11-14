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
      onSnap: (cb: () => void) => void; saveFrame: (img: Uint8Array, auto: boolean) => Promise<number> }
  }
}

// 수집 모드 (COLLECT=1 → #collect): 게임 중 AUTO_MS마다 화면 자동 저장
const COLLECT = location.hash === '#collect'
const AUTO_MS = 3000

function App() {
  const [game, setGame] = useState<Game>(null)
  const [f7, setF7] = useState(0) // F7 누른 횟수 (게임 중엔 안 먹히는 PC가 있어 마우스가 기본)
  const [cards, setCards] = useState<(number | null)[] | null>(null) // 떠 있는 증강 3장 (못 알아본 카드는 null)
  const [picked] = useState<number[]>([]) // 고른 증강. 3-3에서 채운다
  const [saved, setSaved] = useState<number | null>(null) // 수집 모드: 방금 저장한 장 수 (1초 표시)
  const snap = useRef(false)

  useEffect(() => {
    window.api?.onGame(setGame)
    window.api?.onF7(() => setF7((n) => n + 1))
    window.api?.onSnap(() => { console.log('[collect] 다음 프레임 저장'); snap.current = true })
  }, [])

  useEffect(() => {
    if (saved == null) return
    const t = setTimeout(() => setSaved(null), 1000)
    return () => clearTimeout(t)
  }, [saved])

  // 게임 중일 때만 캡처해 인식. #capture면 항상 캡처 (개발 확인용)
  const inGame = useRef(false), playing = useRef(false)
  playing.current = !!game
  inGame.current = !!game || location.hash === '#capture' || COLLECT
  useEffect(() => {
    // 같은 결과면 상태를 바꾸지 않는다 (재렌더·검색 팝업 초기화 방지)
    const recognize = recognizer((ids) => setCards((old) => (old?.join() === ids?.join() ? old : ids)))
    // 수집 모드: 원본 해상도 그대로 저장 (16:10 등 비율도 그대로). 그리기는 지금 한다 (프레임이 곧 바뀜)
    const save = (video: HTMLVideoElement, auto: boolean) => {
      const c = new OffscreenCanvas(video.videoWidth, video.videoHeight)
      c.getContext('2d')!.drawImage(video, 0, 0)
      c.convertToBlob(auto ? { type: 'image/jpeg', quality: 0.92 } : { type: 'image/png' })
        .then(async (b) => {
          const n = await window.api!.saveFrame(new Uint8Array(await b.arrayBuffer()), auto)
          if (!auto) setSaved(n) // 자동 저장은 게임을 가리지 않게 알림 없이
        })
        .catch((e) => console.error('[collect]', e))
    }
    let lastAuto = 0
    startCapture(() => inGame.current, (f, video) => {
      if (snap.current) { snap.current = false; save(video, false) }
      if (COLLECT && playing.current && performance.now() - lastAuto >= AUTO_MS) { lastAuto = performance.now(); save(video, true) }
      return recognize(f)
    })
  }, [])

  const savedToast = saved != null && <div className="toast glass"><span className="tick" />저장했어요 ({saved}장)</div>
  if (!game) return savedToast ? <Stage>{savedToast}</Stage> : null
  return (
    <Stage>
      {savedToast}
      <Overlay key={game.alias} alias={game.alias} cards={cards} picked={picked} f7={f7} />
    </Stage>
  )
}

const hash = location.hash.slice(1)
createRoot(document.getElementById('root')!).render(
  hash.startsWith('preview') ? <Stage><Preview screen={hash.split('-')[1] ?? '02'} /></Stage> : <App />
)
