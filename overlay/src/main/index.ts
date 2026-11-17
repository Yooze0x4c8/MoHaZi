import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, Menu, nativeImage, screen, systemPreferences, Tray } from 'electron'
import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import https from 'node:https'
import { readText } from './ocr'
import { autoUpdater } from 'electron-updater'
import { uIOhook } from 'uiohook-napi'
import koffi from 'koffi'

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

// 롤 게임 창의 화면 영역 (DIP, 제목 표시줄 제외). 창 모드·다른 모니터 대응. 못 찾거나 최소화면 null
// Win32로 창을 찾는다 (윈도우만. 맥은 주 모니터 전체로 본다)
const win32 = process.platform === 'win32' ? (() => {
  const u = koffi.load('user32.dll')
  const RECT = koffi.struct('RECT', { left: 'long', top: 'long', right: 'long', bottom: 'long' })
  const POINT = koffi.struct('POINT', { x: 'long', y: 'long' })
  return {
    find: u.func('void* __stdcall FindWindowW(str16 cls, str16 title)'),
    clientRect: u.func('bool __stdcall GetClientRect(void* h, _Out_ RECT* r)'),
    toScreen: u.func('bool __stdcall ClientToScreen(void* h, _Inout_ POINT* p)'),
    minimized: u.func('bool __stdcall IsIconic(void* h)')
  }
})() : null

function gameRect(): Electron.Rectangle | null {
  try {
    const h = win32?.find(null, 'League of Legends (TM) Client')
    if (!h || win32!.minimized(h)) return null
    const r = { left: 0, top: 0, right: 0, bottom: 0 }, p = { x: 0, y: 0 }
    if (!win32!.clientRect(h, r) || !win32!.toScreen(h, p) || r.right < 100 || r.bottom < 100) return null
    // Win32 좌표는 물리 픽셀 → Electron 좌표(DIP)
    return screen.screenToDipRect(null, { x: p.x, y: p.y, width: r.right, height: r.bottom })
  } catch (e) {
    console.error('[gamewin]', e)
    return null
  }
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

// 롤 클라이언트 언어 (Riot Client 설정의 settings.locale). 카드 이름을 이 언어로 읽는다. 한국어가 아니면 영어.
// 파일이 없으면(롤 미설치·다른 경로) 운영체제 언어. 앱을 켤 때 한 번 읽는다 → 롤 언어를 바꾸면 앱을 다시 켜야 한다
function clientLang(): 'ko' | 'en' {
  const file = join(process.platform === 'darwin' ? '/Users/Shared' : process.env.PROGRAMDATA ?? 'C:/ProgramData',
    'Riot Games/Metadata/league_of_legends.live/league_of_legends.live.product_settings.yaml')
  let locale = app.getLocale()
  try { locale = /^\s+locale:\s*"?([\w-]+)/m.exec(readFileSync(file, 'utf8'))?.[1] ?? locale } catch {}
  return locale.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}
// 앱 화면 언어: 설치할 때 고른 언어 (설치 프로그램이 %APPDATA%\MoHaZi\lang.txt에 ko/en을 쓴다). 없으면(개발·맥) 롤 언어
function appLang(game: 'ko' | 'en'): 'ko' | 'en' {
  try {
    const v = readFileSync(join(app.getPath('appData'), 'MoHaZi', 'lang.txt'), 'utf8').trim()
    if (v === 'ko' || v === 'en') return v
  } catch {}
  return game
}
let LANG: 'ko' | 'en' = 'ko' // 화면 문구
let GAME_LANG: 'ko' | 'en' = 'ko' // 카드 이름 읽기 (OCR)
const t = (ko: string, en: string) => (LANG === 'en' ? en : ko)

// 전역 단축키 등록. 다른 프로그램이 먼저 잡은 키면 실패하므로 터미널에 알린다
function key(accel: string, fn: () => void) {
  const ok = globalShortcut.register(accel, fn)
  console.log(ok ? `[key] ${accel}` : `[key] ${accel} 등록 실패: 다른 프로그램이 쓰는 중`)
  return ok
}

// 패키지에선 extraResources(resources/), 개발 모드에선 overlay/resources/
const resDir = (...p: string[]) => app.isPackaged ? join(process.resourcesPath, ...p) : join(app.getAppPath(), 'resources', ...p)

// 시작 모션: 오른쪽 아래 작은 창에서 한 번 재생하고 닫는다. 클릭·포커스를 가져가지 않는다
function showIntro() {
  const W = 380, H = 140, M = 16
  const { workArea } = screen.getPrimaryDisplay()
  const intro = new BrowserWindow({
    width: W, height: H,
    x: Math.round(workArea.x + workArea.width - W - M),
    y: Math.round(workArea.y + workArea.height - H - M),
    frame: false, transparent: true, resizable: false, movable: false,
    focusable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false,
    show: false, backgroundColor: '#00000000',
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  intro.setIgnoreMouseEvents(true)
  intro.once('ready-to-show', () => intro.showInactive())
  intro.loadFile(resDir('intro', 'intro.html'), { hash: LANG === 'en' ? 'en' : '' })
  setTimeout(() => { if (!intro.isDestroyed()) intro.close() }, 3400)
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
  // 맥: 전체 화면 게임(별도 Space) 위에도 뜨게
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setIgnoreMouseEvents(true, { forward: true })
  // 화면 캡처에 오버레이 자신이 찍히지 않게 (Win10 2004+). 녹화·방송에도 안 보인다.
  win.setContentProtection(true)

  const COLLECT = !!process.env.COLLECT
  // 화면 언어는 ?lang=로 넘긴다 (renderer/i18n.ts)
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(`${process.env.ELECTRON_RENDERER_URL}?lang=${LANG}&game=${GAME_LANG}` + (COLLECT ? '#collect' : process.env.CAPTURE_ALWAYS ? '#capture' : ''))
  else win.loadFile(join(__dirname, '../renderer/index.html'), { query: { lang: LANG, game: GAME_LANG } })

  // 빌드 패널 위에서만 클릭을 받는다
  const clickThrough = (on: boolean) => win.setIgnoreMouseEvents(on, { forward: true })
  let throughNow = true
  ipcMain.on('clickable', (_e, on: boolean) => { throughNow = !on; clickThrough(!on) })

  // 고른 증강 (3-3): 게임에 들어간 왼쪽 클릭 위치를 렌더러로 넘긴다 (창 기준 DIP).
  // 오버레이 패널을 누른 클릭은 게임에 안 갔으니 뺀다. 훅이 안 되면(맥 손쉬운 사용 권한 등) 마우스 위치 추정만 쓴다
  try {
    uIOhook.on('mousedown', (e) => {
      if (e.button !== 1 || !throughNow || !win.isVisible()) return
      const p = process.platform === 'win32' ? screen.screenToDipPoint({ x: e.x, y: e.y }) : { x: e.x, y: e.y }
      const b = win.getBounds()
      win.webContents.send('game-click', { x: p.x - b.x, y: p.y - b.y })
    })
    uIOhook.start()
    app.on('will-quit', () => uIOhook.stop())
  } catch (e) { console.error('[hook]', e) }
  // 이름 영역 PNG → 글자 (같은 그림 증강 가르기)
  ipcMain.handle('ocr', (_e, png: Uint8Array) => readText(png, GAME_LANG))
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
  // 트레이 아이콘: 윈도우는 컬러 타일, 맥은 템플릿(검정+알파, 다크 모드에서 자동 반전). @1.5x/@2x는 알아서 쓴다
  const isMac = process.platform === 'darwin'
  const trayIcon = nativeImage.createFromPath(resDir('tray', isMac ? 'trayTemplate.png' : 'tray.png'))
  if (isMac) trayIcon.setTemplateImage(true)
  tray = new Tray(trayIcon)
  const tip = t('MoHaZi 증강 오버레이', 'MoHaZi augment overlay')
  tray.setToolTip(tip)
  const menu = (updateReady: boolean) => Menu.buildFromTemplate([
    { label: t('숨기기 / 보이기 (F8)', 'Hide / Show (F8)'), click: toggle },
    ...(updateReady ? [{ label: t('지금 재시작해서 업데이트', 'Restart now to update'), click: () => autoUpdater.quitAndInstall() }] : []),
    { type: 'separator' },
    { label: t('종료', 'Quit'), click: () => app.quit() }
  ])
  tray.setContextMenu(menu(false))
  // 창 없이 트레이에만 뜨는 앱이라, 켜졌다는 걸 한 번 알려 준다. 이미 게임 중이면 게임 화면을 가리지 않게 건너뛴다
  detectGame().then((g) => { if (!g) showIntro() })

  // 자동 업데이트: GitHub Releases(package.json build.publish)에서 새 버전을 받아 두고 앱을 끌 때 설치한다.
  // 설치된 앱에서만 (개발 모드엔 app-update.yml이 없다). 서명이 없어도 된다 (publisherName을 안 두면 서명 검사 안 함)
  // ponytail: Windows만. 맥 자동 업데이트는 Apple 서명이 있어야 돼서, 맥은 새 dmg를 받아 덮어쓴다
  if (app.isPackaged && process.platform === 'win32') {
    autoUpdater.on('update-downloaded', ({ version }) => {
      tray.setContextMenu(menu(true))
      tray.displayBalloon({ title: t('MoHaZi 업데이트', 'MoHaZi update'), content: t(`${version} 버전을 받았어요. 다음에 켤 때 적용돼요.`, `Version ${version} downloaded. It applies next time you start the app.`) })
    })
    autoUpdater.on('error', (e) => console.error('[update]', e)) // 인터넷이 없거나 GitHub이 안 될 때. 앱은 그대로 쓴다
    const check = () => autoUpdater.checkForUpdates().catch(() => {})
    check()
    setInterval(check, 6 * 60 * 60 * 1000)
  }

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

  // 오버레이·캡처를 게임 창에 맞춘다 (테두리 없는 창이면 모니터 전체 = 예전과 같음). 게임 밖이면 주 모니터 전체
  let captureDisplay = screen.getPrimaryDisplay().id
  let lastRect = ''
  const fitToGame = (inGame: boolean) => {
    const rect = (inGame && gameRect()) || screen.getPrimaryDisplay().bounds
    const key = JSON.stringify(rect)
    if (key === lastRect) return
    lastRect = key
    const d = screen.getDisplayMatching(rect), b = d.bounds
    captureDisplay = d.id
    win.setBounds(rect)
    win.webContents.send('game-area', { display: d.id, x: (rect.x - b.x) / b.width, y: (rect.y - b.y) / b.height, w: rect.width / b.width, h: rect.height / b.height })
  }

  // 2초마다 게임 상태 확인, 바뀌었을 때만 렌더러에 알림
  win.webContents.on('did-finish-load', () => {
    let last = ''
    lastRect = '' // 렌더러가 새로 떴으면 영역도 다시 보낸다
    setInterval(async () => {
      // 증바람 판에서만 켠다 (다른 모드면 패널·캡처·인식 모두 쉼). 쉬는 이유는 트레이 툴팁에 보인다
      const found = await detectGame()
      const game = found?.gameMode === MODE ? found : null
      fitToGame(!!game)
      const key = JSON.stringify(game)
      if (key !== last) {
        last = key
        win.webContents.send('game', game)
        tray.setToolTip(found && !game ? t(`MoHaZi: 증바람 판이 아니라 쉬는 중 (모드 ${found.gameMode})`, `MoHaZi: idle, not an ARAM: Mayhem game (mode ${found.gameMode})`) : tip)
      }
    }, 2000)
  })

  // 렌더러의 getDisplayMedia 요청에 선택 창 없이 게임이 있는 모니터를 넘긴다 (캡처는 src/capture)
  win.webContents.session.setDisplayMediaRequestHandler(async (_req, cb) => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] })
    const id = String(captureDisplay)
    cb({ video: sources.find((s) => s.display_id === id) ?? sources[0] })
  })
}

let tray: Tray // 가비지 컬렉션으로 트레이가 사라지지 않게 잡아 둔다

// 증바람(ARAM: Mayhem)의 gameMode. 일반 칼바람은 ARAM, 협곡은 CLASSIC (0-4 실측, 2026-11-13)
// 모드 이름이 바뀌면 오버레이가 안 뜬다 → 트레이 툴팁의 모드 값을 보고 여기를 고친다
const MODE = 'KIWI'

// 두 번 실행하면 오버레이가 겹치고 단축키 등록도 실패하므로 하나만 띄운다
if (!app.requestSingleInstanceLock()) app.quit()
else app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock?.hide() // 메뉴 막대 아이콘만 쓰는 앱
    // 화면 기록 권한 요청 창을 게임 밖(지금)에 띄운다. 게임 중에 처음 뜨면 전체 화면에 가려진다
    if (systemPreferences.getMediaAccessStatus('screen') !== 'granted') desktopCapturer.getSources({ types: ['screen'] }).catch(() => {})
  }
  GAME_LANG = clientLang()
  LANG = appLang(GAME_LANG)
  createOverlay()
})
app.on('will-quit', () => globalShortcut.unregisterAll())
