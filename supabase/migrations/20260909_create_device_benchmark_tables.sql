-- 기기 성능 티어(index.html의 KNOWN_DEVICE_GPU_TIERS/AnTuTu11 선형추정 공식) 산정 시 참고할
-- 벤치마크 원자료 저장소. 사이트 방문자 트래픽과 무관한 내부 리서치용 테이블 — 프런트엔드가 읽지
-- 않고, 개발자가 직접(Supabase 대시보드 또는 관리 스크립트로) 조회해 화이트리스트/공식 값을
-- 정할 때 근거로 삼는다. 2026-09-09.

create extension if not exists pgcrypto;

-- iOS: https://browser.geekbench.com/ios-benchmarks (Geekbench 7 공식 차트)
-- 기기명 중복(iPad Pro 일부 모델이 동일 이름으로 다른 점수 두 줄) 때문에 "기기당 1행, 지표별 컬럼"
-- 대신 "기기+지표별 1행" 롱포맷으로 저장 — 어느 single/multi/metal 값이 어느 행과 짝인지 억지로
-- 맞추지 않아도 되게.
create table if not exists public.benchmark_ios_geekbench (
  id uuid primary key default gen_random_uuid(),
  device text not null,
  chip text not null,
  metric text not null check (metric in ('single_core', 'multi_core', 'metal')),
  score integer not null,
  geekbench_version text not null default 'Geekbench 7',
  source_url text not null default 'https://browser.geekbench.com/ios-benchmarks',
  fetched_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.benchmark_ios_geekbench enable row level security;
revoke all on public.benchmark_ios_geekbench from anon, authenticated;

create index if not exists benchmark_ios_geekbench_device_idx
  on public.benchmark_ios_geekbench (device, metric);

comment on table public.benchmark_ios_geekbench is
  'Reference-only Geekbench 7 iOS benchmark scores (browser.geekbench.com/ios-benchmarks), used to help estimate device tiers in index.html. Not read by the public site.';

-- Android/기타: https://www.antutu.com/web/ranking (AnTuTu V11 공식 랭킹)
create table if not exists public.benchmark_android_antutu (
  id uuid primary key default gen_random_uuid(),
  device text not null,
  rank integer,
  total_score integer not null,
  antutu_version text not null default 'V11',
  source_url text not null default 'https://www.antutu.com/web/ranking',
  fetched_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.benchmark_android_antutu enable row level security;
revoke all on public.benchmark_android_antutu from anon, authenticated;

create unique index if not exists benchmark_android_antutu_device_idx
  on public.benchmark_android_antutu (device);

comment on table public.benchmark_android_antutu is
  'Reference-only AnTuTu V11 Android/기타 benchmark scores (antutu.com/web/ranking), used to help estimate device tiers in index.html. Not read by the public site.';

-- New Supabase projects require explicit Data API grants (동일 이유가 consultation_inquiries
-- 마이그레이션에도 적혀있음). service_role만 접근 — 시딩 스크립트/관리자 조회 둘 다 이 키를 씀.
grant usage on schema public to service_role;
grant select, insert, update on public.benchmark_ios_geekbench to service_role;
grant select, insert, update on public.benchmark_android_antutu to service_role;
