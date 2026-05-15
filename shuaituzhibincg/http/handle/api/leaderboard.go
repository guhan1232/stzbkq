package api

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"stzbHelper/http/common"
	"stzbHelper/middleware"
	"stzbHelper/model"
)

func UnionLeaderboardList(c *gin.Context) {
	limit := 50
	if s := c.Query("limit"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}
	var rows []model.UnionLeaderboard
	q := middleware.GetDB(c).Order("`rank` asc").Limit(limit)
	if name := c.Query("name"); name != "" {
		q = q.Where("name LIKE ?", "%"+name+"%")
	}
	if err := q.Find(&rows).Error; err != nil {
		common.Response{Message: "查询排行榜失败: " + err.Error()}.Error(c)
		return
	}
	if rows == nil {
		rows = []model.UnionLeaderboard{}
	}
	common.Response{Data: gin.H{"items": rows, "count": len(rows)}}.Success(c)
}

func PersonalLeaderboardList(c *gin.Context) {
	limit := 200
	if s := c.Query("limit"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 1000 {
			limit = n
		}
	}

	var rows []model.PersonalLeaderboard
	q := middleware.GetDB(c).Order("`rank` asc").Limit(limit)
	if name := c.Query("name"); name != "" {
		q = q.Where("name LIKE ?", "%"+name+"%")
	}
	if region := c.Query("region"); region != "" {
		q = q.Where("region = ?", region)
	}
	if err := q.Find(&rows).Error; err != nil {
		common.Response{Message: "查询失败: " + err.Error()}.Error(c)
		return
	}
	if rows == nil {
		rows = []model.PersonalLeaderboard{}
	}
	common.Response{Data: gin.H{"items": rows, "count": len(rows)}}.Success(c)
}

func PlayerTerritoryRankList(c *gin.Context) {
	limit := 100
	if s := c.Query("limit"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}

	type row struct {
		model.PlayerTerritoryRank
		PlayerName string `json:"player_name" gorm:"column:player_name"`
	}

	q := middleware.GetDB(c).Table("player_territory_rank ptr").
		Select("ptr.*, tu.name AS player_name").
		Joins("LEFT JOIN team_user tu ON tu.pos = ptr.player_pos").
		Order("ptr.rank asc").
		Limit(limit)
	var rows []row
	if err := q.Find(&rows).Error; err != nil {
		common.Response{Message: "查询失败: " + err.Error()}.Error(c)
		return
	}
	common.Response{Data: gin.H{"items": rows, "count": len(rows)}}.Success(c)
}
