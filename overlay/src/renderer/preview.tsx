// 미리보기: npm run dev 후 브라우저에서 /#preview → screens/02-augment-grades.png와 비교
import type { CSSProperties } from 'react'
import { AugmentGrades, CARD_X, type CardGrade } from './grades'

const MOCK_02: CardGrade[] = [
  { grade: 'S', reason: '궁 쿨감', detail: '무한궁 핵심' },
  { grade: 'B', reason: 'AP 조금', detail: '빌드와 무관' },
  { grade: 'A', reason: '스킬 가속', detail: '궁 보조', lowData: true }
]

// 게임 화면 자리표시 (design.html의 .game, .g-card 등). 구현 대상 아님
const abs = (s: CSSProperties): CSSProperties => ({ position: 'absolute', ...s })
const line = (top: number, width: number) => <div style={abs({ left: 36, top, width, height: 10, borderRadius: 5, background: '#4d535d' })} />

function FakeGame() {
  return (
    <>
      <div style={abs({ inset: 0, background: 'radial-gradient(ellipse at 50% 42%,#4b525c 0%,#2c3138 55%,#1c1f24 100%)' })} />
      <div style={abs({ inset: 0, background: 'rgba(8,9,11,.5)' })} />
      <div style={abs({ left: 0, right: 0, top: 180, textAlign: 'center', fontSize: 28, color: '#959ca6' })}>증강 선택 (게임 UI 자리표시)</div>
      {CARD_X.map((x) => (
        <div key={x}>
          <div style={abs({ left: x, top: 300, width: 280, height: 440, background: '#3a3f47', border: '2px solid #535a64', borderRadius: 8, boxSizing: 'border-box' })}>
            <div style={abs({ left: 92, top: 76, width: 96, height: 96, borderRadius: 48, background: '#575e68' })} />
            <div style={abs({ left: 0, right: 0, top: 194, textAlign: 'center', fontSize: 20, color: '#c7ccd3', fontWeight: 600 })}>증강 이름</div>
            {line(248, 208)}{line(270, 180)}{line(292, 196)}
          </div>
          <div style={abs({ left: x + 80, top: 764, width: 120, height: 40, borderRadius: 20, background: '#3a3f47', border: '1px solid #535a64', boxSizing: 'border-box', color: '#959ca6', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>리롤</div>
        </div>
      ))}
    </>
  )
}

export function Preview() {
  return (
    <>
      <FakeGame />
      <AugmentGrades cards={MOCK_02} pick={0} />
    </>
  )
}
