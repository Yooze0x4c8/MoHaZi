// 1920×1080 프레임 → 떠 있는 증강 3장의 ID. DOM 없이 도는 순수 로직 (렌더러 연결은 renderer/main.tsx)
import { match, type Img, type Template } from '../engine/match.ts'
import { closestName } from '../engine/search.ts'

// 1920×1080 기준 (높이 1080으로 줄이고 가운데 정렬한 프레임). 2880×1800 실제 게임 스크린샷에서 잰 값 (2026-11-13)
// 카드는 폭 320, 세로 193~720, 간격 368. 리롤 버튼은 카드마다 하나, 카드 가운데 아래
export const CARD_X = [432, 800, 1168]
export const CARD = { y: 193, w: 320, h: 527 }
export const REROLL = { dx: 126, y: 745, w: 68, h: 40 }
export const ICON = { dx: 79, y: 230, size: 162 } // 아이콘 영역 (정답 라벨로 위치·크기를 찾음, ±5px만 어긋나도 떨어진다)
export const NAME = { dx: 30, y: 420, w: 260, h: 48 } // 이름 영역 (OCR). 양옆 빛나는 테두리를 빼야 한다 (넣으면 "를 … 갤"로 읽힘)
// 증강 화면 판정: 세 장 모두 상대 거리 rel이 이보다 작을 때 (실제 게임 250장 실측, 2026-11-13)
// 증강 화면은 가장 나쁜 카드가 0.04~0.32, 능력치 모루(같은 카드 모양, 증강 아님)는 0.43, 그 밖의 화면은 0.68 이상
// ponytail: 증강과 모루 사이 여유가 작다. 샘플이 더 모이면 다시 본다
const REL_MAX = 0.38
const CONF_MIN = 0.15 // 아이콘이 이보다 자신 없으면 이름을 읽는다
const NAME_MIN = 0.6 // 읽은 이름이 이보다 안 맞으면 '?' (3-6에서 직접 고르기)

export type Region = (x: number, y: number, w: number, h: number) => Img
export type Slot = ReturnType<typeof match>

// 세 장 모두 아이콘과 닮았을 때만 증강 화면. 아니면 null
export function findCards(region: Region, templates: Template[]): Slot[] | null {
  const slots = CARD_X.map((x) => match(region(x + ICON.dx, ICON.y, ICON.size, ICON.size), templates))
  return slots.every((s) => s.rel < REL_MAX) ? slots : null
}

// 슬롯 → 증강 ID. 아이콘이 확실하면 그대로, 같은 그림 후보가 있으면 이름으로 그중에서,
// 아이콘이 자신 없으면(아이콘이 없는 증강, 챔피언 스킬 아이콘을 보여주는 증강 등) 이름으로 전체에서 찾는다
export async function resolveCards(slots: Slot[], readName: (i: number) => Promise<string>, names: Record<number, string>) {
  const all = Object.entries(names).map(([id, name]) => ({ id: Number(id), name }))
  return Promise.all(slots.map(async (s, i) => {
    if (s.conf >= CONF_MIN && !s.twins.length) return s.id
    const text = await readName(i)
    if (s.conf >= CONF_MIN) return closestName(text, [s.id, ...s.twins].map((id) => ({ id, name: names[id] ?? '' }))).it.id
    const best = closestName(text, all)
    return best && best.score >= NAME_MIN ? best.it.id : null
  }))
}
