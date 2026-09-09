# 기기 성능 벤치마크 참고 DB

`index.html`의 기기 성능 티어(`KNOWN_DEVICE_GPU_TIERS` 화이트리스트, AnTuTu11 선형추정 공식)를 정할 때
참고하는 원자료를 상담 DB와 같은 Supabase 프로젝트에 별도 테이블로 저장합니다.

`benchmark_ios_geekbench`는 여전히 리서치 전용(프런트엔드가 안 읽음)이지만, `benchmark_android_antutu`는
2026-09-09부터 `gpu_pattern` 컬럼이 채워진 행에 한해 **실제 방문자 부팅 경로에서도 쓰입니다**
(아래 "C안" 참고) — `api/device-tier-lookup.js`가 `service_role` 키로 읽어 응답할 뿐, 브라우저가 테이블에
직접 접근하진 않습니다(RLS로 anon/authenticated는 여전히 차단).

## 테이블

- `benchmark_ios_geekbench` — 출처: [browser.geekbench.com/ios-benchmarks](https://browser.geekbench.com/ios-benchmarks)
  (Geekbench 7). 기기명 중복 샘플이 있어 "기기+지표(`single_core`/`multi_core`/`metal`)당 1행" 롱포맷.
- `benchmark_android_antutu` — 출처: [antutu.com/web/ranking](https://www.antutu.com/web/ranking)
  (AnTuTu V11). 기기당 1행(`device` 유니크).

## 설정

1. Supabase SQL Editor에서 두 마이그레이션을 순서대로 실행합니다(REST API 키로는 DDL을 못 돌려서
   이 단계는 반드시 수동):
   - `supabase/migrations/20260909_create_device_benchmark_tables.sql` — 테이블 생성
   - `supabase/migrations/20260909b_add_gpu_pattern_lookup.sql` — `gpu_pattern` 컬럼 추가 + 초기 매치값
2. `node tools/seed-device-benchmarks.js`로 데이터를 채웁니다. `benchmark_ios_geekbench`는 매 실행마다
   전량 삭제 후 재삽입(유니크 제약 없음), `benchmark_android_antutu`는 `device` 기준 upsert(`gpu_pattern`은
   이 스크립트가 안 건드림 — SQL로 직접 관리).
3. 값을 갱신하려면 `tools/seed-device-benchmarks.js`의 `IOS_SINGLE`/`IOS_MULTI`/`IOS_METAL`/
   `ANDROID_RANKING` 배열을 새 캡처값으로 고쳐 다시 실행합니다.

## C안: 화이트리스트 미스 시 백그라운드 DB 조회

`index.html`의 `KNOWN_DEVICE_GPU_TIERS`(로컬 화이트리스트)에 없는 GPU 문자열이 나오면, 부팅은 그대로
tier0으로 즉시 진행하면서 백그라운드로 `api/device-tier-lookup.js`를 fire-and-forget 호출합니다. 이
API는 `benchmark_android_antutu`에서 `gpu_pattern`이 채워진 행만 읽어 방문자의 `window.__gpuRenderer`와
정규식 매치하고, 매치되면 그 행의 `total_score`를 AnTuTu11 공식(`index.html`과 동일 앵커/계수, API 파일
상단에도 중복 정의돼 있으니 **공식을 바꾸면 두 곳 다 바꿀 것**)에 넣어 tier를 계산해 돌려줍니다. 실패/
타임아웃(3초)/매치없음은 전부 조용히 무시되고, 이미 로컬로 부팅된 화면은 영향 없음 — 매치되면
`applyDeviceTier`로 업그레이드만(다운그레이드 없음).

**새 칩을 추가하려면** 코드 배포 없이 SQL만으로 됩니다:
```sql
update public.benchmark_android_antutu set gpu_pattern = 'Adreno.*?750' where device = '어떤 기기명';
```
(그 기기명이 테이블에 없으면 `insert`로 새 행부터 추가.)

## 사용 시 주의

- **AnTuTu 버전이 다르면(V10/V11 등) 점수 체계가 달라 직접 비교 불가** — 항상 같은 버전끼리만 비교.
- iOS는 GPU 렌더러 문자열로 기기를 특정 못 해(iOS Safari가 "Apple GPU"로 뭉뚱그림) 화이트리스트에
  직접 못 넣음 — 화면 해상도+배율(`devicePixelRatio`)로 대신 구분(`index.html`의 `iosKnownTier()`).
- iOS와 Android 점수는 척도가 달라 직접 비교 불가 — 두 실측 확정점(S9+=tier0, iPhone14=tier0, 둘 다
  실기기 테스트로 확인됨)을 기준으로 "각자 생태계 내 1위 대비 상대위치(%)"로 환산해 교차비교.
- 범용 벤치마크 점수가 이 사이트의 실제 CSS 합성 워크로드 성능과 반드시 비례하진 않음(iPhone14가
  Geekbench/AnTuTu 모두 Galaxy S23+와 비슷하거나 높은데도 실측 워크로드에선 Galaxy S9+급으로 느림,
  2026-09-09 실측 확인) — 최종 판단은 항상 실기기 `?dt=1` 확인을 우선.

테이블은 RLS가 활성화되어 있고 `service_role`에만 select/insert/update 권한이 있습니다.
