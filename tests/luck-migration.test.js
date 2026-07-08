// tests/luck-migration.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const migrationPath = path.join(root, 'supabase/migrations/20260708000000_add_luck_tables.sql');

assert(fs.existsSync(migrationPath), 'luck migration file should exist');
const sql = fs.readFileSync(migrationPath, 'utf8');

assert(/CREATE TABLE IF NOT EXISTS luck_state/.test(sql), 'should create luck_state table');
assert(/game_id\s+text\s+PRIMARY KEY/.test(sql), 'luck_state should use game_id as primary key');
assert(/rps_multiplier\s+numeric\s+NOT NULL DEFAULT 4/.test(sql), 'rps_multiplier should default to 4');
assert(/roulette_multiplier\s+numeric\s+NOT NULL DEFAULT 5/.test(sql), 'roulette_multiplier should default to 5');
assert(/dice_multiplier\s+numeric\s+NOT NULL DEFAULT 7/.test(sql), 'dice_multiplier should default to 7');
assert(/is_closed\s+boolean\s+NOT NULL DEFAULT false/.test(sql), 'luck_state should have is_closed flag');
assert(/ALTER TABLE luck_state DISABLE ROW LEVEL SECURITY/.test(sql), 'luck_state should disable RLS like bank_state/quiz_state');

assert(/CREATE TABLE IF NOT EXISTS luck_history/.test(sql), 'should create luck_history table');
assert(/id\s+bigint\s+GENERATED (ALWAYS|BY DEFAULT) AS IDENTITY PRIMARY KEY/.test(sql), 'luck_history should use a surrogate identity PK (multiple plays per player allowed)');
assert(/luck_type\s+text\s+NOT NULL/.test(sql), 'luck_history should store which game was played');
assert(/is_win\s+boolean\s+NOT NULL/.test(sql), 'luck_history should store win/loss');
assert(/ALTER TABLE luck_history DISABLE ROW LEVEL SECURITY/.test(sql), 'luck_history should disable RLS like bank_history/quiz_history');

assert(/ALTER TABLE game_individual[\s\S]*ADD COLUMN IF NOT EXISTS luck_reward integer DEFAULT 0/.test(sql), 'game_individual should gain a luck_reward column');

console.log('luck-migration.test.js passed');
