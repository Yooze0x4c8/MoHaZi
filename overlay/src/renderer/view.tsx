import { useEffect, useState } from 'react'
import { rateCards, type Build, type Labels, type Tags } from '../engine'
import { AugmentGrades } from './grades'
import { BuildChip, BuildPanel } from './build'
import BUILDS_JSON from '../../../data/builds.json'
import TAGS_JSON from '../../../data/tags.json'

export const BUILDS = BUILDS_JSON as unknown as Record<string, { name: string; builds: Build[] }>
const TAGS = TAGS_JSON.tags as unknown as Tags
const LABELS = TAGS_JSON.labels as Labels

// 빌드를 바꾼 직후 위쪽 가운데 알림 (2초)
function RescoreToast({ name }: { name: string }) {
  return <div className="toast glass"><span className="tick" />{name} 기준으로 다시 매겼어요</div>
}

// 한 챔피언의 오버레이: 빌드 패널/칩 + 카드 등급 + 재계산 알림.
// 챔피언이 바뀌면 key로 새로 만들어 고른 빌드를 기본으로 되돌린다.
// cards: 지금 떠 있는 증강 3장의 ID (증강 화면이 아니면 null), picked: 고른 증강
export function Overlay({ alias, cards, picked, f7Open, onBuildPicked }: {
  alias: string; cards: number[] | null; picked: number[]; f7Open: boolean; onBuildPicked?: () => void
}) {
  const champ = BUILDS[alias]
  const [choice, setChoice] = useState<string | null>(null)
  const [toast, setToast] = useState<{ name: string; n: number } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  if (!champ) return <BuildChip picked={0} />

  const build = champ.builds.find((b) => b.id === choice) ?? champ.builds.find((b) => b.default) ?? champ.builds[0]
  const rated = cards && rateCards(cards, build, TAGS, LABELS, picked)
  // 첫 증강을 고르기 전까지는 패널, 그 뒤엔 칩 (F7로 다시 연다)
  const panelOpen = picked.length === 0 || f7Open

  const pick = (id: string) => {
    if (id === build.id) return onBuildPicked?.()
    setChoice(id)
    // 떠 있는 카드가 있을 때만 알림. 등급은 다음 렌더에서 새 빌드로 다시 계산된다
    if (cards) setToast((t) => ({ name: champ.builds.find((b) => b.id === id)!.name, n: (t?.n ?? 0) + 1 }))
    onBuildPicked?.()
  }

  return (
    <>
      {panelOpen
        ? <BuildPanel champion={champ.name} builds={champ.builds} selected={build.id} chosen={choice != null} onPick={pick} />
        : <BuildChip build={build} picked={picked.length} />}
      {/* key에 빌드를 넣어 다시 매길 때 등장 애니메이션을 다시 보여준다 */}
      {rated && <AugmentGrades key={build.id} cards={rated.cards} pick={rated.pick} />}
      {toast && <RescoreToast key={toast.n} name={toast.name} />}
    </>
  )
}
