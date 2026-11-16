// 맥 빌드에만: Apple 인증서가 없어 ad-hoc 서명을 한다.
// 서명이 아예 없으면 Apple Silicon 맥에서 "손상된 앱" 오류로 열리지도 않는다. ad-hoc이면 "확인되지 않은 개발자" 경고만 뜬다.
const { execFileSync } = require('node:child_process')
const { join } = require('node:path')

exports.default = async (ctx) => {
  if (ctx.electronPlatformName !== 'darwin') return // Windows 빌드는 건드리지 않는다
  const app = join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' })
}
