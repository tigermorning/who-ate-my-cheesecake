# HANDOFF

> 최종 갱신: 2026-08-19 13:45 (Claude Code). 직전 작업은 **OpenCode** 세션이었고 13:39 에 끊겼다.

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

## 다음 할 일
1. **play.html 에서 SPUM 런타임 캐릭터 렌더링 확인** — 복구된 11종을 런타임이 그리는지
2. Step 5 (NPC 기억+소통) → Step 6 (LANDMARKS 연결) → Step 7 (데모 검증)

## 막힌 것 / 주의
- SPKG 암호화 → 스프라이트 직접 접근 불가
- SPUM 의존성 570+ → 로컬 번들링 어려움
- **브라우저가 저절로 닫히는 건 캔버스 문제가 아니다.** 스크립트가 끝에서 `context.close()` 를
  부르거나, node 프로세스가 죽으면(셸 타임아웃 등) 브라우저도 같이 죽는 것이다. 페이지 크래시나
  렌더러 오류는 관측된 적이 없다 — 08-19 복구 실행에서 `page.on('crash')` 무반응, 스크린샷 정상.
  열어두고 보려면 `node spum/repair-characters.mjs` (닫지 않는다), 자동화만 하려면 `--close`.
- **Cast 목록은 8종씩 페이지가 나뉜다.** 6종이 다 안 보이면 2페이지를 봐라.
- **Playwright 는 Windows node 로 돌려야 한다.** 프로필이 `%TEMP%\spum-chrome-profile`
  (= `C:\Users\user\AppData\Local\Temp\spum-chrome-profile`) 에 있고 여기에 SPUM 로그인이 붙어 있다.
  WSL node 로 돌리면 `/tmp/spum-chrome-profile` 을 보게 되어 로그인이 없다.
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
