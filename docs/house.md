# 집 도면 — 어떻게 만들어졌나

사양은 [`WHO_ATE_MY_CHEESECAKE_MAP_SPEC.md`](../WHO_ATE_MY_CHEESECAKE_MAP_SPEC.md),
눈으로 본 것은 [`reference-house.png`](reference-house.png), 결과는 [`house.png`](house.png).

## 한 줄

바닥도 벽도 가구도 **전부 SPUM 오브젝트(SMO)** 다. 타일시트는 더 쓰지 않는다.

## 파일이 하는 일

| 파일 | 하는 일 |
| --- | --- |
| `spum/buildsmo.mjs` | 픽셀 그림을 코드로 그려 `smo.json` 을 낸다. 한 칸 16px, `cols×rows` 로 여러 칸을 차지한다 |
| `spum/house.mjs` | 도면(`GRID`)·바닥·깔개·놓인 것(`PROPS`)·서 있는 자리(`SPOT`)·이야기가 걸리는 자리(`LANDMARKS`) |
| `spum/houseplan.mjs` | 도면을 글자로 찍고 검사한다. 길·문·겹침·빈자리·크기 |
| `spum/buildmap.mjs` | SPUM Studio 맵(`house-map.json`)으로 뽑는다 |
| `spum/compose.mjs` | 도면을 한 장의 그림으로 합친다. render·buildtheme 가 같이 쓴다 |
| `spum/render.mjs` | 도면을 PNG 로 뽑는다 (`docs/house.png`) |
| `spum/buildtheme.mjs` | 집을 **SPUM 맵 테마 한 장**으로 굽는다 (`docs/house-theme.png` + `spum/house-theme.json`) |
| `spum/play.html` | 게임 화면. `smo.json` 을 읽어 집을 한 번 그려 두고 사람만 그 위에 얹는다 |

고치는 순서: `house.mjs` 를 고친다 → `node spum/houseplan.mjs` → `node spum/buildmap.mjs > spum/house-map.json` → `node spum/render.mjs 2`.
그림을 고쳤으면 `node spum/buildsmo.mjs` 를 먼저 돌린다.

## 방

40×30 칸, 한 칸 24px, 화면 960×720. 집은 `x=8..31, y=3..26` 한 채, 나머지는 울타리 안 뜰이다.

| 자리 | 범위 | 바닥 | 큰 것 |
| --- | --- | --- | --- |
| 부엌 | x9–16, y4–11 | 돌 | **냉장고 2×3**, 아일랜드 3×2, 레인지, 개수대, 찬장 |
| 식당 | x9–16, y12–25 | 나무 | **식탁 4×3 + 의자 여섯**, 아래쪽에 앉는 자리 |
| 욕실 | x18–21, y4–9 | 하늘색 타일 | 욕조 3×2, 변기, 세면대, 거울 |
| 거실 | x23–30 y4–10 + x18–30 y11–17 | 나무 | **난로 4×2**, ㄱ자 소파(4×2 + 2×3), 탁자 3×2 |
| 서재 | x23–30, y19–25 | 나무 | **큰 책장 2×2 넷**, 책상 3×2 |
| 복도 | x18–21, y11–25 | 나무 | 비워 둔다. 현관·거실·서재가 여기서 갈린다 |
| 데크 | x2–7, y10–18 | 널판 | 파라솔 탁자 3×3, 의자 넷 |
| 운동장 | x2–7, y19–25 | 고무 | 벤치 3×2, 아령 거치대, 기구 2×3, 매트 |
| 텃밭 | x32–37, y15–25 | 흙 | 채소 화단 2×2 넷, 징검돌 |
| 헛간 | x33–37, y6–9 | 나무 | 선반, 상자, 바구니, 농기구 |

문: `(17,11)` 부엌↔거실 · `(17,14)` 식당↔거실 · `(17,20)` 식당↔복도 · `(20,10)` 욕실 · `(22,22)` 서재 · `(20,26)` 현관 · `(35,10)` 헛간.
현관 `(20,26)` 에서 돌길이 `(20,27)–(20,28)` 을 지나 대문 `(19..21,29)` 까지 끊기지 않는다.

## 참고 사진에서 가져온 것

- 왼쪽 큰 방 하나에 부엌과 식당이 벽 없이 이어진다
- 욕실은 가운데 위, 작고 하늘색
- 거실은 오른쪽 위, 난로가 벽 한가운데
- 서재는 오른쪽 아래, 책장이 북쪽 벽을 통째로 채운다
- 뜰: 왼쪽에 데크와 운동 자리, 오른쪽에 헛간과 텃밭, 앞쪽에 돌길과 대문과 우편함
- 밝은 대낮. 빛은 늘 왼쪽 위에서 온다 — 윗면이 밝고 앞면이 중간, 벽 밑에 그림자가 진다

사진을 픽셀 단위로 베끼지 않았다. 짜임새만 24px/SPUM 체계로 옮겼다.

## 검사

`node spum/houseplan.mjs` 가 보는 것:

1. 도면 각 행 길이, `smo.json` 의 그림 크기와 `SIZE` 표가 어긋나지 않는지
2. 가구끼리 겹치지 않는지 (`on: true` 인 것 — 접시·책·쪽지 — 만 겹칠 수 있다)
3. 열한 자리 모두 걸어서 닿는지, 방 안에 고립된 칸이 없는지
4. `LANDMARKS`(냉장고·식탁·난로·서재 책상·책장·현관·데크·운동장·텃밭·헛간)까지 A\* 로 길이 있는지
5. 서 있는 자리 여섯 사이 A\* 가 전부 통하는지
6. 문 양쪽이 뚫려 있는지, 가구가 벽이나 문 위에 있지 않은지
7. 실내에 5×5 가 통째로 비어 있지 않은지

## 안 쓰는 것

침대(`bed_top`/`bed_bottom`)·계단·성벽·실내 잔디는 만들지도 놓지도 않는다. 사양이 금지한다.
옛 타일시트(`tilesheet.png`, `tiles.html`)는 이제 아무도 읽지 않는다.

## SPUM Studio 에 올리는 법

**SPUM 맵은 라이브러리에 있는 SMO 를 바로 그리지 못한다.** 맵이 그릴 수 있는 건
`map.tilesets[]` 에 `source:"map-theme"` 로 등록된 타일뿐이고, 레이어에는 숫자 타일 ID 만 들어간다.
`map.objects[]` 는 SMO 배치가 아니라 사각형 주석이다. 그래서 라이브러리에만 넣으면 맵에 영원히 안 보인다.

그래서 집 한 채를 통째로 **테마 시트 한 장**으로 굽는다.

```
node spum/buildtheme.mjs
  → docs/house-theme.png    512×480 · 16열 × 15행 · 한 칸 32px · 고유 타일 227개
  → spum/house-theme.json   타일 227개의 이름·성질 + 40×30 칸의 타일 번호 + walkable/obstacle
```

시트만으로 집이 픽셀 하나까지 그대로 복원된다(되조립 검사 통과).

굽는 그림에는 **그림자를 넣지 않는다.** 벽 밑 그림자를 구우면 고유 타일이 306개로 불어나
테마 한 장(16×16=256)에 안 들어간다. 게임 화면은 그림자를 실행 중에 직접 그린다.

올리는 순서:

1. Object Editor → 새 SMO 에 `docs/house-theme.png` 를 맵 테마로 넣고 32px 로 자른다
2. Map Editor → 새 맵(40×30) → 우측 `Map Theme Tiles` 에서 그 테마를 고른다
   — 이때 앱이 `tilesets[]` 등록 · `tileIdBase` 배정 · `tileProperties` 생성을 대신 해 준다
3. `house-theme.json` 의 `layer` 를 앱이 만든 packed ID 로 옮겨 `layers[].data[]` 에 넣는다
   (`tileProperties[*].sourceCell` 이 번호 ↔ 칸 대응을 알려 준다)
4. `spumStudioData.saveServerSnapshot('...')` 로 서버에 올린다

`tilesets` 를 손으로 조립하지 말 것. 앱이 굽는 산출물
(`spum-map-theme-source-state:*`, `spum-map-theme-export-seed:*`)이 없으면 화면에 안 뜬다.
