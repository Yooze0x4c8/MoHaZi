// 화면 언어: 설치할 때 고른 언어 (main이 ?lang=en으로 넘긴다). 미리보기는 주소에 ?lang=en을 붙이면 영어
// GAME_LANG: 롤 클라이언트 언어 (?game=). 카드 이름을 이 언어로 읽어 맞춘다. 없으면 화면 언어
export type Lang = 'ko' | 'en'
const q = new URLSearchParams(location.search)
export const LANG: Lang = q.get('lang') === 'en' ? 'en' : 'ko'
export const GAME_LANG: Lang = (q.get('game') ?? q.get('lang')) === 'en' ? 'en' : 'ko'
export const t = (ko: string, en: string) => (LANG === 'en' ? en : ko)
