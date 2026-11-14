// 증강 아이콘 매칭: 잘라 낸 아이콘 영역을 N×N으로 줄여 템플릿(data/icon-features.json)과 비교한다.
// 밝기 모양의 상관으로 비교하므로 카드 배경색·아이콘 색조는 상관없다.
// ponytail: 16×16 밝기 상관만 본다. 비슷한 실루엣끼리 헷갈리면 해상도를 올리거나 opencv 템플릿 매칭으로 올린다
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

// 거리: 밝기 모양의 상관관계로 비교한다 (색조·밝기·대비가 달라도 같은 그림이면 가깝다).
// 게임은 희귀도·카드 테마에 따라 아이콘을 물들인다 (골드 카드는 주황·빨강, 2026-11-13 실측) → 색 비교는 실패했다.
// 템플릿은 검은 바탕에 합성한 밝기, 프레임은 그대로의 밝기. rel = 1 − 상관계수 (0 꼭 맞음, 1 무관·단색 화면)
export function dist(frame: Uint8Array, t: Uint8Array) {
  return compare(frame, t).d
}

const lum = (p: Uint8Array, i: number) => 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]

function compare(frame: Uint8Array, t: Uint8Array) {
  const n = t.length / 4
  let sf = 0, se = 0, sff = 0, see = 0, sfe = 0
  for (let i = 0; i < t.length; i += 4) {
    const f = lum(frame, i), e = (lum(t, i) * t[i + 3]) / 255
    sf += f; se += e; sff += f * f; see += e * e; sfe += f * e
  }
  const cov = sfe - (sf * se) / n, vf = sff - (sf * sf) / n, ve = see - (se * se) / n
  const corr = vf > 1e-6 && ve > 1e-6 ? cov / Math.sqrt(vf * ve) : 0
  return { d: (1 - corr) * 100, rel: 1 - corr }
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
