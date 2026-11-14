// 1920×1080 프레임 → 떠 있는 증강 3장의 ID. DOM 없이 도는 순수 로직 (렌더러 연결은 renderer/main.tsx)
import { match, type Img, type Template } from '../engine/match.ts'
import { closestName } from '../engine/search.ts'

// ponytail: 아래 좌표·문턱은 모두 디자인 핸드오프 가정값. 0-4 스크린샷으로 맞춘다
export const CARD_X = [510, 820, 1130] // 카드 왼쪽 x (폭 280, 위 y 300)
export const ICON = { dx: 92, y: 376, size: 96 } // 카드 안 아이콘 영역
export const NAME = { dx: 0, y: 482, w: 280, h: 40 } // 카드 안 이름 영역 (OCR)
// 증강 화면 판정 (1-3 정식 감지 전 임시): 세 장 모두 상대 거리 rel이 이보다 작을 때.
// rel은 아이콘이 없으면(단색 화면) 1.00, 모의 검사의 진짜 아이콘은 95%가 0.80 이하
const REL_MAX = 0.85
const CONF_MIN = 0.15 // 이보다 자신 없으면 '?' (3-6에서 직접 고르기)

export type Region = (x: number, y: number, w: number, h: number) => Img
export type Slot = ReturnType<typeof match>

// 세 장 모두 아이콘과 닮았을 때만 증강 화면. 아니면 null
export function findCards(region: Region, templates: Template[]): Slot[] | null {
  const slots = CARD_X.map((x) => match(region(x + ICON.dx, ICON.y, ICON.size, ICON.size), templates))
  return slots.every((s) => s.rel < REL_MAX) ? slots : null
}

// 슬롯 → 증강 ID. 자신 없으면 null, 같은 그림 후보가 있으면 이름을 읽어 고른다
export async function resolveCards(slots: Slot[], readName: (i: number) => Promise<string>, names: Record<number, string>) {
  return Promise.all(slots.map(async (s, i) => {
    if (s.conf < CONF_MIN) return null
    if (!s.twins.length) return s.id
    const cands = [s.id, ...s.twins].map((id) => ({ id, name: names[id] ?? '' }))
    return closestName(await readName(i), cands).it.id
  }))
}
