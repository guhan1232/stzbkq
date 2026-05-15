package api

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"stzbHelper/http/common"
	"stzbHelper/middleware"
	"stzbHelper/model"
	"stzbHelper/service"
)

// StartPacketCapture 开始数据包捕获
func StartPacketCapture(c *gin.Context) {
	err := service.StartCapture()
	if err != nil {
		common.Response{Code: http.StatusBadRequest, Message: err.Error()}.Error(c)
		return
	}

	stats := service.GetStats()
	common.Response{Message: "开始捕获数据包", Data: gin.H{"interfaces": stats.Interfaces}}.Success(c)
}

// StopPacketCapture 停止数据包捕获
func StopPacketCapture(c *gin.Context) {
	service.StopCapture()
	common.Response{Message: "已停止捕获"}.Success(c)
}

// GetCaptureStats 获取捕获统计
func GetCaptureStats(c *gin.Context) {
	stats := service.GetStats()
	common.Response{Data: stats}.Success(c)
}

func EnableBattlefieldRealtimeCapture(c *gin.Context) {
	log.Printf("[battlefield-realtime] 开启5028抓包")
	service.EnableBattlefieldRealtimeCapture()
	log.Printf("[battlefield-realtime] 5028抓包已开启, 当前状态: enabled=%v", service.GetStats().BattlefieldRealtimeEnabled)
	common.Response{Message: "已开启战场实时监控抓包", Data: gin.H{"cmd_id": 5028}}.Success(c)
}

func DisableBattlefieldRealtimeCapture(c *gin.Context) {
	log.Printf("[battlefield-realtime] 关闭5028抓包")
	service.DisableBattlefieldRealtimeCapture()
	log.Printf("[battlefield-realtime] 5028抓包已关闭, 当前状态: enabled=%v", service.GetStats().BattlefieldRealtimeEnabled)
	common.Response{Message: "已关闭战场实时监控抓包", Data: gin.H{"cmd_id": 5028}}.Success(c)
}

func GetBattlefieldRealtimePackets(c *gin.Context) {
	limit := 100
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	packets := service.GetPacketsByCmdID(limit, 5028)
	log.Printf("[battlefield-realtime] 获取数据包: limit=%d, count=%d", limit, len(packets))
	common.Response{Data: gin.H{"count": len(packets), "packets": packets}}.Success(c)
}

func ClearBattlefieldRealtimePackets(c *gin.Context) {
	cleared := service.ClearPacketsByCmdID(5028)
	parsedCleared := service.ClearProtocol5028MonitorPackets()
	log.Printf("[battlefield-realtime] 清空数据包: cleared=%d parsed_cleared=%d", cleared, parsedCleared)
	common.Response{Message: "已清空战场实时监控包", Data: gin.H{"cleared_count": cleared, "parsed_cleared_count": parsedCleared}}.Success(c)
}

// GetCapturedPackets 获取捕获的数据包
func GetCapturedPackets(c *gin.Context) {
	limit := 100
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	if cmdID := c.Query("cmd_id"); cmdID != "" {
		if parsed, err := strconv.Atoi(cmdID); err == nil && parsed > 0 {
			common.Response{Data: service.GetPacketsByCmdID(limit, parsed)}.Success(c)
			return
		}
	}

	packets := service.GetPackets(limit)
	common.Response{Data: packets}.Success(c)
}

// ExportPacketsCSV 导出CSV
func ExportPacketsCSV(c *gin.Context) {
	csvData, err := service.ExportToCSV()
	if err != nil {
		common.Response{Code: http.StatusInternalServerError, Message: err.Error()}.Error(c)
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=packets.csv")
	c.String(http.StatusOK, csvData)
}

// ExportPacketsJSON 导出JSON
func ExportPacketsJSON(c *gin.Context) {
	jsonData, err := service.ExportToJSON()
	if err != nil {
		common.Response{Code: http.StatusInternalServerError, Message: err.Error()}.Error(c)
		return
	}

	c.Header("Content-Type", "application/json; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=packets.json")
	c.String(http.StatusOK, jsonData)
}

// SearchRealtimeTeams HTTP 回退查询实时队伍
func SearchRealtimeTeams(c *gin.Context) {
	db := middleware.GetDB(c)
	if db == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	mainID := c.Query("main_id")
	playerName := c.Query("player_name")

	ctx := &model.RealtimeContext{}
	if mainID != "" {
		ctx.MainID = mainID
	}

	results, count := service.SearchRealtimeTeamsForHTTP(db, ctx, playerName, 100)
	common.Response{Data: gin.H{"results": results, "count": count}}.Success(c)
}

// GetBattlefieldRealtimeStats 获取战场实时监控统计
func GetBattlefieldRealtimeStats(c *gin.Context) {
	s := service.GetStats()
	log.Printf("[battlefield-realtime] stats请求: is_running=%v, total_packets=%d, battlefield_enabled=%v", s.IsRunning, s.TotalPackets, s.BattlefieldRealtimeEnabled)
	common.Response{Data: gin.H{
		"battlefield_realtime_enabled": s.BattlefieldRealtimeEnabled,
		"total_packets":                s.TotalPackets,
	}}.Success(c)
}

// SearchRealtimeMonitorTeams 搜索实时监控队伍（heroui-web 格式）
func SearchRealtimeMonitorTeams(c *gin.Context) {
	db := middleware.GetDB(c)
	log.Printf("[battlefield-realtime] 搜索队伍: db=%v, keyword=%s", db != nil, c.Query("keyword"))
	if db == nil {
		log.Printf("[battlefield-realtime] 搜索队伍失败: 未选择数据库")
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	keyword := c.Query("keyword")

	var ctx *model.RealtimeContext
	var playerName string

	if keyword != "" {
		if keyword[0] >= '0' && keyword[0] <= '9' {
			ctx = &model.RealtimeContext{MainID: keyword}
			log.Printf("[battlefield-realtime] 搜索队伍: 按main_id=%s查询", keyword)
		} else {
			playerName = keyword
			log.Printf("[battlefield-realtime] 搜索队伍: 按player_name=%s查询", keyword)
		}
	} else {
		log.Printf("[battlefield-realtime] 搜索队伍: 无关键词，返回所有")
	}

	results, count := service.SearchRealtimeTeamsForHTTP(db, ctx, playerName, 100)
	log.Printf("[battlefield-realtime] 搜索队伍结果: count=%d", count)

	type teamRow struct {
		ID           string `json:"id"`
		PlayerName   string `json:"player_name"`
		AllianceName string `json:"alliance_name"`
		StartCoord   string `json:"start_coord"`
		TargetCoord  string `json:"target_coord"`
		ArriveTime   string `json:"arrive_time"`
		RemainTime   string `json:"remain_time"`
		MainCamp     string `json:"main_camp"`
		MiddleArmy   string `json:"middle_army"`
		Vanguard     string `json:"vanguard"`
	}

	formatPos := func(posKey string, result *model.RealtimeTeamResult) string {
		pos, ok := result.Formation[posKey].(map[string]interface{})
		if !ok {
			return "--"
		}
		hero, _ := pos["main_hero"].(map[string]interface{})
		if hero == nil {
			return "--"
		}
		id := hero["id"]
		level := pos["level"]
		star := pos["star"]
		return fmt.Sprintf("%v Lv%v %v红", id, level, star)
	}

	now := time.Now().Unix()
	formatRemain := func(ts int64) string {
		if ts == 0 {
			return "--"
		}
		remain := ts - now
		if remain < 0 {
			return "已到达"
		}
		m := remain / 60
		s := remain % 60
		return fmt.Sprintf("%d分%d秒", m, s)
	}

	rows := make([]teamRow, 0, len(results))
	for _, r := range results {
		rows = append(rows, teamRow{
			ID:           r.ID,
			PlayerName:   r.PlayerName,
			AllianceName: r.AttackUnionName,
			StartCoord:   r.Wid,
			TargetCoord:  r.TargetWid,
			ArriveTime:   r.ArriveTimeText,
			RemainTime:   formatRemain(r.ArriveTime),
			MainCamp:     formatPos("back", r),
			MiddleArmy:   formatPos("middle", r),
			Vanguard:     formatPos("front", r),
		})
	}

	log.Printf("[battlefield-realtime] 搜索队伍响应: rows=%d", len(rows))
	common.Response{Data: rows}.Success(c)
}

// HandleWebSocket WebSocket连接处理（战场实时监控）
func HandleWebSocket(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	db := middleware.GetDB(c)
	log.Printf("[ws] 战场实时监控连接请求: user_id=%d, db_ready=%v", userID, db != nil)

	conn, err := service.UpgradeWS(c.Writer, c.Request)
	if err != nil {
		log.Printf("[ws] 升级WebSocket失败: %v", err)
		return
	}

	client := service.NewWSClient(conn, userID, db)
	go client.WritePump()
	service.ReplayProtocol5028MonitorPacketsToClient(client, 100)
	client.ReadPump()
}
