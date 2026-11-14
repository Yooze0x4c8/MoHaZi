import { test } from 'node:test'
import assert from 'node:assert/strict'
import { match, shrink, type Img } from './match.ts'

// 32×32 투명 바탕에 색 있는 도형. inside(x, y)가 참인 곳만 불투명
const icon = (rgb: number[], inside: (x: number, y: number) => boolean): Img => {
  const data = new Uint8Array(32 * 32 * 4)
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (inside(x, y)) data.set([...rgb, 255], (y * 32 + x) * 4)
  return { width: 32, height: 32, data }
}
// 게임 화면처럼 단색 배경에 합성 (불투명)
const onBg = (img: Img, bg: number[]): Img => {
  const data = new Uint8Array(img.data.length)
  for (let i = 0; i < data.length; i += 4) {
    const a = img.data[i + 3] / 255
    for (let c = 0; c < 3; c++) data[i + c] = img.data[i + c] * a + bg[c] * (1 - a)
    data[i + 3] = 255
  }
  return { ...img, data }
}

const circle = icon([200, 60, 60], (x, y) => (x - 16) ** 2 + (y - 16) ** 2 < 100)
const bar = icon([200, 60, 60], (x) => x > 12 && x < 20) // 같은 색, 다른 모양
const T = [{ id: 1, px: shrink(circle) }, { id: 2, px: shrink(bar) }, { id: 3, px: shrink(circle) }]

test('매칭: 배경색과 상관없이 모양으로 고르고, 같은 그림은 twins로 알린다', () => {
  for (const bg of [[20, 20, 25], [240, 230, 200]]) {
    assert.equal(match(onBg(bar, bg), T).id, 2)
    const r = match(onBg(circle, bg), T)
    assert.ok(r.id === 1 || r.id === 3)
    assert.deepEqual(r.twins, [r.id === 1 ? 3 : 1])
    assert.ok(r.conf > 0.5)
  }
})
