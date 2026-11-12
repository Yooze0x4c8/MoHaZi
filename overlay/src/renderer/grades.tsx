import type { ReactNode } from 'react'

export type Grade = 'S' | 'A' | 'B' | 'C' | '?'

export type CardGrade = {
  grade: Grade
  reason: string   // 주 태그 (예: 궁 쿨감)
  detail?: string  // 보조 설명 (예: 무한궁 핵심)
  lowData?: boolean
}

// 1920×1080 기준 카드 왼쪽 x. ponytail: 가정값, M1에서 스크린샷으로 맞춘 비율 좌표로 교체
export const CARD_X = [510, 820, 1130]

export function Stage({ children }: { children: ReactNode }) {
  return <div className="stage" style={{ zoom: window.innerWidth / 1920 }}>{children}</div>
}

export function GradeStrip({ x, index, card }: { x: number; index: number; card: CardGrade }) {
  return (
    <div className={`strip glass${card.grade === 'C' ? ' dim' : ''}`} style={{ left: x, animationDelay: `${index * 40}ms` }}>
      <div className={`tile ${card.grade === '?' ? 'Q' : card.grade}`}>{card.grade}</div>
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

// 카드 3장 등급 + 추천 꺾쇠. pick은 추천 카드 번호 (없으면 표시 안 함)
export function AugmentGrades({ cards, pick }: { cards: CardGrade[]; pick?: number }) {
  return (
    <>
      {cards.map((c, i) => <GradeStrip key={i} x={CARD_X[i]} index={i} card={c} />)}
      {pick != null && <PickBrackets x={CARD_X[pick]} />}
    </>
  )
}
