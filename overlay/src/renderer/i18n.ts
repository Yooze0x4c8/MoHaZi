// 화면 언어: 롤 클라이언트 언어 (main이 ?lang=en으로 넘긴다). 미리보기는 주소에 ?lang=en을 붙이면 영어
export type Lang = 'ko' | 'en'
export const LANG: Lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ko'
export const t = (ko: string, en: string) => (LANG === 'en' ? en : ko)
