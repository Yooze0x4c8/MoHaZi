/// <reference types="vite/client" />
// 렌더러에서 돈다. 주 모니터 스트림을 열어 두고 필요할 때 프레임 한 장씩 떼어 온다.
// (desktopCapturer.getSources는 한 장에 0.5초 넘게 걸려 쓰지 않는다)
import { CARD_X, NAME, findCards, rerollsLeft, resolveCards, type Region } from './recognize'
import { loadTemplates } from '../engine/match'
import ICONS_JSON from '../../../data/icon-features.json'
import AUGMENTS_JSON from '../../../data/augments.json'
import { GAME_LANG } from '../renderer/i18n'

const SLOW_MS = 700 // 평소 (초당 1~2회)
const FAST_MS = 250 // 증강 화면일 때

// 프레임은 높이 1080으로 (비율 유지) 줄여 넘기고, 인식기는 이를 1920 폭 가운데에 그린다.
// 롤 UI는 화면 높이에 비례해 커지고 가운데 정렬되므로(2880×1800 실측) 16:9·16:10 모두 1920×1080 좌표 하나로 맞는다.
// 16:10은 양옆에 빈칸, 21:9는 양옆이 잘린다 (가운데 카드 영역은 그대로)
export const BASE_W = 1920
export const BASE_H = 1080

// 게임 화면 영역: 어느 모니터(display)의 어디(모니터 대비 0~1 비율)인지. 창 모드·다른 모니터 대응 (main이 롤 창 위치로 알려 준다)
export type Area = { display: number; x: number; y: number; w: number; h: number }

// active()가 true인 동안 캡처해 onFrame에 넘긴다. onFrame이 true를 돌려주면 다음 캡처를 빨리 한다.
// 비활성일 땐 스트림을 닫아 비용을 없앤다. 프레임(ImageBitmap)은 onFrame이 끝나면 닫힌다.
// area(): 게임 화면 영역 (null이면 주 모니터 전체). 모니터가 바뀌면 스트림을 새로 연다 (main이 그 모니터를 넘긴다)
// video: 원본 해상도 화면 (수집 모드 저장용)
export function startCapture(active: () => boolean, area: () => Area | null, onFrame: (f: ImageBitmap, video: HTMLVideoElement) => boolean | void) {
  let video: HTMLVideoElement | null = null, display: number | undefined
  const stop = () => { (video?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop()); video = null }

  const tick = async () => {
    let fast = false
    try {
      const a = area()
      if (active()) {
        if (video && a?.display !== display) stop()
        if (!video) {
          display = a?.display
          video = document.createElement('video')
          video.muted = true
          video.srcObject = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false })
          await video.play()
        }
        const t = performance.now()
        // 게임 영역만 잘라 높이 1080으로 줄인다. 테두리 없는 창이면 모니터 전체 (자르지 않은 것과 같다)
        const vw = video.videoWidth, vh = video.videoHeight
        const sx = Math.round((a?.x ?? 0) * vw), sy = Math.round((a?.y ?? 0) * vh)
        const sw = Math.round((a?.w ?? 1) * vw), sh = Math.round((a?.h ?? 1) * vh)
        const f = await createImageBitmap(video, sx, sy, sw, sh, { resizeWidth: Math.round((sw * BASE_H) / sh), resizeHeight: BASE_H, resizeQuality: 'high' })
        if (import.meta.env.DEV) console.log(`[capture] ${video.videoWidth}x${video.videoHeight} → ${f.width}x${f.height} ${Math.round(performance.now() - t)}ms`)
        try {
          fast = onFrame(f, video) === true
        } finally {
          f.close()
        }
      } else if (video) stop()
    } catch (e) {
      console.error('[capture]', e)
      stop()
    }
    setTimeout(tick, fast ? FAST_MS : SLOW_MS)
  }
  tick()
}

const TEMPLATES = loadTemplates(ICONS_JSON)
// 카드 이름을 읽어 맞춰 볼 이름: 롤 클라이언트 언어
const NAMES: Record<number, string> = Object.fromEntries(AUGMENTS_JSON.map((a) => [a.id, GAME_LANG === 'en' ? a.nameEn : a.name]))

// 프레임 → 떠 있는 증강 3장 (1-5). 결과는 onCards로, 증강 화면이 아니면 null.
// 반환 함수는 startCapture의 onFrame: 증강 화면이면 true(다음 캡처를 빨리)
// onRerolls: 카드별 리롤 버튼을 쓸 수 있는지 (증강 화면일 때 매 프레임)
export function recognizer(onCards: (ids: (number | null)[] | null) => void, onRerolls?: (avail: boolean[]) => void) {
  const ctx = new OffscreenCanvas(1920, 1080).getContext('2d', { willReadFrequently: true })!
  const region: Region = (x, y, w, h) => ctx.getImageData(x, y, w, h)
  let misses = 0, busy = false
  // 카드 구성(아이콘 매칭 결과)이 그대로면 이름을 다시 읽지 않는다 (OCR은 한 번에 0.3초쯤)
  let lastKey = '', last: (number | null)[] | null = null

  const png = async (img: ImageData) => {
    const c = new OffscreenCanvas(img.width, img.height)
    c.getContext('2d')!.putImageData(img, 0, 0)
    return new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())
  }

  return (f: ImageBitmap) => {
    ctx.clearRect(0, 0, BASE_W, BASE_H)
    ctx.drawImage(f, (BASE_W - f.width) / 2, 0) // 가운데 정렬 (16:10이면 양옆 빈칸)
    const t = performance.now()
    const slots = findCards(region, TEMPLATES)
    if (import.meta.env.DEV) console.log(`[recognize] ${slots ? slots.map((s) => `${s.id}(${s.rel.toFixed(2)})`).join(' ') : '증강 화면 아님'} ${Math.round(performance.now() - t)}ms`)
    // 한 프레임 놓쳤다고 등급이 깜빡이지 않게 두 번 연속 못 찾을 때만 지운다
    if (!slots) { if (++misses === 2) { onCards(null); lastKey = '' } return false }
    misses = 0
    onRerolls?.(rerollsLeft(region))
    const key = slots.map((s) => s.id).join()
    if (key === lastKey) { onCards(last); return last != null }
    if (busy) return true
    busy = true
    // 프레임은 onFrame이 끝나면 닫히므로 이름 영역은 지금 떼어 둔다 (OCR은 resolveCards가 필요한 카드만 부른다)
    const names = slots.map((_, i) => ctx.getImageData(CARD_X[i] + NAME.dx, NAME.y, NAME.w, NAME.h))
    resolveCards(slots, async (i) => (window.api ? window.api.ocr(await png(names[i])) : ''), NAMES)
      .then((ids) => { lastKey = key; last = ids; onCards(ids) }) // ids가 null이면 능력치 모루 화면
      .catch((e) => console.error('[recognize]', e))
      .finally(() => (busy = false))
    return true
  }
}
