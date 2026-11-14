import { useEffect, useLayoutEffect, useState } from 'react'
import { rateCards, suggestSwitch, type Build, type Labels, type Switch, type Tags } from '../engine'
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

// '로/으로': 받침이 있으면(ㄹ 제외) 으로
const ro = (w: string) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00
  return c >= 0 && c < 11172 && c % 28 !== 0 && c % 28 !== 8 ? '으로' : '로'
}

// 다른 빌드가 훨씬 맞을 때 위쪽 배너. 버튼 없이 F7 안내만 (오버레이는 클릭 통과)
function SwitchBanner({ from, s }: { from: Build; s: Switch }) {
  const fit = (name: string, v: number, on: boolean) => (
    <div className={`fit${on ? ' on' : ''}`}>
      <span className="lab">{name}</span>
      <div className="track"><i style={{ width: `${v}%` }} /></div>
      <span className="v">{v}</span>
    </div>
  )
  return (
    <div className="switch glass">
      <div className="t"><b>{s.to.name} 빌드가 더 맞아요</b><p>{s.why}</p></div>
      <div className="fits">{fit(from.name, s.fromFit, false)}{fit(s.to.name, s.toFit, true)}</div>
      <div className="act"><div><span className="key">F7</span>{s.to.name}{ro(s.to.name)} 바꾸기</div><span>그대로 두려면 무시하세요</span></div>
    </div>
  )
}

// 한 챔피언의 오버레이: 빌드 패널/칩 + 카드 등급 + 재계산 알림.
// 챔피언이 바뀌면 key로 새로 만들어 고른 빌드를 기본으로 되돌린다.
// cards: 지금 떠 있는 증강 3장의 ID (증강 화면이 아니면 null), picked: 고른 증강
type Props = { alias: string; cards: number[] | null; picked: number[]; f7Open: boolean; onBuildPicked?: () => void }

export function Overlay(props: Props) {
  const champ = BUILDS[props.alias]
  return champ ? <ChampOverlay champ={champ} {...props} /> : <BuildChip picked={0} />
}

function ChampOverlay({ champ, cards, picked, f7Open, onBuildPicked }: Props & { champ: { name: string; builds: Build[] } }) {
  const [choice, setChoice] = useState<string | null>(null)
  const [toast, setToast] = useState<{ name: string; n: number } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

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

  // 전환 제안은 증강 화면에서만 (평소엔 위쪽 게임 UI를 가리지 않게). 이때 F7은 패널 대신 제안 빌드로 바로 바꾼다
  const sw = cards ? suggestSwitch(picked, build, champ.builds, TAGS, LABELS) : null
  // 레이아웃 이펙트라 패널이 한 프레임 열렸다 닫히는 게 보이지 않는다
  useLayoutEffect(() => { if (f7Open && sw) pick(sw.to.id) }, [f7Open])

  return (
    <>
      {panelOpen
        ? <BuildPanel champion={champ.name} builds={champ.builds} selected={build.id} chosen={choice != null} onPick={pick} />
        : <BuildChip build={build} picked={picked.length} />}
      {/* key에 빌드를 넣어 다시 매길 때 등장 애니메이션을 다시 보여준다 */}
      {rated && <AugmentGrades key={build.id} cards={rated.cards} pick={rated.pick} />}
      {sw && !panelOpen && <SwitchBanner from={build} s={sw} />}
      {toast && <RescoreToast key={toast.n} name={toast.name} />}
    </>
  )
}
