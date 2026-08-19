# HANDOFF

## 현재 상태
《Who Ate My Cheesecake?》 — 동물 하우스메이트 추리 게임. `spum/` 에서 플레이.
`node spum/serve.mjs` → http://127.0.0.1:8790/spum/play.html (SAM 키는 `.env`)

## 완료 (Step 1~4)
- **Step 1**: 플레이어 이동 — WASD/화살표, A*, 클릭 이동
- **Step 2**: NPC 자율 방황 — 타일 단위 랜덤 이동
- **Step 3**: NPC 루틴 — 방 간 이동/스케줄, 게임 시계 (21시~02시, 45초 간격)
- **Step 4**: NPC 상호작용 — 근접 감지(2칸), E키 대화, NPC 간 정보 공유

## 캐스트 (6종 — SPUM 헬멧)
| ID | 이름 | 종 | 헬멧 | body |
|---|---|---|---|---|
| sgn_deer | 사슴 | 사슴 | elf_helmet_06 | elf_1 |
| sgn_horse | 적토마 | 말 | elf_helmet_12 | human_1 |
| sgn_penguin | 펭귄 | 펭귄 | elf_helmet_17 | elf_1 |
| sgn_rabbit | 토끼 | 토끼 | legacy_f_sr_helmet | human_4 |
| sgn_chestnut | 밤톨이 | 곰 | legacy_helmet_1 | human_3 |
| sgn_bull | 황소 | 황소 | legacy_helmet_6 | human_2 |

## SPUM 엔진 조사
- **SPUM은 웹엔진** (공식: "SPUM 웹엔진")
- 코어: Engine, Scene, Camera, Animator, Collider, PathfindingManager, NavAgent, TileMap, Character, ResourceLoader
- 월드: StudioSpumWorldRuntime, WorldRuntimeBridge, WorldClock, WorldSpeechDirector
- 내장 이동: QueuedPathfindingManager, moveToTile, wander, rest, sleep
- SPKG = 암호화 바이너리 (SPUM_SECURE_DEV1)
- npm/CDN 없음, ES 모듈만 spum.soonsoon.ai
- 570+ JS 파일 (의존성 트리 깊음)

## 다음 할 일
1. **SPUM 엔진 전체 런타임 통합** — createStudioSpumWorldRuntime()으로 교체
2. SPKG 분석 (암호화 해제 또는 런타임 getAllItems() 추출)
3. SAM 대화 → SPUM WorldLLMConversation 연결

## 막힌 것
- SPKG 암호화 → 스프라이트 직접 접근 불가
- SPUM 의존성 570+ → 로컬 번들링 어려움
- Studio 캐릭터 색은 반드시 Cast AI로 바꿔야 저장

## 핵심 파일
- `spum/play.html` — 메인 게임 (Step 1~4)
- `spum/spummap.mjs` — SPUM 맵 로더
- `spum/house-map.json` — SPUM Studio 맵 (40x30, 4 레이어)
- `spum/house-theme.json` — 227타일 테마
- `spum/house-theme.png` — 베이크된 테마 시트
- `spum/house.mjs` — 블루프린트 GRID, SPOT, ZONES
- `spum/cast.json` — 6 NPC 정의
- `spum/round.mjs` — 라운드 로직
- `spum/dialogue.mjs` — SAM LLM 통합
- `spum/sprites/` — 캐릭터 스프라이트 시트
