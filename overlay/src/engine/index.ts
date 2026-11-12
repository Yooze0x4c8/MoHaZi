// 추천 엔진: 순수 함수. 빌드 + 증강 태그 + 고른 증강 → 카드별 등급·이유, 추천 카드
export type Grade = 'S' | 'A' | 'B' | 'C'

export type Build = {
  id: string
  name: string
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
  const bad = parts.filter((p) => p.v < 0).map((p) => name(p.t))

  let reason = good.join(' · ') || bad.join(' · ') || (mine[0] ? name(mine[0]) : '특징 없음')
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

// 카드 3장 평가 + 최고 점수 카드 번호 (동점이면 왼쪽)
export function rateCards(ids: number[], build: Build, tags: Tags, labels: Labels, picked: number[] = []) {
  const cards = ids.map((id) => rate(id, build, tags, labels, picked))
  const pick = cards.reduce((best, c, i) => (c.score > cards[best].score ? i : best), 0)
  return { cards, pick }
}
