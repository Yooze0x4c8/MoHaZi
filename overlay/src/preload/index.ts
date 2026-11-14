import { contextBridge, ipcRenderer } from 'electron'
import type { Game } from '../main'

// 렌더러에 노출할 IPC 통로. 필요한 채널만 여기 추가한다.
contextBridge.exposeInMainWorld('api', {
  onGame: (cb: (game: Game) => void) => ipcRenderer.on('game', (_e, game: Game) => cb(game)),
  onF7: (cb: () => void) => ipcRenderer.on('f7', () => cb()),
  setClickable: (on: boolean) => ipcRenderer.send('clickable', on),
  setFocus: (on: boolean) => ipcRenderer.send('focus', on),
  ocr: (png: Uint8Array): Promise<string> => ipcRenderer.invoke('ocr', png),
  // 수집 모드 (COLLECT=1)에서만 쓰인다
  onSnap: (cb: () => void) => ipcRenderer.on('snap', () => cb()),
  saveFrame: (png: Uint8Array): Promise<number> => ipcRenderer.invoke('save-frame', png)
})
