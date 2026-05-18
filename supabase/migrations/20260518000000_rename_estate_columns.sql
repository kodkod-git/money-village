-- estate_price 컬럼 rename
ALTER TABLE estate_price
    RENAME COLUMN nooridambi TO gaongaemi;
ALTER TABLE estate_price
    RENAME COLUMN damigorani TO nurigoyangi;
ALTER TABLE estate_price
    RENAME COLUMN girugi TO damiwonsungi;
ALTER TABLE estate_price
    RENAME COLUMN chorongdam TO chorongbungi;

-- estate_balance 컬럼 rename
ALTER TABLE estate_balance
    RENAME COLUMN nooridambi TO gaongaemi;
ALTER TABLE estate_balance
    RENAME COLUMN damigorani TO nurigoyangi;
ALTER TABLE estate_balance
    RENAME COLUMN girugi TO damiwonsungi;
ALTER TABLE estate_balance
    RENAME COLUMN chorongdam TO chorongbungi;
