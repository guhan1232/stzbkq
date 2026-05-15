/**
 * 队伍查询页面
 */
const api = require('../../utils/api')
const app = getApp()
const { getHeroName, getHeroIconId, formatHeroList, parseSkillInfo } = require('../../utils/heroMap')
const { parseGearInfo } = require('../../utils/gearMap')

Page({
  data: {
    loading: false,
    searched: false,
    errorMessage: '',
    
    // 搜索条件
    playerName: '',
    unionName: '',
    
    // 结果
    teamList: [],
    
    // 统计
    totalCount: 0
  },

  onLoad(options) {
    if (!app.requireLogin() || !app.requireDatabase()) return
    // 可能从其他页面带参数跳转
    if (options.name) {
      this.setData({ playerName: decodeURIComponent(options.name) })
      this.doSearch()
    }
  },

  onShow() {
    // 每次显示页面时检查数据库状态
    if (!app.globalData.databaseId) {
      this.setData({ errorMessage: '请先选择数据库' })
    } else {
      this.setData({ errorMessage: '' })
    }
  },

  // 输入事件 - 自动 trim 去除首尾空格
  onPlayerNameInput(e) {
    this.setData({ playerName: (e.detail.value || '').trim() })
  },
  onUnionNameInput(e) {
    this.setData({ unionName: (e.detail.value || '').trim() })
  },

  // 搜索
  async doSearch() {
    const { playerName, unionName } = this.data
    if (!playerName && !unionName) {
      wx.showToast({ title: '请输入玩家名或同盟名', icon: 'none' })
      return
    }

    // 检查数据库是否已选择
    if (!app.globalData.databaseId) {
      wx.showModal({
        title: '提示',
        content: '请先选择数据库',
        showCancel: false,
        success: () => {
          wx.navigateTo({ url: '/pages/database/database' })
        }
      })
      return
    }

    try {
      this.setData({ loading: true, searched: true, errorMessage: '' })
      console.log('查询队伍: playerName=', playerName, ', unionName=', unionName)
      
      const res = await api.getPlayerTeam(playerName || '', unionName || '')
      console.log('查询结果:', res)
      
      if (res.code === 200) {
        // 处理返回数据，过滤无效记录
        const rawData = res.data || []
        const teamList = rawData
          .filter(item => item && (item.hero1_id > 0 || item.hero2_id > 0 || item.hero3_id > 0))
          .map(item => {
            // 解析武将信息
            const heroes = formatHeroList(item.hero1_id, item.hero2_id, item.hero3_id)
            const allSkills = parseSkillInfo(item.all_skill_info || '')
            
            // 获取对应角色的技能索引
            const getSkillIndex = (index) => {
              if (item.role === 'attack') return index
              return index === 0 ? 5 : (index === 1 ? 4 : 3)
            }
            
            // 构建完整的武将数据对象
            const createHeroData = (heroId, level, skillIndex) => {
              if (!heroId || heroId === 0) return null
              const skill = allSkills[getSkillIndex(skillIndex)] || {}
              const skills = []
              
              // 构建技能列表，包含等级信息
              if (skill.skill1id && skill.skill1id !== '0') {
                const skillName = skill.skill1Name || skill.skill1id
                const skillLevel = skill.skill1level ? `[${skill.skill1level}级]` : ''
                skills.push({ name: `${skillName} ${skillLevel}` })
              }
              if (skill.skill2id && skill.skill2id !== '0') {
                const skillName = skill.skill2Name || skill.skill2id
                const skillLevel = skill.skill2level ? `[${skill.skill2level}级]` : ''
                skills.push({ name: `${skillName} ${skillLevel}` })
              }
              if (skill.skill3id && skill.skill3id !== '0') {
                const skillName = skill.skill3Name || skill.skill3id
                const skillLevel = skill.skill3level ? `[${skill.skill3level}级]` : ''
                skills.push({ name: `${skillName} ${skillLevel}` })
              }
              
              // 获取武将 iconId 用于显示头像
              const iconId = getHeroIconId(heroId)
              // 使用网易官方 CDN 头像地址（与 Web 端一致）
              const avatar = iconId ? `https://g0.gph.netease.com/ngsocial/community/stzb/cn/cards/cut/card_medium_${iconId}.jpg?gameid=g10` : ''
              
              return {
                id: heroId,
                name: getHeroName(heroId),
                avatar: avatar,
                level: level || 0,
                skills: skills
              }
            }
            
            return {
              ...item,
              heroes: heroes,
              allSkills: allSkills,
              gears: parseGearInfo(item.gear, item.role),
              hero1Data: createHeroData(item.hero1_id, item.hero1_level, 0),
              hero2Data: createHeroData(item.hero2_id, item.hero2_level, 1),
              hero3Data: createHeroData(item.hero3_id, item.hero3_level, 2),
              hero1Skill: allSkills[getSkillIndex(0)] || {},
              hero2Skill: allSkills[getSkillIndex(1)] || {},
              hero3Skill: allSkills[getSkillIndex(2)] || {},
              hero1Name: getHeroName(item.hero1_id),
              hero2Name: getHeroName(item.hero2_id),
              hero3Name: getHeroName(item.hero3_id),
              hero1IconId: getHeroIconId(item.hero1_id),
              hero2IconId: getHeroIconId(item.hero2_id),
              hero3IconId: getHeroIconId(item.hero3_id),
              starText: this.formatStar(item.total_star),
              hpText: this.formatHp(item.hp),
              timeText: this.formatTime(item.time),
              levelText: `${item.hero1_level || 0}/${item.hero2_level || 0}/${item.hero3_level || 0}`
            }
          })
        
        this.setData({ 
          teamList, 
          loading: false,
          totalCount: teamList.length,
          errorMessage: teamList.length === 0 ? '未找到匹配的队伍数据' : ''
        })
        
        if (teamList.length === 0) {
          wx.showToast({ title: '未找到匹配的队伍', icon: 'none', duration: 2000 })
        }
      } else {
        const errMsg = res.msg || res.message || '查询失败'
        this.setData({ 
          teamList: [], 
          loading: false, 
          totalCount: 0,
          errorMessage: errMsg
        })
        wx.showToast({ title: errMsg, icon: 'none' })
      }
    } catch (err) {
      console.error('查询队伍失败:', err)
      this.setData({ 
        teamList: [], 
        loading: false, 
        totalCount: 0,
        errorMessage: err.message || '网络错误'
      })
      wx.showToast({ title: '网络连接失败，请重试', icon: 'none' })
    }
  },

  formatStar(star) {
    if (!star) return '未知'
    return '★'.repeat(Math.floor(star / 10)) + '☆'.repeat(5 - Math.floor(star / 10))
  },

  formatHp(hp) {
    if (!hp) return '未知'
    return hp >= 10000 ? (hp / 10000).toFixed(1) + '万' : hp
  },

  formatTime(time) {
    if (!time) return ''
    const date = new Date(time * 1000)
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  },

  // 清空
  resetSearch() {
    this.setData({
      playerName: '',
      unionName: '',
      teamList: [],
      searched: false,
      totalCount: 0
    })
  },

  // 查看战报
  viewBattleReport(e) {
    const { name } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/battle-report/battle-report?atk_name=${encodeURIComponent(name)}`
    })
  },

  onGearIconError(e) {
    // 宝物图标加载失败时隐藏
  },

  // 分享功能
  onShareAppMessage() {
    const { playerName } = this.data
    return {
      title: playerName ? `${playerName}的队伍配置 - 同盟管理助手` : '队伍查询 - 同盟管理助手',
      path: '/pages/team-query/team-query'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '队伍查询 - 同盟管理助手',
      query: ''
    }
  }
})
