# DB 구조 전면 수정

1. primary_key nickname --> user_id로
nickname에 수정이 일어날 때, nickname을 고쳐할 table이 너무 많이 발생하는 탓에 오류 발생률이 올라가고 효율성이 떨어져.

bank_history, cash_balance, estate_balance, game_individual, quiz_history, stock_balance, success_factors, traits

위에는 nickname을 primary_key로 쓰고 있는 테이블들이야. users.user_id로 대체해줘.

supabase-api에도 많은 변화가 생길 것으로 예상돼. 바꿔야 할 모든 기능들을 다 알려주고, 대체되었을 때 예상되는 문제지점들을 얘기해줘도 좋아.


2. game_team.team_total_asset, game_team.members 삭제
해당 두 컬럼은 명예의 전당 / 결과 요약에서 사용되는 것으로 알고 있어.
컬럼을 삭제하고, 해당 정보가 필요할 때 team_id를 이용해 계산하는 형태로 만들어줘.