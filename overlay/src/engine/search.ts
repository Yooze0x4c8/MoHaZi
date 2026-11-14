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
