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
const CONF_MIN = 0.15 // 이름으로 못 찾았을 때 아이콘을 믿는 기준
const NAME_MIN = 0.6 // 읽은 이름이 이보다 안 맞으면 '?' (3-6에서 직접 고르기)

export type Region = (x: number, y: number, w: number, h: number) => Img
export type Slot = ReturnType<typeof match>

// 세 장 모두 아이콘과 닮았을 때만 증강 화면. 아니면 null
export function findCards(region: Region, templates: Template[]): Slot[] | null {
  const slots = CARD_X.map((x) => match(region(x + ICON.dx, ICON.y, ICON.size, ICON.size), templates))
  return slots.every((s) => s.rel < REL_MAX) ? slots : null
}

// 능력치 모루 카드: 증강과 같은 카드 모양이고 아이콘(방패·칼 등)까지 증강과 같은 그림이 있어 아이콘으로는 못 가른다.
// 이름이 모두 "○○ 파편"이라 이름으로 거른다 (증강 이름엔 "파편"이 없다)
const ANVIL = /파\s*편/

// 슬롯 → 증강 ID 3개, 증강 화면이 아니면(능력치 모루) null.
// 이름을 먼저 본다: 실제 게임 이름 OCR은 거의 틀리지 않고(66장 중 66장), 아이콘은 비슷한 그림끼리 틀린다
// (푸른 방어막 → 바람전달자의 축복, conf 0.18). 이름으로 못 찾으면 아이콘이 확실할 때만 아이콘, 아니면 '?'.
// 이름 읽기가 실패하면 그 카드만 빈 글자로 본다 (세 장 결과를 통째로 버리지 않게)
export async function resolveCards(slots: Slot[], readName: (i: number) => Promise<string>, names: Record<number, string>) {
  const memo: Promise<string>[] = []
  const read = (i: number) => (memo[i] ??= readName(i).catch(() => ''))
  if (ANVIL.test(await read(0))) return null
  const all = Object.entries(names).map(([id, name]) => ({ id: Number(id), name }))
  return Promise.all(slots.map(async (s, i) => {
    const byName = closestName(await read(i), all)
    if (byName && byName.score >= NAME_MIN) return byName.it.id
    return s.conf >= CONF_MIN ? s.id : null
  }))
}
