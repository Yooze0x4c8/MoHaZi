// 아이콘(.cache/augment-icons) → data/icon-features.json (16×16 RGBA, base64) + 모의 인게임 조건 정확도 검사
// 실행: node --experimental-strip-types --no-warnings tools/make-icon-features.mjs
import fs from 'node:fs'
import zlib from 'node:zlib'
import { N, shrink, match, loadTemplates } from '../overlay/src/engine/match.ts'

const DIR = '.cache/augment-icons/'

// 최소 PNG 디코더: 8비트, 인터레이스 없음, 색 형식 6(RGBA)·4(회색+알파)·2(RGB)
function readPng(file) {
  const b = fs.readFileSync(file)
  let p = 8, w, h, type, idat = []
  while (p < b.length) {
    const len = b.readUInt32BE(p), kind = b.toString('latin1', p + 4, p + 8), body = b.subarray(p + 8, p + 8 + len)
    if (kind === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); type = body[9]; if (body[8] !== 8 || body[12]) throw new Error(`${file}: 8비트 비인터레이스만 지원`) }
    if (kind === 'IDAT') idat.push(body)
    p += 12 + len
  }
  const ch = { 6: 4, 4: 2, 2: 3 }[type]
  if (!ch) throw new Error(`${file}: 색 형식 ${type} 미지원`)
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch, px = new Uint8Array(h * stride)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = y * stride
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[row + x - ch] : 0, up = y ? px[row - stride + x] : 0, ul = y && x >= ch ? px[row - stride + x - ch] : 0
      const pa = Math.abs(up - ul), pb = Math.abs(a - ul), pc = Math.abs(a + up - 2 * ul)
      const pred = [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : ul][f]
      px[row + x] = (src[x] + pred) & 255
    }
  }
  const data = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const s = px.subarray(i * ch, i * ch + ch)
    data.set(ch === 4 ? s : ch === 3 ? [s[0], s[1], s[2], 255] : [s[0], s[0], s[0], s[1]], i * 4)
  }
  return { width: w, height: h, data }
}

const icons = {}, imgs = {}
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.png'))) {
  const id = f.slice(0, -4), img = readPng(DIR + f)
  imgs[id] = img
  icons[id] = Buffer.from(shrink(img)).toString('base64')
}
const json = { size: N, icons }
fs.writeFileSync('data/icon-features.json', JSON.stringify(json) + '\n')
console.log(`아이콘 ${Object.keys(icons).length}개 → data/icon-features.json`)

// 모의 인게임: 무작위 배경에 합성 → 72px로 축소 → 1~2px 밀림 → 잡음 ±12. 쌍둥이(같은 그림)는 맞힌 것으로 친다
// ponytail: 실제 카드 크기·밀림 정도는 가정값. 0-4 스크린샷이 생기면 samples/labels.json 대조로 바꾼다
const templates = loadTemplates(json)
let seed = 1
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
function inGame(img, size = 72) {
  const bg = [rnd() * 255, rnd() * 255, rnd() * 255], dx = Math.round(rnd() * 4 - 2), dy = Math.round(rnd() * 4 - 2)
  const out = new Uint8Array(size * size * 4), s = img.width / size
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sx = Math.min(img.width - 1, Math.max(0, Math.floor((x + dx) * s))), sy = Math.min(img.height - 1, Math.max(0, Math.floor((y + dy) * s)))
    const i = (sy * img.width + sx) * 4, a = img.data[i + 3] / 255, o = (y * size + x) * 4
    for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, img.data[i + c] * a + bg[c] * (1 - a) + (rnd() * 24 - 12)))
    out[o + 3] = 255
  }
  return { width: size, height: size, data: out }
}

let ok = 0, total = 0, low = [], rels = []
for (let round = 0; round < 3; round++) for (const [id, img] of Object.entries(imgs)) {
  const r = match(inGame(img), templates)
  total++
  rels.push(r.rel)
  if (r.id === Number(id) || r.twins.includes(Number(id))) ok++
  else low.push(`${id}→${r.id}(${r.conf.toFixed(2)})`)
}
console.log(`모의 정확도 ${(100 * ok / total).toFixed(1)}% (${ok}/${total})`)
if (low.length) console.log('틀림:', low.join(' '))
rels.sort((a, b) => a - b)
console.log(`상대 거리 rel: 중앙값 ${rels[rels.length >> 1].toFixed(2)}, 95% ${rels[Math.floor(rels.length * 0.95)].toFixed(2)}, 최대 ${rels.at(-1).toFixed(2)} (아이콘 없는 단색 화면은 1.00)`)
