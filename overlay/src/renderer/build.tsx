import { useEffect } from 'react'
import type { Build } from '../engine'
import { LANG, t } from './i18n'

// 패널 위에 마우스가 있을 때만 클릭을 받는다 (창 전체는 클릭 통과)
const clickable = (on: boolean) => window.api?.setClickable(on)

// ponytail: 신뢰도는 style로만 정함 (meta 높음, fun 보통). 통계(M4)가 생기면 표본 수로 바꾼다
const CONF = { meta: [3, t('높음', 'High')], fun: [2, t('보통', 'Medium')] } as const

// onPick이 없으면(빌드 1개) 고를 게 없으므로 기본/재미 표시도 뺀다
function Row({ b, sel, onPick }: { b: Build; sel: boolean; onPick?: () => void }) {
  const [n, label] = CONF[b.style]
  return (
    <button type="button" className={`row${sel ? ' sel' : ''}`} aria-pressed={sel} onClick={onPick}>
      {sel && <span className="selbar" />}
      <span className={`radio${sel ? ' on' : ''}`}>{sel && <i />}</span>
      <div className="r-main">
        <div className="r-name">{b.name}{onPick && (b.default ? <span>{t('기본', 'Default')}</span> : b.style === 'fun' && <span>{t('재미', 'Fun')}</span>)}</div>
        {b.desc && <div className="r-desc">{b.desc}</div>}
      </div>
      <div className="conf">
        <div className="bars">{[0, 1, 2].map((i) => <i key={i} className={i < n ? 'on' : ''} />)}</div>
        <span>{t('신뢰도', 'Confidence')} {label}</span>
      </div>
    </button>
  )
}

// 고른 증강 목록 (3-3). 화면에서 추정해 기록하므로 틀릴 수 있어 바꾸기·빼기·추가를 둔다
export type PickEdit = { names: string[]; tips?: (string | undefined)[]; onEdit: (i: number) => void; onRemove: (i: number) => void; onAdd: () => void }

function Picks({ names, tips, onEdit, onRemove, onAdd }: PickEdit) {
  return (
    <div className="picks">
      <div className="picks-head">{t(`고른 증강 ${names.length}개`, `Picked augments: ${names.length}`)}<button type="button" className="mini" onClick={onAdd}>{t('추가', 'Add')}</button></div>
      {names.map((n, i) => (
        <div key={i} className="pick-row">
          <span>{n}{tips?.[i] && <small>{tips[i]}</small>}</span>
          <button type="button" className="mini" onClick={() => onEdit(i)}>{t('바꾸기', 'Change')}</button>
          <button type="button" className="mini" onClick={() => onRemove(i)} aria-label={t(`${n} 빼기`, `Remove ${n}`)}>{t('빼기', 'Remove')}</button>
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
        <button type="button" className="fold" onClick={onClose} aria-label={t('패널 접기', 'Collapse panel')}>{t('접기', 'Collapse')}</button>
        <div className="eyebrow">{champion}</div>
        <h2>{one ? t('이 빌드로 시작해요', 'Starting with this build') : t('어떤 빌드로 갈까요?', 'Which build will you play?')}</h2>
      </div>
      <div className="rows">
        {builds.map((b) => <Row key={b.id} b={b} sel={b.id === selected} onPick={one ? undefined : () => onPick(b.id)} />)}
      </div>
      {picks && <Picks {...picks} />}
      <div className="p-foot">
        <div className="note">
          {one ? t('알려진 빌드가 하나뿐이라 바로 적용했어요.', 'Only one known build, so it was applied.')
            : picks?.names.length ? t('빌드는 언제든 바꿀 수 있어요. 고른 증강이 틀리게 기록됐으면 바꾸기로 고쳐 주세요.', 'You can switch builds anytime. If a pick was recorded wrong, fix it with Change.')
            : chosen ? t('첫 증강을 고르면 패널이 접혀요. 왼쪽 위 빌드 이름을 누르면 다시 펼쳐져요.', 'The panel folds after your first augment. Click the build name at the top left to open it again.')
            : LANG === 'en' ? <>If you don't pick, recommendations follow the default build, <b>{def.name}</b>. You can switch anytime before your first augment.</>
            : <>고르지 않으면 기본 빌드인 <b>{def.name}</b> 기준으로 추천해요. 첫 증강을 고르기 전까지 언제든 바꿀 수 있어요.</>}
        </div>
        {!one && <div className="hints"><div>{t('클릭해서 고르기', 'Click to choose')}</div></div>}
      </div>
    </div>
  )
}

// 패널을 접으면 왼쪽 위에 남는 칩. 누르면 패널이 펼쳐진다. build가 없으면 "빌드 없음" (누를 수 없음)
export function BuildChip({ build, picked, onOpen }: { build?: Build; picked: number; onOpen?: () => void }) {
  useEffect(() => () => clickable(false), [])
  if (!build) return <div className="chip glass"><span className="tick" />{t('빌드 없음', 'No build')}</div>
  return (
    <button type="button" className="chip glass btnreset" onClick={onOpen} aria-label={t('빌드 패널 펼치기', 'Open build panel')}
      onMouseEnter={() => clickable(true)} onMouseLeave={() => clickable(false)}>
      <span className="tick" />
      {build.name}
      <span className="sub">{t(`증강 ${picked}개`, `${picked} augment${picked === 1 ? '' : 's'}`)}</span>
      <span className="caret" aria-hidden>▾</span>
    </button>
  )
}
