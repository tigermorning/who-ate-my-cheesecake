# HANDOFF

> 최종 갱신: 2026-08-20 (Claude Code). 직전 작업은 **OpenCode** 세션이었고 08-19 13:39 에 끊겼다.
>
> **⚠ 브라우저 자동화 방식 전환 (2026-08-20):** SPUM 조작은 이제 **Claude Chrome 확장(`claude-in-chrome`)**
> 으로 한다. Playwright 스크립트(`spum/studio-*.mjs` · `inject-characters.mjs` · `check-characters.mjs`)는
> **레거시**다 — 기록용으로만 남긴다. 확장은 로그인된 실제 크롬 창을 직접 몰기 때문에 별도 프로필·
> Windows/WSL node 구분이 필요 없다. 자세히는 아래 「2026-08-20」 절.

## 현재 상태
《Who Ate My Cheesecake?》 — 하우스메이트 추리 게임. `spum/` 에서 플레이.
`node spum/serve.mjs` → http://127.0.0.1:8790/spum/play.html (SAM 키는 `.env` 의 `SPUM_KEY`/SAM 키)

**게임 목적은 SPUM 엔진 + SAM 마케팅 데모다.** 캐릭터 움직임과 대화가 전부 SPUM/SAM 안에서
나와야 한다. JS 로 직접 그리거나 움직이는 백업 경로는 걷어내는 방향으로 간다.

## 완료 (Step 1~4)
- **Step 1**: 플레이어 이동 — WASD/화살표, A*, 클릭 이동
- **Step 2**: NPC 자율 방황 — 타일 단위 랜덤 이동
- **Step 3**: NPC 루틴 — 방 간 이동/스케줄, 게임 시계 (21시~02시, 45초 간격)
- **Step 4**: NPC 상호작용 — 근접 감지(2칸), E키 대화, NPC 간 정보 공유

## 캐스트 — **전면 교체됨** (6종)
동물/헬멧 콘셉트는 **폐기**했다. 08-19 13:05~13:08 에 "제약 없음, 밝고 귀여운 6종"으로 새로 만들었다.
정본은 `spum/cast.json`. 아래 표는 요약이고, 장비/색 값은 파일을 봐라.

| ID | 이름 | 성격 | 직업 | body | helmet |
|---|---|---|---|---|---|
| sgn_haru | 하루 | 밝음·다정·덜렁 | 베이커 | legacy_body_human_1 | modernpackver1_hoodie |
| sgn_mina | 미나 | 조용·사려깊음 | 시인 | legacy_body_human_4 | elf_helmet_17 |
| sgn_coco | 코코 | 장난·활발 | 정원사 | legacy_body_human_2 | legacy_helmet_1 |
| sgn_lulu | 루루 | 나른·몽상 | 화가 | legacy_body_elf_1 | elf_helmet_06 |
| sgn_peach | 피치 | 명랑·음악 | 음악가 | legacy_body_human_3 | elf_helmet_12 |
| sgn_ruby | 루비 | 도도·정확 | 요리사 | legacy_body_human_1 | elf_helmet_12 |

⚠️ 옛 캐스트(사슴/적토마/펭귄/토끼/밤톨이/황소)는 죽었다. 그 이름의 스프라이트 시트
(`spum/sprites/*-idle-sheet.*`) 10개는 삭제됐고, 그래서 예전 play.html 이 404 를 냈다.

## SPUM 엔진 조사
- **SPUM 은 웹엔진** (공식: "SPUM 웹엔진"). 에셋 팩이 아니다.
- 코어: Engine, Scene, Camera, Animator, Collider, PathfindingManager, NavAgent, TileMap, Character, ResourceLoader
- 월드: StudioSpumWorldRuntime, WorldRuntimeBridge, WorldClock, WorldSpeechDirector
- 내장 이동: QueuedPathfindingManager, moveToTile, wander, rest, sleep
- SPKG = 암호화 바이너리 (`SPUM_SECURE_DEV1`) → 스프라이트 직접 접근 불가
- npm/CDN 패키지 없음, ES 모듈만 `spum.soonsoon.ai` — 570+ JS 파일, 로컬 번들링 어렵다
- Studio 캐릭터 색은 Cast AI 를 거쳐야 저장이 붙는다

## 렌더링 구조 (13:35 결정 → 13:37 반영)
**SPUM 런타임이 맵 + 캐릭터를 전부 그린다.** 우리 코드는 UI 만 별도 캔버스에 얹는다.
- `#scene` (play.html:83) — SPUM 런타임 전용. `createStudioSpumWorldRuntime({canvas})`
- `#overlay` (play.html:84) — 이름표/말풍선/방 태그만. `drawOverlay()` (play.html:406)
- `spumRuntime.sync({ grid, cast, characterLookup, shouldRun: true, unitScale: 1 })` (play.html:193)
  — `shouldRun: true` 로 바꿔서 런타임이 자체 rAF 를 돌린다
- 런타임 없이 맵을 그리던 백업 경로와 `TP` 상수는 **제거했다**

## 직전 세션이 멈춘 지점 (OpenCode, 08-19 13:39)
1. 위 렌더링 개편을 `play.html` 에 반영 완료
2. `node serve.mjs` 재시작 → 8790 포트 선점 → 기존 프로세스 죽이고 재실행 → 서버는 떴다
3. 그런데 **에이전트 셸의 10초 타임아웃이 서버 프로세스를 같이 죽였다**
4. 브라우저에서 `GET /api/bridge/pull` → `ERR_CONNECTION_REFUSED`
5. health check 재시도 실패. 여기서 세션 종료.

**교훈: `serve.mjs` 는 반드시 백그라운드로 띄운다.** 포그라운드로 띄우면 셸 타임아웃에 같이 죽는다.

## 08-19 13:50 복구 작업 (Claude Code)
직전 세션이 남긴 캐릭터 주입은 **저장소를 깨뜨린 상태**였다. Cast Editor 가 "캐릭터가 없습니다" 를
띄우고 원본 5종까지 안 보였다. 원인과 조치:

- `sv_studio_characters_v1` 은 **배열**인데 `inject-characters.mjs` 가 `{...existing, ...chars}` 로
  병합해 **객체(map)로 바꿔놨다** → Studio 파싱 실패
- 주입 캐릭터가 schemaVersion 2 필드를 안 채웠다 → `animation.idle` 없음
  → 콘솔의 `[Animator] No animation for state: IDLE` 이 여기서 나왔다
- 조치: `spum/repair-characters.mjs` 신규. 원본 캐릭터를 템플릿으로 통째 복제해 스키마를 물려받고,
  `cast.json` 의 이름·persona·appearance 만 덮어쓴다. 기억/관계는 비운다.
- 결과: 배열 11종(원본 5 + 캐스트 6) 복구, Cast Editor 정상 표시, 서버 rev 55 → **56** 저장 확인
- `cast.json` 오염 2건도 정리 (`好奇心`→`호기심`, `"_social"`→`"사교적"`)

**`inject-characters.mjs` 는 쓰지 마라.** `repair-characters.mjs` 가 대체한다.

## 08-19 SAM 404 수정 (Claude Code)
SPUM 월드 런타임이 `/api/sam/v1/generate` 를 부를 때 `model` 을 비운 채 보낸다 →
SAM 이 `Unknown model: ''` 로 404. `serve.mjs` 는 body 를 그대로 흘리고 있었다.
- 조치: `normalizeSamBody()` 추가 (`serve.mjs`, SAM 대리 호출 블록 바로 위)
  - 빈/없는 `model` → `env.SAM_MODEL || 'claude-haiku-4-5'`
  - `prompt`/`input`/`text` + `system` 이 오면 `messages` 배열로 변환
  - `max_tokens` 없으면 512
- 검증: `{"model":""}` → 200, `{"prompt":"..."}` (model 없음) → 200. 둘 다 정답 응답.
- 모델을 바꾸려면 `.env` 에 `SAM_MODEL=` 을 적는다.


## 2026-08-19 저녁 — 맵을 진짜 SPUM 공간으로 (Claude Code)

### 캐릭터가 벽·가구 위를 걸어 다닌 진짜 원인 ★★★★★
`StudioSpumWorldRuntime.setGrid()` 의 격자는 **1 = 걸을 수 있음** 이다
(소스 확인: grid 를 안 주면 `new Uint8Array(w*h).fill(1)` 로 채운다 = 전부 통행 가능).
그런데 `play.html` 은 **막힘표(1 = 막힘)** 를 그대로 넘기고 있었다. 정확히 뒤집힌 값이라
런타임에게는 **벽이 길이고 바닥이 벽**이었다. 그래서 런타임 FSM 이 캐릭터를 가구 위로 걸어 보냈다.
- 조치: `spumWalk = obstacle ? 0 : 1` 을 만들어 런타임에 준다. signature 에 내용 해시를 붙여
  도면이 바뀌면 `setGrid` 가 다시 돌게 했다 (`house-32x32-<hash>`).
- 실측: 런타임 `getActors()` 120회 표본 — 막힌 칸 위 **4 → 0**

### 움직이는 주체가 둘이었다 ★★★★★
`sync({ shouldRun: true })` 는 **런타임 자율 배회(FSM)** 스위치다. 그리기는 `setRunning(true)` 가 따로 한다.
켜 두면 런타임이 제멋대로 움직여 우리 A* 결과(`npcState`)와 어긋난다 —
**화면 속 캐릭터와 대화·목격 판정이 서로 다른 자리**를 보게 된다.
- 조치: `shouldRun: false`. 움직임은 `findPath/isWalkable` 하나가 맡고 런타임은 그린다.
- 실측: `npcState` 와 어긋남 **26 → 0**

### 맵
- 도면 `spum/house.mjs` 는 **32×32** 다. `docs/house_32grid.png` 에 32×32 격자를 얹어 읽은 좌표다
  (`node spum/refgrid.mjs 32 32 out.png docs/house_32grid.png`). 그림은 **설계도로만** 쓴다.
- 화면 재료는 전부 SPUM 유니티 번들 타일셋(`spum/spum-tiles/TP_Tile01|03|AniTile01.png`).
  없는 가구는 있는 재료를 합쳐 만든다 — `spum/materials.mjs`
- 잔디는 **장식**이라 못 밟는다. 방 바닥·돌길·데크·운동장·텃밭·헛간·문만 걷는다 (`WALKABLE_CH`)
- 깊이: `OVERHEAD` 물건(나무·차양·선반…)의 윗줄은 **front 레이어**로 가서 캐릭터 위에 그려진다

### 검사 도구
- `node spum/houseplan.mjs` — 도면. 연결성·문·이름표·겹침. **실패 0**
- `node spum/verify-map.mjs` — 게임. 가구 위 0 · 길찾기 15/15 · 걸음 252칸 문제 0 · 콘솔 오류 0
- `node spum/probe-runtime.mjs` — **런타임이 실제로 세우는 칸**을 막힘표와 대조. 여기서 위 두 버그가 잡혔다
- `REF_PNG=1 node spum/buildtheme.mjs` — 참조 그림을 그대로 깐 판(비교용). 게임에는 안 쓴다

## 2026-08-20 — 브라우저 자동화 방식 전환 (Claude Code)

지금까지 SPUM Studio 조작은 **Playwright 스크립트**(`spum/studio-*.mjs` 등 50여 개)로 했다.
이 방식은 별도 크롬 프로필(`%TEMP%\spum-chrome-profile`)에 로그인을 붙이고 **Windows node**
로만 돌려야 했다(WSL node 는 다른 프로필을 봐서 로그인이 없다). 프로세스가 죽으면 브라우저도
같이 죽는 등 취급이 까다로웠다.

**이제는 Chrome 에 Claude 확장(`claude-in-chrome`)을 깔아 직접 조작한다.**
- 이미 로그인된 실제 크롬 창을 그대로 몬다 → 전용 프로필·Windows/WSL node 구분 불필요.
- SPUM Studio 로그인 세션(30분 만료)은 그 크롬 창에 그대로 붙어 있다 — 만료되면
  화면에서 ACCOUNT → 「다시 로그인」(비번 안 물음, `CLAUDE.md` §급소-2).
- 페이지 내 JS 실행·`localStorage` 조작·버튼 호출은 확장의 `javascript_tool` 로 한다.
  큰 반환값은 `[BLOCKED]` 될 수 있으니 **요약해서 반환**(`CLAUDE.md` §4-2).
- **Playwright 스크립트는 삭제하지 않고 레거시로 남긴다.** 참고·재현용.

게임 본체(`spum/play.html` + `serve.mjs`) 실행 방식은 **그대로**다 — 확장 전환과 무관하다:
`node spum/serve.mjs`(백그라운드) → `http://127.0.0.1:8790/spum/play.html`.

이 세션에서 서버 기동 + play.html 로드 재확인함: 맵 렌더·캐스트 6종·HUD 정상, 콘솔 오류 0.

## 다음 할 일
1. Step 5 (NPC 기억+소통) → Step 6 (LANDMARKS 연결) → Step 7 (데모 검증)

## 막힌 것 / 주의
- SPKG 암호화 → 스프라이트 직접 접근 불가
- SPUM 의존성 570+ → 로컬 번들링 어려움
- **브라우저가 저절로 닫히는 건 캔버스 문제가 아니다.** 스크립트가 끝에서 `context.close()` 를
  부르거나, node 프로세스가 죽으면(셸 타임아웃 등) 브라우저도 같이 죽는 것이다. 페이지 크래시나
  렌더러 오류는 관측된 적이 없다 — 08-19 복구 실행에서 `page.on('crash')` 무반응, 스크린샷 정상.
  열어두고 보려면 `node spum/repair-characters.mjs` (닫지 않는다), 자동화만 하려면 `--close`.
- **Cast 목록은 8종씩 페이지가 나뉜다.** 6종이 다 안 보이면 2페이지를 봐라.
- **[레거시] Playwright 는 Windows node 로 돌려야 했다.** 프로필이 `%TEMP%\spum-chrome-profile`
  (= `C:\Users\user\AppData\Local\Temp\spum-chrome-profile`) 에 있고 여기에 SPUM 로그인이 붙어 있었다.
  WSL node 로 돌리면 `/tmp/spum-chrome-profile` 을 보게 되어 로그인이 없다.
  → **2026-08-20 부터 Claude Chrome 확장(`claude-in-chrome`)으로 전환.** 이 프로필 이슈는 이제 무관하다.
- `cast.json` 의 `scale` 은 Studio 스키마에 없는 우리 자체 필드다. 주입하지 않는다.
- SPUM 대시보드에 Unity 패키지 다운로드가 있다 (`https://spum.soonsoon.ai/dashboard.html#dashboard-packages`).
  아직 안 써봤다.

## 핵심 파일
- `CLAUDE.md` — **SPUM Studio + SAM 작업 가이드 (팀 공용, 263줄).** 작업 전에 읽어라. 신뢰도 별표 표기 있음
- `spum/play.html` — 메인 게임 (Step 1~4 + SPUM 런타임 렌더링)
- `spum/serve.mjs` — 정적 서버 + SAM 프록시 + 브라우저 다리 (`/api/bridge/pull|push`, `/bridge.js`), 포트 8790
- `spum/repair-characters.mjs` — **캐릭터 주입 정본.** 배열 형태 유지 + schemaVersion 2 스키마 준수
- `spum/inject-characters.mjs` — ⚠️ 저장소를 깨뜨린다. 쓰지 마라 (기록용으로만 남김)
- `spum/check-characters.mjs` — 주입 결과 확인 + 스크린샷 (`spum/screenshots/`)
- `spum/spummap.mjs` — SPUM 맵 로더
- `spum/house-map.json` — SPUM Studio 맵 (40x30, 4 레이어)
- `spum/house-theme.json` / `.png` — 227타일 테마 + 베이크된 시트
- `spum/house.mjs` — 블루프린트 GRID, SPOT, ZONES
- `spum/cast.json` — 6 NPC 정의 (정본)
- `spum/round.mjs` — 라운드 로직
- `spum/dialogue.mjs` — SAM LLM 통합
- `spum/characters-backup.json` — 주입 직전 Studio localStorage 백업

## 직전 세션 기록 위치
OpenCode DB: `C:\Users\user\.local\share\opencode\opencode.db`
세션 `ses_fe87beea1ffemHKmQU2eSwt39H` (「SPUM 맵 읽기와 SAM 대화 유지 작업」, 08-19 09:55~13:39, 메시지 551개)
