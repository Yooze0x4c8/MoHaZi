import { useEffect, useLayoutEffect, useState, type KeyboardEvent } from 'react'
import { rateCards, shouldReroll, suggestSwitch, type Build, type Labels, type Switch, type Tags } from '../engine'
import { search } from '../engine/search'
import { AugmentGrades, CARD_X, RerollCallout } from './grades'
import { BuildChip, BuildPanel } from './build'
import BUILDS_JSON from '../../../data/builds.json'
import TAGS_JSON from '../../../data/tags.json'
import AUGMENTS_JSON from '../../../data/augments.json'

export const BUILDS = BUILDS_JSON as unknown as Record<string, { name: string; builds: Build[] }>
const TAGS = TAGS_JSON.tags as unknown as Tags
const LABELS = TAGS_JSON.labels as Labels
const AUGMENTS = AUGMENTS_JSON as { id: number; name: string; rarity: string }[]
const RARITY: Record<string, string> = { silver: '실버', gold: '골드', prismatic: '프리즈마틱' }
const clickable = (on: boolean) => window.api?.setClickable(on)

// 못 알아본 카드의 증강을 초성으로 찾아 고르는 팝업. 열린 동안만 창이 키 입력을 받는다
function UnknownSearch({ x, onPick, onClose }: { x: number; onPick: (id: number) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const res = search(AUGMENTS, q)

  useEffect(() => {
    window.api?.setFocus(true)
    return () => { window.api?.setFocus(false); clickable(false) }
  }, [])

  const onKey = (e: KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return // 한글 조합 중 Enter·화살표는 조합 끝내기용
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((s) => Math.max(0, Math.min(res.length - 1, s + (e.key === 'ArrowDown' ? 1 : -1))))
    } else if (e.key === 'Enter' && res[sel]) onPick(res[sel].id)
    else if (e.key === 'Escape') onClose()
  }

  return (
    <div className="pop glass" style={{ left: x - 10 }} onMouseEnter={() => clickable(true)} onMouseLeave={() => clickable(false)}>
      <label className="srlab" htmlFor="aug-search">증강 이름 검색</label>
      <input id="aug-search" className="inp" autoFocus autoComplete="off" spellCheck={false} value={q}
        onChange={(e) => { setQ(e.target.value); setSel(0) }} onKeyDown={onKey} />
      {res.length > 0 && (
        <div className="res">
          {res.map((a, i) => (
            <button type="button" key={a.id} className={`btnreset${i === sel ? ' on' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => onPick(a.id)}>
              {a.name}<em>{RARITY[a.rarity] ?? ''}</em>
            </button>
          ))}
        </div>
      )}
      <div className="help">{q && !res.length ? '맞는 증강이 없어요. ' : ''}초성으로 찾을 수 있어요. Enter로 고르기, Esc로 닫기</div>
    </div>
  )
}

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
// cards: 지금 떠 있는 증강 3장의 ID (못 알아본 카드는 null, 증강 화면이 아니면 null), picked: 고른 증강
// rerolls: 남은 리롤 횟수 (null = 모름)
type Props = { alias: string; cards: (number | null)[] | null; rerolls?: number | null; picked: number[]; f7Open: boolean; onBuildPicked?: () => void }

export function Overlay(props: Props) {
  const champ = BUILDS[props.alias]
  return champ ? <ChampOverlay champ={champ} {...props} /> : <BuildChip picked={0} />
}

function ChampOverlay({ champ, cards, rerolls = null, picked, f7Open, onBuildPicked }: Props & { champ: { name: string; builds: Build[] } }) {
  const [choice, setChoice] = useState<string | null>(null)
  const [toast, setToast] = useState<{ name: string; n: number } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  // 못 알아본 카드를 직접 고른 결과 (카드 번호 → 증강 ID). 새 증강 화면이 뜨면 비운다
  const [fixed, setFixed] = useState<Record<number, number>>({})
  const [searching, setSearching] = useState<number | null>(null)
  const cardsKey = cards?.join()
  useEffect(() => { setFixed({}); setSearching(null) }, [cardsKey])

  const build = champ.builds.find((b) => b.id === choice) ?? champ.builds.find((b) => b.default) ?? champ.builds[0]
  const rated = cards && rateCards(cards.map((id, i) => id ?? fixed[i] ?? null), build, TAGS, LABELS, picked)
  const reroll = !!rated && shouldReroll(rated.cards, rerolls)
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
      {rated && <AugmentGrades key={build.id} cards={rated.cards.map((c) => c ?? { grade: '?', reason: '' })} pick={reroll ? undefined : rated.pick}
        onOpen={(i) => setSearching((s) => (s === i ? null : i))} />}
      {reroll && <RerollCallout rerolls={rerolls} />}
      {searching != null && (
        <UnknownSearch key={searching} x={CARD_X[searching]}
          onPick={(id) => { setFixed((f) => ({ ...f, [searching]: id })); setSearching(null) }}
          onClose={() => setSearching(null)} />
      )}
      {sw && !panelOpen && <SwitchBanner from={build} s={sw} />}
      {toast && <RescoreToast key={toast.n} name={toast.name} />}
    </>
  )
}
