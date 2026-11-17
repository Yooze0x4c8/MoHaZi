import { contextBridge, ipcRenderer } from 'electron'
import type { Game } from '../main'

// 렌더러에 노출할 IPC 통로. 필요한 채널만 여기 추가한다.
contextBridge.exposeInMainWorld('api', {
  onGame: (cb: (game: Game) => void) => ipcRenderer.on('game', (_e, game: Game) => cb(game)),
  onGameArea: (cb: (a: { display: number; x: number; y: number; w: number; h: number }) => void) => ipcRenderer.on('game-area', (_e, a) => cb(a)),
  onF7: (cb: () => void) => ipcRenderer.on('f7', () => cb()),
  // 해제 함수를 돌려준다 (챔피언이 바뀌면 오버레이를 새로 만들어서)
  onGameClick: (cb: (p: { x: number; y: number }) => void) => {
    const on = (_e: unknown, p: { x: number; y: number }) => cb(p)
    ipcRenderer.on('game-click', on)
    return () => { ipcRenderer.off('game-click', on) }
  },
  setClickable: (on: boolean) => ipcRenderer.send('clickable', on),
  setFocus: (on: boolean) => ipcRenderer.send('focus', on),
  ocr: (png: Uint8Array): Promise<string> => ipcRenderer.invoke('ocr', png),
  // 수집 모드 (COLLECT=1)에서만 쓰인다
  onSnap: (cb: () => void) => ipcRenderer.on('snap', () => cb()),
  saveFrame: (img: Uint8Array, auto: boolean): Promise<number> => ipcRenderer.invoke('save-frame', img, auto)
})
