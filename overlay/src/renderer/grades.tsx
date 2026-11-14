import type { CSSProperties, ReactNode } from 'react'

export type Grade = 'S' | 'A' | 'B' | 'C' | '?'

export type CardGrade = {
  grade: Grade
  reason: string   // 주 태그 (예: 궁 쿨감)
  detail?: string  // 보조 설명 (예: 무한궁 핵심)
  lowData?: boolean
}

// 1920×1080 기준 카드 왼쪽 x (인식과 같은 값)
import { CARD_X, REROLL } from '../capture/recognize'
export { CARD_X }

// 무대(1920×1080) 배치: 화면 높이에 맞춘 zoom, 가로 가운데 정렬 시 무대 왼쪽 위치, 무대 밖으로 나간 폭(16:10)
export function stageBox() {
  const z = window.innerHeight / 1080, left = (window.innerWidth / z - 1920) / 2
  return { z, left, edge: Math.max(0, -left) }
}

// 마우스 위치(화면 px) → 무대 좌표
export const toStage = (clientX: number, clientY: number) => {
  const { z, left } = stageBox()
  return { x: clientX / z - left, y: clientY / z }
}

export function Stage({ children }: { children: ReactNode }) {
  // 게임 UI처럼 화면 높이에 맞춰 키우고 가로는 가운데 (16:10이면 양옆이 남는다)
  // --edge: 화면이 1920 기준보다 좁을 때(16:10) 무대 밖으로 나간 폭. 왼쪽에 붙는 칩·패널은 이만큼 안으로 들인다
  const { z, left, edge } = stageBox()
  return <div className="stage" style={{ zoom: z, left, '--edge': `${edge}px` } as CSSProperties}>{children}</div>
}

const clickable = (on: boolean) => window.api?.setClickable(on)

// '?' 카드는 눌러서 직접 고르는 버튼 (클릭을 받는 몇 안 되는 곳)
export function GradeStrip({ x, index, card, onOpen }: { x: number; index: number; card: CardGrade; onOpen?: () => void }) {
  const style = { left: x, animationDelay: `${index * 40}ms` }
  if (card.grade === '?') return (
    <button type="button" className="strip glass btnreset" style={style} onClick={onOpen}
      onMouseEnter={() => clickable(true)} onMouseLeave={() => clickable(false)}>
      <div className="tile Q">?</div>
      <div className="why"><div className="r1">못 알아봤어요</div><div className="r2">눌러서 직접 고르기</div></div>
    </button>
  )
  return (
    <div className={`strip glass${card.grade === 'C' ? ' dim' : ''}`} style={style}>
      <div className={`tile ${card.grade}`}>{card.grade}</div>
      <div className="why">
        <div className="r1">{card.reason}{card.detail && <span>{card.detail}</span>}</div>
        {card.lowData && <div className="r2 low">표본이 적어요</div>}
      </div>
    </div>
  )
}

export function PickBrackets({ x }: { x: number }) {
  return (
    <div className="pick" style={{ left: x - 12 }}>
      <div className="pick-label">추천</div>
      <div className="br tl" /><div className="br tr" /><div className="br bl" /><div className="br brr" />
    </div>
  )
}

// 리롤 권장: 게임 리롤 버튼마다 14px 꺾쇠 + 카드 아래 가운데 안내. rerolls null = 남은 횟수 모름
export function RerollCallout({ rerolls }: { rerolls: number | null }) {
  return (
    <>
      {CARD_X.map((x) => (
        <div key={x} className="rr" style={{ left: x + REROLL.dx - 12 }}>
          <div className="br tl" /><div className="br tr" /><div className="br bl" /><div className="br brr" />
        </div>
      ))}
      <div className="callout glass">
        <span className="tick" />
        <div>
          <div className="t">리롤을 권장해요</div>
          <div className="s">세 장 모두 B 이하예요.{rerolls != null && ` 리롤 ${rerolls}번 남음`}</div>
        </div>
      </div>
    </>
  )
}

// 카드 3장 등급 + 추천 꺾쇠. pick은 추천 카드 번호 (없으면 표시 안 함)
export function AugmentGrades({ cards, pick, onOpen }: { cards: CardGrade[]; pick?: number; onOpen?: (i: number) => void }) {
  return (
    <>
      {cards.map((c, i) => <GradeStrip key={i} x={CARD_X[i]} index={i} card={c} onOpen={() => onOpen?.(i)} />)}
      {pick != null && <PickBrackets x={CARD_X[pick]} />}
    </>
  )
}
