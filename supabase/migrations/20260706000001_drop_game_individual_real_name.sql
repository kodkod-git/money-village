-- game_individual.real_name은 users.real_name과 항상 동일하게 유지되어 왔고
-- (users.real_name 변경이 과거 게임 기록에 소급 반영되는 사례가 실제로 없었음을 확인),
-- user_id로 users를 조인하면 그대로 대체 가능한 중복 컬럼이다.
ALTER TABLE game_individual DROP COLUMN IF EXISTS real_name;
