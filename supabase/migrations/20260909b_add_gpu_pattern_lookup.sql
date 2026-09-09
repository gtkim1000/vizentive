-- C안(백그라운드 비동기 DB 조회, 업그레이드 전용) 지원용. 방문자 GPU 렌더러 문자열을 서버가
-- 이 컬럼과 정규식 매치해서 tier를 산정 — 로컬 화이트리스트(index.html KNOWN_DEVICE_GPU_TIERS)에
-- 없는 기기를 재배포 없이 커버하기 위함. null이면 매치 대상 아님(랭킹 참고용 행 그대로).
-- 2026-09-09.

alter table public.benchmark_android_antutu
  add column if not exists gpu_pattern text;

comment on column public.benchmark_android_antutu.gpu_pattern is
  'JS 정규식 소스 문자열(대소문자 무시, api/device-tier-lookup.js가 new RegExp(pattern,''i'')로 사용). window.__gpuRenderer와 매치되면 이 행의 total_score로 tier 산정.';

-- 오늘 index.html 로컬 화이트리스트에 이미 있는 것과 동일한 칩만 우선 연결(2026-09-09 기준).
-- 갤럭시 S9+(Mali-G72/Adreno630)는 antutu.com 상위 118위 밖이라 이 테이블에 행 자체가 없음 —
-- 로컬 화이트리스트만으로 계속 처리(변경 없음).
update public.benchmark_android_antutu set gpu_pattern = 'Adreno.*?740' where device = 'Galaxy S23+';
update public.benchmark_android_antutu set gpu_pattern = 'Adreno.*?840' where device = 'Galaxy S26 Ultra';
