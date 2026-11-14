import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { rateCards, shouldReroll, suggestSwitch, type Build, type Labels, type Switch, type Tags } from '../engine'
import { search } from '../engine/search'
import { cardAt } from '../capture/recognize'
import { AugmentGrades, CARD_X, RerollCallout, stageBox, toStage } from './grades'
import { BuildChip, BuildPanel } from './build'
import BUILDS_JSON from '../../../data/builds.json'
import TAGS_JSON from '../../../data/tags.json'
import AUGMENTS_JSON from '../../../data/augments.json'

export const BUILDS = BUILDS_JSON as unknown as Record<string, { name: string; builds: Build[] }>
const TAGS = TAGS_JSON.tags as unknown as Tags
const LABELS = TAGS_JSON.labels as Labels
const AUGMENTS = AUGMENTS_JSON as { id: number; name: string; rarity: string }[]
const RARITY: Record<string, string> = { silver: '실버', gold: '골드', prismatic: '프리즈마틱' }
const NAME: Record<number, string> = Object.fromEntries(AUGMENTS.map((a) => [a.id, a.name]))
const clickable = (on: boolean) => window.api?.setClickable(on)

// 증강을 초성으로 찾아 고르는 팝업 (못 알아본 카드, 고른 증강 바꾸기·추가). 열린 동안만 창이 키 입력을 받는다
function UnknownSearch({ left, top, onPick, onClose }: { left: number; top?: number; onPick: (id: number) => void; onClose: () => void }) {
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
    <div className="pop glass" style={{ left, top }} onMouseEnter={() => clickable(true)} onMouseLeave={() => clickable(false)}>
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

// 위쪽 가운데 알림 (2초): 빌드를 바꿔 다시 매겼을 때, 고른 증강을 기록했을 때
function Toast({ text }: { text: string }) {
  return <div className="toast glass"><span className="tick" />{text}</div>
}

// '로/으로': 받침이 있으면(ㄹ 제외) 으로
const ro = (w: string) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00
  return c >= 0 && c < 11172 && c % 28 !== 0 && c % 28 !== 8 ? '으로' : '로'
}

// 다른 빌드가 훨씬 맞을 때 위쪽 배너. 바꾸기 버튼만 클릭을 받는다 (F7도 된다)
function SwitchBanner({ from, s, onAccept }: { from: Build; s: Switch; onAccept: () => void }) {
  useEffect(() => () => clickable(false), [])
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
      <div className="act">
        <button type="button" className="accept btnreset" onClick={onAccept} onMouseEnter={() => clickable(true)} onMouseLeave={() => clickable(false)}>
          {s.to.name}{ro(s.to.name)} 바꾸기
        </button>
        <span>그대로 두려면 무시하세요</span>
      </div>
    </div>
  )
}

// 한 챔피언의 오버레이: 빌드 패널/칩 + 카드 등급 + 재계산 알림.
// 챔피언이 바뀌면 key로 새로 만들어 고른 빌드를 기본으로 되돌린다.
// cards: 지금 떠 있는 증강 3장의 ID (못 알아본 카드는 null, 증강 화면이 아니면 null), picked: 고른 증강
// rerolls: 남은 리롤 횟수 (null = 모름), f7: F7을 누른 횟수 (단축키가 먹히는 PC용. 바뀔 때마다 패널 토글)
// picked: 처음 고른 증강 (미리보기용). 게임에선 비어서 시작하고 화면에서 추정해 채운다 (3-3)
type Props = { alias: string; cards: (number | null)[] | null; rerolls?: number | null; picked?: number[]; f7?: number }

export function Overlay(props: Props) {
  const champ = BUILDS[props.alias]
  return champ ? <ChampOverlay champ={champ} {...props} /> : <BuildChip picked={0} />
}

function ChampOverlay({ champ, cards, rerolls = null, picked: initial = [], f7 = 0 }: Props & { champ: { name: string; builds: Build[] } }) {
  const [choice, setChoice] = useState<string | null>(null)
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null)

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

  // 고른 증강 (3-3). 게임 API에 없어 화면에서 추정한다: 증강 화면이 닫힐 때 마우스가 올라가 있던 카드
  const [picked, setPicked] = useState<number[]>(initial)
  const [editing, setEditing] = useState<number | 'add' | null>(null)
  const mouse = useRef<{ t: number; x: number; y: number }[]>([])
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const h = mouse.current, t = performance.now()
      h.push({ t, ...toStage(e.clientX, e.clientY) })
      while (h.length && h[0].t < t - 3000) h.shift()
    }
    addEventListener('mousemove', on) // 클릭 통과 창도 마우스 이동은 받는다 (forward)
    return () => removeEventListener('mousemove', on)
  }, [])

  const resolved = cards?.map((id, i) => id ?? fixed[i] ?? null) ?? null
  const shown = useRef<{ key: string; ids: (number | null)[] } | null>(null)
  const lastPick = useRef<string | null>(null)
  useEffect(() => {
    const prev = shown.current
    if (cards && resolved) {
      // 방금 기록한 화면이 다시 뜨면 고른 게 아니었다 (화면을 숨겼다 다시 연 것) → 기록 취소
      if (cardsKey === lastPick.current) { setPicked((p) => p.slice(0, -1)); setToast({ text: '방금 기록을 취소했어요', n: Date.now() }) }
      lastPick.current = null
      shown.current = { key: cardsKey!, ids: resolved }
      return
    }
    if (!prev) return
    shown.current = null
    // 화면이 닫힌 걸 아는 건 두 프레임 뒤라(약 0.5~1초) 그만큼 앞의 마우스 위치를 본다
    // ponytail: 시간으로 고른 근사값. 닫힌 순간 마우스를 크게 움직이면 틀릴 수 있다 → 패널에서 고친다
    const t = performance.now() - 700, h = mouse.current
    const at = [...h].reverse().find((m) => m.t <= t) ?? h[0] ?? null
    const i = cardAt(at), id = i == null ? null : prev.ids[i]
    if (id == null) return
    setPicked((p) => [...p, id])
    lastPick.current = prev.key
    setToast({ text: `${NAME[id]} 기록했어요`, n: Date.now() })
  }, [cardsKey])

  // 떠 있는 동안 '?' 카드를 직접 고치면 기록용 값에도 반영
  useEffect(() => { if (shown.current && resolved) shown.current.ids = resolved }, [fixed])

  // 고른 증강 정정 (패널). editing: 바꿀 번호 또는 'add'
  const setPick = (id: number) => {
    setPicked((p) => (editing === 'add' ? [...p, id] : p.map((x, i) => (i === editing ? id : x))))
    setEditing(null)
  }

  const build = champ.builds.find((b) => b.id === choice) ?? champ.builds.find((b) => b.default) ?? champ.builds[0]
  const rated = resolved && rateCards(resolved, build, TAGS, LABELS, picked)
  const reroll = !!rated && shouldReroll(rated.cards, rerolls)
  // 패널: 처음엔 펼침, 첫 증강을 고르면 접힘. 칩·접기 버튼(또는 F7)으로 언제든 접고 편다
  const hadPick = picked.length > 0
  const [panelOpen, setPanelOpen] = useState(!hadPick)
  useEffect(() => { if (hadPick) setPanelOpen(false) }, [hadPick])

  const pick = (id: string) => {
    if (hadPick) setPanelOpen(false) // 첫 증강 뒤엔 고르면 접는다 (그 전엔 비교해 보게 둔다)
    if (id === build.id) return
    setChoice(id)
    // 떠 있는 카드가 있을 때만 알림. 등급은 다음 렌더에서 새 빌드로 다시 계산된다
    if (cards) setToast({ text: `${champ.builds.find((b) => b.id === id)!.name} 기준으로 다시 매겼어요`, n: Date.now() })
  }

  // 전환 제안은 증강 화면에서만 (평소엔 위쪽 게임 UI를 가리지 않게). 이때 F7은 패널 대신 제안 빌드로 바로 바꾼다
  const sw = cards ? suggestSwitch(picked, build, champ.builds, TAGS, LABELS) : null
  const lastF7 = useRef(f7)
  useEffect(() => {
    if (f7 === lastF7.current) return
    lastF7.current = f7
    if (sw && !panelOpen) pick(sw.to.id)
    else setPanelOpen((o) => !o)
  }, [f7])

  return (
    <>
      {panelOpen
        ? <BuildPanel champion={champ.name} builds={champ.builds} selected={build.id} chosen={choice != null} onPick={pick}
            onClose={() => { setPanelOpen(false); setEditing(null) }}
            picks={{ names: picked.map((id) => NAME[id] ?? String(id)), onEdit: setEditing, onAdd: () => setEditing('add'),
              onRemove: (i) => setPicked((p) => p.filter((_, j) => j !== i)) }} />
        : <BuildChip build={build} picked={picked.length} onOpen={() => setPanelOpen(true)} />}
      {/* key에 빌드를 넣어 다시 매길 때 등장 애니메이션을 다시 보여준다 */}
      {rated && <AugmentGrades key={build.id} cards={rated.cards.map((c) => c ?? { grade: '?', reason: '' })} pick={reroll ? undefined : rated.pick}
        onOpen={(i) => setSearching((s) => (s === i ? null : i))} />}
      {reroll && <RerollCallout rerolls={rerolls} />}
      {searching != null && (
        <UnknownSearch key={searching} left={CARD_X[searching] + 10}
          onPick={(id) => { setFixed((f) => ({ ...f, [searching]: id })); setSearching(null) }}
          onClose={() => setSearching(null)} />
      )}
      {editing != null && panelOpen && (
        // 패널(왼쪽 32, 폭 368) 오른쪽 옆
        <UnknownSearch key={String(editing)} left={412 + stageBox().edge} top={200} onPick={setPick} onClose={() => setEditing(null)} />
      )}
      {sw && !panelOpen && <SwitchBanner from={build} s={sw} onAccept={() => pick(sw.to.id)} />}
      {toast && <Toast key={toast.n} text={toast.text} />}
    </>
  )
}
