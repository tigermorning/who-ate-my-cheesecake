# SPUM Studio — Map Theme Tiles(SRC) 미리보기 크롭 버그 ★★★★★

> 확인 시점: 2026-08-21 · 확인 위치: `https://spum.soonsoon.ai/studio/?section=map` → Map Editor → MAP THEME TILES

## 증상

Map Editor 우측 **MAP THEME TILES → SRC** 미리보기가 오브젝트(테마 시트) 전체를 못 보여주고
한쪽(위/오른쪽)이 잘려서 표시됨. VIEW 드롭다운(16px/32px 등) 값과 무관하게 발생.

## 원인 (DOM 확인)

```
.tp-scroll   { width: 292px; height: 140px; overflow-y: hidden; }   // 뷰포트(고정 크기)
.tp-stage    { width: 399px; height: 399px; }                        // 실제 콘텐츠(더 큼)
```

`tp-stage`(콘텐츠)가 `tp-scroll`(뷰포트)보다 크고, `overflow-y: hidden`이라
**스크롤바도 없고 리사이즈(scale-to-fit)도 안 걸림** → 콘텐츠가 그냥 잘려서 보임.
스크롤 휠, 드래그 모두 안 먹음(`scrollTop` 그대로 0).

## 회피법 ★★★★★ (직접 재현·해결함)

BRUSH 옆 **VIEW 드롭다운 오른쪽 돋보기(－) 아이콘**을 눌러서 확대 단계를 낮추면
`tp-stage` 크기가 단계적으로 줄어듦: `399→294→220→168→140`.
`tp-stage` 가로/세로가 `tp-scroll`(292×140) 이하로 내려가는 순간 전체가 잘림 없이 다 보임.

→ **SRC가 잘려 보이면: 돋보기(－) 아이콘을 stage 크기가 292×140 이하가 될 때까지 클릭**
(대략 4번, 정확한 클릭 수는 시작 확대 단계에 따라 다를 수 있음).

이 상태에서 SRC 미리보기 클릭 → 타일 선택 → 맵에 배치까지 정상 동작 확인함
(`detail 66` 타일 선택 후 맵 칸에 배치 → 정상 렌더 확인, 테스트라 즉시 undo로 원복).

## 참고

- Studio 자체(우리 코드 아님) 프론트엔드 버그라 우리 쪽에서 수정 불가. 매번 이 회피법 쓸 것.
- 이 문서는 [CLAUDE.md](CLAUDE.md) §3 (SPUM Studio 함정) 계열 추가 항목 — 팀 CLAUDE.md 병합 시 §3-13 정도로 옮길 것.
