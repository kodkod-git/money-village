-- =====================================================
-- nickname → user_id PK 전환 (8개 테이블)
-- game_team.team_total_asset / members 컬럼 제거
-- =====================================================
--
-- 적용 전 아래 쿼리로 nickname 매칭 실패 행이 있는지 확인할 것.
-- 0건이 아니면 users 테이블에 없는 nickname을 가진 게임 기록이 있다는 뜻이므로,
-- 마이그레이션을 중단하고 원인(오탈자, 삭제된 시민권자 등)을 먼저 조사한다.
--
-- SELECT 'game_individual' AS table_name, count(*) FROM game_individual gi LEFT JOIN users u ON gi.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'stock_balance', count(*) FROM stock_balance sb LEFT JOIN users u ON sb.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'cash_balance', count(*) FROM cash_balance cb LEFT JOIN users u ON cb.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'traits', count(*) FROM traits t LEFT JOIN users u ON t.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'estate_balance', count(*) FROM estate_balance eb LEFT JOIN users u ON eb.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'success_factors', count(*) FROM success_factors sf LEFT JOIN users u ON sf.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'quiz_history', count(*) FROM quiz_history qh LEFT JOIN users u ON qh.nickname = u.nickname WHERE u.user_id IS NULL
-- UNION ALL SELECT 'bank_history', count(*) FROM bank_history bh LEFT JOIN users u ON bh.nickname = u.nickname WHERE u.user_id IS NULL;

-- ---- game_individual ----
ALTER TABLE game_individual ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE game_individual gi
SET user_id = u.user_id
FROM users u
WHERE gi.nickname = u.nickname AND gi.user_id IS NULL;

ALTER TABLE game_individual DROP CONSTRAINT IF EXISTS game_individual_pkey;
ALTER TABLE game_individual DROP COLUMN nickname;
ALTER TABLE game_individual ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE game_individual ADD PRIMARY KEY (game_id, user_id);

-- ---- stock_balance ----
ALTER TABLE stock_balance ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE stock_balance sb
SET user_id = u.user_id
FROM users u
WHERE sb.nickname = u.nickname AND sb.user_id IS NULL;

ALTER TABLE stock_balance DROP CONSTRAINT IF EXISTS stock_balance_pkey;
ALTER TABLE stock_balance DROP COLUMN nickname;
ALTER TABLE stock_balance ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE stock_balance ADD PRIMARY KEY (game_id, user_id);

-- ---- cash_balance ----
ALTER TABLE cash_balance ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE cash_balance cb
SET user_id = u.user_id
FROM users u
WHERE cb.nickname = u.nickname AND cb.user_id IS NULL;

ALTER TABLE cash_balance DROP CONSTRAINT IF EXISTS cash_balance_pkey;
ALTER TABLE cash_balance DROP COLUMN nickname;
ALTER TABLE cash_balance ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE cash_balance ADD PRIMARY KEY (game_id, user_id);

-- ---- traits ----
ALTER TABLE traits ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE traits t
SET user_id = u.user_id
FROM users u
WHERE t.nickname = u.nickname AND t.user_id IS NULL;

ALTER TABLE traits DROP CONSTRAINT IF EXISTS traits_pkey;
ALTER TABLE traits DROP COLUMN nickname;
ALTER TABLE traits ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE traits ADD PRIMARY KEY (game_id, user_id);

-- ---- estate_balance ----
ALTER TABLE estate_balance ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE estate_balance eb
SET user_id = u.user_id
FROM users u
WHERE eb.nickname = u.nickname AND eb.user_id IS NULL;

ALTER TABLE estate_balance DROP CONSTRAINT IF EXISTS estate_balance_pkey;
ALTER TABLE estate_balance DROP COLUMN nickname;
ALTER TABLE estate_balance ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE estate_balance ADD PRIMARY KEY (game_id, user_id);

-- ---- success_factors ----
ALTER TABLE success_factors ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE success_factors sf
SET user_id = u.user_id
FROM users u
WHERE sf.nickname = u.nickname AND sf.user_id IS NULL;

ALTER TABLE success_factors DROP CONSTRAINT IF EXISTS success_factors_pkey;
ALTER TABLE success_factors DROP COLUMN nickname;
ALTER TABLE success_factors ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE success_factors ADD PRIMARY KEY (game_id, user_id);

-- ---- quiz_history ----
ALTER TABLE quiz_history ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE quiz_history qh
SET user_id = u.user_id
FROM users u
WHERE qh.nickname = u.nickname AND qh.user_id IS NULL;

ALTER TABLE quiz_history DROP CONSTRAINT IF EXISTS quiz_history_pkey;
ALTER TABLE quiz_history DROP COLUMN nickname;
ALTER TABLE quiz_history ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE quiz_history ADD PRIMARY KEY (game_id, user_id);

-- ---- bank_history ----
ALTER TABLE bank_history ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE bank_history bh
SET user_id = u.user_id
FROM users u
WHERE bh.nickname = u.nickname AND bh.user_id IS NULL;

ALTER TABLE bank_history DROP CONSTRAINT IF EXISTS bank_history_pkey;
ALTER TABLE bank_history DROP COLUMN nickname;
ALTER TABLE bank_history ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE bank_history ADD PRIMARY KEY (game_id, user_id, round_num, is_team);

-- ---- game_team: 요약 컬럼 제거 (온더플라이 계산으로 대체) ----
ALTER TABLE game_team DROP COLUMN IF EXISTS team_total_asset;
ALTER TABLE game_team DROP COLUMN IF EXISTS members;
