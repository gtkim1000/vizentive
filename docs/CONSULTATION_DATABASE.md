# 상담 DB 연결

상담 폼은 `/api/inquiries`를 통해 Supabase PostgreSQL에 저장합니다. 브라우저에는 Supabase Secret key를 노출하지 않습니다.

## 설정

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/migrations/20260803_create_consultation_inquiries.sql`을 실행합니다.
3. Vercel 프로젝트 환경 변수에 다음 값을 등록합니다.
   - `SUPABASE_URL`: Supabase 프로젝트 URL
   - `SUPABASE_SECRET_KEY`: `sb_secret_`으로 시작하는 서버 전용 Secret key
4. Vercel을 다시 배포합니다.

## 저장 내용

- 접수번호, 회사·브랜드명, 담당자명
- 연락처, 업종, 이메일
- 필요한 서비스, 예상 제작 수량, 희망 일정, 문의 내용
- 접수 경로(문자 또는 오픈카톡), 동의 여부, 접수 시각, 처리 상태

테이블은 RLS가 활성화되어 있으며 익명·일반 인증 사용자의 직접 접근 권한을 제거했습니다. 조회와 관리는 Supabase 대시보드 또는 별도 관리자 API에서 수행합니다.
