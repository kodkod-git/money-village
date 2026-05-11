-- =====================
-- game_info
-- 게임 세션 메타 정보 테이블
-- game_id별 날짜, 인원수, 게임종류, 분반 번호 저장
-- =====================
CREATE TABLE game_info (
  game_id      varchar     PRIMARY KEY,
  date         date        NOT NULL,
  player_count integer     DEFAULT 0,
  game_type    varchar(10) DEFAULT 'individual',  -- 'individual' | 'team'
  section_num  integer     DEFAULT 1              -- 날짜 내 순번 (01분반, 02분반 ...)
);
ALTER TABLE game_info DISABLE ROW LEVEL SECURITY;

-- 기존 game_individual 데이터에서 game_info 역산 채우기
INSERT INTO game_info (game_id, date, player_count, game_type, section_num)
SELECT
  game_id,
  date,
  COUNT(*)                                                                    AS player_count,
  CASE
    WHEN MAX(NULLIF(TRIM(team_id), '')) IS NOT NULL THEN 'team'
    ELSE 'individual'
  END                                                                         AS game_type,
  ROW_NUMBER() OVER (PARTITION BY date ORDER BY MIN(id))                     AS section_num
FROM game_individual
GROUP BY game_id, date
ON CONFLICT (game_id) DO NOTHING;
