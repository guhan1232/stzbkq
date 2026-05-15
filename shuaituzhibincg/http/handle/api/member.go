package api

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
	"stzbHelper/http/common"
	"stzbHelper/middleware"
	"stzbHelper/model"
)

func GetMemberHistory(c *gin.Context) {
	var history []model.MemberHistory

	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("page_size", "20")
	action := c.Query("action")

	query := middleware.GetDB(c).Model(&model.MemberHistory{})

	if action != "" {
		query = query.Where("action = ?", action)
	}

	var total int64
	query.Count(&total)

	offset := 0
	pageInt := 1
	if pageInt_ := parseInt(page); pageInt_ > 0 {
		pageInt = pageInt_
		offset = (pageInt - 1) * parseInt(pageSize)
	}

	query.Order("action_time DESC").Offset(offset).Limit(parseInt(pageSize)).Find(&history)

	if history == nil {
		history = []model.MemberHistory{}
	}

	common.Response{Data: gin.H{
		"list":  history,
		"total": total,
		"page":  pageInt,
	}}.Success(c)
}

func GetLandRecords(c *gin.Context) {
	var records []model.LandRecord

	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("page_size", "20")
	playerName := c.Query("player_name")
	isSuccess := c.Query("is_success")
	startTime := c.Query("start_time")
	endTime := c.Query("end_time")
	onlyMembers := c.DefaultQuery("only_members", "1")
	groupName := c.Query("group_name")

	query := middleware.GetDB(c).Model(&model.LandRecord{})

	if onlyMembers == "1" {
		query = query.Where("player_id IN (SELECT id FROM team_user)")
	}

	if playerName != "" {
		query = query.Where("player_name LIKE ?", "%"+playerName+"%")
	}

	if isSuccess != "" {
		query = query.Where("is_success = ?", isSuccess)
	}

	if groupName != "" {
		query = query.Where("player_id IN (SELECT id FROM team_user WHERE `group` = ?)", groupName)
	}

	if startTime != "" {
		if startTs, err := strconv.ParseInt(startTime, 10, 64); err == nil {
			query = query.Where("attack_time >= ?", startTs)
		}
	}
	if endTime != "" {
		if endTs, err := strconv.ParseInt(endTime, 10, 64); err == nil {
			query = query.Where("attack_time <= ?", endTs)
		}
	}

	var total int64
	query.Count(&total)

	offset := 0
	pageInt := 1
	if pageInt_ := parseInt(page); pageInt_ > 0 {
		pageInt = pageInt_
		offset = (pageInt - 1) * parseInt(pageSize)
	}

	query.Order("attack_time DESC").Offset(offset).Limit(parseInt(pageSize)).Find(&records)

	if records == nil {
		records = []model.LandRecord{}
	}

	common.Response{Data: gin.H{
		"list":  records,
		"total": total,
		"page":  pageInt,
	}}.Success(c)
}

func RecordMemberChange(db *gorm.DB, oldUsers, newUsers []model.TeamUser) {
	oldMap := make(map[int]model.TeamUser)
	for _, u := range oldUsers {
		oldMap[u.Id] = u
	}

	newMap := make(map[int]model.TeamUser)
	for _, u := range newUsers {
		newMap[u.Id] = u
	}

	now := time.Now().Unix()
	joinCount := 0
	leaveCount := 0

	for id, oldUser := range oldMap {
		if _, exists := newMap[id]; !exists {
			history := model.MemberHistory{
				PlayerId:   id,
				Name:       oldUser.Name,
				Action:     "leave",
				ActionTime: now,
				GroupName:  oldUser.Group,
				Power:      oldUser.Power,
			}
			if err := db.Create(&history).Error; err != nil {
				log.Printf("[RecordMemberChange] 记录退出失败: player=%s(id=%d), err=%v", oldUser.Name, id, err)
			} else {
				leaveCount++
			}
		}
	}

	for id, newUser := range newMap {
		if _, exists := oldMap[id]; !exists {
			history := model.MemberHistory{
				PlayerId:   id,
				Name:       newUser.Name,
				Action:     "join",
				ActionTime: now,
				GroupName:  newUser.Group,
				Power:      newUser.Power,
			}
			if err := db.Create(&history).Error; err != nil {
				log.Printf("[RecordMemberChange] 记录加入失败: player=%s(id=%d), err=%v", newUser.Name, id, err)
			} else {
				joinCount++
			}
		}
	}

	if joinCount > 0 || leaveCount > 0 {
		log.Printf("[RecordMemberChange] 检测到成员变动: 加入=%d, 退出=%d (旧=%d, 新=%d)", joinCount, leaveCount, len(oldMap), len(newMap))
	}
}

func parseInt(s string) int {
	if s == "" {
		return 0
	}
	val, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return val
}

func ExportLandRecordsExcel(c *gin.Context) {
	playerName := c.Query("player_name")
	isSuccess := c.Query("is_success")
	startTime := c.Query("start_time")
	endTime := c.Query("end_time")
	onlyMembers := c.DefaultQuery("only_members", "1")
	groupName := c.Query("group_name")

	query := middleware.GetDB(c).Model(&model.LandRecord{})

	if onlyMembers == "1" {
		query = query.Where("player_id IN (SELECT id FROM team_user)")
	}

	if playerName != "" {
		query = query.Where("player_name LIKE ?", "%"+playerName+"%")
	}

	if isSuccess != "" {
		query = query.Where("is_success = ?", isSuccess)
	}

	if groupName != "" {
		query = query.Where("player_id IN (SELECT id FROM team_user WHERE `group` = ?)", groupName)
	}

	if startTime != "" {
		if startTs, err := strconv.ParseInt(startTime, 10, 64); err == nil {
			query = query.Where("attack_time >= ?", startTs)
		}
	}
	if endTime != "" {
		if endTs, err := strconv.ParseInt(endTime, 10, 64); err == nil {
			query = query.Where("attack_time <= ?", endTs)
		}
	}

	var records []model.LandRecord
	query.Order("attack_time DESC").Find(&records)

	f := excelize.NewFile()
	defer f.Close()

	sheetName := "翻地记录"
	if groupName != "" {
		sheetName = groupName + "-翻地记录"
	}
	f.SetSheetName("Sheet1", sheetName)

	headers := []string{"玩家名称", "土地位置", "土地名称", "土地等级", "结果", "防守方", "时间"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#CCCCCC"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	f.SetRowStyle(sheetName, 1, 1, headerStyle)

	for i, record := range records {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), record.PlayerName)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), splitPos(record.LandPos))
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), record.LandName)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), record.LandLevel)
		if record.IsSuccess == 1 {
			f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), "成功")
		} else {
			f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), "失败")
		}
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), record.DefenderName)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), time.Unix(record.AttackTime, 0).Format("2006-01-02 15:04:05"))
	}

	f.SetColWidth(sheetName, "A", "A", 15)
	f.SetColWidth(sheetName, "B", "B", 12)
	f.SetColWidth(sheetName, "C", "C", 20)
	f.SetColWidth(sheetName, "D", "D", 10)
	f.SetColWidth(sheetName, "E", "E", 8)
	f.SetColWidth(sheetName, "F", "F", 15)
	f.SetColWidth(sheetName, "G", "G", 20)

	buf := new(bytes.Buffer)
	if err := f.Write(buf); err != nil {
		common.Response{Code: 500, Message: "生成Excel失败"}.Error(c)
		return
	}

	filename := fmt.Sprintf("翻地记录_%s.xlsx", time.Now().Format("20060102150405"))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

func splitPos(pos int) string {
	posStr := fmt.Sprintf("%d", pos)
	if len(posStr) < 4 {
		return posStr
	}
	x := posStr[:len(posStr)-4]
	y := posStr[len(posStr)-4:]
	return fmt.Sprintf("%s,%s", x, y)
}

type LandRecordStats struct {
	PlayerId     int    `json:"player_id"`
	PlayerName   string `json:"player_name"`
	TotalCount   int    `json:"total_count"`
	SuccessCount int    `json:"success_count"`
	FailCount    int    `json:"fail_count"`
}

func GetLandRecordsStats(c *gin.Context) {
	playerName := c.Query("player_name")

	query := middleware.GetDB(c).Model(&model.LandRecord{})

	if playerName != "" {
		query = query.Where("player_name LIKE ?", "%"+playerName+"%")
	}

	var stats []LandRecordStats

	middleware.GetDB(c).Raw(`
		SELECT
			player_id,
			player_name,
			COUNT(*) as total_count,
			SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as success_count,
			SUM(CASE WHEN is_success = 0 THEN 1 ELSE 0 END) as fail_count
		FROM land_record
		WHERE (? = '' OR player_name LIKE ?)
		GROUP BY player_id, player_name
		ORDER BY total_count DESC
	`, playerName, "%"+playerName+"%").Scan(&stats)

	if stats == nil {
		stats = []LandRecordStats{}
	}

	common.Response{Data: gin.H{
		"list": stats,
	}}.Success(c)
}
