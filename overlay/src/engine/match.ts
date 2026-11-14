// 증강 아이콘 매칭: 잘라 낸 아이콘 영역을 N×N으로 줄여 템플릿(data/icon-features.json)과 비교한다.
// 배경색을 추정해 템플릿을 합성한 뒤 비교하므로 카드 배경색은 상관없다.
// ponytail: 배경은 단색으로 가정하고 평균 색 차이만 본다. 실제 스크린샷에서 밝기·색조가 다르면 정규화나 opencv 템플릿 매칭으로 올린다
export type Img = { width: number; height: number; data: Uint8Array | Uint8ClampedArray } // RGBA
export type Template = { id: number; px: Uint8Array } // N×N RGBA
export const N = 16

// 알파 가중 면적 평균으로 n×n 축소 (투명 픽셀의 색은 섞지 않는다)
export function shrink(img: Img, n = N): Uint8Array {
  const { width: w, height: h, data } = img
  const out = new Uint8Array(n * n * 4)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const x0 = Math.floor((x * w) / n), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / n))
    const y0 = Math.floor((y * h) / n), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / n))
    let r = 0, g = 0, b = 0, a = 0
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = (yy * w + xx) * 4, al = data[i + 3]
      r += data[i] * al; g += data[i + 1] * al; b += data[i + 2] * al; a += al
    }
    const o = (y * n + x) * 4, cnt = (x1 - x0) * (y1 - y0)
    if (a) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a }
    out[o + 3] = a / cnt
  }
  return out
}

// 0~255 평균 색 차이. 배경색은 템플릿이 투명한 칸의 프레임 평균으로 추정하고,
// 템플릿을 그 배경 위에 합성해 전체 칸을 비교한다 → 모양(알파)과 색을 같이 보되 배경색에는 무관
export function dist(frame: Uint8Array, t: Uint8Array) {
  return compare(frame, t).d
}

// d: 위의 거리, rel: d ÷ (아이콘이 없을 때 = 배경만 있을 때의 거리). 0이면 꼭 맞음, 1 근처면 아이콘이 없는 것
// 불투명한 부분이 작은 아이콘은 단색 화면과도 d가 작게 나오므로 "여기 아이콘이 있나"는 rel로 본다
function compare(frame: Uint8Array, t: Uint8Array) {
  const bg = [0, 0, 0]
  let n = 0
  for (let i = 0; i < t.length; i += 4) if (t[i + 3] < 32) { bg[0] += frame[i]; bg[1] += frame[i + 1]; bg[2] += frame[i + 2]; n++ }
  if (n) for (let c = 0; c < 3; c++) bg[c] /= n
  let s = 0, e = 0
  for (let i = 0; i < t.length; i += 4) {
    const a = t[i + 3] / 255
    for (let c = 0; c < 3; c++) {
      const want = t[i + c] * a + bg[c] * (1 - a)
      s += Math.abs(frame[i + c] - want); e += Math.abs(bg[c] - want)
    }
  }
  return { d: s / (t.length / 4 * 3), rel: s / Math.max(e, 1) }
}

// 같은 그림인지: 템플릿끼리 RGBA 원값 평균 차이 (dist는 합성된 화면용이라 템플릿끼리는 0이 안 나온다)
// ponytail: 문턱 3은 아이콘 쌍 거리 분포를 보고 정한 값
export function same(a: Uint8Array, b: Uint8Array) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
  return s / a.length < 3
}

// 가장 비슷한 증강. conf 0~1: 1등과 "다른 그림" 중 2등의 거리 차이 비율.
// twins: 1등과 같은 그림을 쓰는 다른 증강 (아이콘만으로는 구분 불가 → 이름 비교 필요)
export function match(img: Img, templates: Template[]) {
  const f = shrink(img)
  const ranked = templates.map((t) => ({ t, ...compare(f, t.px) })).sort((a, b) => a.d - b.d)
  const best = ranked[0]
  const twins = ranked.filter((r) => r !== best && same(r.t.px, best.t.px)).map((r) => r.t.id)
  const second = ranked.find((r) => r !== best && !same(r.t.px, best.t.px))
  const conf = second ? Math.max(0, (second.d - best.d) / Math.max(second.d, 1)) : 1
  return { id: best.t.id, dist: best.d, rel: best.rel, conf, twins }
}

// data/icon-features.json → 템플릿 목록 (브라우저·Node 둘 다)
export function loadTemplates(json: { size: number; icons: Record<string, string> }): Template[] {
  return Object.entries(json.icons).map(([id, b64]) => ({ id: Number(id), px: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) }))
}
