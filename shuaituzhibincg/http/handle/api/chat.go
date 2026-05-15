package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"stzbHelper/global"
	"stzbHelper/http/common"
	"stzbHelper/middleware"
	"stzbHelper/model"
)

func EnableGetChatMessage(c *gin.Context) {
	global.ExVar.NeedGetChatMessage = true
	common.Response{Message: "已开启聊天消息抓取 (cmd 724)"}.Success(c)
}

func DisableGetChatMessage(c *gin.Context) {
	global.ExVar.NeedGetChatMessage = false
	common.Response{Message: "已关闭聊天消息抓取"}.Success(c)
}

func GetChatMessageList(c *gin.Context) {
	db := middleware.GetDB(c)
	if db == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	allianceName := c.Query("alliance_name")
	playerName := c.Query("player_name")
	content := c.Query("content")
	startTime := c.Query("start_time")
	endTime := c.Query("end_time")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := db.Model(&model.ChatMessage{})

	if allianceName != "" {
		query = query.Where("alliance_name LIKE ?", "%"+allianceName+"%")
	}
	if playerName != "" {
		query = query.Where("player_name LIKE ? OR player_full_name LIKE ?", "%"+playerName+"%", "%"+playerName+"%")
	}
	if content != "" {
		query = query.Where("content LIKE ?", "%"+content+"%")
	}
	if startTime != "" {
		if st, err := strconv.ParseInt(startTime, 10, 64); err == nil {
			query = query.Where("time >= ?", st)
		}
	}
	if endTime != "" {
		if et, err := strconv.ParseInt(endTime, 10, 64); err == nil {
			query = query.Where("time <= ?", et)
		}
	}

	var total int64
	query.Count(&total)

	var messages []model.ChatMessage
	offset := (page - 1) * pageSize
	query.Order("time DESC").Offset(offset).Limit(pageSize).Find(&messages)

	if messages == nil {
		messages = []model.ChatMessage{}
	}

	common.Response{Data: gin.H{
		"list":      messages,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}}.Success(c)
}

func GetChatMessageStats(c *gin.Context) {
	db := middleware.GetDB(c)
	if db == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	type AllianceStats struct {
		AllianceName string `json:"alliance_name"`
		MsgCount     int64  `json:"msg_count"`
		PlayerCount  int64  `json:"player_count"`
	}

	var allianceStats []AllianceStats
	db.Model(&model.ChatMessage{}).
		Select("alliance_name, COUNT(*) as msg_count, COUNT(DISTINCT player_id) as player_count").
		Group("alliance_name").
		Order("msg_count DESC").
		Scan(&allianceStats)

	type PlayerStats struct {
		PlayerId       int    `json:"player_id"`
		PlayerName     string `json:"player_name"`
		PlayerFullName string `json:"player_full_name"`
		AllianceName   string `json:"alliance_name"`
		MsgCount       int64  `json:"msg_count"`
	}

	var playerStats []PlayerStats
	db.Model(&model.ChatMessage{}).
		Select("player_id, player_name, player_full_name, alliance_name, COUNT(*) as msg_count").
		Group("player_id").
		Order("msg_count DESC").
		Limit(50).
		Scan(&playerStats)

	var totalMessages int64
	db.Model(&model.ChatMessage{}).Count(&totalMessages)

	common.Response{Data: gin.H{
		"total_messages":  totalMessages,
		"alliance_stats":  allianceStats,
		"top_players":     playerStats,
		"capture_enabled": global.ExVar.NeedGetChatMessage,
	}}.Success(c)
}

func DeleteChatMessages(c *gin.Context) {
	db := middleware.GetDB(c)
	if db == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	beforeTime := c.Query("before_time")
	query := db.Model(&model.ChatMessage{})
	if beforeTime != "" {
		if bt, err := strconv.ParseInt(beforeTime, 10, 64); err == nil {
			query = query.Where("time < ?", bt)
		}
	} else {
		query = query.Where("1 = 1")
	}

	result := query.Delete(&model.ChatMessage{})
	if result.Error != nil {
		common.Response{Message: "删除失败: " + result.Error.Error()}.Error(c)
		return
	}

	common.Response{Message: "删除成功", Data: result.RowsAffected}.Success(c)
}
