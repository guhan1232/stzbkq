import { useState } from 'react'
import { ApiGetPlayerTeam } from '../api'
import { herocfg, skillcfg, gear_feature_cfg, gear_cfg } from '../cfg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Swords, Star } from 'lucide-react'

interface HeroInfo {
  iconId: number
  type: string
  name: string
  uniqueName: string
  country: string
  quality: number
}

interface SkillInfo {
  type: string
  name: string
  zfQuality: string
}

interface GearItem {
  gear_id: number
  gear_kinds: string
  gear_type: number
  is_season: number
  label: string
  name: string
  phase: number
  pinyin: string
  value: string
}

interface GearFeatureItem {
  advance: number
  gear_type: number
  id: number
  name: string
  quality: number
}

const heroMap: Record<string, HeroInfo> = JSON.parse(herocfg)
const skillMap: Record<string, SkillInfo> = JSON.parse(skillcfg)
const gearFeatureMap: Record<string, GearFeatureItem> = gear_feature_cfg
const gearMap: Record<string, GearItem> = {}
gear_cfg.forEach((g: GearItem) => { gearMap[String(g.gear_id)] = g })

interface TeamData {
  player_name: string
  battle_id: number
  hero1_id: number
  hero2_id: number
  hero3_id: number
  hero1_level: number
  hero2_level: number
  hero3_level: number
  hero1_star: number
  hero2_star: number
  hero3_star: number
  total_star: number
  hp: number
  all_skill_info: string
  role: string
  time: number
  gear: string
  hero_type: string
  idu: string
}

interface ParsedGear {
  gearId: string
  level: number
  entryId: string
}

interface ParsedSkillGroup {
  index: number
  skills: { id: string; level: number }[]
}

function resolveHeroId(id: number | undefined): number {
  if (!id) return 0
  const num = Number(id)
  return num >= 130000 ? num - 30000 : num
}

function getHeroIconId(id: number | undefined): number {
  if (!id) return 0
  const hero = heroMap[String(resolveHeroId(id))]
  return hero ? hero.iconId : id
}

function getHeroName(id: number | undefined): string {
  if (!id) return ''
  const hero = heroMap[String(resolveHeroId(id))]
  return hero ? hero.name : `未知(${id})`
}

function getHeroCountry(id: number | undefined): string {
  if (!id) return ''
  const hero = heroMap[String(resolveHeroId(id))]
  return hero ? hero.country : ''
}

function getHeroType(id: number | undefined): string {
  if (!id) return ''
  const hero = heroMap[String(resolveHeroId(id))]
  return hero ? hero.type : ''
}

function getSkillName(id: string): string {
  if (!id) return ''
  const skill = skillMap[String(id)]
  return skill ? skill.name : `未知(${id})`
}

function getSkillQuality(id: string): string {
  if (!id) return ''
  const skill = skillMap[String(id)]
  return skill ? skill.zfQuality : ''
}

function getSkillType(id: string): string {
  if (!id) return ''
  const skill = skillMap[String(id)]
  return skill ? skill.type : ''
}

function getTroopTypeId(team: TeamData, slot: number): string {
  if (!team.hero_type) return ''
  const parts = String(team.hero_type).split(',').filter(s => s.trim() !== '')
  let filtered = team.role === 'attack' ? parts.slice(1) : parts.slice(0, -1)
  if (team.role !== 'attack') filtered = [...filtered].reverse()
  return filtered[slot - 1] ? filtered[slot - 1].trim() : ''
}

function parseSkillInfo(str: string, team: TeamData): ParsedSkillGroup[] {
  if (!str) return []
  const groups = String(str).split(';').filter(s => s.trim() !== '')
  const parsed = groups.map(g => {
    const parts = g.split(',')
    return {
      index: parseInt(parts[0]),
      skills: [
        { id: parts[1], level: parseInt(parts[2]) },
        { id: parts[3], level: parseInt(parts[4]) },
        { id: parts[5], level: parseInt(parts[6]) },
      ]
    }
  })
  let filtered = team.role === 'attack'
    ? parsed.filter(g => g.index >= 1 && g.index <= 3)
    : parsed.filter(g => g.index >= 4 && g.index <= 6)
  if (team.role !== 'attack') filtered = [...filtered].reverse()
  return filtered
}

function parseGearInfo(str: string, team: TeamData): ParsedGear[] {
  if (!str) return []
  const groups = String(str).split(';').filter(s => s.trim() !== '')
  const parsed = groups.map(g => {
    const parts = g.split(',')
    return {
      gearId: parts[0],
      level: parseInt(parts[1]),
      entryId: parts[2],
    }
  }).filter(g => g.gearId && g.gearId !== '0')
  let filtered = team.role === 'attack' ? parsed : [...parsed].reverse()
  return filtered
}

function getGearName(gearId: string): string {
  if (!gearId || gearId === '0') return ''
  const gear = gearMap[String(gearId)]
  return gear ? gear.name : `未知(${gearId})`
}

function getGearEntryName(entryId: string): string {
  if (!entryId || entryId === '0') return ''
  const entry = gearFeatureMap[String(entryId)]
  return entry ? entry.name : `未知(${entryId})`
}

function getGearEntryQuality(entryId: string): number {
  if (!entryId || entryId === '0') return 0
  const entry = gearFeatureMap[String(entryId)]
  return entry ? entry.quality : 0
}

function getGearEntryAdvance(entryId: string): number {
  if (!entryId || entryId === '0') return 0
  const entry = gearFeatureMap[String(entryId)]
  return entry ? entry.advance : 0
}

function getGearNameClass(entryId: string): string {
  const quality = getGearEntryQuality(entryId)
  const advance = getGearEntryAdvance(entryId)
  if (advance === 1) return 'gear-name-red'
  if (quality >= 8) return 'gear-name-pink'
  return 'gear-name-blue'
}

function formatTime(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getQualityTagType(quality: string): string {
  if (quality === 'S') return 'bg-amber-100 text-amber-700'
  if (quality === 'A') return 'bg-blue-100 text-blue-700'
  if (quality === 'B') return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-600'
}

export default function TeamQuery() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TeamData[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [searchUnion, setSearchUnion] = useState('')
  const [searchIdu, setSearchIdu] = useState('')

  const doSearch = async () => {
    setLoading(true)
    setResults([])
    setHasSearched(true)
    try {
      const v = await ApiGetPlayerTeam({
        name: searchName,
        uname: searchUnion,
        idu: searchIdu,
      })
      if (v.status === 200 && v.data.code === 200) {
        const data = v.data.data
        setResults(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const groupedResults = (): Record<string, TeamData[]> => {
    const map: Record<string, TeamData[]> = {}
    results.forEach(r => {
      if (!map[r.player_name]) {
        map[r.player_name] = []
      }
      map[r.player_name].push(r)
    })
    return map
  }

  const groups = groupedResults()
  const playerCount = Object.keys(groups).length

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">队伍查询</h2>
          <p className="text-sm text-gray-500 mt-2">通过战报数据查询玩家队伍配置</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-blue-100/50 p-6">
        <div className="flex gap-4 flex-wrap">
          <Input
            className="flex-1 min-w-[160px] h-12 rounded-xl border-blue-200/70 bg-white/70"
            placeholder="玩家名称"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
          />
          <Input
            className="flex-1 min-w-[160px] h-12 rounded-xl border-blue-200/70 bg-white/70"
            placeholder="同盟名称"
            value={searchUnion}
            onChange={e => setSearchUnion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
          />
          <Input
            className="flex-1 min-w-[160px] h-12 rounded-xl border-blue-200/70 bg-white/70"
            placeholder="队伍 ID"
            value={searchIdu}
            onChange={e => setSearchIdu(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
          />
          <Button
            onClick={doSearch}
            disabled={loading}
            className="h-12 px-7 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-cyan-600 disabled:opacity-60 flex items-center gap-3 shadow-lg shadow-blue-200/60 hover:shadow-xl hover:shadow-blue-300/70 transition-all duration-300 hover:-translate-y-0.5"
          >
            <Search size={18} />
            查询
          </Button>
        </div>
      </div>

      <div className="min-h-[200px]">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600 text-sm font-medium">查询中...</span>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <div className="text-gray-600 text-base font-medium">未找到队伍数据</div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/60 backdrop-blur-sm rounded-xl px-5 py-3 border border-blue-100/50">
              共找到 <strong className="text-blue-700 text-base">{playerCount}</strong> 名玩家，
              <strong className="text-blue-700 text-base">{results.length}</strong> 支队伍
            </div>

            {Object.entries(groups).map(([playerName, teams]) => (
              <div key={playerName} className="mb-8">
                <div className="flex items-center gap-3 text-lg font-bold text-gray-800 mb-4 pb-3 border-b-2 border-blue-100/60 bg-white/40 backdrop-blur-sm px-4 rounded-xl">
                  <Swords size={20} className="text-blue-500" />
                  {playerName}
                </div>

                {teams.map((team, idx) => {
                  const gears = parseGearInfo(team.gear, team)
                  const skillGroups = parseSkillInfo(team.all_skill_info, team)

                  return (
                    <div
                      key={`${team.battle_id}-${team.role}-${team.hero1_id}-${idx}`}
                      className="bg-white/85 backdrop-blur-xl border border-blue-100/60 rounded-2xl p-6 mb-4 hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-400 hover:-translate-y-1"
                    >
                      <div className="flex items-center gap-4 mb-5 flex-wrap">
                        <Badge className={team.role === 'attack' ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 hover:from-red-100 hover:to-rose-100' : 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 hover:from-blue-100 hover:to-cyan-100'}>
                          {team.role === 'attack' ? '进攻' : '防守'}
                        </Badge>
                        <span className="text-sm text-gray-600 font-medium">
                          {team.player_name} · ID {team.idu}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Star size={16} className="text-amber-400 fill-amber-400" />
                          红度 {team.total_star}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto font-medium">
                          {formatTime(team.time)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                        {[1, 2, 3].map(i => {
                          const heroId = team[`hero${i}_id` as keyof TeamData] as number
                          const heroLevel = team[`hero${i}_level` as keyof TeamData] as number
                          const heroStar = team[`hero${i}_star` as keyof TeamData] as number
                          const iconId = getHeroIconId(heroId)
                          const troopTypeId = getTroopTypeId(team, i)
                          const country = getHeroCountry(heroId)
                          const type = getHeroType(heroId)

                          return (
                            <div key={i} className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-sm rounded-xl border border-blue-100/60 hover:border-blue-200 transition-all duration-300">
                              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-200 to-gray-300 shadow-inner">
                                {heroId ? (
                                  <img
                                    src={`https://g0.gph.netease.com/ngsocial/community/stzb/cn/cards/cut/card_small_${iconId}.jpg?gameid=g10`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">?</div>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <span className="text-sm font-bold text-gray-800 truncate">{getHeroName(heroId)}</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {country && (
                                    <span className="px-2 py-0.5 text-[10px] bg-white/70 text-gray-700 rounded-full font-medium border border-gray-200/60">{country}</span>
                                  )}
                                  {type && (
                                    <span className="px-2 py-0.5 text-[10px] bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full font-medium border border-blue-200/60">{type}</span>
                                  )}
                                  <span className="text-xs font-bold text-gray-700">Lv.{heroLevel}</span>
                                  <span className="text-xs text-amber-500 font-bold">{heroStar}红</span>
                                </div>
                              </div>
                              {troopTypeId && (
                                <div className="ml-auto w-11 h-11 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center flex-shrink-0 shadow-lg">
                                  <img
                                    src={`https://cbg-stzb.res.netease.com/mvvm/rc346663d4140700aaab6da137/images/bz/${troopTypeId}.png`}
                                    alt=""
                                    className="w-8 h-8 object-contain"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    loading="lazy"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {team.all_skill_info && skillGroups.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                          {skillGroups.map((group, gi) => (
                            <div key={gi} className="flex flex-col gap-2 p-4 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 backdrop-blur-sm rounded-xl border border-indigo-100/60">
                              {group.skills.filter(s => s && s.id && s.id !== '0').map((skill, si) => {
                                const quality = getSkillQuality(skill.id)
                                const skillType = getSkillType(skill.id)
                                return (
                                  <div key={si} className="flex items-center gap-1.5 flex-wrap">
                                    {quality && (
                                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getQualityTagType(quality)}`}>
                                        {quality}
                                      </span>
                                    )}
                                    {skillType && (
                                      <span className="px-2 py-0.5 text-[10px] bg-white/70 text-gray-700 rounded-full font-medium border border-gray-200/60">{skillType}</span>
                                    )}
                                    <span className="text-sm font-bold text-gray-800">{getSkillName(skill.id)}</span>
                                    <span className="text-xs text-gray-600 font-bold">Lv.{skill.level}</span>
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      )}

                      {team.gear && gears.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {gears.map((gear, gi) => (
                            <div key={gi} className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 backdrop-blur-sm rounded-xl border border-emerald-100/60">
                              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-200 to-gray-300 shadow-inner">
                                <img
                                  src={`https://cbg-stzb.res.netease.com/game_res/gears/gear_icon/gear_icon_${gear.gearId}.jpg`}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                  loading="lazy"
                                />
                              </div>
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm font-bold text-gray-800">{getGearName(gear.gearId)}</span>
                                  <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${getGearNameClass(gear.entryId)}`}>
                                    {getGearEntryName(gear.entryId)}
                                  </span>
                                  <span className="text-xs text-gray-600 font-bold">Lv.{gear.level}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
