// supabase-api.js
// GAS Code.js의 각 action을 Supabase JS 클라이언트로 1:1 변환한 레퍼런스 파일.
// 실제 연동 시 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경 변수 필요.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// =====================
// Helpers
// =====================

function sanitizeNickname(raw) {
  return String(raw || '')
    .replace(/\s+/g, '')
    .replace(/[^\w가-힣]/g, '')
    .slice(0, 5)
}

function sanitizeLimitedText(raw, maxLen = 5) {
  return String(raw || '').replace(/\s+/g, '').trim().slice(0, maxLen)
}

function generateGameId() {
  return crypto.randomUUID().split('-')[0]
}

// =====================
// POST actions
// =====================

// GAS: action = 'saveGameResult'
export async function saveGameResult({ mode, date, individuals = [], teams = [] }) {
  const { data: existingUsers } = await supabase.from('users').select('nickname')
  const existingNicknames = new Set((existingUsers || []).map(u => u.nickname))

  for (const p of individuals) {
    const nickname = sanitizeNickname(p.nickname ?? '')
    const realName = sanitizeLimitedText(p.real_name ?? '')
    if (!nickname && !realName) continue
    const finalNickname = nickname || realName

    if (!existingNicknames.has(finalNickname)) {
      await supabase.from('users').insert({
        nickname:     finalNickname,
        real_name:    realName || '',
        join_date:    date,
        is_citizen:   true,
        default_efti: p.efti_type || p.default_EFTI || 'FAEN',
        status:       'active'
      })
      existingNicknames.add(finalNickname)
    }

    await supabase.from('game_individual').upsert({
      date,
      nickname:         finalNickname,
      real_name:        sanitizeLimitedText(p.real_name ?? ''),
      total_asset:      Number(p.total ?? 0),
      cash:             Number(p.manualCash ?? 0),
      stock:            Number(p.stockVal ?? 0),
      diligence_reward: Number(p.diligence_reward ?? 0),
      game_id:          String(p.game_id).trim(),
      team_id:          String(p.team_id || '').trim() || null
    }, { onConflict: 'game_id,nickname' })
  }

  if (mode === 'team') {
    for (const t of teams) {
      const teamId   = String(t.team_id || '').trim()
      const teamName = sanitizeLimitedText(t.name ?? '')
      if (!teamId || !teamName) continue

      const members = String(t.members ?? '')
        .split(',').map(v => sanitizeNickname(v)).filter(Boolean).join(', ')

      await supabase.from('game_team').upsert({
        team_id:          teamId,
        game_id:          String(t.game_id || '').trim(),
        date,
        team_name:        teamName,
        team_total_asset: Number(t.total ?? 0),
        members
      }, { onConflict: 'team_id' })
    }
  }

  return { success: true }
}

// GAS: action = 'registerCitizen'
export async function registerCitizen({ nickname, real_name, default_EFTI = 'FAEN' }) {
  const nick = sanitizeNickname(nickname || '')
  const name = sanitizeLimitedText(real_name || '')
  if (!nick) return { success: false, code: 'EMPTY_NICKNAME' }
  if (!name) return { success: false, code: 'EMPTY_REAL_NAME' }

  const { data: existing } = await supabase
    .from('users').select('nickname').eq('nickname', nick).maybeSingle()
  if (existing) return { success: false, code: 'DUPLICATE_NICKNAME' }

  const { error } = await supabase.from('users').insert({
    nickname:     nick,
    real_name:    name,
    join_date:    new Date().toISOString().slice(0, 10),
    is_citizen:   true,
    default_efti: String(default_EFTI || 'FAEN').trim(),
    status:       'active'
  })
  if (error) return { success: false, code: 'DB_ERROR', message: error.message }
  return { success: true, nickname: nick, real_name: name }
}

// GAS: action = 'deleteCitizen'
// 연관 테이블을 순서대로 삭제 (GAS의 cascade 삭제 로직과 동일)
export async function deleteCitizen({ nickname }) {
  const nick = sanitizeNickname(nickname || '')
  if (!nick) return { success: false, code: 'EMPTY_NICKNAME' }

  const { data: user } = await supabase
    .from('users').select('nickname').eq('nickname', nick).maybeSingle()
  if (!user) return { success: false, code: 'USER_NOT_FOUND' }

  await supabase.from('stock_balance').delete().eq('nickname', nick)
  await supabase.from('cash_balance').delete().eq('nickname', nick)
  await supabase.from('traits').delete().eq('nickname', nick)
  await supabase.from('game_individual').delete().eq('nickname', nick)
  await supabase.from('users').delete().eq('nickname', nick)

  return { success: true, nickname: nick }
}

// GAS: action = 'updateCitizen'
export async function updateCitizen({ original_nickname, nickname, real_name, default_EFTI, status }) {
  const originalNick = sanitizeNickname(original_nickname || '')
  if (!originalNick) return { success: false, code: 'EMPTY_NICKNAME' }

  const newNick  = nickname ? sanitizeNickname(nickname) : originalNick
  const updates  = {}
  if (newNick)      updates.nickname     = newNick
  if (real_name)    updates.real_name    = sanitizeLimitedText(real_name)
  if (default_EFTI) updates.default_efti = String(default_EFTI).trim()
  if (status)       updates.status       = String(status).trim()

  if (newNick !== originalNick) {
    const { data: dup } = await supabase
      .from('users').select('nickname').eq('nickname', newNick).maybeSingle()
    if (dup) return { success: false, code: 'DUPLICATE_NICKNAME' }
  }

  const { error } = await supabase.from('users').update(updates).eq('nickname', originalNick)
  if (error) return { success: false, code: 'DB_ERROR', message: error.message }
  return { success: true, original_nickname: originalNick, nickname: newNick }
}

// GAS: action = 'saveStockValue'
// stockValues 배열 순서: [sasung, lgi, skei, cacao, hyunde, naber]
export async function saveStockValue({ stockValues }) {
  const gameId = generateGameId()
  const { error } = await supabase.from('stock_price').insert({
    game_id: gameId,
    sasung:  Number(stockValues[0] ?? 1500),
    lgi:     Number(stockValues[1] ?? 600),
    skei:    Number(stockValues[2] ?? 1600),
    cacao:   Number(stockValues[3] ?? 4000),
    hyunde:  Number(stockValues[4] ?? 6000),
    naber:   Number(stockValues[5] ?? 7000)
  })
  if (error) return { success: false, message: error.message }
  return { success: true, gameId }
}

// GAS: action = 'saveUserBalance'
export async function saveUserBalance({ nickname, gameId, assets = {} }) {
  const nick = sanitizeNickname(nickname || '')
  const gid  = String(gameId || '').trim()
  if (!nick || !gid) return { success: false, code: 'INVALID_PAYLOAD' }

  await supabase.from('stock_balance').upsert({
    nickname: nick, game_id: gid,
    sasung:  Number(assets['SASUNG']  || 0),
    lgi:     Number(assets['LGI']     || 0),
    skei:    Number(assets['SKEI']    || 0),
    cacao:   Number(assets['CACAO']   || 0),
    hyunde:  Number(assets['HYUNDE']  || 0),
    naber:   Number(assets['NABER']   || 0)
  }, { onConflict: 'game_id,nickname' })

  await supabase.from('cash_balance').upsert({
    nickname: nick, game_id: gid,
    bill_100:   Number(assets['100']   || 0),
    bill_500:   Number(assets['500']   || 0),
    bill_1000:  Number(assets['1000']  || 0),
    bill_5000:  Number(assets['5000']  || 0),
    bill_10000: Number(assets['10000'] || 0),
    bill_50000: Number(assets['50000'] || 0)
  }, { onConflict: 'game_id,nickname' })

  return { success: true }
}

// GAS: action = 'syncSmoreEFTI'
export async function syncSmoreEFTI({ nickname, efti_type }) {
  const nick = sanitizeNickname(nickname || '')
  const efti = String(efti_type || '').trim()
  if (!nick) return { success: false, code: 'EMPTY_NICKNAME' }
  if (!efti) return { success: false, code: 'EMPTY_EFTI' }

  const { error } = await supabase
    .from('users').update({ default_efti: efti }).eq('nickname', nick)
  if (error) return { success: false, code: 'DB_ERROR', message: error.message }
  return { success: true, nickname: nick, efti_type: efti }
}

// GAS: action = 'saveTraits'
export async function saveTraits({ traits = [] }) {
  for (const t of traits) {
    const nickname = sanitizeNickname(t.nickname || '')
    const gameId   = String(t.game_id || '').trim()
    if (!nickname || !gameId) continue

    await supabase.from('traits').upsert({
      nickname, game_id: gameId,
      diligent:  !!t.diligent,
      saving:    !!t.saving,
      invest:    !!t.invest,
      career:    !!t.career,
      luck:      !!t.luck,
      adventure: !!t.adventure
    }, { onConflict: 'game_id,nickname' })
  }
  return { success: true }
}

// GAS: action = 'uploadPDF'
// Google Drive 대신 Supabase Storage 버킷 'pdfs' 사용.
// Supabase 대시보드에서 'pdfs' 버킷을 먼저 생성해야 함.
export async function uploadPDF({ pdfBase64, fileName, gameDate, category }) {
  if (!pdfBase64) return { success: false, code: 'EMPTY_PDF_DATA' }
  if (!gameDate)  return { success: false, code: 'EMPTY_GAME_DATE' }
  if (!['asset_report', 'hall_of_fame'].includes(category))
    return { success: false, code: 'INVALID_CATEGORY' }

  const base64 = pdfBase64.split(',').pop().replace(/\s/g, '')
  const binary  = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const path    = `${category}/${gameDate}/${fileName}`

  const { error } = await supabase.storage
    .from('pdfs')
    .upload(path, binary, { contentType: 'application/pdf', upsert: true })
  if (error) return { success: false, message: error.message }

  const { data } = supabase.storage.from('pdfs').getPublicUrl(path)
  return { success: true, path, publicUrl: data.publicUrl }
}

// =====================
// GET actions
// =====================

// GAS: action = 'listCitizens'
export async function listCitizens() {
  const { data, error } = await supabase
    .from('users').select('*').order('nickname')
  if (error) return { users: [] }
  return { users: data }
}

// GAS: action = 'loadAssetsByDate'
export async function loadAssetsByDate(date) {
  let query = supabase
    .from('game_individual').select('*').order('total_asset', { ascending: false })
  if (date) query = query.eq('date', date)
  const { data } = await query
  return { success: true, history: data || [] }
}

// GAS: action = 'loadUserBalance'
export async function loadUserBalance(nickname, gameId) {
  const { data } = await supabase
    .from('stock_balance').select('*')
    .eq('nickname', nickname).eq('game_id', gameId)
    .maybeSingle()
  if (!data) return { success: false }
  return {
    success: true,
    data: {
      nickname: data.nickname,
      game_id:  data.game_id,
      stocks: {
        SASUNG: data.sasung, LGI: data.lgi,   SKEI:   data.skei,
        CACAO:  data.cacao,  HYUNDE: data.hyunde, NABER: data.naber
      }
    }
  }
}

// GAS: action = 'loadTraitsByGameId'
export async function loadTraitsByGameId(gameId) {
  const { data } = await supabase
    .from('traits').select('*').eq('game_id', gameId)
  return { success: true, traits: data || [] }
}

// GAS: 기본 GET — 명예의 전당 데이터
export async function loadHallOfFame() {
  const [{ data: indiv }, { data: team }] = await Promise.all([
    supabase.from('game_individual')
      .select('*').order('total_asset', { ascending: false }).limit(200),
    supabase.from('game_team')
      .select('*').order('team_total_asset', { ascending: false }).limit(200)
  ])
  return { indiv: indiv || [], team: team || [] }
}
