// 미리보기: npm run dev 후 브라우저에서 /#preview-02 (01, 06, 07도) → screens/의 같은 번호 PNG와 비교
// /#preview-03: 리롤 권장 (실제 엔진·빌드 데이터)
// /#preview-04: 치명타 배럴인데 AP 증강 3개를 고른 상태 → 전환 배너(버튼이나 F7로 AP 무한궁). 가운데 카드는 인식 실패 '?'
// /#preview-02a: 실제 엔진·빌드 데이터로 갱플랭크 증강 화면. 패널에서 빌드를 누르면 다시 매긴다 (02a → 02b)
import { useEffect, useState, type CSSProperties } from 'react'
import type { Build } from '../engine'
import { BuildChip, BuildPanel } from './build'
import { Overlay } from './view'
import { AugmentGrades, CARD_X, type CardGrade } from './grades'
import { CARD, REROLL } from '../capture/recognize'

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
    <div className="fake-game">
      <div style={abs({ inset: 0, background: 'radial-gradient(ellipse at 50% 42%,#4b525c 0%,#2c3138 55%,#1c1f24 100%)' })} />
      <div style={abs({ inset: 0, background: 'rgba(8,9,11,.5)' })} />
      <div style={abs({ left: 0, right: 0, top: 180, textAlign: 'center', fontSize: 28, color: '#959ca6' })}>증강 선택 (게임 UI 자리표시)</div>
      {CARD_X.map((x) => (
        <div key={x}>
          <div style={abs({ left: x, top: CARD.y, width: CARD.w, height: CARD.h, background: '#3a3f47', border: '2px solid #535a64', borderRadius: 8, boxSizing: 'border-box' })}>
            <div style={abs({ left: 110, top: 50, width: 100, height: 100, borderRadius: 50, background: '#575e68' })} />
            <div style={abs({ left: 0, right: 0, top: 236, textAlign: 'center', fontSize: 20, color: '#c7ccd3', fontWeight: 600 })}>증강 이름</div>
            {line(300, 248)}{line(322, 220)}{line(344, 236)}
          </div>
          <div style={abs({ left: x + REROLL.dx, top: REROLL.y, width: REROLL.w, height: REROLL.h, borderRadius: 4, background: '#3a3f47', border: '1px solid #535a64', boxSizing: 'border-box', color: '#959ca6', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>↻</div>
        </div>
      ))}
    </div>
  )
}

// design.html의 갱플랭크 빌드 목업
const b = (id: string, name: string, desc: string, style: Build['style'], def = false): Build =>
  ({ id, name, desc, style, default: def, wantTags: {}, mustHave: [], avoidTags: [] })
const AP = b('ap', 'AP 무한궁', '궁 쿨감을 쌓아 궁을 쉬지 않고 깔아요', 'fun')
const BRUISER = b('bruiser', '브루저', '체력과 방어 증강으로 앞에서 오래 싸워요', 'meta', true)
const CRIT = b('crit', '치명타', '치명타 증강으로 Q 한 방을 키워요', 'meta')
const MOCK_BUILDS: Record<string, Build[]> = {
  '01': [AP, BRUISER, CRIT],
  '06': [CRIT, BRUISER, AP, b('tank', '탱커', '방어 증강으로 버티며 궁으로 받쳐줘요', 'meta'), b('onhit', '온힛', '공격 속도와 적중 효과로 평타를 키워요', 'fun')],
  '07': [b('tank', '탱커', '방어 증강으로 아군 앞을 막아요', 'fun', true)]
}

function PanelPreview({ screen }: { screen: string }) {
  const builds = MOCK_BUILDS[screen]
  const [sel, setSel] = useState<string | null>(screen === '06' ? 'crit' : null)
  return (
    <>
      <div style={abs({ inset: 0, background: 'radial-gradient(ellipse at 50% 42%,#4b525c 0%,#2c3138 55%,#1c1f24 100%)' })} />
      <BuildPanel
        champion={screen === '07' ? '브라움' : '갱플랭크'}
        builds={builds}
        selected={sel ?? (builds.find((x) => x.default) ?? builds[0]).id}
        chosen={false}
        onPick={setSel}
        onClose={() => {}}
      />
    </>
  )
}

// 고른 증강: 궁극기 대변혁, 대마법사, 적응형 능력치 / 떠 있는 카드: 거인의 결의, (못 알아봄), 순수주의자 - 마법사
// 가운데 '?'를 누르면 초성 검색 (예: ㅁㅎㅇㄷ → 무한의 대검)
function SwitchPreview() {
  const [f7, setF7] = useState(0)
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'F7' && (e.preventDefault(), setF7((n) => n + 1))
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [])
  return <><FakeGame /><Overlay alias="Gangplank" cards={[1001, null, 2018]} picked={[1088, 2087, 1205]} f7={f7} /></>
}

// /#preview-pick: 3-3 확인용. window.__cards([...]) 로 증강 화면을 띄우고 null로 닫는다 (마우스가 올라간 카드를 기록)
function PickPreview() {
  const [cards, setCards] = useState<number[] | null>(null)
  useEffect(() => { (window as any).__cards = setCards }, [])
  return <><FakeGame /><Overlay alias="Gangplank" cards={cards} /></>
}

export function Preview({ screen }: { screen: string }) {
  if (screen === 'pick') return <PickPreview />
  if (screen === '04') return <SwitchPreview />
  // 치명타 배럴에 거인의 결의, 대마법사, 사악한 정신 → 모두 B 이하라 리롤 권장 (고른 증강: 천상의 신체, 정신 변환)
  if (screen === '03') return <><FakeGame /><Overlay alias="Gangplank" cards={[1001, 2087, 1097]} rerolls={[true, false, false]} picked={[1013, 1056]} /></>
  if (MOCK_BUILDS[screen]) return <PanelPreview screen={screen} />
  // 궁극기 대변혁, 대마법사, 무한의 대검 업그레이드
  if (screen === '02a') return <><FakeGame /><Overlay alias="Gangplank" cards={[1088, 2087, 1336]} picked={[]} /></>
  return (
    <>
      <FakeGame />
      <BuildChip build={{ ...AP, name: 'AP 무한궁 갱플' }} picked={1} />
      <AugmentGrades cards={MOCK_02} pick={0} />
    </>
  )
}
