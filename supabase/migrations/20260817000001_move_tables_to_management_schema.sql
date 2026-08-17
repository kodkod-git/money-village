-- 통합관리시스템(money-village) 데이터를 public -> management 스키마로 이동
--
-- ** 실행 전 필수 체크리스트 **
-- 1. 진행 중인 게임 세션이 없는 시간대에 실행할 것 (라이브 이벤트 중 실행 금지)
-- 2. 이 마이그레이션 적용 직후, Supabase 대시보드 Settings > API > Exposed schemas 에
--    'management' 를 추가할 것 (안 하면 PostgREST가 이 스키마를 못 찾음)
-- 3. js/supabase-client.js 의 클라이언트 생성 코드가
--    createClient(..., { db: { schema: 'management' } }) 로 이미 반영되어 있는 상태에서
--    최대한 빨리 함께 배포할 것 (이 마이그레이션 적용 ~ 코드 배포 사이는 기존 코드가 깨짐)
--
-- 데이터/인덱스/FK/RLS 정책은 ALTER TABLE ... SET SCHEMA 로 모두 그대로 유지된 채 이동됨.
-- 참고: Storage 버킷 'pdfs'는 Postgres 테이블이 아니라 Supabase Storage 객체라 이동 대상 아님.

CREATE SCHEMA IF NOT EXISTS management;

ALTER TABLE public.users SET SCHEMA management;
ALTER TABLE public.game_info SET SCHEMA management;
ALTER TABLE public.game_individual SET SCHEMA management;
ALTER TABLE public.game_team SET SCHEMA management;
ALTER TABLE public.stock_price SET SCHEMA management;
ALTER TABLE public.stock_balance SET SCHEMA management;
ALTER TABLE public.cash_balance SET SCHEMA management;
ALTER TABLE public.traits SET SCHEMA management;
ALTER TABLE public.estate_price SET SCHEMA management;
ALTER TABLE public.estate_balance SET SCHEMA management;
ALTER TABLE public.success_factors SET SCHEMA management;
ALTER TABLE public.bank_state SET SCHEMA management;
ALTER TABLE public.bank_history SET SCHEMA management;
ALTER TABLE public.quiz_state SET SCHEMA management;
ALTER TABLE public.quiz_history SET SCHEMA management;
ALTER TABLE public.luck_state SET SCHEMA management;
ALTER TABLE public.luck_history SET SCHEMA management;

-- 'public' 스키마는 PostgreSQL/Supabase가 기본으로 anon, authenticated 에게
-- USAGE 권한을 부여해 두지만, 새로 만든 'management' 스키마는 그렇지 않다.
-- 아래 GRANT 없이는 대시보드에서 Exposed schemas에 추가해도
-- PostgREST가 "permission denied for schema management" 로 전부 실패한다.
GRANT USAGE ON SCHEMA management TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA management TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA management TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA management
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA management
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
