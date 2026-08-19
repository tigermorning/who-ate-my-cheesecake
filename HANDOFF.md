# HANDOFF

## 현재 상태
《Who Ate My Cheesecake?》 — 동물 하우스메이트 추리 게임. 플레이 가능한 프로토타입이 `spum/` 에 돈다.
`node spum/serve.mjs` → http://127.0.0.1:8790/spum/play.html (SAM 키는 `.env`, 커밋 안 됨)

## 방금 끝난 것
- **집을 사양서대로 다시 지었다** — `WHO_ATE_MY_CHEESECAKE_MAP_SPEC.md` + `docs/reference-house.png` 기준.
  단층집 한 채(부엌·식당·욕실·거실·서재·복도)와 울타리 안 뜰(데크·운동장·텃밭·헛간).
  침실과 화원은 없앴다. 설계와 검사 항목은 **`docs/house.md`**, 그림은 `docs/house.png`.
- **바닥·벽·가구를 전부 SPUM 오브젝트(SMO)로 바꿨다.** 타일시트는 더 쓰지 않는다.
  `spum/buildsmo.mjs` 가 67개를 그린다 — 그중 29개는 여러 칸짜리(냉장고 2×3, 난로 4×2, 식탁 4×3, 소파 4×2 …).
  사양의 "가구가 너무 작다"를 여기서 풀었다.
- 검사기 `spum/houseplan.mjs` 를 새로 썼다 — 길·문·겹침·빈자리에 더해 **A\* 로 열 자리까지 실제 경로**를 본다. 실패 0.
- `spum/render.mjs` + `spum/png.mjs` 를 새로 만들었다. 브라우저 없이 도면을 PNG 로 뽑는다 (`node spum/render.mjs 2`).
- 방 이름이 바뀌었으므로 `round.mjs` 의 `ROOMS`, `premise.json`, `cast.json` 도 같이 고쳤다.
  판 엔진 4,000판 불변식 실패 0 (`node spum/roundtest.mjs`).

## 다음 할 일
- 하웰·벤·도른의 SPUM 스프라이트 색을 밝게 다시 뽑는다 (Studio Cast → AI 로 색 지정 → Export → `spum/sprites/`).
- 사람이 가구 뒤로 지나가도 앞에 그려진다. 사람도 Y 정렬에 넣을지 정한다.
- 사양서 §11 의 날씨/알리바이는 아직 없다. 넣으려면 `round.mjs` 에 시각별 날씨를 사실로 만들어야 한다
  (LLM 이 지어내면 규칙 2 위반이다).
- `tilesheet.png` · `tiles-sheet.png` · `tiles.html` · `tiles-meta.json` 은 이제 아무도 안 읽는다. 지울지 정한다.

## 막힌 것
Studio 캐릭터 색을 `localStorage` 로 직접 바꾸면 **서버 스냅샷이 되돌린다.** 반드시 Studio 의 Cast AI 로 바꿔야 저장된다.
