# HANDOFF

## 현재 상태
《치즈케이크의 밤》 — 동물 하우스메이트 추리 게임. 플레이 가능한 프로토타입이 `spum/` 에 돈다.
`node spum/serve.mjs` → http://127.0.0.1:8790 (SAM 키는 `.env`, 커밋 안 됨)

## 방금 끝난 것
- **집 도면을 다시 그렸다** — 방 다섯이 따로 놓인 상자였던 걸 지붕 하나 아래로 이어 붙였다.
  숫자는 전부 `spum/house.mjs` 한 곳에. `node spum/houseplan.mjs` 로 글자 도면과 검사.
  설계 근거와 사진 대응표는 `docs/집.md`, 그림은 `docs/집.png`
- 판 엔진 `spum/round.mjs` — 범인·방패·포섭. 4,000판 불변식 실패 0 (`node spum/roundtest.mjs`)
- 대사 `spum/dialogue.mjs` + SAM 연결(claude-sonnet-4.6). 게임 안에서 실제 대사 나옴
- 성 화면 `spum/play.html` — 타일맵·소품·증언판·지목
- 종 재배정: 카일=호랑이 · 미라=토끼 · 도른=원숭이 · 하웰=돼지 · 벤=오리 · 플레이어=고양이
- 종 표식(귀·코·부리·꼬리)을 캔버스로 스프라이트 위에 그림 (`drawSpecies`)

## 다음 할 일 (정확히 이것)
`spum/play.html` 의 `drawSpecies()` 에서 **꼬리 위치를 몸에 붙인다.** 지금 꼬리가 몸에서 떨어져 떠 있다.
→ ✅ 완료 (kyle·dorn·ben 꼬리 곡선을 몸쪽으로 좁힘. howell은 이미 가까움)
집 도면에 맞춰 남은 것: 소파(`sofa_l`/`sofa_r`)와 침대 픽셀이 아직 밋밋하다 — `spum/buildsmo.mjs` 에서 손보고
`node spum/buildsmo.mjs > spum/smo.json` 로 다시 뽑는다.
그리고 하웰·벤·도른의 SPUM 스프라이트 색을 밝게 다시 뽑는다 (Studio Cast → AI 로 색 지정 → Export → `spum/sprites/`).

## 막힌 것
Studio 캐릭터 색을 `localStorage` 로 직접 바꾸면 **서버 스냅샷이 되돌린다.** 반드시 Studio 의 Cast AI 로 바꿔야 저장된다.
