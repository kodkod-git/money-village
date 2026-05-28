// Supabase 브라우저 클라이언트
// SUPABASE_URL, SUPABASE_ANON_KEY는 index.html에 인라인으로 설정
// (브라우저에서는 process.env 불가 — anon key는 공개 키라 노출 안전)

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function _toStorageKey(fileName) {
    if (!/[^\x00-\x7F]/.test(fileName)) return fileName;
    let h = 0;
    for (let i = 0; i < fileName.length; i++) h = (Math.imul(31, h) + fileName.charCodeAt(i)) | 0;
    const hash = Math.abs(h).toString(36).slice(0, 6);
    const dotIdx = fileName.lastIndexOf('.');
    const ext = dotIdx !== -1 ? fileName.slice(dotIdx) : '';
    const nameOnly = dotIdx !== -1 ? fileName.slice(0, dotIdx) : fileName;
    const base = nameOnly.split('_').map(part =>
        /[^\x00-\x7F]/.test(part) ? hash : part
    ).filter(Boolean).join('_');
    return `${base}${ext}`;
}

function _nick(raw) {
    return String(raw || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 5);
}
function _text(raw, maxLen = 5) {
    return String(raw || '').replace(/\s+/g, '').trim().slice(0, maxLen);
}

// =========================================================
// 시민권자 (users)
// =========================================================

async function sbListCitizens() {
    const { data, error } = await _sb.from('users').select('*').order('nickname');
    if (error) return { users: [] };
    return { users: (data || []).map(u => ({ ...u, default_EFTI: u.default_efti })) };
}

async function sbRegisterCitizen({ nickname, real_name, default_EFTI = 'FAEN', user_type = 'child' }) {
    const nick = _nick(nickname);
    const name = _text(real_name);
    if (!nick) return { success: false, code: 'EMPTY_NICKNAME' };
    if (!name) return { success: false, code: 'EMPTY_REAL_NAME' };

    const { data: existing } = await _sb.from('users').select('nickname').eq('nickname', nick).maybeSingle();
    if (existing) return { success: false, code: 'DUPLICATE_NICKNAME' };

    const { error } = await _sb.from('users').insert({
        nickname:     nick,
        real_name:    name,
        join_date:    new Date().toISOString().slice(0, 10),
        is_citizen:   true,
        default_efti: String(default_EFTI || 'FAEN').trim(),
        status:       'active',
        user_type:    user_type === 'adult' ? 'adult' : 'child'
    });
    if (error) return { success: false, code: 'DB_ERROR', message: error.message };
    return { success: true, nickname: nick, real_name: name };
}

async function sbDeleteCitizen(nickname) {
    const nick = _nick(nickname);
    if (!nick) return { success: false, code: 'EMPTY_NICKNAME' };

    const { data: user } = await _sb.from('users').select('nickname').eq('nickname', nick).maybeSingle();
    if (!user) return { success: false, code: 'USER_NOT_FOUND' };

    const tables = ['cash_balance', 'game_individual', 'estate_balance', 'success_factors', 'stock_balance', 'traits'];
    for (const table of tables) {
        const { error } = await _sb.from(table).delete().eq('nickname', nick);
        if (error) return { success: false, code: 'DELETE_FAILED', table, message: error.message };
    }

    const { error: e5 } = await _sb.from('users').delete().eq('nickname', nick);
    if (e5) return { success: false, code: 'DELETE_FAILED', message: e5.message };

    return { success: true, nickname: nick };
}

async function sbUpdateCitizen({ original_nickname, nickname, real_name, default_EFTI, status }) {
    const originalNick = _nick(original_nickname);
    if (!originalNick) return { success: false, code: 'EMPTY_NICKNAME' };

    const newNick = nickname ? _nick(nickname) : originalNick;
    const updates = {};
    if (newNick)      updates.nickname     = newNick;
    if (real_name)    updates.real_name    = _text(real_name);
    if (default_EFTI) updates.default_efti = String(default_EFTI).trim();
    if (status)       updates.status       = String(status).trim();

    if (newNick !== originalNick) {
        const { data: dup } = await _sb.from('users').select('nickname').eq('nickname', newNick).maybeSingle();
        if (dup) return { success: false, code: 'DUPLICATE_NICKNAME' };
    }

    const { error } = await _sb.from('users').update(updates).eq('nickname', originalNick);
    if (error) return { success: false, code: 'DB_ERROR', message: error.message };
    return { success: true };
}

// =========================================================
// 게임 결과 저장
// =========================================================

async function sbSaveStockValue(stockValues) {
    const gameId = crypto.randomUUID().split('-')[0];
    const { error } = await _sb.from('stock_price').insert({
        game_id: gameId,
        sasung:  Number(stockValues[0] ?? 1500),
        lgi:     Number(stockValues[1] ?? 600),
        skei:    Number(stockValues[2] ?? 1600),
        cacao:   Number(stockValues[3] ?? 4000),
        hyunde:  Number(stockValues[4] ?? 6000),
        naber:   Number(stockValues[5] ?? 7000)
    });
    if (error) { console.error('[sbSaveStockValue]', error); return null; }
    return gameId;
}

async function sbUpdateStockPrice(gameId, stockValues) {
    if (!gameId) return null;
    const { error } = await _sb.from('stock_price').upsert({
        game_id: gameId,
        sasung:  Number(stockValues[0] ?? 1500),
        lgi:     Number(stockValues[1] ?? 600),
        skei:    Number(stockValues[2] ?? 1600),
        cacao:   Number(stockValues[3] ?? 4000),
        hyunde:  Number(stockValues[4] ?? 6000),
        naber:   Number(stockValues[5] ?? 7000)
    }, { onConflict: 'game_id' });
    if (error) { console.error('[sbUpdateStockPrice]', error); return null; }
    return gameId;
}

// 게임 시작 시 초기 레코드 삽입 (자산 = 0)
async function sbInitGame(gameId, mode, players, stockValues, gameVariant = 'basic', date = null) {
    const today = date || new Date().toISOString().slice(0, 10);
    const isAdvancedLike = gameVariant !== 'basic';

    // stock_price (기본 모드에서만)
    if (!isAdvancedLike) {
        const { error: spErr } = await _sb.from('stock_price').insert({
            game_id: gameId,
            sasung:  Number(stockValues[0] ?? 1500),
            lgi:     Number(stockValues[1] ?? 600),
            skei:    Number(stockValues[2] ?? 1600),
            cacao:   Number(stockValues[3] ?? 4000),
            hyunde:  Number(stockValues[4] ?? 6000),
            naber:   Number(stockValues[5] ?? 7000)
        });
        if (spErr) console.error('[sbInitGame] stock_price', spErr);
    }

    // game_info (section_num 자동 계산)
    const { count } = await _sb.from('game_info').select('*', { count: 'exact', head: true }).eq('date', today);
    const { error: giErr } = await _sb.from('game_info').insert({
        game_id:      gameId,
        date:         today,
        player_count: players.length,
        game_type:    mode,
        section_num:  (count || 0) + 1,
        game_variant: gameVariant
    });
    if (giErr) console.error('[sbInitGame] game_info', giErr);

    const nicks = players.map(p => ({
        nick: _nick(p.nickname || p.name || ''),
        name: _text(p.realName || p.name || ''),
        efti: String(p.efti || 'FAEN').trim(),
        p
    })).filter(r => r.nick);

    // users (upsert — 없으면 생성, 있으면 기본정보 갱신)
    // rich_vessel이면 user_type='adult' 명시, 나머지는 컬럼 포함 안 해서 기존값 보존
    const userRows = nicks.map(({ nick, name, efti }) => {
        const row = {
            nickname:     nick,
            real_name:    name,
            join_date:    today,
            is_citizen:   false,
            default_efti: efti,
            status:       'active'
        };
        if (gameVariant === 'rich_vessel') row.user_type = 'adult';
        return row;
    });
    if (userRows.length > 0) {
        const { error } = await _sb.from('users').upsert(userRows, { onConflict: 'nickname' });
        if (error) console.error('[sbInitGame] users', error);
    }

    // cash_balance (전체 0 init)
    const cashRows = nicks.map(({ nick }) => ({
        game_id: gameId, nickname: nick,
        bill_100: 0, bill_500: 0, bill_1000: 0,
        bill_5000: 0, bill_10000: 0, bill_50000: 0
    }));
    if (cashRows.length > 0) {
        const { error } = await _sb.from('cash_balance').upsert(cashRows, { onConflict: 'game_id,nickname' });
        if (error) console.error('[sbInitGame] cash_balance', error);
    }

    if (isAdvancedLike) {
        // estate_balance (심화/부자의그릇 — 0 init)
        const estateRows = nicks.map(({ nick }) => ({
            game_id: gameId, nickname: nick,
            gaongaemi: 0, nurigoyangi: 0, damiwonsungi: 0,
            marusuri: 0, chorongbungi: 0, haniyuwoo: 0
        }));
        if (estateRows.length > 0) {
            const { error } = await _sb.from('estate_balance').upsert(estateRows, { onConflict: 'game_id,nickname' });
            if (error) console.error('[sbInitGame] estate_balance', error);
        }

        // success_factors (심화/부자의그릇 — false init)
        const sfRows = nicks.map(({ nick }) => ({
            game_id: gameId, nickname: nick,
            financial_management: false, communication: false,
            critical_thinking: false, global_economy: false,
            credit_trust: false, entrepreneurship: false
        }));
        if (sfRows.length > 0) {
            const { error } = await _sb.from('success_factors').upsert(sfRows, { onConflict: 'game_id,nickname' });
            if (error) console.error('[sbInitGame] success_factors', error);
        }
    } else {
        // stock_balance (기본 — 0 init)
        const stockRows = nicks.map(({ nick }) => ({
            game_id: gameId, nickname: nick,
            sasung: 0, lgi: 0, skei: 0, cacao: 0, hyunde: 0, naber: 0
        }));
        if (stockRows.length > 0) {
            const { error } = await _sb.from('stock_balance').upsert(stockRows, { onConflict: 'game_id,nickname' });
            if (error) console.error('[sbInitGame] stock_balance', error);
        }

        // traits (기본 — false init)
        const traitRows = nicks.map(({ nick }) => ({
            game_id: gameId, nickname: nick,
            diligent: false, saving: false, invest: false,
            career: false, luck: false, adventure: false
        }));
        if (traitRows.length > 0) {
            const { error } = await _sb.from('traits').upsert(traitRows, { onConflict: 'game_id,nickname' });
            if (error) console.error('[sbInitGame] traits', error);
        }
    }

    // game_individual (자산 0)
    const indivRows = nicks.map(({ nick, name, p }) => ({
        nickname:         nick,
        real_name:        name,
        total_asset:      0,
        cash:             0,
        stock:            0,
        diligence_reward: 0,
        game_id:          gameId,
        team_id:          p.teamId || null
    }));
    if (indivRows.length > 0) {
        const { error } = await _sb.from('game_individual').insert(indivRows);
        if (error) console.error('[sbInitGame] game_individual', error);
    }

    // game_team (팀전인 경우, 총자산 0)
    if (mode === 'team') {
        const teamMap = {};
        players.forEach(p => {
            const tid = p.teamId || '';
            if (!tid) return;
            if (!teamMap[tid]) teamMap[tid] = { name: p.team || '', members: [] };
            const nick = _nick(p.nickname || p.name || '');
            if (nick) teamMap[tid].members.push(nick);
        });

        for (const [tid, t] of Object.entries(teamMap)) {
            if (!tid || !t.name) continue;
            const { error } = await _sb.from('game_team').upsert({
                team_id:          tid,
                game_id:          gameId,
                team_name:        _text(t.name),
                team_total_asset: 0,
                members:          t.members.join(', ')
            }, { onConflict: 'team_id' });
            if (error) console.error('[sbInitGame] game_team', error);
        }
    }
}

async function sbSaveUserBalance(nickname, gameId, assets) {
    const nick = _nick(nickname);
    const gid  = String(gameId || '').trim();
    if (!nick || !gid) return;

    await _sb.from('stock_balance').upsert({
        nickname: nick, game_id: gid,
        sasung:  Number(assets['SASUNG']  || 0),
        lgi:     Number(assets['LGI']     || 0),
        skei:    Number(assets['SKEI']    || 0),
        cacao:   Number(assets['CACAO']   || 0),
        hyunde:  Number(assets['HYUNDE']  || 0),
        naber:   Number(assets['NABER']   || 0)
    }, { onConflict: 'game_id,nickname' });

    await _sb.from('cash_balance').upsert({
        nickname: nick, game_id: gid,
        bill_100:   Number(assets['100']   || 0),
        bill_500:   Number(assets['500']   || 0),
        bill_1000:  Number(assets['1000']  || 0),
        bill_5000:  Number(assets['5000']  || 0),
        bill_10000: Number(assets['10000'] || 0),
        bill_50000: Number(assets['50000'] || 0)
    }, { onConflict: 'game_id,nickname' });
}

async function sbLoadUserBalance(nickname, gameId) {
    const { data } = await _sb
        .from('stock_balance').select('*')
        .eq('nickname', nickname).eq('game_id', gameId)
        .maybeSingle();
    if (!data) return null;
    return {
        SASUNG: data.sasung, LGI: data.lgi,   SKEI:   data.skei,
        CACAO:  data.cacao,  HYUNDE: data.hyunde, NABER: data.naber
    };
}

async function sbSaveTraits(gameId, players) {
    if (!gameId) return;
    const rows = players
        .map(p => ({
            nickname:  _nick(p.nickname || ''),
            game_id:   gameId,
            diligent:  !!(p.traits && p.traits.diligent),
            saving:    !!(p.traits && p.traits.saving),
            invest:    !!(p.traits && p.traits.invest),
            career:    !!(p.traits && p.traits.career),
            luck:      !!(p.traits && p.traits.luck),
            adventure: !!(p.traits && p.traits.adventure)
        }))
        .filter(r => r.nickname);
    if (rows.length === 0) return;
    const { error } = await _sb.from('traits').upsert(rows, { onConflict: 'game_id,nickname' });
    if (error) console.error('[sbSaveTraits]', error);
}

async function sbSaveGameResult({ mode, date, game_variant = 'basic', individuals = [], teams = [] }) {
    const { data: existingUsers } = await _sb.from('users').select('nickname');
    const existingNicknames = new Set((existingUsers || []).map(u => u.nickname));

    for (const p of individuals) {
        const nickname = _nick(p.nickname ?? '');
        const realName = _text(p.real_name ?? '');
        if (!nickname && !realName) continue;
        const finalNickname = nickname || realName;

        if (!existingNicknames.has(finalNickname)) {
            await _sb.from('users').insert({
                nickname:     finalNickname,
                real_name:    realName || '',
                join_date:    date,
                is_citizen:   true,
                default_efti: p.efti_type || 'FAEN',
                status:       'active'
            });
            existingNicknames.add(finalNickname);
        }

        await _sb.from('game_individual').upsert({
            nickname:         finalNickname,
            real_name:        _text(p.real_name ?? ''),
            total_asset:      Number(p.total ?? 0),
            cash:             Number(p.manualCash ?? 0),
            stock:            Number(p.stockVal ?? 0),
            diligence_reward: Number(p.diligence_reward ?? 0),
            quest_reward:     Number(p.questReward ?? 0),
            deposit_reward:   Number(p.depositReward ?? 0),
            game_id:          String(p.game_id || '').trim(),
            team_id:          String(p.team_id || '').trim() || null
        }, { onConflict: 'game_id,nickname' });
    }

    if (mode === 'team') {
        for (const t of teams) {
            const teamId   = String(t.team_id || '').trim();
            const teamName = _text(t.name ?? '');
            const gameId   = String(t.game_id || '').trim();
            if (!teamId || !teamName || !gameId) continue;
            await _sb.from('game_team').upsert({
                team_id:          teamId,
                game_id:          gameId,
                team_name:        teamName,
                team_total_asset: Number(t.total ?? 0),
                members:          String(t.members ?? '')
            }, { onConflict: 'team_id' });
        }
    }

    // game_info upsert: 날짜 내 section_num 자동 계산
    const gameId = String((individuals[0] || teams[0] || {}).game_id || '').trim();
    if (gameId) {
        const { data: existing } = await _sb.from('game_info').select('game_id').eq('game_id', gameId).maybeSingle();
        if (!existing) {
            const { count } = await _sb.from('game_info').select('*', { count: 'exact', head: true }).eq('date', date);
            await _sb.from('game_info').insert({
                game_id:      gameId,
                date,
                player_count: individuals.length,
                game_type:    mode,
                section_num:  (count || 0) + 1,
                game_variant
            });
        } else {
            await _sb.from('game_info').update({
                player_count: individuals.length,
                game_type:    mode,
                game_variant
            }).eq('game_id', gameId);
        }
    }

    return { success: true };
}

async function sbLoadAssetsByDate(date) {
    let query = _sb.from('game_individual').select('*').order('total_asset', { ascending: false });
    if (date) query = query.eq('date', date);
    const { data } = await query;
    return { success: true, history: data || [] };
}

// 과거 게임 날짜 목록 (dropdown용)
async function sbGetGameDates() {
    const { data } = await _sb.from('game_info').select('date').order('date', { ascending: false });
    if (!data) return [];
    const seen = new Set();
    return data.map(r => r.date).filter(d => { if (seen.has(d)) return false; seen.add(d); return true; });
}

// 특정 날짜의 게임 목록 + 참가자 미리보기 (카드용)
async function sbGetGamesByDate(date) {
    const { data: games } = await _sb.from('game_info').select('*').eq('date', date).order('section_num');
    if (!games || games.length === 0) return [];
    return Promise.all(games.map(async game => {
        const { data: rows } = await _sb.from('game_individual')
            .select('real_name').eq('game_id', game.game_id).limit(6);
        return { ...game, preview_names: (rows || []).map(r => r.real_name).filter(Boolean) };
    }));
}

// game_id 기반 플레이어 전체 로드
async function sbLoadAssetsByGameId(gameId) {
    const { data } = await _sb.from('game_individual').select('*')
        .eq('game_id', gameId).order('total_asset', { ascending: false });
    return { success: true, history: data || [] };
}

// game_id 참가자 목록 (nickname, real_name, default_efti)
async function sbGetPlayersByGameId(gameId) {
    const { data: rows } = await _sb.from('game_individual')
        .select('nickname, real_name, team_id').eq('game_id', gameId);
    if (!rows || rows.length === 0) return [];

    const nicknames = rows.map(r => r.nickname).filter(Boolean);
    const { data: users } = await _sb.from('users')
        .select('nickname, real_name, default_efti').in('nickname', nicknames);
    const userMap = Object.fromEntries((users || []).map(u => [u.nickname, u]));

    const teamIds = [...new Set(rows.map(r => r.team_id).filter(Boolean))];
    let teamMap = {};
    if (teamIds.length > 0) {
        const { data: teams } = await _sb.from('game_team')
            .select('team_id, team_name').in('team_id', teamIds);
        teamMap = Object.fromEntries((teams || []).map(t => [t.team_id, t.team_name]));
    }

    return rows.map(r => ({
        nickname:     r.nickname,
        real_name:    userMap[r.nickname]?.real_name || r.real_name || '',
        default_efti: userMap[r.nickname]?.default_efti || 'FAEN',
        team_name:    r.team_id ? (teamMap[r.team_id] || '') : ''
    }));
}

async function sbSaveDepositReward(gameId, nickname, depositReward) {
    await _sb.from('game_individual')
        .update({ deposit_reward: Number(depositReward) })
        .eq('game_id', gameId)
        .eq('nickname', nickname);
}

async function sbSaveQuestReward(gameId, nickname, questReward) {
    await _sb.from('game_individual')
        .update({ quest_reward: Number(questReward) })
        .eq('game_id', gameId)
        .eq('nickname', nickname);
}

async function sbGetRewardsByGameId(gameId) {
    const { data } = await _sb.from('game_individual')
        .select('nickname, quest_reward, deposit_reward')
        .eq('game_id', gameId);
    return data || [];
}

async function sbLoadTraitsByGameId(gameId) {
    const { data } = await _sb.from('traits').select('*').eq('game_id', gameId);
    return { success: true, traits: data || [] };
}

// =========================================================
// 심화 모드: 부동산 & 성공요소
// =========================================================

async function sbSaveEstatePrice(gameId, prices) {
    const gid = String(gameId || '').trim();
    if (!gid) return;
    const { error } = await _sb.from('estate_price').upsert({
        game_id:    gid,
        gaongaemi:    Number(prices['GAONGAEMI']    ?? 100000),
        nurigoyangi:  Number(prices['NURIGOYANGI']  ?? 100000),
        damiwonsungi: Number(prices['DAMIWONSUNGI'] ?? 100000),
        marusuri:     Number(prices['MARUSURI']     ?? 100000),
        chorongbungi: Number(prices['CHORONGBUNGI'] ?? 100000),
        haniyuwoo:    Number(prices['HANIYUWOO']    ?? 100000),
    }, { onConflict: 'game_id' });
    if (error) console.error('[sbSaveEstatePrice]', error);
}

async function sbSaveEstateBalance(nickname, gameId, assets) {
    const nick = _nick(nickname);
    const gid  = String(gameId || '').trim();
    if (!nick || !gid) return;
    const { error } = await _sb.from('estate_balance').upsert({
        nickname:   nick,
        game_id:    gid,
        gaongaemi:    Number(assets['GAONGAEMI']    || 0),
        nurigoyangi:  Number(assets['NURIGOYANGI']  || 0),
        damiwonsungi: Number(assets['DAMIWONSUNGI'] || 0),
        marusuri:     Number(assets['MARUSURI']     || 0),
        chorongbungi: Number(assets['CHORONGBUNGI'] || 0),
        haniyuwoo:    Number(assets['HANIYUWOO']    || 0),
    }, { onConflict: 'game_id,nickname' });
    if (error) console.error('[sbSaveEstateBalance]', error);
}

async function sbLoadEstateBalance(nickname, gameId) {
    const { data } = await _sb
        .from('estate_balance').select('*')
        .eq('nickname', nickname).eq('game_id', gameId)
        .maybeSingle();
    if (!data) return null;
    return {
        GAONGAEMI:    data.gaongaemi,
        NURIGOYANGI:  data.nurigoyangi,
        DAMIWONSUNGI: data.damiwonsungi,
        MARUSURI:     data.marusuri,
        CHORONGBUNGI: data.chorongbungi,
        HANIYUWOO:    data.haniyuwoo,
    };
}

async function sbLoadEstatePrice(gameId) {
    const { data } = await _sb
        .from('estate_price').select('*')
        .eq('game_id', String(gameId || '').trim())
        .maybeSingle();
    if (!data) return null;
    return {
        GAONGAEMI:    data.gaongaemi,
        NURIGOYANGI:  data.nurigoyangi,
        DAMIWONSUNGI: data.damiwonsungi,
        MARUSURI:     data.marusuri,
        CHORONGBUNGI: data.chorongbungi,
        HANIYUWOO:    data.haniyuwoo,
    };
}

async function sbSaveSuccessFactors(gameId, players) {
    if (!gameId) return;
    const gid = String(gameId).trim();
    const rows = players
        .map(p => ({
            nickname:             _nick(p.nickname || ''),
            game_id:              gid,
            financial_management: !!(p.successFactors && p.successFactors.financial_management),
            communication:        !!(p.successFactors && p.successFactors.communication),
            critical_thinking:    !!(p.successFactors && p.successFactors.critical_thinking),
            global_economy:       !!(p.successFactors && p.successFactors.global_economy),
            credit_trust:         !!(p.successFactors && p.successFactors.credit_trust),
            entrepreneurship:     !!(p.successFactors && p.successFactors.entrepreneurship),
        }))
        .filter(r => r.nickname);
    if (rows.length === 0) return;
    const { error } = await _sb.from('success_factors').upsert(rows, { onConflict: 'game_id,nickname' });
    if (error) console.error('[sbSaveSuccessFactors]', error);
}

async function sbLoadSuccessFactorsByGameId(gameId) {
    const { data } = await _sb.from('success_factors').select('*').eq('game_id', gameId);
    return { success: true, factors: data || [] };
}

// =========================================================
// 명예의 전당
// =========================================================

async function sbLoadHallOfFame() {
    const [{ data: gameInfoList }, { data: indiv }, { data: team }] = await Promise.all([
        _sb.from('game_info').select('game_id, game_variant'),
        _sb.from('game_individual').select('*').order('total_asset', { ascending: false }).limit(200),
        _sb.from('game_team').select('*').order('team_total_asset', { ascending: false }).limit(200)
    ]);
    const variantMap = Object.fromEntries(
        (gameInfoList || []).map(r => [r.game_id, r.game_variant || 'basic'])
    );
    const indivWithVariant = (indiv || []).map(r => ({ ...r, game_variant: variantMap[r.game_id] || 'basic' }));
    const teamWithVariant  = (team  || []).map(r => ({ ...r, game_variant: variantMap[r.game_id] || 'basic' }));
    return { indiv: indivWithVariant, team: teamWithVariant };
}

// =========================================================
// PDF 업로드 (Supabase Storage 'pdfs' 버킷)
// =========================================================

async function sbUploadPDF({ pdfBase64, fileName, gameDate, category }) {
    if (!pdfBase64) return { success: false, code: 'EMPTY_PDF_DATA' };
    if (!gameDate)  return { success: false, code: 'EMPTY_GAME_DATE' };

    const base64 = pdfBase64.split(',').pop().replace(/\s/g, '');
    const binary  = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const safeFileName = _toStorageKey(fileName);
    const path    = `${category}/${gameDate}/${safeFileName}`;

    const { error } = await _sb.storage
        .from('pdfs')
        .upload(path, binary, { contentType: 'application/pdf', upsert: true });
    if (error) return { success: false, message: error.message };

    const { data } = _sb.storage.from('pdfs').getPublicUrl(path);
    return { success: true, path, publicUrl: data.publicUrl };
}

// =========================================================
// 동기화: bank_state / bank_history
// =========================================================

async function sbGetBankState(gameId) {
    const { data } = await _sb.from('bank_state').select('*')
        .eq('game_id', gameId).maybeSingle();
    return data || null;
}

async function sbUpsertBankState(gameId, fields) {
    const { error } = await _sb.from('bank_state').upsert(
        { game_id: gameId, ...fields, updated_at: new Date().toISOString() },
        { onConflict: 'game_id' }
    );
    if (error) console.error('[sbUpsertBankState]', error);
}

async function sbGetBankHistory(gameId) {
    const { data } = await _sb.from('bank_history').select('*')
        .eq('game_id', gameId);
    return data || [];
}

async function sbUpsertBankHistory(gameId, nickname, roundNum, depositType, amount, maturedAmount, teamName) {
    const { error } = await _sb.from('bank_history').upsert({
        game_id:        gameId,
        nickname:       nickname,
        round_num:      roundNum,
        deposit_type:   depositType,
        amount:         amount,
        matured_amount: maturedAmount,
        team_name:      teamName || null
    }, { onConflict: 'game_id,nickname,round_num' });
    if (error) console.error('[sbUpsertBankHistory]', error);
}

// =========================================================
// 동기화: quiz_state / quiz_history
// =========================================================

async function sbGetQuizState(gameId) {
    const { data } = await _sb.from('quiz_state').select('*')
        .eq('game_id', gameId).maybeSingle();
    return data || null;
}

async function sbUpsertQuizState(gameId, fields) {
    const { error } = await _sb.from('quiz_state').upsert(
        { game_id: gameId, ...fields, updated_at: new Date().toISOString() },
        { onConflict: 'game_id' }
    );
    if (error) console.error('[sbUpsertQuizState]', error);
}

async function sbGetQuizHistory(gameId) {
    const { data } = await _sb.from('quiz_history').select('*')
        .eq('game_id', gameId);
    return data || [];
}

async function sbUpsertQuizHistory(gameId, nickname, fields) {
    const { error } = await _sb.from('quiz_history').upsert(
        { game_id: gameId, nickname, ...fields },
        { onConflict: 'game_id,nickname' }
    );
    if (error) console.error('[sbUpsertQuizHistory]', error);
}
