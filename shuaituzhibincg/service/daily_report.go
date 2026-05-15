package service

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"stzbHelper/database"
	"stzbHelper/model"

	"gorm.io/gorm"
)

type DailyReportService struct {
	stopChan chan struct{}
}

func NewDailyReportService() *DailyReportService {
	return &DailyReportService{
		stopChan: make(chan struct{}),
	}
}

func (s *DailyReportService) Start() {
	log.Println("[DailyReportService] 启动每日报告服务")

	go func() {
		for {
			now := time.Now()
			nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
			duration := nextMidnight.Sub(now)

			log.Printf("[DailyReportService] 距离下次报告生成: %v\n", duration)

			timer := time.NewTimer(duration)
			select {
			case <-timer.C:
				s.generateAllDailyReports()
			case <-s.stopChan:
				log.Println("[DailyReportService] 停止每日报告服务")
				timer.Stop()
				return
			}
		}
	}()

	go func() {
		for {
			ticker := time.NewTicker(1 * time.Hour)
			select {
			case <-ticker.C:
				s.checkAndGenerateReport()
			case <-s.stopChan:
				log.Println("[DailyReportService] 停止定时检查")
				ticker.Stop()
				return
			}
		}
	}()
}

func (s *DailyReportService) Stop() {
	close(s.stopChan)
}

func (s *DailyReportService) checkAndGenerateReport() {
	now := time.Now()
	todayStr := now.Format("2006-01-02")

	var gameDBs []database.GameDatabase
	result := database.SystemDB.Where("status = 1").Find(&gameDBs)
	if result.Error != nil {
		log.Printf("[DailyReportService] 获取数据库列表失败: %v\n", result.Error)
		return
	}

	for _, gameDB := range gameDBs {
		db, err := database.GetGameDB(gameDB.Name)
		if err != nil {
			log.Printf("[DailyReportService] 连接数据库 %s 失败: %v\n", gameDB.Name, err)
			continue
		}

		var existingReport model.DailyReport
		if err := db.Where("date = ?", todayStr).First(&existingReport).Error; err == nil {
			continue
		}

		log.Printf("[DailyReportService] 为数据库 %s 生成 %s 的每日报告\n", gameDB.Name, todayStr)
		s.generateDailyReport(db, gameDB.Name, todayStr)
	}
}

func (s *DailyReportService) generateAllDailyReports() {
	log.Println("[DailyReportService] 开始生成所有数据库的每日报告...")

	now := time.Now()
	todayStr := now.Format("2006-01-02")

	var gameDBs []database.GameDatabase
	result := database.SystemDB.Where("status = 1").Find(&gameDBs)
	if result.Error != nil {
		log.Printf("[DailyReportService] 获取数据库列表失败: %v\n", result.Error)
		return
	}

	for _, gameDB := range gameDBs {
		db, err := database.GetGameDB(gameDB.Name)
		if err != nil {
			log.Printf("[DailyReportService] 连接数据库 %s 失败: %v\n", gameDB.Name, err)
			continue
		}

		var existingReport model.DailyReport
		if err := db.Where("date = ?", todayStr).First(&existingReport).Error; err == nil {
			log.Printf("[DailyReportService] 数据库 %s 今日报告已存在，跳过\n", gameDB.Name)
			continue
		}

		log.Printf("[DailyReportService] 为数据库 %s 生成 %s 的每日报告\n", gameDB.Name, todayStr)
		s.generateDailyReport(db, gameDB.Name, todayStr)
	}

	log.Println("[DailyReportService] 所有每日报告生成完成")
}

func (s *DailyReportService) GenerateDailyReport(db *gorm.DB, dbName string, dateStr string) {
	startTime := s.getDayStartTimestamp(dateStr)
	endTime := s.getDayEndTimestamp(dateStr)

	landStats := s.generateLandStats(db, startTime, endTime)
	memberChanges := s.generateMemberChanges(db, startTime, endTime)
	taskAttendance := s.generateTaskAttendance(db, startTime, endTime)
	memberList := s.generateMemberList(db)
	wuStats := s.generateWuStats(db)

	landStatsJSON, _ := json.Marshal(landStats)
	memberChangesJSON, _ := json.Marshal(memberChanges)
	taskAttendanceJSON, _ := json.Marshal(taskAttendance)
	memberListJSON, _ := json.Marshal(memberList)
	wuStatsJSON, _ := json.Marshal(wuStats)

	content := s.buildReportContent(landStats, memberChanges, taskAttendance, memberList, wuStats)
	contentJSON, _ := json.Marshal(content)

	dailyReport := model.DailyReport{
		Date:           dateStr,
		DBName:         dbName,
		Content:        string(contentJSON),
		LandStats:      string(landStatsJSON),
		MemberChanges:  string(memberChangesJSON),
		TaskAttendance: string(taskAttendanceJSON),
		MemberList:     string(memberListJSON),
		WuStats:        string(wuStatsJSON),
	}

	if err := db.Create(&dailyReport).Error; err != nil {
		log.Printf("[DailyReportService] 创建报告失败: %v\n", err)
	} else {
		log.Printf("[DailyReportService] 报告已保存: %s - %s\n", dbName, dateStr)
	}
}

func (s *DailyReportService) generateDailyReport(db *gorm.DB, dbName string, dateStr string) {
	startTime := s.getDayStartTimestamp(dateStr)
	endTime := s.getDayEndTimestamp(dateStr)

	landStats := s.generateLandStats(db, startTime, endTime)
	memberChanges := s.generateMemberChanges(db, startTime, endTime)
	taskAttendance := s.generateTaskAttendance(db, startTime, endTime)
	memberList := s.generateMemberList(db)
	wuStats := s.generateWuStats(db)

	landStatsJSON, _ := json.Marshal(landStats)
	memberChangesJSON, _ := json.Marshal(memberChanges)
	taskAttendanceJSON, _ := json.Marshal(taskAttendance)
	memberListJSON, _ := json.Marshal(memberList)
	wuStatsJSON, _ := json.Marshal(wuStats)

	content := s.buildReportContent(landStats, memberChanges, taskAttendance, memberList, wuStats)
	contentJSON, _ := json.Marshal(content)

	dailyReport := model.DailyReport{
		Date:           dateStr,
		DBName:         dbName,
		Content:        string(contentJSON),
		LandStats:      string(landStatsJSON),
		MemberChanges:  string(memberChangesJSON),
		TaskAttendance: string(taskAttendanceJSON),
		MemberList:     string(memberListJSON),
		WuStats:        string(wuStatsJSON),
	}

	if err := db.Create(&dailyReport).Error; err != nil {
		log.Printf("[DailyReportService] 创建报告失败: %v\n", err)
	} else {
		log.Printf("[DailyReportService] 报告已保存: %s - %s\n", dbName, dateStr)
	}
}

func (s *DailyReportService) generateLandStats(db *gorm.DB, startTime, endTime int64) []model.LandStatsByGroup {
	var records []model.LandRecord
	db.Where("attack_time >= ? AND attack_time <= ?", startTime, endTime).Find(&records)

	groupStatsMap := make(map[string]*model.LandStatsByGroup)
	for _, record := range records {
		groupName := s.getPlayerGroup(db, record.PlayerId)
		if groupName == "" {
			groupName = "未分组"
		}

		if _, exists := groupStatsMap[groupName]; !exists {
			groupStatsMap[groupName] = &model.LandStatsByGroup{
				GroupName: groupName,
				Players:   []model.LandPlayerStats{},
			}
		}

		stats := groupStatsMap[groupName]
		stats.TotalCount++
		if record.IsSuccess == 1 {
			stats.SuccessCount++
		} else {
			stats.FailCount++
		}

		found := false
		for i := range stats.Players {
			if stats.Players[i].PlayerName == record.PlayerName {
				stats.Players[i].Count++
				if record.IsSuccess == 1 {
					stats.Players[i].SuccessCount++
				}
				found = true
				break
			}
		}
		if !found {
			playerStats := model.LandPlayerStats{
				PlayerName:   record.PlayerName,
				GroupName:    groupName,
				Count:        1,
				SuccessCount: 0,
			}
			if record.IsSuccess == 1 {
				playerStats.SuccessCount = 1
			}
			stats.Players = append(stats.Players, playerStats)
		}
	}

	result := make([]model.LandStatsByGroup, 0, len(groupStatsMap))
	for _, v := range groupStatsMap {
		result = append(result, *v)
	}
	return result
}

func (s *DailyReportService) generateMemberChanges(db *gorm.DB, startTime, endTime int64) []model.MemberChangeInfo {
	var histories []model.MemberHistory
	db.Where("action_time >= ? AND action_time <= ?", startTime, endTime).Find(&histories)

	groupChangesMap := make(map[string]*model.MemberChangeInfo)
	for _, history := range histories {
		groupName := history.GroupName
		if groupName == "" {
			groupName = "未分组"
		}

		if _, exists := groupChangesMap[groupName]; !exists {
			groupChangesMap[groupName] = &model.MemberChangeInfo{
				GroupName: groupName,
				JoinList:  []model.MemberChangeItem{},
				LeaveList: []model.MemberChangeItem{},
			}
		}

		item := model.MemberChangeItem{
			Name:       history.Name,
			ActionTime: history.ActionTime,
			Power:      history.Power,
		}

		if history.Action == "join" {
			groupChangesMap[groupName].JoinList = append(groupChangesMap[groupName].JoinList, item)
		} else if history.Action == "leave" {
			groupChangesMap[groupName].LeaveList = append(groupChangesMap[groupName].LeaveList, item)
		}
	}

	result := make([]model.MemberChangeInfo, 0, len(groupChangesMap))
	for _, v := range groupChangesMap {
		result = append(result, *v)
	}
	return result
}

func (s *DailyReportService) generateTaskAttendance(db *gorm.DB, startTime, endTime int64) []model.TaskAttendanceInfo {
	var tasks []model.Task
	db.Where("created_at >= ? AND created_at <= ?", startTime, endTime).Find(&tasks)

	var result []model.TaskAttendanceInfo
	for _, task := range tasks {
		groupStatsMap := make(map[string]*model.GroupAttendanceStats)

		for _, targetGroup := range task.Target {
			var users []model.TeamUser
			db.Where("`group` = ?", targetGroup).Find(&users)

			for _, user := range users {
				groupName := user.Group
				if groupName == "" {
					groupName = "未分组"
				}

				if _, exists := groupStatsMap[groupName]; !exists {
					groupStatsMap[groupName] = &model.GroupAttendanceStats{
						GroupName:       groupName,
						TotalMembers:    0,
						AttendedMembers: 0,
						AtkNum:          0,
						DisNum:          0,
					}
				}

				stats := groupStatsMap[groupName]
				stats.TotalMembers++

				var attackCount, disCount int64
				var attackTeamCount, disTeamCount int64

				db.Model(&model.Report{}).Where("wid = ? AND attack_name = ?", task.Pos, user.Name).Count(&attackCount)
				db.Model(&model.Report{}).Where("wid = ? AND attack_name = ? AND garrison = ?", task.Pos, user.Name, 1).Count(&disCount)
				db.Model(&model.Report{}).Where("wid = ? AND attack_name = ? AND garrison = ?", task.Pos, user.Name, 0).Group("attack_base_heroid").Count(&attackTeamCount)
				db.Model(&model.Report{}).Where("wid = ? AND attack_name = ? AND garrison = ?", task.Pos, user.Name, 1).Group("attack_base_heroid").Count(&disTeamCount)

				if attackCount > 0 || disCount > 0 {
					stats.AttendedMembers++
				}
				stats.AtkNum += int(attackTeamCount)
				stats.DisNum += int(disTeamCount)
			}
		}

		var groupStats []model.GroupAttendanceStats
		for _, v := range groupStatsMap {
			groupStats = append(groupStats, *v)
		}

		result = append(result, model.TaskAttendanceInfo{
			TaskID:     task.Id,
			TaskName:   task.Name,
			TaskPos:    task.Pos,
			GroupStats: groupStats,
		})
	}

	return result
}

func (s *DailyReportService) generateMemberList(db *gorm.DB) []model.MemberInfo {
	var users []model.TeamUser
	db.Find(&users)

	result := make([]model.MemberInfo, 0, len(users))
	for _, user := range users {
		result = append(result, model.MemberInfo{
			ID:    user.Id,
			Name:  user.Name,
			Group: user.Group,
			Power: user.Power,
			Wu:    user.Wu,
		})
	}
	return result
}

func (s *DailyReportService) buildReportContent(landStats []model.LandStatsByGroup, memberChanges []model.MemberChangeInfo, taskAttendance []model.TaskAttendanceInfo, memberList []model.MemberInfo, wuStats []model.WuStatsByGroup) map[string]interface{} {
	return map[string]interface{}{
		"land_stats":      landStats,
		"member_changes":  memberChanges,
		"task_attendance": taskAttendance,
		"member_list":     memberList,
		"wu_stats":        wuStats,
		"generated_at":    time.Now().Format("2006-01-02 15:04:05"),
	}
}

func (s *DailyReportService) generateWuStats(db *gorm.DB) []model.WuStatsByGroup {
	var users []model.TeamUser
	db.Find(&users)

	groupMap := make(map[string]*model.WuStatsByGroup)
	for _, user := range users {
		groupName := user.Group
		if groupName == "" {
			groupName = "未分组"
		}

		if _, exists := groupMap[groupName]; !exists {
			groupMap[groupName] = &model.WuStatsByGroup{
				GroupName:   groupName,
				MemberCount: 0,
				TotalWu:     0,
				ZeroWuCount: 0,
				Players:     []model.WuPlayerStats{},
			}
		}

		stats := groupMap[groupName]
		stats.MemberCount++
		stats.TotalWu += user.Wu
		if user.Wu == 0 {
			stats.ZeroWuCount++
		}

		stats.Players = append(stats.Players, model.WuPlayerStats{
			PlayerName: user.Name,
			GroupName:  groupName,
			Wu:         user.Wu,
		})
	}

	result := make([]model.WuStatsByGroup, 0, len(groupMap))
	for _, v := range groupMap {
		if v.MemberCount > 0 {
			v.AverageWu = v.TotalWu / v.MemberCount
		}
		result = append(result, *v)
	}

	return result
}

func (s *DailyReportService) getPlayerGroup(db *gorm.DB, playerId int) string {
	var user model.TeamUser
	if err := db.Where("id = ?", playerId).First(&user).Error; err == nil {
		return user.Group
	}
	return ""
}

func (s *DailyReportService) getDayStartTimestamp(dateStr string) int64 {
	t, err := time.ParseInLocation("2006-01-02", dateStr, time.Local)
	if err != nil {
		return 0
	}
	return t.Unix()
}

func (s *DailyReportService) getDayEndTimestamp(dateStr string) int64 {
	t, err := time.ParseInLocation("2006-01-02 15:04:05", dateStr+" 23:59:59", time.Local)
	if err != nil {
		return 0
	}
	return t.Unix()
}

func GetTodayDate() string {
	return time.Now().Format("2006-01-02")
}

type ReportContent struct {
	LandStats      []model.LandStatsByGroup   `json:"land_stats"`
	MemberChanges  []model.MemberChangeInfo   `json:"member_changes"`
	TaskAttendance []model.TaskAttendanceInfo `json:"task_attendance"`
	MemberList     []model.MemberInfo         `json:"member_list"`
	WuStats        []model.WuStatsByGroup     `json:"wu_stats"`
	GeneratedAt    string                     `json:"generated_at"`
}

func ParseReportContent(contentJSON string) (*ReportContent, error) {
	var content ReportContent
	if err := json.Unmarshal([]byte(contentJSON), &content); err != nil {
		return nil, err
	}
	return &content, nil
}

func GenerateTextReport(dailyReport *model.DailyReport) (string, error) {
	content, err := ParseReportContent(dailyReport.Content)
	if err != nil {
		return "", fmt.Errorf("解析报告内容失败: %v", err)
	}

	var reportBuilder strings.Builder
	reportBuilder.WriteString(fmt.Sprintf("📊 每日报告 - %s\n", dailyReport.Date))
	reportBuilder.WriteString("=" + strings.Repeat("=", 50) + "\n\n")

	if len(content.MemberList) > 0 {
		reportBuilder.WriteString("【同盟成员】\n")
		groupMembers := make(map[string][]model.MemberInfo)
		for _, member := range content.MemberList {
			groupName := member.Group
			if groupName == "" {
				groupName = "未分组"
			}
			groupMembers[groupName] = append(groupMembers[groupName], member)
		}
		for groupName, members := range groupMembers {
			reportBuilder.WriteString(fmt.Sprintf("  %s (%d人):\n", groupName, len(members)))
			for _, m := range members {
				reportBuilder.WriteString(fmt.Sprintf("    - %s (势力:%d 武勋:%d)\n", m.Name, m.Power, m.Wu))
			}
		}
		reportBuilder.WriteString("\n")
	}

	if len(content.LandStats) > 0 {
		reportBuilder.WriteString("【翻地统计】\n")
		for _, group := range content.LandStats {
			reportBuilder.WriteString(fmt.Sprintf("  %s: 总计 %d (成功 %d / 失败 %d)\n", group.GroupName, group.TotalCount, group.SuccessCount, group.FailCount))
			for _, player := range group.Players {
				reportBuilder.WriteString(fmt.Sprintf("    - %s: %d次 (成功 %d)\n", player.PlayerName, player.Count, player.SuccessCount))
			}
		}
		reportBuilder.WriteString("\n")
	}

	if len(content.MemberChanges) > 0 {
		reportBuilder.WriteString("【成员变动】\n")
		for _, change := range content.MemberChanges {
			reportBuilder.WriteString(fmt.Sprintf("  %s:\n", change.GroupName))
			if len(change.JoinList) > 0 {
				reportBuilder.WriteString("    入盟:")
				for _, j := range change.JoinList {
					reportBuilder.WriteString(fmt.Sprintf(" %s", j.Name))
				}
				reportBuilder.WriteString("\n")
			}
			if len(change.LeaveList) > 0 {
				reportBuilder.WriteString("    退盟:")
				for _, l := range change.LeaveList {
					reportBuilder.WriteString(fmt.Sprintf(" %s", l.Name))
				}
				reportBuilder.WriteString("\n")
			}
		}
		reportBuilder.WriteString("\n")
	}

	if len(content.TaskAttendance) > 0 {
		reportBuilder.WriteString("【攻城出勤】\n")
		for _, task := range content.TaskAttendance {
			reportBuilder.WriteString(fmt.Sprintf("  任务: %s (坐标: %d)\n", task.TaskName, task.TaskPos))
			for _, stat := range task.GroupStats {
				reportBuilder.WriteString(fmt.Sprintf("    %s: 出勤 %d/%d (主力 %d次 / 拆迁 %d队)\n", stat.GroupName, stat.AttendedMembers, stat.TotalMembers, stat.AtkNum, stat.DisNum))
			}
		}
		reportBuilder.WriteString("\n")
	}

	if len(content.WuStats) > 0 {
		reportBuilder.WriteString("【武勋统计】\n")
		for _, group := range content.WuStats {
			reportBuilder.WriteString(fmt.Sprintf("  %s: 总武勋 %d (平均 %d, %d人未获得武勋)\n",
				group.GroupName, group.TotalWu, group.AverageWu, group.ZeroWuCount))
			for _, player := range group.Players {
				reportBuilder.WriteString(fmt.Sprintf("    - %s: %d\n", player.PlayerName, player.Wu))
			}
		}
		reportBuilder.WriteString("\n")
	}

	reportBuilder.WriteString(fmt.Sprintf("\n报告生成时间: %s\n", content.GeneratedAt))

	return reportBuilder.String(), nil
}
