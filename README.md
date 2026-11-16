<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo/lockup-on-dark.svg">
    <img src="docs/logo/lockup-on-light.svg" alt="MoHaZi" height="72">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/Yooze0x4c8/MoHaZi/releases/latest"><img src="https://img.shields.io/github/v/release/Yooze0x4c8/MoHaZi?style=flat-square&label=release&labelColor=0E0F12&color=6E95FF" alt="Latest release"></a>
  <a href="https://github.com/Yooze0x4c8/MoHaZi/releases"><img src="https://img.shields.io/github/downloads/Yooze0x4c8/MoHaZi/total?style=flat-square&label=downloads&labelColor=0E0F12&color=6E95FF" alt="Downloads"></a>
  <br>
  <sub><a href="#설치">한국어</a> · <a href="#english">English</a></sub>
</p>

증바람(롤 무작위 총력전: 아수라장) 증강 추천 오버레이.

증강 선택 화면의 카드마다 **등급과 한 줄 이유**를 띄워, 게임 시작 때 고른 빌드에 맞는 증강을 몇 초 안에 고르게 돕습니다.

> 개인용(본인·친구)으로 먼저 만들고 있습니다. 공개 배포는 라이엇 정책을 확인한 뒤 결정합니다.

앱 화면은 **롤 클라이언트 언어**를 따라 한국어 또는 영어로 나옵니다. 한국어가 아니면 영어입니다. 롤 언어를 바꿨으면 앱을 다시 켜 주세요.

## 설치
### 윈도우 사용자용

**[최신 설치 파일 받기](https://github.com/Yooze0x4c8/MoHaZi/releases/latest)** → 페이지의 **🪟 윈도우 사용자용**에서 `MoHaZi-Setup-<버전>.exe`를 받아 실행합니다.

1. "Windows의 PC 보호" 경고가 뜨면 **추가 정보 → 실행**을 누릅니다 (코드 서명이 없어서 뜨는 경고입니다).
2. 설치되면 바로 켜지고, 작업 표시줄 오른쪽 트레이에 카드 세 장 모양 아이콘이 생깁니다. 게임 밖에선 화면에 아무것도 안 보이는 게 정상입니다.
3. 롤은 **테두리 없는 창 모드**로 두고 **증바람**을 시작합니다. 화면은 16:9 또는 16:10이어야 합니다.
4. 끌 때는 트레이 아이콘 우클릭 → **종료**.

새 버전이 나오면 앱이 알아서 받고, 다음에 켤 때 적용됩니다 (트레이 메뉴의 "지금 재시작해서 업데이트"로 바로 적용).

### macOS (맥북) 사용자용

**[최신 설치 파일 받기](https://github.com/Yooze0x4c8/MoHaZi/releases/latest)** → 페이지의 **🍎 맥북 사용자용**에서 내 맥에 맞는 파일을 받습니다 (왼쪽 위 Apple 메뉴 → 이 Mac에 관하여 → '칩'으로 확인).

- M1·M2·M3·M4 등 Apple 칩: `MoHaZi-<버전>-arm64.dmg`
- 인텔 맥: `MoHaZi-<버전>-x64.dmg`

1. dmg를 열고 MoHaZi를 **응용 프로그램** 폴더로 끌어다 놓습니다.
2. 처음 열 때 "확인되지 않은 개발자" 경고가 뜨면 **시스템 설정 → 개인정보 보호 및 보안** 아래쪽의 **그래도 열기**를 누릅니다 (Apple 서명이 없어서 뜨는 경고입니다).
3. **화면 기록** 권한을 물으면 허용하고 앱을 다시 켭니다. (나중에 켜려면 시스템 설정 → 개인정보 보호 및 보안 → 화면 및 시스템 오디오 기록에서 MoHaZi를 켭니다.) 이 권한이 없으면 증강 카드를 읽지 못합니다.
4. 실행되면 화면 위쪽 메뉴 막대에 카드 세 장 모양 아이콘이 생깁니다. 끌 때는 이 아이콘 → **종료**.

맥은 자동 업데이트가 안 됩니다. 새 버전은 dmg를 다시 받아 덮어쓰세요.

### 쓰는 법

- 게임이 시작되면 왼쪽 위에 **빌드 패널**이 뜹니다. 클릭해서 빌드를 고르고 `접기`로 접습니다. 접힌 칩을 누르면 다시 펼쳐집니다.
- 증강 선택 화면에서 카드 위에 **등급(S/A/B/C)과 이유**, 추천 카드에 파란 꺾쇠가 뜹니다. 빌드를 바꾸면 바로 다시 매깁니다.
- 고른 증강은 자동으로 기록됩니다 (`○○ 기록했어요`). 틀리게 기록됐으면 패널의 `고른 증강`에서 바꾸기·빼기·추가.
- 등급 자리에 `?`가 뜨면 눌러서 초성으로 검색해 고릅니다 (영어 화면에선 이름 일부로 검색).
- 게임 중엔 단축키(F7·F8)가 안 먹히는 PC가 있어 모든 조작은 마우스로 됩니다.

## 어떻게 동작하나

1. **게임 시작 감지**: 라이엇 Live Client Data API(`127.0.0.1:2999`)로 게임 시작과 내 챔피언을 알아냅니다. 화면 언어는 Riot Client 설정 파일(`league_of_legends.live.product_settings.yaml`의 `locale`)에서 읽습니다.
2. **빌드 선택**: 화면 구석에 챔피언별 빌드 목록이 뜹니다(예: AP 무한궁 갱플 / 브루저 갱플). 고르지 않으면 무난한 빌드가 기본값입니다.
3. **증강 인식**: 증강 선택 화면이 뜨면 카드 3장의 아이콘을 인식합니다.
4. **등급 표시**: 카드 상단에 `S — 궁 쿨감 · 무한궁 핵심` 같은 배지를 띄웁니다.
5. **리롤 권장 / 빌드 전환 제안**: 세 장 모두 B 이하면 리롤을 권하고, 고른 증강이 다른 빌드에 더 맞으면 작은 배너로 알려줍니다. 결정은 사용자가 합니다.

### 추천 점수

```
score = w_b·빌드 적합도 + w_s·승률(베이지안 보정) + w_p·기존 증강 시너지
```

| 빌드 성격 | 빌드 적합도 | 통계 | 시너지 |
| --- | --- | --- | --- |
| 승률 최우선 | 0.5 | 0.4 | 0.1 |
| 재미/밈 | 0.8 | 0.1 | 0.1 |

## 실행

Node.js 22 이상, Windows. 게임은 테두리 없는 창 모드, 16:9 또는 16:10 화면 (UI는 화면 높이 기준으로 맞춘다).

```bash
cd overlay
npm install
npm run dev        # 개발 실행
npm run typecheck  # 타입 검사
npm test           # 엔진·인식 테스트
npm run dist       # 설치 파일 만들기 (overlay/release/)
```

- 데이터 수집 모드: `$env:COLLECT=1; npm run dev` → 게임 중 3초마다 화면을 `samples/screens/`에 저장 (인식 보정용)
- 미리보기: `npm run dev` 후 브라우저에서 `/#preview-02a`, `-03`, `-04`, `-pick` 등. 영어 화면은 `/?lang=en#preview-02a`

### 새 버전 배포

1. `overlay/package.json`의 `version`을 올린다.
2. `overlay`에서 `$env:GH_TOKEN = (gh auth token); npm run release` → GitHub 릴리스로 공개되고, 설치된 앱들이 자동으로 받는다.

## 구조

```
overlay/            Electron + TypeScript + React 오버레이 앱
└─ src/
   ├─ main/         창 생성, 게임 감지, 이름 OCR, 자동 업데이트
   ├─ capture/      화면 캡처 + 증강 인식
   ├─ engine/       추천 엔진·아이콘 매칭·초성 검색 (순수 함수)
   ├─ preload/      IPC 통로
   └─ renderer/     오버레이 UI
data/               증강 목록·태그·빌드·아이콘 특징값 JSON
pipeline/           통계 배치 스크립트 (M4)
tools/              증강·아이콘 받기, 태그 추출, 빌드 생성
```

## 빌드 파일 작성법

`tools/make-builds.mjs`의 `BUILDS` 표를 고치고 `node tools/make-builds.mjs`를 돌리면 `data/builds.json`(전 챔피언)이 만들어집니다. 빌드 하나의 모양은 이렇습니다.

```json
{
  "Gangplank": { "name": "갱플랭크", "builds": [
    {
      "id": "gp-ap-ult",
      "name": "AP 무한궁 갱플",
      "style": "fun",
      "default": false,
      "wantTags": { "ult_haste": 1.0, "ap": 0.8, "ability_haste": 0.6 },
      "mustHave": [],
      "avoidTags": ["crit"]
    }
  ] }
}
```

- `style`: `fun`(재미/밈) 또는 `meta`(승률 최우선). 점수 가중치가 달라집니다. 첫 빌드가 기본입니다.
- `wantTags`: 빌드가 원하는 증강 태그와 가중치
- `mustHave`: 보너스를 줄 필수 증강 ID
- `avoidTags`: 피할 태그

## 주의

- 화면 캡처만 사용하며, 게임 메모리를 읽거나 게임에 입력을 보내지 않습니다. 오버레이 창은 녹화·방송 화면에 찍히지 않습니다.
- 라이엇은 2025년 오버레이 정책을 개정했고, TFT에서는 증강 승률 표시가 금지돼 있습니다. 공개 배포 전 Riot Developer Portal에서 허용 여부를 확인할 예정입니다.
- 이 프로젝트는 Riot Games와 관련이 없으며, Riot Games가 보증하지 않습니다.

## 라이선스

[Apache License 2.0](./LICENSE)

---

## English

Augment recommendation overlay for League of Legends **ARAM: Mayhem**.

On the augment selection screen it shows a **grade and a one-line reason** on each card, so you can pick the augment that fits the build you chose at game start within seconds.

> Built for personal use (me and friends) first. Public distribution will be decided after checking Riot's policies.

The app follows your **League client language**: Korean if the client is Korean, English otherwise. Restart the app after changing the client language.

### Install

#### Windows

**[Download the latest installer](https://github.com/Yooze0x4c8/MoHaZi/releases/latest)** → under **🪟 Windows**, download and run `MoHaZi-Setup-<version>.exe`.

1. If "Windows protected your PC" appears, click **More info → Run anyway** (the app is not code-signed).
2. It starts right after install and a three-card icon appears in the system tray. Nothing shows on screen outside a game; that is normal.
3. Set League to **borderless window mode** and start **ARAM: Mayhem**. The screen must be 16:9 or 16:10.
4. To quit, right-click the tray icon → **Quit**.

New versions download automatically and apply the next time you start the app (or use **Restart now to update** in the tray menu).

#### macOS

**[Download the latest installer](https://github.com/Yooze0x4c8/MoHaZi/releases/latest)** → under **🍎 macOS**, pick the file for your Mac (Apple menu → About This Mac → Chip).

- Apple silicon (M1, M2, M3, M4...): `MoHaZi-<version>-arm64.dmg`
- Intel Mac: `MoHaZi-<version>-x64.dmg`

1. Open the dmg and drag MoHaZi into **Applications**.
2. If an "unidentified developer" warning appears on first launch, click **Open Anyway** at the bottom of **System Settings → Privacy & Security** (the app is not Apple-signed).
3. Allow **Screen Recording** when asked, then restart the app. (To enable it later: System Settings → Privacy & Security → Screen & System Audio Recording → MoHaZi.) Without it the app cannot read the augment cards.
4. A three-card icon appears in the menu bar. To quit, click it → **Quit**.

There is no auto-update on macOS. Download the new dmg and replace the app.

#### Usage

- When a game starts, a **build panel** appears in the top-left. Click to choose a build, and **Collapse** to fold it. Click the folded chip to expand it again.
- On the augment selection screen, each card shows a **grade (S/A/B/C) and a reason**, and the recommended card gets a blue bracket. Changing the build re-grades instantly.
- Picked augments are recorded automatically (`Recorded ○○`). If one was recorded wrong, use **Change**, **Remove** or **Add** under **Picked augments** in the panel.
- If a `?` shows instead of a grade, click it and search by part of the name.
- Some PCs ignore hotkeys (F7, F8) during a game, so everything also works with the mouse.

### How it works

1. **Game detection**: Riot's Live Client Data API (`127.0.0.1:2999`) tells when a game starts and which champion you play. The UI language comes from the Riot Client settings file (`locale` in `league_of_legends.live.product_settings.yaml`).
2. **Build choice**: a per-champion build list appears in a corner (e.g. AP infinite-ult Gangplank / bruiser Gangplank). If you don't pick one, a safe default is used.
3. **Augment recognition**: on the augment selection screen, the icons of the three cards are recognized.
4. **Grades**: a badge like `S — ult haste · core for infinite ult` is shown on top of each card.
5. **Reroll / build switch hints**: if all three cards are B or lower it suggests a reroll, and if your picked augments fit another build better a small banner says so. You make the call.

#### Recommendation score

```
score = w_b·build fit + w_s·win rate (Bayesian adjusted) + w_p·synergy with current augments
```

| Build type | Build fit | Stats | Synergy |
| --- | --- | --- | --- |
| Win rate first | 0.5 | 0.4 | 0.1 |
| Fun / meme | 0.8 | 0.1 | 0.1 |

### Development

Node.js 22+, Windows. The game must be in borderless window mode on a 16:9 or 16:10 screen (UI scales with screen height).

```bash
cd overlay
npm install
npm run dev        # run in dev mode
npm run typecheck  # type check
npm test           # engine and recognition tests
npm run dist       # build installer (overlay/release/)
```

- Data collection mode: `$env:COLLECT=1; npm run dev` → saves the screen to `samples/screens/` every 3 seconds during a game (for recognition tuning)
- Previews: after `npm run dev`, open `/#preview-02a`, `-03`, `-04`, `-pick`, etc. in a browser. For English, use `/?lang=en#preview-02a`

#### Releasing a new version

1. Bump `version` in `overlay/package.json`.
2. In `overlay`, run `$env:GH_TOKEN = (gh auth token); npm run release` → published as a GitHub release, and installed apps pick it up automatically.

### Structure

```
overlay/            Electron + TypeScript + React overlay app
└─ src/
   ├─ main/         windows, game detection, name OCR, auto-update
   ├─ capture/      screen capture + augment recognition
   ├─ engine/       recommendation engine, icon matching, initial-consonant search (pure functions)
   ├─ preload/      IPC bridge
   └─ renderer/     overlay UI
data/               augment list, tags, builds, icon feature JSON
pipeline/           stats batch scripts (M4)
tools/              augment/icon download, tag extraction, build generation
```

### Writing builds

Edit the `BUILDS` table in `tools/make-builds.mjs` and run `node tools/make-builds.mjs` to generate `data/builds.json` (all champions). A build looks like the example in the Korean section above; `nameEn`/`descEn` are filled from the `NAME_EN`, `DESC_EN` and `CUSTOM_EN` tables.

- `style`: `fun` (fun/meme) or `meta` (win rate first). Changes the score weights. The first build is the default.
- `wantTags`: augment tags the build wants, with weights
- `mustHave`: required augment IDs that get a bonus
- `avoidTags`: tags to avoid

### Notes

- Uses screen capture only. It never reads game memory or sends input to the game. The overlay window does not show up in recordings or streams.
- Riot revised its overlay policy in 2025, and showing augment win rates is banned in TFT. Whether this is allowed will be checked on the Riot Developer Portal before any public release.
- This project is not affiliated with or endorsed by Riot Games.

### License

[Apache License 2.0](./LICENSE)
