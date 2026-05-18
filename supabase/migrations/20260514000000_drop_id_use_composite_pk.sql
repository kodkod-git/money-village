-- game_individual
ALTER TABLE game_individual
  DROP COLUMN id,
  DROP CONSTRAINT game_individual_game_id_nickname_key,
  ADD PRIMARY KEY (game_id, nickname);

-- stock_balance
ALTER TABLE stock_balance
  DROP COLUMN id,
  DROP CONSTRAINT stock_balance_game_id_nickname_key,
  ADD PRIMARY KEY (game_id, nickname);

-- cash_balance
ALTER TABLE cash_balance
  DROP COLUMN id,
  DROP CONSTRAINT cash_balance_game_id_nickname_key,
  ADD PRIMARY KEY (game_id, nickname);

-- traits
ALTER TABLE traits
  DROP COLUMN id,
  DROP CONSTRAINT traits_game_id_nickname_key,
  ADD PRIMARY KEY (game_id, nickname);

-- estate_balance (생성되어 있는 경우)
ALTER TABLE estate_balance
  DROP COLUMN id,
  DROP CONSTRAINT estate_balance_game_id_nickname_key,
  ADD PRIMARY KEY (game_id, nickname);

-- success_factors (생성되어 있는 경우)
ALTER TABLE success_factors
  DROP COLUMN id,
  DROP CONSTRAINT success_factors_game_id_nickname_key,
  ADD PRIMARY KEY (game_id, nickname);
