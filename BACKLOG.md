# Who Ate My Cheesecake? — 백로그

> 최종 갱신: 2026-08-19 (OpenCode 세션 중단 지점 복구 후 Claude Code 가 정리)
> 게임 목적: **SPUM 엔진 + SAM 마케팅 데모**. 움직임도 대화도 전부 SPUM/SAM 안에서 나와야 한다.

## 완료
- [x] Step 1: 플레이어 이동 (WASD/화살표, A* 경로탐색, 부드러운 애니메이션)
- [x] Step 2: NPC 자율 이동 (타일 단위 방황)
- [x] Step 3: NPC 루틴 — 방 간 이동 경로/스케줄, 게임 시계 (21시~02시, 45초 간격)
- [x] Step 4: NPC 상호작용 — 근처 NPC 감지(2칸), E키 대화, NPC 간 정보 공유
- [x] 도면 디자인 — 사양서대로 단층집 + 뜰. 전부 SPUM 오브젝트. `docs/house.md`
- [x] SPUM CDN 프록시 + 월드 런타임 초기 연결 (커밋 `3b4fb3f`)
- [x] 캐스트 전면 재설계 — 동물/헬멧 제약 폐기, 밝고 귀여운 6종으로 재작성 (`spum/cast.json`)
- [x] Playwright 캐릭터 주입 스크립트 작성 (`spum/inject-characters.mjs`)
- [x] Chrome 프로필 확보 + SPUM Studio 로그인 (`%TEMP%\spum-chrome-profile`, 08-19 13:27 로그인 확인)

- [x] **캐릭터 6종 주입 확인 + 저장소 복구** (08-19 13:50) — 주입은 저장소를 깨뜨린 상태였다.
      `spum/repair-characters.mjs` 로 배열 형태 복구 + schemaVersion 2 스키마로 재주입.
      Studio 화면에 11종(원본 5 + 캐스트 6) 정상 표시, 서버 rev 55 → 56 저장 확인
- [x] Cast 서버 저장 — `saveServerSnapshot('manual')` 성공 (rev 56)
- [x] `cast.json` 오염 정리 — `好奇心`→`호기심`, `"_social"`→`"사교적"`

- [x] **play.html 렌더링 확인 + 3건 수정** (08-19 14:10)
      캐릭터가 SPUM 스프라이트로 그려지는 것 확인. 같이 고친 것:
      맵 배경 복구(`#bg`), 캐릭터 크기(`unitScale`), 이름표 중복 제거, 무대 폭 정리
- [x] **플레이어를 캐스트 6종 중 하나로** — 「나(고양이)」 삭제. 시작할 때 고르고, 고른 캐릭터는
      범인에서 빠진다(`makeRound(seed, playerId)`). 플레이어도 SPUM 런타임이 그린다

- [x] **SPUM 월드 AI 의 SAM 호출 404 해결** (08-19) — ⚠️ 원인 진단이 백로그와 달랐다.
      런타임이 보내는 모델은 빈값이 아니라 **`"medium"`** — SPUM 의 품질 등급(`aiConfig.qualityMode`)
      이름을 그대로 보낸다. 서버 로그 실측: `{"model":"medium", ... "너는 자율 캐릭터의 행동 디렉터다"}`
      → SAM `Unknown model: 'medium'` 404. `serve.mjs` 의 `normalizeSamBody()` 가 등급→모델로 옮긴다
      (low/fast→haiku, medium/balanced→sonnet, high/best→opus, 빈값→`SAM_MODEL`).
      `repair-characters.mjs` 도 `aiConfig.model`/`talkConfig.model` 에 실제 모델을 박는다.
      실측: 브라우저 실행 6회 호출 전부 200, 상류 오류 0

- [x] **Step 5: NPC 기억 + 소통** (08-19) — `spum/memory.mjs` 신설
      · 기억: 씨앗(자기 동선·목격·남의 사정) → 마주치면 한 조각씩 전달, 받은 쪽은 **출처**를 단다
      · 범인은 범행 시각 자기 자리를 안 흘린다. 대신 **알리바이 거짓말**(`round.alibiLie` 신설)을 민다
      · 플레이어의 질문도 `asked` 로 기억돼 퍼진다
      · **엿듣기** — 플레이어가 5칸 안이면 소문이 대화창+증언판에 오른다 (대화 예산 안 씀)
      · 소문 문장은 **SAM 이 짓는다** (`buildGossipMessages`). 사실은 memory 가 고른 한 조각으로 고정
      실측: 브라우저 40초에 소문 16건, 기억 9→21, 엿들은 줄 10건, 증언판 9/36 칸

- [x] **인격을 SPUM Cast 정본으로** (08-19) — `cast.json` persona 에 `traits`/`occupation`/`profile` 채움.
      NPC 프롬프트는 성격·경향·버릇·말투·내력·관계를 Cast 에서 읽는다. (08-20 CHARACTER_SYSTEM.md 판으로 교체)
      **플레이어가 고른 캐릭터는 인격에서 풀린다** — `castPersona` 에서 지워 SAM 에 실릴 길을 없앴고,
      `buildMessages`/`buildGossipMessages` 는 플레이어 id 로 부르면 예외를 던진다

- [x] **증언판이 비어 있던 버그** (08-19) — `renderBoard()` 가 행을 만들고 `t.append(tr)` 를 안 했다.
      헤더만 그려지고 36칸이 통째로 없었다. 원래 있던 버그다

- [x] **캐릭터 크기 + 로스터 얼굴** (08-19) — `UNIT_SCALE` 0.055 → **0.12** (허용 0.035~0.35).
      로스터 아이콘의 이모지(🌙·🎵)는 자리표시자였다 → SPUM `createCharacterPreview` 의
      `captureThumbnail()` 로 **진짜 초상을 구워** 건다. SPKG 는 월드 런타임이 올린 것을 공유한다

- [x] **게임 설명서** — `WHO_ATE_MY_CHEESECAKE_GAME_GUIDE_KO.md`

## 지금 하는 것
- (없음 — 아래 「다음」의 Step 5 부터)

## 다음 (순서대로)
- [ ] Step 5: NPC 기억 + 소통 — 사건 기억, 자연스러운 정보 공유
- [ ] Step 6: 맵 통합 — 도면은 다 됐다. 남은 건 상호작용 지점 연결 (`LANDMARKS`)
- [ ] Step 7: 데모 검증 — 자율이동, 상호작용, 기억, 소통 전부 확인

## 알려진 문제
- **SPUM 런타임은 타일맵을 안 그린다.** `sync({grid})` 의 `setGrid()` 는 길찾기 전용이다
  (모듈 전수 확인 — `TileMap` 자체가 없다). 08-19 13:35 의 "런타임이 맵을 전부 담당" 판단은
  틀렸고, 그래서 맵이 검게 나왔다. 배경은 `spumMap.bake()` 를 `#bg` 캔버스에 깐다.
  런타임 씬 배경은 투명(`rgba(0,0,0,0)`)이고 매 프레임 `clearRect` 라 아래가 비친다.
- **`unitScale` 은 0.035~0.35 로 잘린다** (기본 0.09). `1` 을 넘기면 0.35 로 잘려 캐릭터가
  타일보다 훨씬 커진다. 24px 타일에는 `0.055` 가 맞다.
- **serve.mjs 가 자꾸 죽는다** — 에이전트 셸 타임아웃(10초)이 서버 프로세스를 같이 죽였다.
  반드시 백그라운드로 띄울 것. 죽으면 `/api/bridge/pull` 이 `ERR_CONNECTION_REFUSED` 로 뜬다.
- **8790 포트 선점** — 이전 node 프로세스가 남아 있으면 `EADDRINUSE`. 먼저 정리하고 띄운다.
  ⚠️ **WSL 쪽과 Windows 쪽 서버가 따로 뜬다.** 브라우저(Windows)는 Windows 서버를 보고,
  WSL 의 `curl 127.0.0.1:8790` 은 WSL 서버를 본다. 낡은 WSL 서버가 살아 있으면 검증 결과가
  엇갈린다 — `ss -ltnp | grep 8790` 로 확인하고 죽여라.
- **[레거시 · 2026-08-20 부터 무관] Playwright 브라우저가 자꾸 닫힌다 — 캔버스 문제가 아니다** (08-19 확인).
  원인 둘: ① `inject-characters.mjs`/`check-characters.mjs` 가 끝에서 `await context.close()` 를
  부른다 — 설계대로 닫는 것이다. ② node 프로세스가 죽으면 브라우저도 같이 죽는다(에이전트 셸
  타임아웃이 대표적). 페이지 크래시·렌더러 오류는 관측되지 않았다.
  → 열어두고 보려면 `node spum/repair-characters.mjs` (닫지 않음), 자동화만 하려면 `--close`.
  프로필은 Windows `%TEMP%\spum-chrome-profile` 이므로 **Windows node 로 실행**해야 로그인
  세션이 붙는다 (WSL node 로 돌리면 다른 프로필을 본다).
  → **SPUM 조작은 이제 Claude Chrome 확장(`claude-in-chrome`)으로 한다.** 위 프로필·node 이슈는
  더 이상 해당 없음. Playwright 스크립트(`spum/studio-*.mjs`)는 레거시로만 남긴다. (HANDOFF 「2026-08-20」 절)
- **`inject-characters.mjs` 는 저장소를 깨뜨린다 — 쓰지 마라.** `sv_studio_characters_v1` 은
  **배열**인데 `{...existing, ...chars}` 로 병합해서 객체(map)로 바꿔놨다. Studio 가 못 읽어서
  Cast Editor 에 "캐릭터가 없습니다" 가 떴고, 원본 캐릭터 5종까지 같이 안 보였다.
  또 주입 캐릭터가 schemaVersion 2 필드(`animation`/`profiles`/`aiConfig`/`talkConfig`/`runtime`/
  `memory`/`meta`)를 안 채워서 `animation.idle` 이 없었다 — 이게 콘솔의
  `[Animator] No animation for state: IDLE` 의 원인이다. 대체제는 `spum/repair-characters.mjs`.
- **`cast.json` 의 `scale` 은 Studio 스키마에 없는 우리 자체 필드다.** 주입하지 않는다.
  캐릭터 덩치를 정말 바꾸려면 SPUM 쪽 지원 방식을 따로 찾아야 한다.
- **Cast 목록은 8종씩 페이지가 나뉜다** — 6종이 다 안 보이면 2페이지를 봐라 (버그 아니다).
- **SPKG 암호화** (`SPUM_SECURE_DEV1`) — 스프라이트 직접 접근 불가. 런타임 경유만 가능.
- **SPUM 의존성 570+ 파일** — 로컬 번들링 어렵다. CDN 프록시로 간다.
- **Studio 캐릭터 색은 Cast AI 를 거쳐야 저장된다** (직접 색만 바꾸면 저장이 안 붙는 사례 있었음).

---

# 2026-08-19 밤 — 세션 정리 (Claude Code)

## 지금 게임에 들어가 있는 것
`spum/house-map.json` = **32×32 · SPUM 유니티 타일셋 재료로 지은 집** (테마 타일 192장, 시트 1024×192).
`node spum/serve.mjs` → http://127.0.0.1:8790/spum/play.html 에서 바로 돈다.
검증: 길찾기 15/15 · 가구 위에 선 NPC 0 · 플레이어 랜드마크 순회 252칸 문제 0 · 콘솔 오류 0 · 탐험 가능 431/431칸(100%).

## 이번에 고친 진짜 버그 3개 (HANDOFF 에 상세)
1. **런타임 격자가 정반대였다** — `setGrid` 는 `1 = 걸을 수 있음`인데 막힘표(1=막힘)를 넘겨서 벽이 길이 됐다
2. **움직이는 주체가 둘이었다** — `sync({shouldRun:true})` 는 자율배회 스위치. 끄고 우리 A* 하나로
3. **스프라이트가 4.3×3.3칸이었다** — 충돌 1칸인데 그림이 사방을 덮어 "가구 위"로 보였다. `unitScale 0.16 → 0.07`
+ 정적 응답 `Cache-Control: no-store`, 키 `Space`/`Tab` 추가, 대화창에서 Esc 안 먹던 것 수정

## ★ SPUM Link 배포본에서 맵을 꺼내는 법 (추적 완료, 아직 구현 안 함)

배포 payload 는 **로그인 없이** 열린다:
`GET https://spum.soonsoon.ai/api/worlds/<publishId>` → `{ok, snapshot}`

참조 사슬 (실측):
```
snapshot.map.layers[].data 의 값 = packed 타일 ID
   ↓ snapshot.map.tilesets[1].tileProperties[String(id)]
{ smoTileId, category, movement, blocksMovement, sourceCell:{column,row} }
   ↓ sourceCell (1부터)
아틀라스에서 자를 자리 = ((column-1)*32, (row-1)*32, 32, 32)
```

**타일 그림은 `snapshot.map.tilesets[1].imageUrl` 에 `data:image/png;base64,…` 한 장으로 통째로 들어 있다.**
- 예: 512×512 PNG, base64 1,002,546자, 타일 32px → 16열×16행 = 256칸
- `spumLink.bake` 는 `{schemaVersion, mode, stages[4]}` 로 **그림 없음**
- `spumLink.capsule.map` 은 `{id,name,width,height,tileSize}` 메타뿐, **레이어·그림 없음**
- 같은 맵이 `spumLink.sourceWorld.map` / `.maps[0]` 에도 복제돼 있다
- `tilesets[0]` 은 빌트인 `TP_Tile01.png`(외부 URL)이고 `tileProperties` 0개라 안 쓰인다

**해야 할 일은 두 가지뿐이다 (재굽기·에셋 다운로드·로그인 전부 불필요):**
1. `tilesets[1].imageUrl` 의 base64 를 디코딩해 `spum/house-theme.png` 로 저장
2. `snapshot.map` 을 `spum/house-map.json` 으로 저장하되 테마 타일셋 `columns` 를 **아틀라스 열 수(예 16)** 로 두고 `tileProperties` 는 **원본 그대로** 유지
   → `spum/spummap.mjs` 가 이미 `tileProperties[id].sourceCell` 로 자르므로 좌표 재매핑 불필요

⚠️ 내가 처음 실패한 이유: 타일 하나하나에서 `imageDataUrl`/`assetId` 를 찾았는데, 배포본은
**타일셋 수준에 아틀라스 한 장**으로 굽는다. 그래서 시트가 858B 빈 파일로 나왔다.

## 손에 있는 재료
- `docs/House-export/House/tiles/*.png` — 잘린 타일 **250장, 전부 32×32**.
  파일 이름에 분류가 들어 있다: `wall` 153 · `detail` 48 · `prop` 41 · `floor` 7 · `water` 1
  (배치 정보는 없다 — 맵 JSON 에만 있다)
- `docs/House-export/House/source/` — `slice-base.png` + `ai-input-2~7.png` (전부 1024²)
- `docs/house_32grid.png` — 32×32 설계도. `REF_PNG=1 node spum/buildtheme.mjs` 로 비교판을 굽는다(게임엔 안 씀)

## Studio → 게임 창구 (만들어 두고 검증 끝냄)
- `POST http://127.0.0.1:8790/api/import` — `{files:{"house-map.json":{...},"house-theme.png":"data:image/png;base64,..."}}`
  (`127.0.0.1` 은 보안 출처라 https Studio 페이지에서 불러도 안 막힌다. CORS 열어 뒀다)
- **사용자 브라우저에서 쓰는 한 줄** (localStorage 가 원본이라 그 탭에서 실행해야 한다):
  `fetch("http://127.0.0.1:8790/studio-export.js").then(r=>r.text()).then(eval)`
  → 맵 목록 출력 후 가장 최근 맵 전송. 다른 걸 보내려면 `SPUM_EXPORT("맵 이름")`
  실측: 타일 420장 → 시트 1024×448 → 전송 성공

## 배운 함정 (다음 사람용)
- **Studio 편집기 화면이 비어 보이는 건 데이터 문제가 아니다.** 타일 1,400장을 한꺼번에 받다가
  `ERR_INSUFFICIENT_RESOURCES` 7,672건이 나서 그림이 안 뜬 것이다. **12장씩 끊어 받으면 된다**
- **`saveServerSnapshot()` 은 리비전이 어긋나면 `false` 를 돌려주고 저장 안 한다** — 덮어쓰기 사고를 막아 준다.
  저장 전에 `GET /api/studio/state` 로 내려받아 **합친 뒤** 저장할 것
- **맵에 map-theme 타일셋이 여러 개일 수 있다.** `map.mapThemeId` 와 `themeId` 가 같은 것을 골라야 한다
  (첫 번째를 집으면 ID 대역이 안 맞아 타일이 하나도 안 붙는다)
- **세션은 30분쯤에 풀린다.** `/api/studio/state` 가 `login_required` 면 ACCOUNT → 「다시 로그인」(4초, 비번 안 물음)
- **사용자 브라우저와 자동화 브라우저는 다른 저장소다.** 자동화 프로필 두 곳 다 사용자 최신 작업이 없었다

## 다음 할 일 (우선순위)
1. `spum/import-publish.mjs` — 배포 URL 하나 받아 위 §「SPUM Link 배포본」 대로 두 파일만 떨구기
2. 반영 뒤 `node spum/patch-map-doors.mjs --dry` 로 걸을 수 있는 칸이 몇 조각인지 확인
   (직전 44×36 맵은 6조각이라 코코·미나 쪽으로 아예 못 갔다. 방마다 문 한 칸은 뚫려 있어야 한다)
   → `node spum/verify-map.mjs` 로 충돌·길찾기 최종 점검
3. 마지막 배포본(`PUB_WORLD_mt06c5_…`)은 **40×30 · 기본 캐스트 4명**이라 우리 판이 아니다.
   44×36 집 + 캐스트 6명으로 World 를 짜서 SPUM Link 를 새로 뽑으면 링크 하나로 끝난다

## 검사 도구
| 명령 | 무엇을 보나 |
|---|---|
| `node spum/houseplan.mjs` | 도면 — 연결성·문·이름표·겹침 |
| `node spum/verify-map.mjs` | 게임 — 가구 위 0 · 길찾기 · 랜드마크 순회 |
| `node spum/verify-controls.mjs` | 키보드 — WASD/E/Space/Esc/Tab · NPC 자율 이동 |
| `node spum/probe-runtime.mjs` | **런타임이 실제로 세우는 칸** (격자 뒤집힘을 여기서 잡았다) |
| `node spum/probe-size.mjs` | 캐릭터가 몇 칸을 차지하나 |
| `node spum/patch-map-doors.mjs --dry` | 걸을 수 있는 칸이 몇 조각인지 |
| `node spum/studio-pull.mjs --close` | 사용자 크롬 프로필의 Studio 맵·테마 목록 |
