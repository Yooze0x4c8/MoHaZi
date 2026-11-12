import { contextBridge, ipcRenderer } from 'electron'
import type { Game } from '../main'

// 렌더러에 노출할 IPC 통로. 필요한 채널만 여기 추가한다.
contextBridge.exposeInMainWorld('api', {
  onGame: (cb: (game: Game) => void) => ipcRenderer.on('game', (_e, game: Game) => cb(game)),
  onF7: (cb: () => void) => ipcRenderer.on('f7', () => cb()),
  setClickable: (on: boolean) => ipcRenderer.send('clickable', on)
})
