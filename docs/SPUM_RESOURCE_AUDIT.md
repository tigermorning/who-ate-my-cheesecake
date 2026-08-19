# SPUM 자원 감사 — 자원 → 능력 → 쓸 곳

> 2026-08-19. 전부 **직접 열어서 확인**했다. 추정에는 (추정) 을 붙였다.
> 목적: 참조 그림(`docs/reference-house.png`, 1254×1254)을 **진짜 SPUM 재료**로 다시 짓기 위한 재고 조사.

---

## 1. 유니티 패키지 — 여기에 진짜 맵 아트가 있다

### `SPUMUltimate_6000.5.1f1.unitypackage` (18MB, 에셋 2,844)

| 자원 | 능력 | 쓸 곳 |
|---|---|---|
| `Res/Maps/BG/Tile01/**TP_Tile01.png**` 512², **스프라이트 376장**, 셀 16px, PPU 16 | 마을·야외 재료 한 판. 잔디·흙·덤불·나무·물·나무울타리·돌길·벤치·통·상자·수레·가로등·석상·좌판(차양)·천막·집·묘비·꽃밭·작물·나무데크 | **마당 전체**: 울타리·잔디·돌길·나무·화단·텃밭·데크·차양(파라솔 대용)·헛간 |
| `**TP_Tile03.png**` 512², 스프라이트 122장 (이름 있음) | `Capet00~17`(깔개 18종) · `Table01~03` · `Chair01~03` · `CenTable01` · `BrickTile01~15`(벽돌) · `Dansang01~18`(단상·계단) · `Shadow01~14`(그림자) · `House01~04` · 나무바닥 무늬 · 붉은 융단 | **실내**: 깔개·나무바닥·벽돌벽·식탁/의자·계단·**그림자(가구 접지감)** |
| `**TP_AniTile01.png**` 256², 56장 | 물 애니 · 깃발 · **횃불 불꽃** | **벽난로 불** · 정원 물 |
| `RuleTiles/*.asset` 29개 | 유니티 룰타일(자동 이어붙이기) | Studio Map Editor 의 **Rule Tile 탭**이 같은 개념 — 잔디/길 경계 자동화 |
| `Res/Maps/#99.prefab` | 완성된 샘플 마을 맵 | SPUM 이 실제로 타일을 어떻게 조합하는지 보는 정답지 |
| `SampleVillage/Scripts/*.cs` (15개) | `Pathfinder`(타일맵 A*) · `NPCMovement` · `NPCManager` · `NPCTalkSystem` · `SpeechBubble` · `CameraController` · `WorldManager` | **SPUM 이 직접 쓴 우리 게임과 똑같은 루프.** 충돌·길찾기 규칙을 여기에 맞춘다 |
| 캐릭터 애드온 10종 | Legacy · Ver121 · Ver300 · ModernPackVer1(프리팹 200) · Elf · RetroHeroes · ChosunSet · PaladinSet · MS_Orc · Undead | 캐스트는 이미 6종 완료. 추가 필요 없음 |
| `Retro UI Set` (테마 2종, 이미지 400여장) | 창·버튼·아이콘·장비창·결과창 | (선택) 대화창·증언판 UI 를 SPUM 룩으로 |

### `SPUM187_6000.5.1f1.unitypackage` (3.9MB, 에셋 534)
캐릭터 메이커 코어만. **맵 아트 없음.** 위키(`soonsoon2/SPUM/wiki`)도 캐릭터 도구 문서다.
→ 맵에는 안 쓴다.

### 로컬 클론 `SPUM/` · `SPUM_SupportCollection/` · `SPUM-Experiments/`
캐릭터 툴·라이선스 문서. 맵 아트 없음.

---

## 2. SPUM Studio (spum.soonsoon.ai/studio) — 실제로 열어서 확인

### Object Editor = **재료(타일 그림)를 만드는 곳** (iframe `/studio/pixeldeidtor/`)

| 기능 | 실제 컨트롤 | 쓸 곳 |
|---|---|---|
| **원본 이미지 업로드** | `sourceImageFileInput` | **TP_Tile01/03 을 그대로 올린다** ← 핵심 |
| AI 생성 | 프리셋 `desert/forest/ice/dungeon` · 모델 `gpt-image-2 / gpt-image / FLUX.2-pro` · 품질 low/med/high | 없는 재료만 보충 (냉장고·욕조 등) |
| **Slice** | 격자 열/행 + offsetX/Y + 셀 w/h | 16px 로 잘라 376장을 타일로 |
| **Classify** | AI 분류 → category `floor/obstacle_blocking/obstacle_slowing/item/decoration` · movement `passable/blocked/slowed/none` · interaction `none/collect/inspect/activate` | **충돌·차단이 여기서 정해진다** |
| 픽셀 편집기 | 연필·지우개·채우기·스포이드·선·사각·선택·이동·스머지·픽셀화·밝게·어둡게 / 레이어(추가·삭제·불투명도·잠금·순서) / 블렌드 9종 / 팔레트(PICO-8·GB·프로젝트 36색) | **재료 합성** — 벽난로 = 벽돌 + 불꽃 + 나무선반 |
| 테마 설정 | type `map-theme / tile-set / maze-theme` · 타일 16/32/64 · 격자 8×8~32×32/커스텀 | 집 테마 / 마당 테마로 나눠 굽는다 |
| 내보내기 | 자른 타일 + AI 원본 zip | 게임 쪽 시트로 반출 |

### Map Editor = **배치하는 곳**
- 맵 이름 · 폭/높이 · 타일 크기 `8/16/32/48/64`
- 레이어 5장: `뒤 레이어 2` · `뒤 레이어 1` · `앞 레이어 1` · `워커블` · `장애물`
- 우측 `Theme` 팔레트에서 SMO 테마를 골라 찍는다 · **Rule Tile 탭** · Undo/Redo · JSON import
- 함정: 타일이 안 보이면 `Layers` 의 **NAV 체크(장애물·워커블)를 끈다**

### 저장 모형 (★★★★★)
`localStorage 가 원본`, 서버는 백업. 순서: `export()` 백업 → `localStorage.setItem` → `spum:studio-storage-write` 이벤트 → `saveServerSnapshot()` → 새로고침.
키: `sv_studio_smo_v1`(오브젝트) · `sv_studio_maps_v1`(맵) · `sv_studio_characters_v1`(캐스트) ·
`spum-map-theme-source-state:{SMO_ID}` / `spum-map-theme-export-seed:{SMO_ID}`(앱이 굽는 산출물).

### **Studio 에는 기성 가구 라이브러리가 없다** (확인함)
`sv_studio_smo_v1` 에 든 것은 `SMO_BUILTIN_STONE_WALL`(기본 맵 데이터) 하나뿐이고,
`items.json` 753개는 **전부 캐릭터 장비**(clothing·helmet·weapon·armor·hair·pants·shield·back·body·facehair·eye)다.
→ **가구 재료의 출처는 유니티 패키지 타일셋 + Object Editor 합성 두 가지뿐이다.**

---

## 3. 지금 게임이 잘못 쓰고 있는 것

| 문제 | 근거 |
|---|---|
| **참조 PNG 를 잘라서 맵으로 쓴다** | `spum/bake-ref-theme.mjs` 가 `reference-house.png` 를 32px 격자로 잘라 `house-theme.png` 를 굽는다. 사용자가 금지한 「그림을 평면으로 깔기」 그 자체 |
| **SMO 69개가 손으로 찍은 픽셀** | `spum/smo.json` 의 `visual.kind:"pixel"` = 우리가 `buildsmo.mjs` 로 그린 색배열. SPUM 재료가 아니다 |
| 진짜 SPUM 타일 미사용 | `house-map.json` 의 `tilesets[0].name === "TP_Tile01"` 인데 `columns:0` — 이름만 있고 실제 시트가 안 붙어 있다 |

---

## 4. 재료 대응표 — 참조 그림의 요소 → 진짜 SPUM 자원

| 그림 요소 | SPUM 자원 | 방법 |
|---|---|---|
| 흰 말뚝 울타리 · 대문 | TP_Tile01 울타리·문 | 그대로 |
| 잔디 · 덤불 · 나무 · 꽃밭 | TP_Tile01 잔디/덤불/나무/꽃밭 | 그대로 |
| 돌길 · 포장 | TP_Tile01 돌길 · TP_Tile03 `BrickTile01~15` | 그대로 |
| 나무 데크 · 파라솔 자리 | TP_Tile01 나무데크 + 좌판 차양 | 조합 |
| 헛간(붉은 지붕) | TP_Tile01 집/지붕 | 그대로 |
| 텃밭 두둑 | TP_Tile01 밭흙 + 작물 + 나무테두리 | 조합 |
| 실내 나무바닥 | TP_Tile03 나무바닥 무늬 | 그대로 |
| 깔개(러그) 4장 | TP_Tile03 `Capet00~17` | 그대로 |
| 식탁 + 의자 6 | TP_Tile03 `Table01~03` `Chair01~03` | 그대로 |
| 벽난로 + 나무선반 | TP_Tile03 벽돌 + TP_AniTile01 횃불 불꽃 + TP_Tile01 나무판 | **합성** |
| 책장 벽 | TP_Tile01 좌판 선반 + 책 아이콘 | **합성** |
| L자 소파 · 안락의자 | TP_Tile01 벤치 + 쿠션 색 | **합성** |
| 냉장고 · 싱크대 · 조리대 | 없음 | Object Editor 픽셀 편집 또는 AI 생성 |
| 욕조 · 변기 · 세면대 | 없음 | 동상·물통 재료를 개조 또는 AI 생성 |
| 야외 운동기구 | 없음 | 통·바위 재료 개조 또는 AI 생성 |
| 가구 접지 그림자 | TP_Tile03 `Shadow01~14` | 앞 레이어에 깔아 **평면 느낌 제거** |

**커버율: 진짜 SPUM 아트로 약 2/3, 나머지는 Object Editor 합성.**
합성도 SPUM 워크플로 안이다 — 사용자 지시 「combine materials when necessary」와 같다.

---

## 5. 실행 순서 (SPUM 공식 순서 Object → Map → Cast → World)

1. `TP_Tile01/03/Ani` 에서 쓸 스프라이트만 골라 **재료 아틀라스**를 만든다 (16px 격자, 진짜 픽셀 그대로)
2. 부족한 가구를 그 재료들로 **합성**해 아틀라스에 넣는다
3. Object Editor 에 아틀라스를 올려 Slice → 타일마다 category/movement 지정 (**차단 여부가 곧 게임 충돌**)
4. Map Editor 에서 참조 그림 비율대로 배치 — 뒤2(바닥) · 뒤1(깔개·그림자) · 앞1(가구 윗부분) · 장애물
5. 맵을 게임으로 반출 → `play.html` 이 그대로 읽는다 (`spummap.mjs` 경로 유지)
6. 검증: 스프라이트 선명도 · 가구 크기 · **NPC/플레이어가 가구를 뚫지 않는지** · 길찾기

**손대지 않는 것**: 캐스트 6종 · 기억/소문(`memory.mjs`) · 대사(`dialogue.mjs`) · 라운드(`round.mjs`) · SAM 연결(`serve.mjs`).

---

## 6. 확인 못 한 것 (정직하게)

- 유튜브 3편(`SPUM BASE 소개` · `맵 제작` · 나머지 1편) — **자막을 못 받았다.** 제목만 확인.
  YouTube 가 timedtext 를 막았고 스크립트 패널도 안 열렸다. 화면은 대신 Studio 를 직접 열어 확인했다.
- SAM `api-docs` 페이지는 SPA 라 정적 fetch 로 비어 있다. SAM 자체는 이미 `serve.mjs` 프록시로 200 응답 확인됨.
- Studio 의 `tile-set` / `maze-theme` 타입, Rule Tile 탭, `spawnPoints[]`, SPUM Link/Frame 배포 — 미사용.
