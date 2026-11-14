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
