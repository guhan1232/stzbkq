// pages/ai-data-export/ai-data-export.js
const aiDataApi = require('../../utils/aiDataApi.js')
const platform = require('../../utils/platform.js')

Page({
  data: {
    dataType: 'all',          // all, player, union, statistics, full
    exportFormat: 'json',     // json, csv
    filterValue: '',          // 筛选值（玩家名或同盟名）
    includeHeroConfig: true,  // 是否包含武将配置
    includeSkillConfig: true, // 是否包含技能配置
    pageSize: 100,            // 每页数量
    
    exporting: false,         // 导出中状态
    stats: null,              // 统计数据
    showPreview: false,       // 显示预览
    previewData: ''           // 预览数据
  },

  onLoad() {
    this.loadStats()
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const res = await aiDataApi.getTeamsStatistics()
      if (res.code === 200) {
        this.setData({
          stats: res.data
        })
      }
    } catch (error) {
      console.error('Load stats error:', error)
    }
  },

  /**
   * 数据类型变化
   */
  onDataTypeChange(e) {
    const value = e.currentTarget.dataset.value || e.detail
    this.setData({
      dataType: value,
      filterValue: ''
    })
  },

  /**
   * 导出格式变化
   */
  onFormatChange(e) {
    const value = e.currentTarget.dataset.value || e.detail
    this.setData({
      exportFormat: value
    })
  },

  /**
   * 筛选值变化
   */
  onFilterValueChange(e) {
    this.setData({
      filterValue: e.detail.value
    })
  },

  /**
   * 包含武将配置变化
   */
  onIncludeHeroConfigChange(e) {
    this.setData({
      includeHeroConfig: e.detail
    })
  },

  /**
   * 包含技能配置变化
   */
  onIncludeSkillConfigChange(e) {
    this.setData({
      includeSkillConfig: e.detail
    })
  },

  /**
   * 每页数量变化
   */
  onPageSizeChange(e) {
    const value = parseInt(e.detail.value) || 100
    this.setData({
      pageSize: Math.min(Math.max(value, 10), 1000)
    })
  },

  /**
   * 导出数据
   */
  async exportData() {
    this.setData({ exporting: true })

    try {
      let res = null
      const params = {
        page_size: this.data.pageSize,
        include_hero_config: this.data.includeHeroConfig,
        include_skill_config: this.data.includeSkillConfig
      }

      // 根据数据类型调用不同接口
      switch (this.data.dataType) {
        case 'all':
          res = await aiDataApi.getAllTeamsData(params)
          break
        case 'player':
          if (!this.data.filterValue) {
            throw new Error('请输入玩家名称')
          }
          res = await aiDataApi.getPlayerTeamsData(this.data.filterValue, params)
          break
        case 'union':
          if (!this.data.filterValue) {
            throw new Error('请输入同盟名称')
          }
          res = await aiDataApi.getUnionTeamsData(this.data.filterValue, params)
          break
        case 'statistics':
          res = await aiDataApi.getTeamsStatistics(params)
          break
        case 'full':
          res = await aiDataApi.getFullTrainingData(params)
          break
        default:
          throw new Error('未知的数据类型')
      }

      if (res.code === 200 && res.data) {
        // 根据格式导出数据
        if (this.data.exportFormat === 'json') {
          this.exportAsJSON(res.data)
        } else {
          this.exportAsCSV(res.data)
        }

        platform.feedback.showToast({
          title: '导出成功',
          icon: 'success'
        })
      } else {
        throw new Error(res.msg || '导出失败')
      }
    } catch (error) {
      console.error('Export error:', error)
      platform.feedback.showToast({
        title: error.message || '导出失败',
        icon: 'none'
      })
    } finally {
      this.setData({ exporting: false })
    }
  },

  /**
   * 导出为JSON
   */
  exportAsJSON(data) {
    const jsonStr = JSON.stringify(data, null, 2)
    const fileName = `teams_data_${Date.now()}.json`
    
    // 创建临时文件并下载
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`
    
    fs.writeFileSync(filePath, jsonStr, 'utf8')
    
    // 打开文件
    wx.openDocument({
      filePath: filePath,
      fileType: 'json',
      showMenu: true,
      success: () => {
        console.log('文件打开成功')
      },
      fail: (err) => {
        console.error('文件打开失败:', err)
        // 如果打开失败，复制到剪贴板
        wx.setClipboardData({
          data: jsonStr,
          success: () => {
            platform.feedback.showToast({
              title: '已复制到剪贴板',
              icon: 'success'
            })
          }
        })
      }
    })
  },

  /**
   * 导出为CSV
   */
  exportAsCSV(data) {
    // TODO: 实现CSV转换逻辑
    platform.feedback.showToast({
      title: 'CSV导出功能开发中',
      icon: 'none'
    })
  },

  /**
   * 预览数据
   */
  async previewData() {
    try {
      let res = null
      const params = {
        page_size: 5, // 预览只获取少量数据
        include_hero_config: this.data.includeHeroConfig,
        include_skill_config: this.data.includeSkillConfig
      }

      // 根据数据类型调用不同接口
      switch (this.data.dataType) {
        case 'all':
          res = await aiDataApi.getAllTeamsData(params)
          break
        case 'player':
          if (!this.data.filterValue) {
            throw new Error('请输入玩家名称')
          }
          res = await aiDataApi.getPlayerTeamsData(this.data.filterValue, params)
          break
        case 'union':
          if (!this.data.filterValue) {
            throw new Error('请输入同盟名称')
          }
          res = await aiDataApi.getUnionTeamsData(this.data.filterValue, params)
          break
        case 'full':
          res = await aiDataApi.getFullTrainingData(params)
          break
        default:
          throw new Error('该类型不支持预览')
      }

      if (res.code === 200 && res.data) {
        const previewStr = JSON.stringify(res.data, null, 2)
        this.setData({
          previewData: previewStr,
          showPreview: true
        })
      }
    } catch (error) {
      console.error('Preview error:', error)
      platform.feedback.showToast({
        title: error.message || '预览失败',
        icon: 'none'
      })
    }
  },

  /**
   * 关闭预览
   */
  closePreview() {
    this.setData({
      showPreview: false
    })
  },

  /**
   * 重置选项
   */
  resetOptions() {
    this.setData({
      dataType: 'all',
      exportFormat: 'json',
      filterValue: '',
      includeHeroConfig: true,
      includeSkillConfig: true,
      pageSize: 100
    })
    
    platform.feedback.showToast({
      title: '已重置',
      icon: 'success'
    })
  },

  /**
   * 返回
   */
  onBack() {
    platform.router.navigateBack()
  }
})
