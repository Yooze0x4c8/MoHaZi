// 맥: Apple 인증서가 없어 ad-hoc 서명을 한다.
// 서명이 아예 없으면 Apple Silicon 맥에서 "손상된 앱" 오류로 열리지도 않는다. ad-hoc이면 "확인되지 않은 개발자" 경고만 뜬다.
// 윈도우: signAndEditExecutable을 끄면(winCodeSign 심볼릭 링크 권한 문제) exe 아이콘이 기본 Electron 그대로라,
// rcedit로 직접 넣는다. 바로가기 아이콘은 exe 아이콘을 따른다.
const { execFileSync } = require('node:child_process')
const { join } = require('node:path')

exports.default = async (ctx) => {
  const name = ctx.packager.appInfo.productFilename
  if (ctx.electronPlatformName === 'win32') {
    const { rcedit } = await import('rcedit')
    await rcedit(join(ctx.appOutDir, `${name}.exe`), { icon: join(__dirname, 'icon.ico') })
    return
  }
  if (ctx.electronPlatformName !== 'darwin') return
  const app = join(ctx.appOutDir, `${name}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' })
}
