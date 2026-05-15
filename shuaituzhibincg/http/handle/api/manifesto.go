package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"stzbHelper/global"
	"stzbHelper/http/common"
	"stzbHelper/middleware"
	"stzbHelper/model"
)

func EnableGetManifesto(c *gin.Context) {
	global.ExVar.NeedGetManifesto = true
	common.Response{Message: "已开启檄文抓取 (cmd 3788)"}.Success(c)
}

func DisableGetManifesto(c *gin.Context) {
	global.ExVar.NeedGetManifesto = false
	common.Response{Message: "已关闭檄文抓取"}.Success(c)
}

func GetManifestoList(c *gin.Context) {
	db := middleware.GetDB(c)
	if db == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	allianceName := c.Query("alliance_name")
	title := c.Query("title")
	content := c.Query("content")
	faction := c.Query("faction")
	startTime := c.Query("start_time")
	endTime := c.Query("end_time")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := db.Model(&model.Manifesto{})

	if allianceName != "" {
		query = query.Where("alliance_name LIKE ?", "%"+allianceName+"%")
	}
	if title != "" {
		query = query.Where("title LIKE ?", "%"+title+"%")
	}
	if content != "" {
		query = query.Where("content LIKE ?", "%"+content+"%")
	}
	if faction != "" {
		query = query.Where("faction = ?", faction)
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

	var manifestos []model.Manifesto
	offset := (page - 1) * pageSize
	query.Order("time DESC").Offset(offset).Limit(pageSize).Find(&manifestos)

	if manifestos == nil {
		manifestos = []model.Manifesto{}
	}

	common.Response{Data: gin.H{
		"list":      manifestos,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}}.Success(c)
}

func GetManifestoStats(c *gin.Context) {
	db := middleware.GetDB(c)
	if db == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	type AllianceStats struct {
		AllianceName string `json:"alliance_name"`
		MsgCount     int64  `json:"msg_count"`
	}

	var allianceStats []AllianceStats
	db.Model(&model.Manifesto{}).
		Select("alliance_name, COUNT(*) as msg_count").
		Group("alliance_name").
		Order("msg_count DESC").
		Scan(&allianceStats)

	type FactionStats struct {
		Faction  string `json:"faction"`
		MsgCount int64  `json:"msg_count"`
	}

	var factionStats []FactionStats
	db.Model(&model.Manifesto{}).
		Select("faction, COUNT(*) as msg_count").
		Group("faction").
		Order("msg_count DESC").
		Scan(&factionStats)

	var totalMessages int64
	db.Model(&model.Manifesto{}).Count(&totalMessages)

	common.Response{Data: gin.H{
		"total_messages":  totalMessages,
		"alliance_stats":  allianceStats,
		"faction_stats":   factionStats,
		"capture_enabled": global.ExVar.NeedGetManifesto,
	}}.Success(c)
}

func DeleteManifestos(c *gin.Context) {
	db := middleware.GetDB(c)
	if db == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	beforeTime := c.Query("before_time")
	query := db.Model(&model.Manifesto{})
	if beforeTime != "" {
		if bt, err := strconv.ParseInt(beforeTime, 10, 64); err == nil {
			query = query.Where("time < ?", bt)
		}
	} else {
		query = query.Where("1 = 1")
	}

	result := query.Delete(&model.Manifesto{})
	if result.Error != nil {
		common.Response{Message: "删除失败: " + result.Error.Error()}.Error(c)
		return
	}

	common.Response{Message: "删除成功", Data: result.RowsAffected}.Success(c)
}
