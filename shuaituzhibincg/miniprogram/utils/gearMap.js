const gearFeatureCfg = require('./gear_feature_cfg')
const gearCfg = require('./gear_cfg')

function getGearName(gearId) {
  if (!gearId || gearId === '0') return ''
  return gearCfg[String(gearId)] || '未知'
}

function getGearEntryName(entryId) {
  if (!entryId || entryId === '0') return ''
  const entry = gearFeatureCfg[String(entryId)]
  return entry ? entry.n : '未知'
}

function getGearEntryQuality(entryId) {
  if (!entryId || entryId === '0') return 0
  const entry = gearFeatureCfg[String(entryId)]
  return entry ? entry.q : 0
}

function getGearEntryAdvance(entryId) {
  if (!entryId || entryId === '0') return 0
  const entry = gearFeatureCfg[String(entryId)]
  return entry ? entry.a : 0
}

function getGearEntryClass(entryId) {
  const quality = getGearEntryQuality(entryId)
  const advance = getGearEntryAdvance(entryId)
  if (advance === 1) return 'gear-entry-red'
  if (quality >= 8) return 'gear-entry-pink'
  return 'gear-entry-blue'
}

function parseGearInfo(str, role) {
  if (!str) return []
  const groups = String(str).split(';').filter(s => s.trim() !== '')
  const parsed = groups.map(g => {
    const parts = g.split(',')
    return {
      gearId: parts[0],
      level: parseInt(parts[1]) || 0,
      entryId: parts[2],
      name: getGearName(parts[0]),
      entryName: getGearEntryName(parts[2]),
      entryClass: getGearEntryClass(parts[2])
    }
  }).filter(g => g.gearId && g.gearId !== '0')

  if (role === 'attack') return parsed
  return [...parsed].reverse()
}

module.exports = {
  getGearName,
  getGearEntryName,
  getGearEntryQuality,
  getGearEntryAdvance,
  getGearEntryClass,
  parseGearInfo
}
