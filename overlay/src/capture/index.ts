/// <reference types="vite/client" />
// 렌더러에서 돈다. 주 모니터 스트림을 열어 두고 필요할 때 프레임 한 장씩 떼어 온다.
// (desktopCapturer.getSources는 한 장에 0.5초 넘게 걸려 쓰지 않는다)
import { CARD_X, NAME, findCards, resolveCards, type Region } from './recognize'
import { loadTemplates } from '../engine/match'
import ICONS_JSON from '../../../data/icon-features.json'
import AUGMENTS_JSON from '../../../data/augments.json'

const SLOW_MS = 700 // 평소 (초당 1~2회)
const FAST_MS = 250 // 증강 화면일 때

// 프레임은 항상 1920×1080으로 줄여 넘긴다. 롤 UI는 16:9에서 해상도에 비례하므로
// 2560×1440 등도 1920 기준 좌표·템플릿 하나로 인식할 수 있다.
// ponytail: 16:9만 맞음. 16:10·울트라와이드는 비율 좌표가 필요 (기획서 3단계)
export const BASE_W = 1920
export const BASE_H = 1080

// active()가 true인 동안 캡처해 onFrame에 넘긴다. onFrame이 true를 돌려주면 다음 캡처를 빨리 한다.
// 비활성일 땐 스트림을 닫아 비용을 없앤다. 프레임(ImageBitmap)은 onFrame이 끝나면 닫힌다.
export function startCapture(active: () => boolean, onFrame: (f: ImageBitmap) => boolean | void) {
  let video: HTMLVideoElement | null = null

  const tick = async () => {
    let fast = false
    try {
      if (active()) {
        if (!video) {
          video = document.createElement('video')
          video.muted = true
          video.srcObject = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false })
          await video.play()
        }
        const t = performance.now()
        const f = await createImageBitmap(video, { resizeWidth: BASE_W, resizeHeight: BASE_H, resizeQuality: 'high' })
        if (import.meta.env.DEV) console.log(`[capture] ${video.videoWidth}x${video.videoHeight} → ${f.width}x${f.height} ${Math.round(performance.now() - t)}ms`)
        try {
          fast = onFrame(f) === true
        } finally {
          f.close()
        }
      } else if (video) {
        ;(video.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
        video = null
      }
    } catch (e) {
      console.error('[capture]', e)
      video = null
    }
    setTimeout(tick, fast ? FAST_MS : SLOW_MS)
  }
  tick()
}

const TEMPLATES = loadTemplates(ICONS_JSON)
const NAMES: Record<number, string> = Object.fromEntries(AUGMENTS_JSON.map((a) => [a.id, a.name]))

// 프레임 → 떠 있는 증강 3장 (1-5). 결과는 onCards로, 증강 화면이 아니면 null.
// 반환 함수는 startCapture의 onFrame: 증강 화면이면 true(다음 캡처를 빨리)
export function recognizer(onCards: (ids: (number | null)[] | null) => void) {
  const ctx = new OffscreenCanvas(1920, 1080).getContext('2d', { willReadFrequently: true })!
  const region: Region = (x, y, w, h) => ctx.getImageData(x, y, w, h)
  let misses = 0, busy = false

  const png = async (img: ImageData) => {
    const c = new OffscreenCanvas(img.width, img.height)
    c.getContext('2d')!.putImageData(img, 0, 0)
    return new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())
  }

  return (f: ImageBitmap) => {
    ctx.drawImage(f, 0, 0)
    const t = performance.now()
    const slots = findCards(region, TEMPLATES)
    if (import.meta.env.DEV) console.log(`[recognize] ${slots ? slots.map((s) => `${s.id}(${s.rel.toFixed(2)})`).join(' ') : '증강 화면 아님'} ${Math.round(performance.now() - t)}ms`)
    // 한 프레임 놓쳤다고 등급이 깜빡이지 않게 두 번 연속 못 찾을 때만 지운다
    if (!slots) { if (++misses === 2) onCards(null); return false }
    misses = 0
    if (busy) return true
    busy = true
    // 프레임은 onFrame이 끝나면 닫히므로 이름 영역은 지금 떼어 둔다 (같은 그림 후보가 있는 카드만 OCR)
    const names = slots.map((s, i) => (s.twins.length ? ctx.getImageData(CARD_X[i] + NAME.dx, NAME.y, NAME.w, NAME.h) : null))
    resolveCards(slots, async (i) => (window.api ? window.api.ocr(await png(names[i]!)) : ''), NAMES)
      .then(onCards)
      .catch((e) => console.error('[recognize]', e))
      .finally(() => (busy = false))
    return true
  }
}
