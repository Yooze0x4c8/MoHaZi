import { app, BrowserWindow, globalShortcut, screen } from 'electron'
import { join } from 'node:path'
import https from 'node:https'

export type Game = { champion: string; gameMode: string } | null

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
    return me ? { champion: me.championName, gameMode: d.gameData?.gameMode } : null
  } catch {
    return null
  }
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

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))

  // 오버레이 숨기기/보이기
  globalShortcut.register('F8', () => (win.isVisible() ? win.hide() : win.showInactive()))

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
}

app.whenReady().then(createOverlay)
app.on('will-quit', () => globalShortcut.unregisterAll())
