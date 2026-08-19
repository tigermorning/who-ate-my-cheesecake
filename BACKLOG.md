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

## 지금 하는 것
- [ ] **캐릭터 6종 주입 확인** — `spum/check-characters.mjs` 실행해서 Studio localStorage
      `sv_studio_characters_v1` 에 6종이 살아 있는지, equipment/colors 가 `cast.json` 과 맞는지 확인

## 다음 (순서대로)
- [ ] Cast Export 또는 서버 저장 — `window.spumStudioData.saveServerSnapshot('manual')`.
      localStorage 만으로는 프로필이 날아가면 같이 날아간다
- [ ] play.html 에서 SPUM 런타임 캐릭터 렌더링 테스트 — 캐릭터가 스프라이트로 그려지는지
- [ ] Step 5: NPC 기억 + 소통 — 사건 기억, 자연스러운 정보 공유
- [ ] Step 6: 맵 통합 — 도면은 다 됐다. 남은 건 상호작용 지점 연결 (`LANDMARKS`)
- [ ] Step 7: 데모 검증 — 자율이동, 상호작용, 기억, 소통 전부 확인

## 알려진 문제
- **serve.mjs 가 자꾸 죽는다** — 에이전트 셸 타임아웃(10초)이 서버 프로세스를 같이 죽였다.
  반드시 백그라운드로 띄울 것. 죽으면 `/api/bridge/pull` 이 `ERR_CONNECTION_REFUSED` 로 뜬다.
- **8790 포트 선점** — 이전 node 프로세스가 남아 있으면 `EADDRINUSE`. 먼저 정리하고 띄운다.
- **Playwright 브라우저가 자꾸 닫힌다** — 스크립트가 끝나면서 `context.close()` 를 부르거나,
  부모 셸이 타임아웃으로 죽으면 브라우저도 같이 닫힌다. 프로필은 Windows `%TEMP%\spum-chrome-profile`
  이므로 **Windows node 로 실행**해야 로그인 세션이 붙는다 (WSL node 로 돌리면 다른 프로필을 본다).
- **`cast.json` 데이터 오염** — `sgn_coco.persona.background` 에 중국어 `好奇心`,
  `sgn_peach.persona.personality` 에 `"_social"` 이 섞여 있다. SAM 프롬프트로 나가기 전에 고칠 것.
- **SPKG 암호화** (`SPUM_SECURE_DEV1`) — 스프라이트 직접 접근 불가. 런타임 경유만 가능.
- **SPUM 의존성 570+ 파일** — 로컬 번들링 어렵다. CDN 프록시로 간다.
- **Studio 캐릭터 색은 Cast AI 를 거쳐야 저장된다** (직접 색만 바꾸면 저장이 안 붙는 사례 있었음).
