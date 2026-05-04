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
    return String(raw || '').replace(/\s+/g, '').replace(/[^\w가-힣]/g, '').slice(0, 5);
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

async function sbRegisterCitizen({ nickname, real_name, default_EFTI = 'FAEN' }) {
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
        status:       'active'
    });
    if (error) return { success: false, code: 'DB_ERROR', message: error.message };
    return { success: true, nickname: nick, real_name: name };
}

async function sbDeleteCitizen(nickname) {
    const nick = _nick(nickname);
    if (!nick) return { success: false, code: 'EMPTY_NICKNAME' };

    const { data: user } = await _sb.from('users').select('nickname').eq('nickname', nick).maybeSingle();
    if (!user) return { success: false, code: 'USER_NOT_FOUND' };

    await _sb.from('stock_balance').delete().eq('nickname', nick);
    await _sb.from('cash_balance').delete().eq('nickname', nick);
    await _sb.from('traits').delete().eq('nickname', nick);
    await _sb.from('game_individual').delete().eq('nickname', nick);
    await _sb.from('users').delete().eq('nickname', nick);

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
    for (const p of players) {
        const nickname = _nick(p.nickname || '');
        if (!nickname || !gameId) continue;
        await _sb.from('traits').upsert({
            nickname, game_id: gameId,
            diligent:  !!(p.traits && p.traits.diligent),
            saving:    !!(p.traits && p.traits.saving),
            invest:    !!(p.traits && p.traits.invest),
            career:    !!(p.traits && p.traits.career),
            luck:      !!(p.traits && p.traits.luck),
            adventure: !!(p.traits && p.traits.adventure)
        }, { onConflict: 'game_id,nickname' });
    }
}

async function sbSaveGameResult({ mode, date, individuals = [], teams = [] }) {
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
            date,
            nickname:         finalNickname,
            real_name:        _text(p.real_name ?? ''),
            total_asset:      Number(p.total ?? 0),
            cash:             Number(p.manualCash ?? 0),
            stock:            Number(p.stockVal ?? 0),
            diligence_reward: Number(p.diligence_reward ?? 0),
            game_id:          String(p.game_id || '').trim(),
            team_id:          String(p.team_id || '').trim() || null
        }, { onConflict: 'game_id,nickname' });
    }

    if (mode === 'team') {
        for (const t of teams) {
            const teamId   = String(t.team_id || '').trim();
            const teamName = _text(t.name ?? '');
            if (!teamId || !teamName) continue;
            await _sb.from('game_team').upsert({
                team_id:          teamId,
                game_id:          String(t.game_id || '').trim(),
                date,
                team_name:        teamName,
                team_total_asset: Number(t.total ?? 0),
                members:          String(t.members ?? '')
            }, { onConflict: 'team_id' });
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

async function sbLoadTraitsByGameId(gameId) {
    const { data } = await _sb.from('traits').select('*').eq('game_id', gameId);
    return { success: true, traits: data || [] };
}

// =========================================================
// 명예의 전당
// =========================================================

async function sbLoadHallOfFame() {
    const [{ data: indiv }, { data: team }] = await Promise.all([
        _sb.from('game_individual').select('*').order('total_asset', { ascending: false }).limit(200),
        _sb.from('game_team').select('*').order('team_total_asset', { ascending: false }).limit(200)
    ]);
    return { indiv: indiv || [], team: team || [] };
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
