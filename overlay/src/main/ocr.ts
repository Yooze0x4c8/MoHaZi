// 증강 이름 OCR (한 줄). 같은 그림을 쓰는 증강을 이름으로 가를 때만 쓴다.
// 언어 데이터는 앱에 들어 있는 @tesseract.js-data/kor·eng (best_int)를 읽는다 → 인터넷 연결 없음
import { createWorker, PSM, type Worker } from 'tesseract.js'
import { dirname, join } from 'node:path'

let worker: Promise<Worker> | null = null

// lang: 롤 클라이언트 언어. 앱을 켠 동안 바뀌지 않아 처음 값으로 만든 워커를 계속 쓴다
function getWorker(lang: 'ko' | 'en') {
  worker ??= (async () => {
    const code = lang === 'en' ? 'eng' : 'kor'
    const langPath = join(dirname(require.resolve(`@tesseract.js-data/${code}/package.json`)), '4.0.0_best_int')
    const w = await createWorker(code, 1, { langPath, gzip: true, cacheMethod: 'none' })
    await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE })
    return w
  })()
  return worker
}

// png: 이름 영역만 잘라 낸 이미지
export async function readText(png: Uint8Array, lang: 'ko' | 'en') {
  const { data } = await (await getWorker(lang)).recognize(Buffer.from(png))
  return data.text.trim()
}
