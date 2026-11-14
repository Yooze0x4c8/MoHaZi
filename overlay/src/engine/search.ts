// 증강 이름 초성 검색: 'ㅁㅂ' → 마법 부여. 띄어쓰기 무시, 초성과 완성 글자를 섞어 써도 된다
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const cho = (ch: string) => {
  const c = ch.charCodeAt(0) - 0xac00
  return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch
}
const chars = (s: string) => [...s.replace(/\s/g, '').toLowerCase()]

// 맞는 위치 (없으면 -1). 앞에서 맞을수록 위로 정렬하는 데 쓴다
export function matchAt(name: string, query: string) {
  const n = chars(name), q = chars(query)
  if (!q.length) return -1
  for (let i = 0; i + q.length <= n.length; i++)
    if (q.every((x, j) => x === n[i + j] || (CHO.includes(x) && cho(n[i + j]) === x))) return i
  return -1
}

export function search<T extends { name: string }>(items: T[], query: string, limit = 5): T[] {
  return items
    .map((it) => ({ it, at: matchAt(it.name, query) }))
    .filter((m) => m.at >= 0)
    .sort((a, b) => a.at - b.at || a.it.name.length - b.it.name.length)
    .slice(0, limit)
    .map((m) => m.it)
}

// OCR로 읽은 글자와 가장 가까운 후보 (같은 그림을 쓰는 증강 2~5개 중에서 고를 때).
// 띄어쓰기·기호를 빼고 편집 거리로 비교. score 0~1 (1이면 같은 글자)
const bare = (s: string) => s.replace(/[^0-9a-zA-Z가-힣]/g, '').toLowerCase()
function edits(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length]
}
export function closestName<T extends { name: string }>(text: string, items: T[]) {
  const t = bare(text)
  return items
    .map((it) => { const n = bare(it.name); return { it, score: 1 - edits(t, n) / Math.max(t.length, n.length, 1) } })
    .sort((a, b) => b.score - a.score)[0]
}
