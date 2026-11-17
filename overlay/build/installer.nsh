; 설치할 때 고른 언어를 앱 화면 언어로 남긴다 (main/index.ts appLang). 한국어(1042)가 아니면 영어.
; 자동 업데이트(조용히 설치)는 언어 창이 없어서 기본 언어로 덮어쓰게 되므로, 처음 설치·직접 설치할 때만 쓴다
!macro customInstall
  ${ifNot} ${isUpdated}
    ; 모든 사용자용으로 설치해도 앱은 사용자별 AppData를 읽는다 (electron-builder 제거 스크립트와 같은 방식)
    ${if} $installMode == "all"
      SetShellVarContext current
    ${endIf}
    CreateDirectory "$APPDATA\MoHaZi"
    FileOpen $0 "$APPDATA\MoHaZi\lang.txt" w
    ${if} $LANGUAGE == 1042
      FileWrite $0 "ko"
    ${else}
      FileWrite $0 "en"
    ${endIf}
    FileClose $0
    ${if} $installMode == "all"
      SetShellVarContext all
    ${endIf}
  ${endIf}
!macroend

; 기본 "설치 후 실행"은 시작 메뉴 바로가기(.lnk)를 셸로 여는데, 경로의 "Start Menu" 공백에서 잘려
; "Menu\...MoHaZi.lnk를 찾을 수 없습니다" 오류가 난다. exe를 직접 실행한다.
!macro customFinishPage
  Function StartAppDirect
    Exec '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  FunctionEnd
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartAppDirect"
  !insertmacro MUI_PAGE_FINISH
!macroend
