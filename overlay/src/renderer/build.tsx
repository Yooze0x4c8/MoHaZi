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

// 빌드 선택 패널. chosen: 사용자가 직접 고른 적 있는지 (안내 문구가 바뀐다)
export function BuildPanel({ champion, builds, selected, chosen, onPick }: {
  champion: string; builds: Build[]; selected: string; chosen: boolean; onPick: (id: string) => void
}) {
  useEffect(() => () => clickable(false), []) // 마우스 아래에서 닫혀도 클릭 통과로 되돌린다
  const one = builds.length === 1
  const def = builds.find((b) => b.default) ?? builds[0]
  return (
    <div className="panel glass" onMouseEnter={() => clickable(true)} onMouseLeave={() => clickable(false)}>
      <div className="p-head">
        <div className="eyebrow">{champion}</div>
        <h2>{one ? '이 빌드로 시작해요' : '어떤 빌드로 갈까요?'}</h2>
      </div>
      <div className="rows">
        {builds.map((b) => <Row key={b.id} b={b} sel={b.id === selected} onPick={one ? undefined : () => onPick(b.id)} />)}
      </div>
      <div className="p-foot">
        <div className="note">
          {one ? '알려진 빌드가 하나뿐이라 바로 적용했어요.'
            : chosen ? <>첫 증강을 고르면 패널이 닫혀요. 그 뒤에는 <b>F7</b>로 바꿔요.</>
            : <>고르지 않으면 기본 빌드인 <b>{def.name}</b> 기준으로 추천해요. 첫 증강을 고르기 전까지 언제든 바꿀 수 있어요.</>}
        </div>
        <div className="hints">
          {!one && <div>클릭해서 고르기</div>}
          <div><span className="key">F8</span>숨기기</div>
        </div>
      </div>
    </div>
  )
}

// 패널이 닫힌 뒤 왼쪽 위에 남는 칩. build가 없으면 "빌드 없음"
export function BuildChip({ build, picked }: { build?: Build; picked: number }) {
  return (
    <div className="chip glass">
      <span className="tick" />
      {build ? build.name : '빌드 없음'}
      {build && <span className="sub">증강 {picked}개</span>}
      {build && <span className="key">F7</span>}
    </div>
  )
}
