/// <reference types="vite/client" />
// 렌더러에서 돈다. 주 모니터 스트림을 열어 두고 필요할 때 프레임 한 장씩 떼어 온다.
// (desktopCapturer.getSources는 한 장에 0.5초 넘게 걸려 쓰지 않는다)

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
