// 추천 엔진: 순수 함수. 빌드 + 증강 태그 + 고른 증강 → 카드별 등급·이유, 추천 카드
export type Grade = 'S' | 'A' | 'B' | 'C'

export type Build = {
  id: string
  name: string
  desc?: string    // 빌드 패널의 한 줄 설명
  style: 'fun' | 'meta'
  default?: boolean
  wantTags: Record<string, number>
  mustHave: number[]
  avoidTags: string[]
}

export type Tags = Record<number, string[]>   // 증강 ID → 태그 (data/tags.json)
export type Labels = Record<string, string>   // 태그 → 한글 표시명

export type Rated = { id: number; score: number; grade: Grade; reason: string; detail: string }

// 기획서 출발값. stat은 M4 전까지 없으므로 그 몫을 fit·syn 비율대로 나눠 준다
const WEIGHTS = { fun: { fit: 0.8, syn: 0.1 }, meta: { fit: 0.5, syn: 0.1 } }
const MUST_BONUS = 1
const AVOID_PENALTY = 1
const SYN_PER_TAG = 0.5
// ponytail: 등급 구간 임시값, 플레이하며 조정
const CUTS: [Grade, number][] = [['S', 0.8], ['A', 0.4], ['B', 0]]

export function rate(id: number, build: Build, tags: Tags, labels: Labels, picked: number[] = []): Rated {
  const w = WEIGHTS[build.style]
  const wf = w.fit / (w.fit + w.syn)
  const ws = w.syn / (w.fit + w.syn)
  const mine = tags[id] ?? []
  const pickedTags = new Set(picked.flatMap((p) => tags[p] ?? []))

  // 태그별 기여도 (이유 문장에 씀)
  const parts = mine.map((t) => ({
    t,
    v: wf * ((build.wantTags[t] ?? 0) - (build.avoidTags.includes(t) ? AVOID_PENALTY : 0))
  }))
  const must = build.mustHave.includes(id) ? wf * MUST_BONUS : 0
  const syn = ws * Math.min(1, mine.filter((t) => pickedTags.has(t)).length * SYN_PER_TAG)
  const score = parts.reduce((s, p) => s + p.v, 0) + must + syn
  const grade = CUTS.find(([, c]) => score >= c)?.[0] ?? 'C'

  const name = (t: string) => labels[t] ?? t
  const good = parts.filter((p) => p.v > 0).sort((a, b) => b.v - a.v).slice(0, 2).map((p) => name(p.t))
  const bad = parts.filter((p) => p.v < 0).sort((a, b) => a.v - b.v).slice(0, 2).map((p) => name(p.t))

  // C면 등급을 끌어내린 태그를, 아니면 도움 된 태그를 이유로 보여준다
  const shown = grade === 'C' && bad.length ? bad : good.length ? good : bad
  let reason = shown.join(' · ') || (mine[0] ? name(mine[0]) : '특징 없음')
  let detail =
    grade === 'C' ? '빌드와 반대'
    : !good.length ? '빌드와 무관'
    : grade === 'S' ? `${build.name} 핵심`
    : grade === 'A' ? '빌드에 도움'
    : '효과 작음'
  if (must) [reason, detail] = ['필수 증강', `${build.name} 핵심`]
  else if (syn > Math.max(0, ...parts.map((p) => p.v)) && grade !== 'C') detail = '고른 증강과 시너지'

  return { id, score, grade, reason, detail }
}

// 카드 3장 평가 + 최고 점수 카드 번호 (동점이면 왼쪽). null은 못 알아본 카드 → 등급 없음, 추천 후보에서 빠짐
export function rateCards(ids: (number | null)[], build: Build, tags: Tags, labels: Labels, picked: number[] = []) {
  const cards = ids.map((id) => (id == null ? null : rate(id, build, tags, labels, picked)))
  let pick: number | undefined
  cards.forEach((c, i) => { if (c && (pick == null || c.score > cards[pick]!.score)) pick = i })
  return { cards, pick }
}

// 리롤 권장: 세 장 모두 B 이하이고 리롤이 남았을 때. rerolls null = 남은 횟수를 모름(있다고 본다).
// 못 알아본 카드가 있으면 판단하지 않는다
export function shouldReroll(cards: (Rated | null)[], rerolls: number | null) {
  return rerolls !== 0 && cards.length > 0 && cards.every((c) => c != null && (c.grade === 'B' || c.grade === 'C'))
}

// 빌드 적합도 0~100: 고른 증강의 평균 점수(시너지 제외)를 0~1로 자른 값
export function fitOf(picked: number[], build: Build, tags: Tags, labels: Labels) {
  if (!picked.length) return 0
  const avg = picked.reduce((s, id) => s + rate(id, build, tags, labels).score, 0) / picked.length
  return Math.round(Math.min(1, Math.max(0, avg)) * 100)
}

// ponytail: 임계값·최소 증강 수 임시값, 플레이하며 조정
const SWITCH_GAP = 20
const SWITCH_MIN_PICKED = 2

export type Switch = { to: Build; fromFit: number; toFit: number; why: string }

// 고른 증강이 다른 빌드에 SWITCH_GAP 이상 더 맞으면 그 빌드를 제안 (가장 높은 것 하나)
export function suggestSwitch(picked: number[], current: Build, builds: Build[], tags: Tags, labels: Labels): Switch | null {
  if (picked.length < SWITCH_MIN_PICKED) return null
  const fromFit = fitOf(picked, current, tags, labels)
  const best = builds
    .filter((b) => b.id !== current.id)
    .map((b) => ({ b, fit: fitOf(picked, b, tags, labels) }))
    .sort((x, y) => y.fit - x.fit)[0]
  if (!best || best.fit - fromFit < SWITCH_GAP) return null

  // 이유: 제안 빌드에 맞는 증강 수 + 가장 많이 기여한 태그 2개
  const fits = picked.filter((id) => rate(id, best.b, tags, labels).score > 0)
  const sum: Record<string, number> = {}
  for (const id of fits) for (const t of tags[id] ?? []) sum[t] = (sum[t] ?? 0) + (best.b.wantTags[t] ?? 0)
  const top = Object.entries(sum).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => labels[t] ?? t)
  const n = picked.length
  const who = fits.length === n ? `고른 증강 ${n}개가 모두` : `고른 증강 ${n}개 중 ${fits.length}개가`
  return { to: best.b, fromFit, toFit: best.fit, why: `${who} ${top.join(' · ')} 쪽이에요.` }
}
