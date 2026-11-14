import { useEffect } from 'react'
import type { Build } from '../engine'

// 패널 위에 마우스가 있을 때만 클릭을 받는다 (창 전체는 클릭 통과)
const clickable = (on: boolean) => window.api?.setClickable(on)

// ponytail: 신뢰도는 style로만 정함 (meta 높음, fun 보통). 통계(M4)가 생기면 표본 수로 바꾼다
const CONF = { meta: [3, '높음'], fun: [2, '보통'] } as const

// onPick이 없으면(빌드 1개) 고를 게 없으므로 기본/재미 표시도 뺀다
function Row({ b, sel, onPick }: { b: Build; sel: boolean; onPick?: () => void }) {
  const [n, label] = CONF[b.style]
  return (
    <button type="button" className={`row${sel ? ' sel' : ''}`} aria-pressed={sel} onClick={onPick}>
      {sel && <span className="selbar" />}
      <span className={`radio${sel ? ' on' : ''}`}>{sel && <i />}</span>
      <div className="r-main">
        <div className="r-name">{b.name}{onPick && (b.default ? <span>기본</span> : b.style === 'fun' && <span>재미</span>)}</div>
        {b.desc && <div className="r-desc">{b.desc}</div>}
      </div>
      <div className="conf">
        <div className="bars">{[0, 1, 2].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}</div>
        <span>신뢰도 {label}</span>
      </div>
    </button>
  )
}

// 고른 증강 목록 (3-3). 화면에서 추정해 기록하므로 틀릴 수 있어 바꾸기·빼기·추가를 둔다
export type PickEdit = { names: string[]; onEdit: (i: number) => void; onRemove: (i: number) => void; onAdd: () => void }

function Picks({ names, onEdit, onRemove, onAdd }: PickEdit) {
  return (
    <div className="picks">
      <div className="picks-head">고른 증강 {names.length}개<button type="button" className="mini" onClick={onAdd}>추가</button></div>
      {names.map((n, i) => (
        <div key={i} className="pick-row">
          <span>{n}</span>
          <button type="button" className="mini" onClick={() => onEdit(i)}>바꾸기</button>
          <button type="button" className="mini" onClick={() => onRemove(i)} aria-label={`${n} 빼기`}>빼기</button>
        </div>
      ))}
    </div>
  )
}

// 빌드 선택 패널. chosen: 사용자가 직접 고른 적 있는지 (안내 문구가 바뀐다), onClose: 칩으로 접기
// (게임 중엔 전역 단축키가 안 먹혀서 접고 펴기는 마우스로 한다. 오버레이 위에선 클릭·스크롤이 된다)
export function BuildPanel({ champion, builds, selected, chosen, onPick, onClose, picks }: {
  champion: string; builds: Build[]; selected: string; chosen: boolean; onPick: (id: string) => void; onClose: () => void; picks?: PickEdit
}) {
  useEffect(() => () => clickable(false), []) // 마우스 아래에서 닫혀도 클릭 통과로 되돌린다
  const one = builds.length === 1
  const def = builds.find((b) => b.default) ?? builds[0]
  return (
    <div className="panel glass" onMouseEnter={() => clickable(true)} onMouseLeave={() => clickable(false)}>
      <div className="p-head">
        <button type="button" className="fold" onClick={onClose} aria-label="패널 접기">접기</button>
        <div className="eyebrow">{champion}</div>
        <h2>{one ? '이 빌드로 시작해요' : '어떤 빌드로 갈까요?'}</h2>
      </div>
      <div className="rows">
        {builds.map((b) => <Row key={b.id} b={b} sel={b.id === selected} onPick={one ? undefined : () => onPick(b.id)} />)}
      </div>
      {picks && <Picks {...picks} />}
      <div className="p-foot">
        <div className="note">
          {one ? '알려진 빌드가 하나뿐이라 바로 적용했어요.'
            : picks?.names.length ? '빌드는 언제든 바꿀 수 있어요. 고른 증강이 틀리게 기록됐으면 바꾸기로 고쳐 주세요.'
            : chosen ? <>첫 증강을 고르면 패널이 접혀요. 왼쪽 위 빌드 이름을 누르면 다시 펼쳐져요.</>
            : <>고르지 않으면 기본 빌드인 <b>{def.name}</b> 기준으로 추천해요. 첫 증강을 고르기 전까지 언제든 바꿀 수 있어요.</>}
        </div>
        {!one && <div className="hints"><div>클릭해서 고르기</div></div>}
      </div>
    </div>
  )
}

// 패널을 접으면 왼쪽 위에 남는 칩. 누르면 패널이 펼쳐진다. build가 없으면 "빌드 없음" (누를 수 없음)
export function BuildChip({ build, picked, onOpen }: { build?: Build; picked: number; onOpen?: () => void }) {
  useEffect(() => () => clickable(false), [])
  if (!build) return <div className="chip glass"><span className="tick" />빌드 없음</div>
  return (
    <button type="button" className="chip glass btnreset" onClick={onOpen} aria-label="빌드 패널 펼치기"
      onMouseEnter={() => clickable(true)} onMouseLeave={() => clickable(false)}>
      <span className="tick" />
      {build.name}
      <span className="sub">증강 {picked}개</span>
      <span className="caret" aria-hidden>▾</span>
    </button>
  )
}
