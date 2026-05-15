/**
 * AI数据导出API
 * 提供纯净的队伍数据接口，用于AI训练和数据分析
 * 不包含任何AI对话逻辑，仅返回原始数据
 */

const { get } = require('../utils/request')

/**
 * 获取所有队伍数据（完整版）
 * @param {Object} params - 查询参数
 * @param {number} params.db_id - 数据库ID（可选，默认使用当前选中的数据库）
 * @param {string} params.player_name - 玩家名称筛选（可选）
 * @param {string} params.union_name - 同盟名称筛选（可选）
 * @param {number} params.page - 页码（可选，默认1）
 * @param {number} params.page_size - 每页数量（可选，默认100，最大1000）
 * @returns {Promise<Object>} 队伍数据列表
 */
function getAllTeamsData(params = {}) {
  return get('/api/ai-data/teams/all', params, true, true)
}

/**
 * 获取指定玩家的队伍数据
 * @param {string} playerName - 玩家名称
 * @param {Object} params - 其他参数
 * @returns {Promise<Object>} 队伍数据
 */
function getPlayerTeamsData(playerName, params = {}) {
  return get('/api/ai-data/teams/player', {
    player_name: playerName,
    ...params
  }, true, true)
}

/**
 * 获取指定同盟的队伍数据
 * @param {string} unionName - 同盟名称
 * @param {Object} params - 其他参数
 * @returns {Promise<Object>} 队伍数据
 */
function getUnionTeamsData(unionName, params = {}) {
  return get('/api/ai-data/teams/union', {
    union_name: unionName,
    ...params
  }, true, true)
}

/**
 * 获取队伍统计数据
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 统计数据
 */
function getTeamsStatistics(params = {}) {
  return get('/api/ai-data/teams/statistics', params, true, true)
}

/**
 * 导出队伍数据为JSON格式（适合AI训练）
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} JSON格式数据
 */
function exportTeamsAsJSON(params = {}) {
  return get('/api/ai-data/teams/export/json', params, true, true)
}

/**
 * 导出队伍数据为CSV格式
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} CSV格式数据
 */
function exportTeamsAsCSV(params = {}) {
  return get('/api/ai-data/teams/export/csv', params, true, true)
}

/**
 * 获取武将配置数据（用于AI理解武将信息）
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 武将配置数据
 */
function getHeroConfigData(params = {}) {
  return get('/api/ai-data/heros/config', params, true, false)
}

/**
 * 获取技能配置数据（用于AI理解技能信息）
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 技能配置数据
 */
function getSkillConfigData(params = {}) {
  return get('/api/ai-data/skills/config', params, true, false)
}

/**
 * 获取完整的训练数据集（队伍+武将+技能）
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 完整训练数据
 */
function getFullTrainingData(params = {}) {
  return get('/api/ai-data/training/full', params, true, true)
}

module.exports = {
  // 基础数据接口
  getAllTeamsData,
  getPlayerTeamsData,
  getUnionTeamsData,
  getTeamsStatistics,
  
  // 数据导出接口
  exportTeamsAsJSON,
  exportTeamsAsCSV,
  
  // 配置数据接口
  getHeroConfigData,
  getSkillConfigData,
  
  // 完整训练数据
  getFullTrainingData
}
