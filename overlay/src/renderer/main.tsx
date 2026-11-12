import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Game } from '../main'
import type { Build } from '../engine'
import { Stage } from './grades'
import { BuildChip, BuildPanel } from './build'
import { Preview } from './preview'
import { startCapture } from '../capture'
import BUILDS_JSON from '../../../data/builds.json'
import './overlay.css'

declare global {
  interface Window {
    api?: { onGame: (cb: (game: Game) => void) => void; onF7: (cb: () => void) => void; setClickable: (on: boolean) => void }
  }
}

const BUILDS = BUILDS_JSON as unknown as Record<string, { name: string; builds: Build[] }>

function App() {
  const [game, setGame] = useState<Game>(null)
  // 사용자가 고른 빌드. 챔피언이 바뀌면 무시되고 기본 빌드로 돌아간다
  const [choice, setChoice] = useState<{ alias: string; id: string } | null>(null)
  const [f7Open, setF7Open] = useState(false)
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
  const champ = BUILDS[game.alias]
  if (!champ) return <Stage><BuildChip picked={0} /></Stage>

  const chosen = choice?.alias === game.alias
  const build = champ.builds.find((b) => b.id === (chosen ? choice.id : undefined)) ?? champ.builds.find((b) => b.default) ?? champ.builds[0]
  // 첫 증강을 고르기 전까지는 패널, 그 뒤엔 칩 (F7로 다시 연다)
  const panelOpen = picked.length === 0 || f7Open

  return (
    <Stage>
      {panelOpen ? (
        <BuildPanel
          champion={champ.name}
          builds={champ.builds}
          selected={build.id}
          chosen={chosen}
          onPick={(id) => {
            setChoice({ alias: game.alias, id })
            setF7Open(false)
          }}
        />
      ) : (
        <BuildChip build={build} picked={picked.length} />
      )}
    </Stage>
  )
}

const hash = location.hash.slice(1)
createRoot(document.getElementById('root')!).render(
  hash.startsWith('preview') ? <Stage><Preview screen={hash.split('-')[1] ?? '02'} /></Stage> : <App />
)
