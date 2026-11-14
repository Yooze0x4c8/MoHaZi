// 실제 아이콘 데이터(data/icon-features.json)로 가짜 증강 화면을 만들어 인식 흐름을 확인한다
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { loadTemplates } from '../engine/match.ts'
import { CARD_X, ICON, cardAt, findCards, resolveCards, type Region } from './recognize.ts'

const templates = loadTemplates(JSON.parse(fs.readFileSync(new URL('../../../data/icon-features.json', import.meta.url), 'utf8')))
const px = (id: number) => templates.find((t) => t.id === id)!.px

// 1920×1080 배경에 아이콘(16×16 템플릿을 확대)을 카드 자리에 합성
function frame(ids: number[], bg = [40, 44, 52]): Region {
  const W = 1920, H = 1080, data = new Uint8Array(W * H * 4)
  for (let i = 0; i < data.length; i += 4) data.set([...bg, 255], i)
  ids.forEach((id, k) => {
    const t = px(id)
    for (let y = 0; y < ICON.size; y++) for (let x = 0; x < ICON.size; x++) {
      const s = (Math.floor((y * 16) / ICON.size) * 16 + Math.floor((x * 16) / ICON.size)) * 4, a = t[s + 3] / 255
      const o = ((ICON.y + y) * W + CARD_X[k] + ICON.dx + x) * 4
      for (let c = 0; c < 3; c++) data[o + c] = t[s + c] * a + bg[c] * (1 - a)
    }
  })
  return (x, y, w, h) => {
    const out = new Uint8Array(w * h * 4)
    for (let r = 0; r < h; r++) out.set(data.subarray(((y + r) * W + x) * 4, ((y + r) * W + x + w) * 4), r * w * 4)
    return { width: w, height: h, data: out }
  }
}

test('인식: 카드 3장 아이콘 → ID, 같은 그림은 이름으로 가른다', async () => {
  // 궁극기 대변혁, 빵과 잼(빵과 버터 등과 같은 그림), 무한의 대검 업그레이드(취약과 같은 그림)
  const slots = findCards(frame([1088, 1150, 1336]), templates)
  assert.ok(slots)
  assert.equal(slots[0].id, 1088)
  assert.deepEqual(slots[0].twins, [])
  const names = { 1103: '빵과 버터', 1150: '빵과 잼', 1151: '빵과 치즈', 2064: '날쌘걸음', 2100: '가속 추구', 1092: '취약', 1336: '무한의 대검 업그레이드' }
  const read = ['', '빵과 짐', '무한의 대검 업그레이드'] // OCR이 한 글자 틀려도 맞춘다
  assert.deepEqual(await resolveCards(slots, async (i) => read[i], names), [1088, 1150, 1336])
})

test('인식: 첫 카드 이름이 "파편"이면 능력치 모루 화면이라 증강 화면이 아니다', async () => {
  const slots = findCards(frame([1088, 1150, 1336]), templates)!
  assert.equal(await resolveCards(slots, async () => '공격력 파편', {}), null)
})

test('인식: 이름 읽기가 실패해도 다른 카드 결과는 남는다', async () => {
  const slots = findCards(frame([1088, 1150, 1336]), templates)!
  const got = await resolveCards(slots, async (i) => { if (i === 1) throw new Error('ocr'); return i === 2 ? '무한의 대검 업그레이드' : '' }, { 1092: '취약', 1336: '무한의 대검 업그레이드' })
  assert.equal(got![0], 1088)
  assert.equal(got![2], 1336)
})

test('인식: 아이콘이 없는 화면은 증강 화면이 아니다', () => {
  assert.equal(findCards(frame([]), templates), null)
})

test('고른 카드 추정: 마우스가 올라간 카드 번호, 카드 밖이면 null', () => {
  assert.equal(cardAt({ x: CARD_X[0] + 160, y: 400 }), 0)
  assert.equal(cardAt({ x: CARD_X[2] + 5, y: 700 }), 2)
  assert.equal(cardAt({ x: CARD_X[1] - 20, y: 400 }), null) // 카드 사이 틈
  assert.equal(cardAt({ x: CARD_X[1] + 160, y: 900 }), null) // 카드 아래 (리롤·파란 버튼)
  assert.equal(cardAt(null), null)
})
