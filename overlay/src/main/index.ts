import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import https from 'node:https'
import { readText } from './ocr'

// alias: data/builds.json 키 (rawChampionName = 'game_character_displayname_<alias>')
export type Game = { champion: string; alias: string; gameMode: string } | null

// Live Client Data API는 자체 서명 인증서를 쓴다.
// ponytail: 인증서 검증을 끔 (localhost 전용). 공개 배포 땐 riotgames.pem을 ca로 고정.
const agent = new https.Agent({ rejectUnauthorized: false })

function getAllGameData(): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get('https://127.0.0.1:2999/liveclientdata/allgamedata', { agent, timeout: 1500 }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => (res.statusCode === 200 ? resolve(JSON.parse(body)) : reject(new Error(String(res.statusCode)))))
    })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })
}

// 게임 중이 아니거나 로딩 중이면 null
async function detectGame(): Promise<Game> {
  try {
    const d = await getAllGameData()
    const id = (p: any) => p.riotId ?? p.summonerName
    const me = d.allPlayers?.find((p: any) => id(p) === id(d.activePlayer ?? {}))
    return me
      ? { champion: me.championName, alias: String(me.rawChampionName ?? '').split('_').pop()!, gameMode: d.gameData?.gameMode }
      : null
  } catch {
    return null
  }
}

// 전역 단축키 등록. 다른 프로그램이 먼저 잡은 키면 실패하므로 터미널에 알린다
function key(accel: string, fn: () => void) {
  const ok = globalShortcut.register(accel, fn)
  console.log(ok ? `[key] ${accel}` : `[key] ${accel} 등록 실패: 다른 프로그램이 쓰는 중`)
  return ok
}

// M0: 게임 위에 투명·클릭 통과·항상 위 창
function createOverlay() {
  const { bounds } = screen.getPrimaryDisplay()
  const win = new BrowserWindow({
    ...bounds,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: { preload: join(__dirname, '../preload/index.js') }
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setIgnoreMouseEvents(true, { forward: true })
  // 화면 캡처에 오버레이 자신이 찍히지 않게 (Win10 2004+). 녹화·방송에도 안 보인다.
  win.setContentProtection(true)

  const COLLECT = !!process.env.COLLECT
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL + (COLLECT ? '#collect' : process.env.CAPTURE_ALWAYS ? '#capture' : ''))
  else win.loadFile(join(__dirname, '../renderer/index.html'))

  // 빌드 패널 위에서만 클릭을 받는다
  const clickThrough = (on: boolean) => win.setIgnoreMouseEvents(on, { forward: true })
  ipcMain.on('clickable', (_e, on: boolean) => clickThrough(!on))
  // 이름 영역 PNG → 글자 (같은 그림 증강 가르기)
  ipcMain.handle('ocr', (_e, png: Uint8Array) => readText(png))
  // 증강 검색 팝업이 열린 동안만 키 입력을 받는다. 닫으면 포커스를 놓아 게임으로 돌려준다
  ipcMain.on('focus', (_e, on: boolean) => {
    if (on) { win.setFocusable(true); win.focus() }
    else { win.blur(); win.setFocusable(false) }
  })

  // F8 오버레이 숨기기/보이기, F7 빌드 바꾸기
  const toggle = () => {
    if (!win.isVisible()) return win.showInactive()
    win.hide()
    clickThrough(true) // 패널 위에서 숨겨도 다시 보일 때 게임 클릭을 막지 않게
  }
  key('F8', toggle)
  key('F7', () => win.webContents.send('f7'))

  // 작업 표시줄에도 없고 포커스도 안 받는 창이라, 끄는 길은 트레이뿐이다
  // ponytail: 아이콘은 파란 사각형 하나. 앱 아이콘을 만들면 그 파일로 바꾼다
  const px = Buffer.alloc(16 * 16 * 4)
  for (let i = 0; i < px.length; i += 4) px.set([0xff, 0x95, 0x6e, 0xff], i) // BGRA #6E95FF
  tray = new Tray(nativeImage.createFromBitmap(px, { width: 16, height: 16 }))
  tray.setToolTip('MoHaZi 증강 오버레이')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '숨기기 / 보이기 (F8)', click: toggle },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() }
  ]))

  // 수집 모드 (0-4): COLLECT=1 npm run dev
  // - 게임 중 3초마다 원본 해상도 JPG 자동 저장 (게임 중엔 단축키가 안 먹혀서)
  // - Ctrl+Shift+S(COLLECT_KEY로 변경): 지금 화면 PNG + allgamedata (게임 밖 확인용)
  // - 30초마다 allgamedata 자동 저장
  // 저장 위치: 저장소의 samples/ (git 제외)
  if (COLLECT) {
    const dir = join(app.getAppPath(), '..', 'samples')
    // 파일 이름: 현지 시각 YYYYMMDDHHmmss (플레이한 시각과 맞춰 보기 쉽게)
    const stamp = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 19).replace(/[-:T]/g, '')
    const saveGameData = async (name: string) => {
      const d = await getAllGameData().catch(() => null)
      if (!d) return
      await mkdir(join(dir, 'allgamedata'), { recursive: true })
      await writeFile(join(dir, 'allgamedata', `${name}.json`), JSON.stringify(d, null, 2))
    }
    let shots = 0
    const snapKey = process.env.COLLECT_KEY || 'Ctrl+Shift+S'
    key(snapKey, () => { console.log(`[collect] ${snapKey} 눌림`); win.webContents.send('snap') })
    ipcMain.handle('save-frame', async (_e, img: Uint8Array, auto: boolean) => {
      const name = auto ? `auto-${stamp()}` : stamp()
      await mkdir(join(dir, 'screens'), { recursive: true })
      await writeFile(join(dir, 'screens', `${name}.${auto ? 'jpg' : 'png'}`), img)
      ++shots
      if (!auto) { await saveGameData(name); console.log(`[collect] ${name}.png`) }
      else if (shots % 20 === 0) console.log(`[collect] 자동 저장 ${shots}장`)
      return shots
    })
    setInterval(() => saveGameData(`auto-${stamp()}`), 30_000)
    console.log(`[collect] 게임 중 3초마다 자동 저장, ${snapKey}로 직접 저장, 30초마다 allgamedata → ${dir}`)
  }

  // 2초마다 게임 상태 확인, 바뀌었을 때만 렌더러에 알림
  win.webContents.on('did-finish-load', () => {
    let last = ''
    setInterval(async () => {
      const game = await detectGame()
      const key = JSON.stringify(game)
      if (key !== last) {
        last = key
        win.webContents.send('game', game)
      }
    }, 2000)
  })

  // 렌더러의 getDisplayMedia 요청에 선택 창 없이 주 모니터를 넘긴다 (캡처는 src/capture)
  win.webContents.session.setDisplayMediaRequestHandler(async (_req, cb) => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    const id = String(screen.getPrimaryDisplay().id)
    cb({ video: sources.find((s) => s.display_id === id) ?? sources[0] })
  })
}

let tray: Tray // 가비지 컬렉션으로 트레이가 사라지지 않게 잡아 둔다

// 두 번 실행하면 오버레이가 겹치고 단축키 등록도 실패하므로 하나만 띄운다
if (!app.requestSingleInstanceLock()) app.quit()
else app.whenReady().then(createOverlay)
app.on('will-quit', () => globalShortcut.unregisterAll())
