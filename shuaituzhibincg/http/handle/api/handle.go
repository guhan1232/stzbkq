package api

import (
	"fmt"
	"log"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"stzbHelper/global"
	"stzbHelper/http/common"
	"stzbHelper/middleware"
	"stzbHelper/model"
)

func GetTeamUser(c *gin.Context) {
	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	var teamUsers []model.TeamUser
	query := middleware.GetDB(c)
	group := c.Query("group")
	if group != "" {
		query = query.Where("`group` = ?", group)
	}
	query.Find(&teamUsers)

	if teamUsers == nil {
		teamUsers = []model.TeamUser{}
	}

	common.Response{Data: teamUsers}.Success(c)
}

func GetTeamGroup(c *gin.Context) {
	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	var groups []string
	middleware.GetDB(c).Model(&model.TeamUser{}).Select("group").Distinct("group").Pluck("group", &groups)

	if groups == nil {
		groups = []string{}
	}

	common.Response{Data: groups}.Success(c)
}

func CreateTask(c *gin.Context) {
	taskName := c.PostForm("taskname")
	taskTime := c.PostForm("tasktime")
	taskEndTime := c.PostForm("taskendtime")
	targetGroup := c.PostFormArray("targetgroup")
	taskPos := c.PostFormArray("taskpos")

	taskPosFormat := model.ToTaskPos(taskPos)
	if taskPosFormat == 0 {
		common.Response{Code: 400, Message: "任务坐标格式错误"}.Error(c)
		return
	}

	taskTimeFormat, err := strconv.Atoi(taskTime)
	if err != nil {
		common.Response{Code: 400, Message: "任务时间格式错误"}.Error(c)
		return
	}

	taskEndTimeFormat, err := strconv.Atoi(taskEndTime)
	if err != nil {
		common.Response{Code: 400, Message: "任务结束时间格式错误"}.Error(c)
		return
	}

	var users []model.TeamUser
	middleware.GetDB(c).Where("`group` IN ?", targetGroup).Find(&users)

	taskUserList := model.TeamUserListToTaskUserList(users)
	if len(users) <= 0 {
		common.Response{Code: 400, Message: "创建出错:目标人数为0"}.Error(c)
		return
	}

	task := model.Task{
		Status:          0,
		Name:            taskName,
		Time:            taskTimeFormat,
		EndTime:         taskEndTimeFormat,
		Pos:             taskPosFormat,
		Target:          targetGroup,
		TargetUserNum:   len(users),
		CompleteUserNum: 0,
		LeaveUserNum:    0,
		UserList:        taskUserList,
		CreatedAt:       time.Now().Unix(),
	}

	add := middleware.GetDB(c).Create(&task)
	if add.RowsAffected != 0 {
		common.Response{
			Message: "创建成功",
			Data: map[string]interface{}{
				"id":   task.Id,
				"rows": add.RowsAffected,
			},
		}.Success(c)
	} else {
		if add.Error != nil {
			common.Response{Code: 500, Message: "创建失败", Data: add.Error.Error()}.Error(c)
		} else {
			common.Response{Code: 500, Message: "创建失败"}.Error(c)
		}
	}
}

func GetTaskList(c *gin.Context) {
	var taskList []model.Task
	middleware.GetDB(c).Omit("user_list").Order("id DESC").Find(&taskList)
	if taskList == nil {
		taskList = []model.Task{}
	}
	common.Response{Data: taskList}.Success(c)
}

func DelTask(c *gin.Context) {
	id := c.Param("tid")
	idInt, err := strconv.Atoi(id)
	if err != nil {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	db := middleware.GetDB(c)

	var task model.Task
	if err := db.First(&task, idInt).Error; err != nil {
		common.Response{Code: 404, Message: "任务不存在"}.Error(c)
		return
	}

	reportResult := db.Where("wid = ?", task.Pos).Delete(&model.Report{})
	if reportResult.Error != nil {
		log.Printf("删除任务关联战报失败: %v\n", reportResult.Error)
	}

	battleReportResult := db.Where("wid = ?", fmt.Sprintf("%d", task.Pos)).Delete(&model.BattleReport{})
	if battleReportResult.Error != nil {
		log.Printf("删除任务关联详细战报失败: %v\n", battleReportResult.Error)
	}

	action := db.Delete(&model.Task{}, idInt)
	if action.RowsAffected != 0 {
		log.Printf("删除任务成功: ID=%d, Name=%s, Pos=%d, 删除战报: %d 条, 删除详细战报: %d 条\n",
			task.Id, task.Name, task.Pos, reportResult.RowsAffected, battleReportResult.RowsAffected)
		common.Response{Message: "删除成功", Data: action.RowsAffected}.Success(c)
	} else {
		if action.Error != nil {
			common.Response{Code: 500, Message: "删除失败", Data: action.Error.Error()}.Error(c)
		} else {
			common.Response{Code: 500, Message: "删除失败"}.Error(c)
		}
	}
}

func EnableGetReport(c *gin.Context) {
	pos := c.PostForm("pos")
	startTimeStr := c.PostForm("start_time")
	endTimeStr := c.PostForm("end_time")

	fmt.Printf("EnableGetReport 收到的参数 - pos: %s, start_time: %s, end_time: %s\n", pos, startTimeStr, endTimeStr)

	posInt, err := strconv.Atoi(pos)
	if err != nil {
		common.Response{Code: 400, Message: "坐标格式错误"}.Error(c)
		return
	}

	var startTime, endTime int64 = 0, 0
	if startTimeStr != "" {
		startTime, err = strconv.ParseInt(startTimeStr, 10, 64)
		if err != nil {
			common.Response{Code: 400, Message: "开始时间格式错误"}.Error(c)
			return
		}
	}
	if endTimeStr != "" {
		endTime, err = strconv.ParseInt(endTimeStr, 10, 64)
		if err != nil {
			common.Response{Code: 400, Message: "结束时间格式错误"}.Error(c)
			return
		}
	}

	fmt.Printf("EnableGetReport 设置 NeededReportPos: %d, ReportStartTime: %d, ReportEndTime: %d\n", posInt, startTime, endTime)
	global.ExVar.NeededReportPos = posInt
	global.ExVar.NeedGetReport = true
	global.ExVar.ReportStartTime = startTime
	global.ExVar.ReportEndTime = endTime

	common.Response{}.Success(c)
}

func DisableGetReport(c *gin.Context) {
	global.ExVar.NeededReportPos = 0
	global.ExVar.NeedGetReport = false
	global.ExVar.ReportStartTime = 0
	global.ExVar.ReportEndTime = 0
	common.Response{}.Success(c)
}

func EnableGetBattleData(c *gin.Context) {
	global.ExVar.NeedGetBattleData = true
	if !global.ExVar.NeedGetReport {
		global.ExVar.NeedGetReport = true
		log.Println("已同时开启考勤战报抓取（详细战报依赖）")
	}
	log.Println("已开启详细战报数据抓取")
	common.Response{}.Success(c)
}

func DisableGetBattleData(c *gin.Context) {
	global.ExVar.NeedGetBattleData = false
	common.Response{}.Success(c)
}

func EnableGetLeaderboard(c *gin.Context) {
	global.ExVar.NeedGetLeaderboard = true
	log.Println("已开启排行数据抓取 (cmd 700/514/6314)")
	common.Response{}.Success(c)
}

func DisableGetLeaderboard(c *gin.Context) {
	global.ExVar.NeedGetLeaderboard = false
	log.Println("已关闭排行数据抓取")
	common.Response{}.Success(c)
}

func GetReportNumByTaskId(c *gin.Context) {
	tid := c.Param("tid")
	if tid == "" {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	tidint, err := strconv.Atoi(tid)
	if err != nil {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	var task model.Task
	if err := middleware.GetDB(c).Last(&task, tidint).Error; err != nil {
		common.Response{Code: 404, Message: "任务不存在"}.Error(c)
		return
	}

	var num int64
	middleware.GetDB(c).Model(&model.Report{}).Where("wid = ?", task.Pos).Count(&num)

	common.Response{Data: num}.Success(c)
}

func GetTaskReportList(c *gin.Context) {
	tid := c.Param("tid")
	if tid == "" {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	tidint, err := strconv.Atoi(tid)
	if err != nil {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	var task model.Task
	if err := middleware.GetDB(c).Last(&task, tidint).Error; err != nil {
		common.Response{Code: 404, Message: "任务不存在"}.Error(c)
		return
	}

	var reports []model.Report
	middleware.GetDB(c).Where("wid = ?", task.Pos).Order("time DESC").Find(&reports)

	if reports == nil {
		reports = []model.Report{}
	}

	common.Response{Data: reports}.Success(c)
}

func StatisticsReport(c *gin.Context) {
	tid := c.Param("tid")
	if tid == "" {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	tidint, err := strconv.Atoi(tid)
	if err != nil {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	var task model.Task
	query := middleware.GetDB(c).Last(&task, tidint)
	if query.Error == nil {
		refresh := c.Query("refresh")
		if refresh == "1" {
			task.CompleteUserNum = 0
			for id, t := range task.UserList {
				log.Printf("[StatisticsReport] 统计用户: ID=%d, Name=%s\n", id, t.Name)

				var Num int64
				middleware.GetDB(c).Model(model.Report{}).Where("wid = ? AND attack_name = ? AND time >= ? AND time <= ?", task.Pos, t.Name, task.Time, task.EndTime).Count(&Num)
				log.Printf("[StatisticsReport] 用户 %s 总战报数: %d\n", t.Name, Num)

				var AtkNum int64
				middleware.GetDB(c).Model(model.Report{}).Where("wid = ? AND attack_name = ? AND garrison = ? AND time >= ? AND time <= ?", task.Pos, t.Name, 0, task.Time, task.EndTime).Count(&AtkNum)
				log.Printf("[StatisticsReport] 用户 %s 攻城次数: %d\n", t.Name, AtkNum)

				var DisNum int64
				middleware.GetDB(c).Model(model.Report{}).Where("wid = ? AND attack_name = ? AND garrison = ? AND time >= ? AND time <= ?", task.Pos, t.Name, 1, task.Time, task.EndTime).Count(&DisNum)
				log.Printf("[StatisticsReport] 用户 %s 拆迁次数: %d\n", t.Name, DisNum)

				var AtkTeamNum int64
				middleware.GetDB(c).Model(model.Report{}).Where("wid = ? AND attack_name = ? AND garrison = ? AND time >= ? AND time <= ?", task.Pos, t.Name, 0, task.Time, task.EndTime).Group("attack_base_heroid").Count(&AtkTeamNum)

				var DisTeamNum int64
				middleware.GetDB(c).Model(model.Report{}).Where("wid = ? AND attack_name = ? AND garrison = ? AND time >= ? AND time <= ?", task.Pos, t.Name, 1, task.Time, task.EndTime).Group("attack_base_heroid").Count(&DisTeamNum)

				task.UserList[id].AtkNum = int(AtkNum)
				task.UserList[id].DisNum = int(DisNum)
				task.UserList[id].AtkTeamNum = int(AtkTeamNum)
				task.UserList[id].DisTeamNum = int(DisTeamNum)

				if AtkNum != 0 || DisNum != 0 {
					task.CompleteUserNum++
				}
			}
			task.LeaveUserNum = countTaskLeaveUsers(task.UserList)

			save := middleware.GetDB(c).Save(&task)
			if save.Error != nil {
				common.Response{Code: 500, Message: "统计考勤数据失败: " + save.Error.Error()}.Error(c)
				return
			}
			common.Response{Message: "统计完成，共 " + strconv.Itoa(task.CompleteUserNum) + " 人参与", Data: save.RowsAffected}.Success(c)
		} else {
			common.Response{Data: task}.Success(c)
		}
	} else {
		common.Response{Code: 500, Message: "获取任务失败"}.Error(c)
		return
	}
}

func GetTask(c *gin.Context) {
	tid := c.Param("tid")
	if tid == "" {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	tidint, err := strconv.Atoi(tid)
	if err != nil {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	var task model.Task
	if err := middleware.GetDB(c).Last(&task, tidint).Error; err != nil {
		common.Response{Code: 404, Message: "任务不存在"}.Error(c)
		return
	}

	common.Response{Data: task}.Success(c)
}

func SetTaskUserLeave(c *gin.Context) {
	tid := c.Param("tid")
	if tid == "" {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	tidint, err := strconv.Atoi(tid)
	if err != nil {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	userIDStr := c.PostForm("user_id")
	if userIDStr == "" {
		userIDStr = c.Query("user_id")
	}
	userID, err := strconv.Atoi(userIDStr)
	if err != nil || userID <= 0 {
		common.Response{Code: 400, Message: "成员ID错误"}.Error(c)
		return
	}

	isLeave := true
	isLeaveStr := c.PostForm("is_leave")
	if isLeaveStr == "" {
		isLeaveStr = c.Query("is_leave")
	}
	switch strings.ToLower(isLeaveStr) {
	case "0", "false", "no", "off":
		isLeave = false
	}

	var task model.Task
	db := middleware.GetDB(c)
	if err := db.Last(&task, tidint).Error; err != nil {
		common.Response{Code: 404, Message: "任务不存在"}.Error(c)
		return
	}
	if task.UserList == nil {
		common.Response{Code: 404, Message: "任务成员不存在"}.Error(c)
		return
	}

	user, ok := task.UserList[userID]
	if !ok || user == nil {
		common.Response{Code: 404, Message: "成员不在该任务中"}.Error(c)
		return
	}

	user.IsLeave = isLeave
	if isLeave {
		user.LeaveReason = strings.TrimSpace(c.PostForm("reason"))
		if user.LeaveReason == "" {
			user.LeaveReason = strings.TrimSpace(c.Query("reason"))
		}
		user.LeaveTime = time.Now().Unix()
	} else {
		user.LeaveReason = ""
		user.LeaveTime = 0
	}
	task.UserList[userID] = user
	task.LeaveUserNum = countTaskLeaveUsers(task.UserList)

	if err := db.Save(&task).Error; err != nil {
		common.Response{Code: 500, Message: "保存请假状态失败: " + err.Error()}.Error(c)
		return
	}

	common.Response{Message: "保存成功", Data: gin.H{
		"task_id":        task.Id,
		"user_id":        userID,
		"is_leave":       user.IsLeave,
		"leave_user_num": task.LeaveUserNum,
	}}.Success(c)
}

func countTaskLeaveUsers(userList map[int]*model.TaskUserList) int {
	count := 0
	for _, user := range userList {
		if user != nil && user.IsLeave && user.AtkNum == 0 && user.DisNum == 0 {
			count++
		}
	}
	return count
}

func GetGroupWu(c *gin.Context) {
	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	var teamUsers []model.TeamUser
	middleware.GetDB(c).Find(&teamUsers)

	type GroupWuItem struct {
		Group       string `json:"group"`
		MemberCount int    `json:"member_count"`
		TotalWu     int    `json:"total_wu"`
		AverageWu   int    `json:"average_wu"`
		ZeroWuCount int    `json:"zero_wu_count"`
	}

	groupMap := make(map[string]*GroupWuItem)
	for _, user := range teamUsers {
		if _, exists := groupMap[user.Group]; !exists {
			groupMap[user.Group] = &GroupWuItem{Group: user.Group}
		}
		item := groupMap[user.Group]
		item.MemberCount++
		item.TotalWu += user.Wu
		if user.Wu == 0 {
			item.ZeroWuCount++
		}
	}

	var result []GroupWuItem
	for _, item := range groupMap {
		if item.MemberCount > 0 {
			item.AverageWu = item.TotalWu / item.MemberCount
		}
		result = append(result, *item)
	}

	if result == nil {
		result = []GroupWuItem{}
	}

	common.Response{Data: result}.Success(c)
}

func DelTaskReport(c *gin.Context) {
	tid := c.Param("tid")
	if tid == "" {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	tidint, err := strconv.Atoi(tid)
	if err != nil {
		common.Response{Code: 400, Message: "任务ID错误"}.Error(c)
		return
	}

	var task model.Task
	if err := middleware.GetDB(c).First(&task, tidint).Error; err != nil {
		common.Response{Code: 404, Message: "任务不存在"}.Error(c)
		return
	}

	result := middleware.GetDB(c).Where("wid = ?", task.Pos).Delete(&model.Report{})
	if result.Error != nil {
		common.Response{Code: 500, Message: "删除战报失败: " + result.Error.Error()}.Error(c)
		return
	}

	common.Response{Message: "删除成功", Data: result.RowsAffected}.Success(c)
}

func ReportList(c *gin.Context) {
	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	wid := c.Query("wid")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := middleware.GetDB(c).Model(&model.Report{})
	if wid != "" {
		widInt, err := strconv.Atoi(wid)
		if err == nil {
			query = query.Where("wid = ?", widInt)
		}
	}

	var total int64
	query.Count(&total)

	var reports []model.Report
	query.Order("time DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&reports)

	common.Response{Data: gin.H{
		"list":      reports,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}}.Success(c)
}

type TeamResult struct {
	PlayerName   string `json:"player_name"`
	BattleId     int64  `json:"battle_id"`
	Hero1Id      int64  `json:"hero1_id"`
	Hero2Id      int64  `json:"hero2_id"`
	Hero3Id      int64  `json:"hero3_id"`
	Hero1Level   int64  `json:"hero1_level"`
	Hero2Level   int64  `json:"hero2_level"`
	Hero3Level   int64  `json:"hero3_level"`
	Hero1Star    int64  `json:"hero1_star"`
	Hero2Star    int64  `json:"hero2_star"`
	Hero3Star    int64  `json:"hero3_star"`
	TotalStar    int64  `json:"total_star"`
	Hp           int64  `json:"hp"`
	AllSkillInfo string `json:"all_skill_info"`
	Role         string `json:"role"`
	Time         int64  `json:"time"`
	Gear         string `json:"gear"`
	HeroType     string `json:"hero_type"`
	Idu          string `json:"idu"`
}

func GetPlayerTeam(c *gin.Context) {
	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	name := c.Query("name")
	uname := c.Query("uname")
	idu := c.Query("idu")

	if name == "" {
		name = c.Query("atkname")
	}
	if uname == "" {
		uname = c.Query("atkunionname")
	}

	namePattern := "%" + name + "%"
	unamePattern := "%" + uname + "%"
	iduPattern := "%" + idu + "%"

	var results []TeamResult

	var battleReportCount int64
	middleware.GetDB(c).Model(&model.BattleReport{}).Count(&battleReportCount)

	if battleReportCount > 0 {
		attackQuery := middleware.GetDB(c).Model(&model.BattleReport{}).
			Select(`attack_name AS player_name,
				battle_id,
				attack_hero1_id AS hero1_id,
				attack_hero2_id AS hero2_id,
				attack_hero3_id AS hero3_id,
				attack_hero1_level AS hero1_level,
				attack_hero2_level AS hero2_level,
				attack_hero3_level AS hero3_level,
				attack_hero1_star AS hero1_star,
				attack_hero2_star AS hero2_star,
				attack_hero3_star AS hero3_star,
				attack_total_star AS total_star,
				attack_hp AS hp,
				COALESCE(all_skill_info, '') AS all_skill_info,
				'attack' AS role,
				time,
				attacker_gear_info AS gear,
				attack_hero_type AS hero_type,
				attack_idu AS idu`).
			Where("attack_name LIKE ? AND npc = 0", namePattern)

		if uname != "" {
			attackQuery = attackQuery.Where("attack_union_name LIKE ?", unamePattern)
		}
		if idu != "" {
			attackQuery = attackQuery.Where("attack_idu LIKE ?", iduPattern)
		}

		var attackResults []TeamResult
		if err := attackQuery.Order("time DESC").Limit(200).Find(&attackResults).Error; err != nil {
			fmt.Println("GetPlayerTeam: battle_report 进攻方查询错误:", err)
		} else {
			results = append(results, attackResults...)
		}

		defendQuery := middleware.GetDB(c).Model(&model.BattleReport{}).
			Select(`defend_name AS player_name,
				battle_id,
				defend_hero1_id AS hero1_id,
				defend_hero2_id AS hero2_id,
				defend_hero3_id AS hero3_id,
				defend_hero1_level AS hero1_level,
				defend_hero2_level AS hero2_level,
				defend_hero3_level AS hero3_level,
				defend_hero1_star AS hero1_star,
				defend_hero2_star AS hero2_star,
				defend_hero3_star AS hero3_star,
				defend_total_star AS total_star,
				defend_hp AS hp,
				'' AS all_skill_info,
				'defend' AS role,
				time,
				defender_gear_info AS gear,
				defend_hero_type AS hero_type,
				defend_idu AS idu`).
			Where("defend_name LIKE ? AND npc = 0", namePattern)

		if uname != "" {
			defendQuery = defendQuery.Where("defend_union_name LIKE ?", unamePattern)
		}
		if idu != "" {
			defendQuery = defendQuery.Where("defend_idu LIKE ?", iduPattern)
		}

		var defendResults []TeamResult
		if err := defendQuery.Order("time DESC").Limit(200).Find(&defendResults).Error; err != nil {
			fmt.Println("GetPlayerTeam: battle_report 防守方查询错误:", err)
		} else {
			results = append(results, defendResults...)
		}
	}

	if len(results) == 0 {
		var reportCount int64
		middleware.GetDB(c).Model(&model.Report{}).Count(&reportCount)

		if reportCount > 0 {
			type ReportRaw struct {
				PlayerName        string `json:"player_name"`
				BattleId          int    `json:"battle_id"`
				AttackAllHeroInfo string
				AttackAdvance     string
				Hp                int    `json:"hp"`
				AllSkillInfo      string `json:"all_skill_info"`
				HeroType          string `json:"hero_type"`
				Idu               string `json:"idu"`
				Time              int    `json:"time"`
				AttackerGearInfo  string
				Role              string `json:"role"`
			}

			attackQuery := `SELECT
				attack_name AS player_name,
				battle_id,
				attack_all_hero_info,
				attack_advance,
				attack_hp AS hp,
				COALESCE(all_skill_info, '') AS all_skill_info,
				attack_hero_type AS hero_type,
				attack_idu AS idu,
				time,
				attacker_gear_info,
				'attack' AS role
			FROM reports
			WHERE attack_name LIKE ? AND npc = 0`

			attackArgs := []interface{}{namePattern}
			if uname != "" {
				attackQuery += " AND attack_union_name LIKE ?"
				attackArgs = append(attackArgs, unamePattern)
			}
			if idu != "" {
				attackQuery += " AND attack_idu LIKE ?"
				attackArgs = append(attackArgs, iduPattern)
			}
			attackQuery += " ORDER BY time DESC LIMIT 200"

			var attackRaws []ReportRaw
			if err := middleware.GetDB(c).Raw(attackQuery, attackArgs...).Scan(&attackRaws).Error; err != nil {
				fmt.Println("GetPlayerTeam: 查询report表进攻方错误:", err)
			} else {
				for _, raw := range attackRaws {
					tr := TeamResult{
						PlayerName:   raw.PlayerName,
						BattleId:     int64(raw.BattleId),
						Hp:           int64(raw.Hp),
						AllSkillInfo: raw.AllSkillInfo,
						Role:         "attack",
						Time:         int64(raw.Time),
						Gear:         raw.AttackerGearInfo,
						HeroType:     raw.HeroType,
						Idu:          raw.Idu,
					}
					parseHeroFields(raw.AttackAllHeroInfo, raw.AttackAdvance, &tr)
					results = append(results, tr)
				}
			}

			defendQuery := `SELECT
				defend_name AS player_name,
				battle_id,
				defend_all_hero_info AS attack_all_hero_info,
				defend_advance AS attack_advance,
				defend_hp AS hp,
				'' AS all_skill_info,
				defend_hero_type AS hero_type,
				defend_idu AS idu,
				time,
				defender_gear_info AS attacker_gear_info,
				'defend' AS role
			FROM reports
			WHERE defend_name LIKE ? AND npc = 0`

			defendArgs := []interface{}{namePattern}
			if uname != "" {
				defendQuery += " AND defend_union_name LIKE ?"
				defendArgs = append(defendArgs, unamePattern)
			}
			if idu != "" {
				defendQuery += " AND defend_idu LIKE ?"
				defendArgs = append(defendArgs, iduPattern)
			}
			defendQuery += " ORDER BY time DESC LIMIT 200"

			var defendRaws []ReportRaw
			if err := middleware.GetDB(c).Raw(defendQuery, defendArgs...).Scan(&defendRaws).Error; err != nil {
				fmt.Println("GetPlayerTeam: 查询report表防守方错误:", err)
			} else {
				for _, raw := range defendRaws {
					tr := TeamResult{
						PlayerName:   raw.PlayerName,
						BattleId:     int64(raw.BattleId),
						Hp:           int64(raw.Hp),
						AllSkillInfo: raw.AllSkillInfo,
						Role:         "defend",
						Time:         int64(raw.Time),
						Gear:         raw.AttackerGearInfo,
						HeroType:     raw.HeroType,
						Idu:          raw.Idu,
					}
					parseHeroFields(raw.AttackAllHeroInfo, raw.AttackAdvance, &tr)
					results = append(results, tr)
				}
			}
		}
	}

	if results == nil {
		results = []TeamResult{}
	}

	common.Response{Data: results}.Success(c)
}

func parseHeroInfo(heroInfo string) []map[string]interface{} {
	var result []map[string]interface{}
	heroes := strings.Split(heroInfo, "|")
	for _, hero := range heroes {
		if hero == "" {
			continue
		}
		fields := strings.Split(hero, ",")
		if len(fields) >= 3 {
			heroData := map[string]interface{}{
				"hero_id": fields[0],
				"level":   fields[1],
				"star":    fields[2],
			}
			result = append(result, heroData)
		}
	}
	return result
}

func GetBattleReportDetail(c *gin.Context) {
	battleId := c.Param("battle_id")
	if battleId == "" {
		common.Response{Code: 400, Message: "战报ID不能为空"}.Error(c)
		return
	}

	var report model.BattleReport
	if err := middleware.GetDB(c).Where("battle_id = ?", battleId).First(&report).Error; err != nil {
		common.Response{Code: 404, Message: "战报不存在"}.Error(c)
		return
	}

	common.Response{Data: report}.Success(c)
}

func parseHeroFields(heroInfo, advance string, tr *TeamResult) {
	if heroInfo != "" {
		heroes := strings.Split(heroInfo, "|")
		for i, hero := range heroes {
			if i >= 3 {
				break
			}
			fields := strings.Split(hero, ",")
			if len(fields) >= 1 {
				id, _ := strconv.ParseInt(fields[0], 10, 64)
				switch i {
				case 0:
					tr.Hero1Id = id
				case 1:
					tr.Hero2Id = id
				case 2:
					tr.Hero3Id = id
				}
			}
			if len(fields) >= 2 {
				level, _ := strconv.ParseInt(fields[1], 10, 64)
				switch i {
				case 0:
					tr.Hero1Level = level
				case 1:
					tr.Hero2Level = level
				case 2:
					tr.Hero3Level = level
				}
			}
		}
	}

	if advance != "" {
		parts := strings.Split(advance, ";")
		for i, part := range parts {
			if i == 0 || i > 3 {
				continue
			}
			fields := strings.Split(part, ",")
			if len(fields) > 0 && fields[0] != "" {
				star, _ := strconv.ParseInt(fields[0], 10, 64)
				switch i {
				case 1:
					tr.Hero1Star = star
				case 2:
					tr.Hero2Star = star
				case 3:
					tr.Hero3Star = star
				}
				tr.TotalStar += star
			}
		}
	}
}

func GetPlayerTeamByKey(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		common.Response{Code: 400, Message: "参数 key 不能为空"}.Error(c)
		return
	}

	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	var teamData model.PlayerTeamData
	if err := middleware.GetDB(c).Where("team_key = ?", key).First(&teamData).Error; err != nil {
		common.Response{Code: 404, Message: "未找到该队伍数据"}.Error(c)
		return
	}

	common.Response{Data: teamData}.Success(c)
}

func GetBattleReportList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	atkName := c.Query("atk_name")
	defName := c.Query("def_name")
	unionName := c.Query("union_name")
	wid := c.Query("wid")
	minHp, _ := strconv.Atoi(c.DefaultQuery("min_hp", "0"))
	nonpc := c.Query("nonpc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := middleware.GetDB(c).Model(&model.BattleReport{})

	if wid != "" {
		query = applyWidFilter(query, wid)
	}
	if atkName != "" {
		query = query.Where("attack_name LIKE ?", "%"+atkName+"%")
	}
	if defName != "" {
		query = query.Where("defend_name LIKE ?", "%"+defName+"%")
	}
	if unionName != "" {
		query = query.Where("attack_union_name LIKE ? OR defend_union_name LIKE ?", "%"+unionName+"%", "%"+unionName+"%")
	}
	if minHp > 0 {
		query = query.Where("attack_hp >= ? OR defend_hp >= ?", minHp, minHp)
	}
	if nonpc == "1" {
		query = query.Where("npc = 0")
	}

	var total int64
	query.Count(&total)

	var reports []model.BattleReport
	query.Order("time DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&reports)

	if reports == nil {
		reports = []model.BattleReport{}
	}

	common.Response{Data: gin.H{
		"list":      reports,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}}.Success(c)
}

func DeleteBattleReports(c *gin.Context) {
	db := middleware.GetDB(c)
	if db == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	wid := c.Query("wid")
	idStr := c.Query("ids")

	if wid == "" && idStr == "" {
		common.Response{Code: 400, Message: "请提供 wid 或 ids 参数"}.Error(c)
		return
	}

	var result *gorm.DB
	if idStr != "" {
		ids := strings.Split(idStr, ",")
		result = db.Delete(&model.BattleReport{}, ids)
	} else if wid != "" {
		result = applyWidFilter(db.Model(&model.BattleReport{}), wid).Delete(&model.BattleReport{})
	}

	if result.Error != nil {
		common.Response{Code: 500, Message: "删除失败: " + result.Error.Error()}.Error(c)
		return
	}

	common.Response{Data: gin.H{"deleted": result.RowsAffected}, Message: fmt.Sprintf("成功删除 %d 条战报", result.RowsAffected)}.Success(c)
}

func GetBattlefieldStats(c *gin.Context) {
	db := middleware.GetDB(c)
	if db == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	unionName := c.Query("union_name")
	minHp, _ := strconv.Atoi(c.DefaultQuery("min_hp", "0"))
	nonpc := c.Query("nonpc")
	widName := c.Query("wid_name")
	minX, _ := strconv.Atoi(c.DefaultQuery("min_x", "0"))
	maxX, _ := strconv.Atoi(c.DefaultQuery("max_x", "0"))
	minY, _ := strconv.Atoi(c.DefaultQuery("min_y", "0"))
	maxY, _ := strconv.Atoi(c.DefaultQuery("max_y", "0"))

	type BattlefieldInfo struct {
		Wid          string `json:"wid"`
		WidName      string `json:"wid_name"`
		AttackCount  int64  `json:"attack_count"`
		DefendCount  int64  `json:"defend_count"`
		ReportCount  int64  `json:"report_count"`
		AttackUnions string `json:"attack_unions"`
		DefendUnions string `json:"defend_unions"`
		X            int    `json:"x"`
		Y            int    `json:"y"`
	}

	hasRange := minX > 0 || maxX > 0 || minY > 0 || maxY > 0

	sql := `
		SELECT
			wid,
			MAX(wid_name) as wid_name,
			COUNT(DISTINCT attack_name) as attack_count,
			COUNT(DISTINCT defend_name) as defend_count,
			COUNT(*) as report_count,
			GROUP_CONCAT(DISTINCT attack_union_name) as attack_unions,
			GROUP_CONCAT(DISTINCT defend_union_name) as defend_unions
		FROM battle_report
		WHERE 1=1
	`
	var args []interface{}

	if unionName != "" {
		sql += " AND (attack_union_name = ? OR defend_union_name = ?)"
		args = append(args, unionName, unionName)
	}
	if minHp > 0 {
		sql += " AND (attack_hp >= ? OR defend_hp >= ?)"
		args = append(args, minHp, minHp)
	}
	if nonpc == "1" {
		sql += " AND npc = 0"
	}
	if widName != "" {
		sql += " AND wid_name LIKE ?"
		args = append(args, "%"+widName+"%")
	}

	sql += " GROUP BY wid"

	type RawResult struct {
		Wid          string
		WidName      string
		AttackCount  int64
		DefendCount  int64
		ReportCount  int64
		AttackUnions string
		DefendUnions string
	}

	var rawResults []RawResult
	rows, err := db.Raw(sql, args...).Rows()
	if err != nil {
		common.Response{Code: 500, Message: "查询失败: " + err.Error()}.Error(c)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var r RawResult
		if err := rows.Scan(&r.Wid, &r.WidName, &r.AttackCount, &r.DefendCount, &r.ReportCount, &r.AttackUnions, &r.DefendUnions); err != nil {
			continue
		}
		rawResults = append(rawResults, r)
	}

	widNameToCoord := make(map[string][2]int)
	for _, raw := range rawResults {
		if strings.Contains(raw.Wid, ",") {
			parts := strings.SplitN(raw.Wid, ",", 2)
			if len(parts) == 2 {
				x, e1 := strconv.Atoi(strings.TrimSpace(parts[0]))
				y, e2 := strconv.Atoi(strings.TrimSpace(parts[1]))
				if e1 == nil && e2 == nil && x > 0 && y > 0 {
					if raw.WidName != "" && raw.WidName != "-" {
						if existing, ok := widNameToCoord[raw.WidName]; !ok || (existing[0] == 0 && existing[1] == 0) {
							widNameToCoord[raw.WidName] = [2]int{x, y}
						}
					}
				}
			}
		}
	}

	type Merged struct {
		Wid          string
		WidName      string
		AttackCount  int64
		DefendCount  int64
		ReportCount  int64
		AttackUnions map[string]bool
		DefendUnions map[string]bool
		X            int
		Y            int
	}
	mergedMap := make(map[string]*Merged)

	for _, raw := range rawResults {
		x, y, ok := parseWidToXY(raw.Wid, widNameToCoord, raw.WidName)
		if !ok || x <= 0 || y <= 0 {
			continue
		}
		if hasRange {
			if minX > 0 && x < minX {
				continue
			}
			if maxX > 0 && x > maxX {
				continue
			}
			if minY > 0 && y < minY {
				continue
			}
			if maxY > 0 && y > maxY {
				continue
			}
		}

		normWid := fmt.Sprintf("%d,%d", x, y)
		addUnion := func(m map[string]bool, unions string) {
			for _, u := range strings.Split(unions, ",") {
				u = strings.TrimSpace(u)
				if u != "" && u != "无" {
					m[u] = true
				}
			}
		}

		if m, exists := mergedMap[normWid]; exists {
			m.AttackCount += raw.AttackCount
			m.DefendCount += raw.DefendCount
			m.ReportCount += raw.ReportCount
			if raw.WidName != "" && raw.WidName != "-" {
				m.WidName = raw.WidName
			}
			addUnion(m.AttackUnions, raw.AttackUnions)
			addUnion(m.DefendUnions, raw.DefendUnions)
		} else {
			atk := make(map[string]bool)
			def := make(map[string]bool)
			addUnion(atk, raw.AttackUnions)
			addUnion(def, raw.DefendUnions)
			mergedMap[normWid] = &Merged{
				Wid: normWid, WidName: raw.WidName,
				AttackCount: raw.AttackCount, DefendCount: raw.DefendCount, ReportCount: raw.ReportCount,
				AttackUnions: atk, DefendUnions: def, X: x, Y: y,
			}
		}
	}

	var results []BattlefieldInfo
	for _, m := range mergedMap {
		atkList := make([]string, 0, len(m.AttackUnions))
		for u := range m.AttackUnions {
			atkList = append(atkList, u)
		}
		defList := make([]string, 0, len(m.DefendUnions))
		for u := range m.DefendUnions {
			defList = append(defList, u)
		}
		results = append(results, BattlefieldInfo{
			Wid: m.Wid, WidName: m.WidName,
			AttackCount: m.AttackCount, DefendCount: m.DefendCount, ReportCount: m.ReportCount,
			AttackUnions: strings.Join(atkList, ","), DefendUnions: strings.Join(defList, ","),
			X: m.X, Y: m.Y,
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].ReportCount > results[j].ReportCount
	})

	if results == nil {
		results = []BattlefieldInfo{}
	}

	common.Response{Data: results}.Success(c)
}

func parseWidToXY(wid string, nameLookup map[string][2]int, widName string) (int, int, bool) {
	if wid == "" {
		return 0, 0, false
	}
	if strings.Contains(wid, ",") {
		parts := strings.SplitN(wid, ",", 2)
		if len(parts) == 2 {
			x, e1 := strconv.Atoi(strings.TrimSpace(parts[0]))
			y, e2 := strconv.Atoi(strings.TrimSpace(parts[1]))
			if e1 == nil && e2 == nil {
				return x, y, true
			}
		}
		return 0, 0, false
	}

	digits := ""
	for _, ch := range wid {
		if ch >= '0' && ch <= '9' {
			digits += string(ch)
		}
	}
	if len(digits) <= 4 {
		return 0, 0, false
	}

	if widName != "" && widName != "-" {
		if coord, ok := nameLookup[widName]; ok && coord[0] > 0 && coord[1] > 0 {
			return coord[0], coord[1], true
		}
	}

	strLen := len(digits)
	half := strLen / 2
	bestX, bestY := 0, 0
	bestScore := 0
	for split := 1; split < strLen; split++ {
		x, e1 := strconv.Atoi(digits[:split])
		y, e2 := strconv.Atoi(digits[split:])
		if e1 != nil || e2 != nil || y == 0 {
			continue
		}
		score := 0
		if x >= 100 && x <= 1500 {
			score++
		}
		if y >= 100 && y <= 1500 {
			score++
		}
		if x >= 200 && x <= 1200 {
			score++
		}
		if y >= 200 && y <= 1200 {
			score++
		}
		if score > bestScore {
			bestScore = score
			bestX, bestY = x, y
		}
	}
	if bestScore > 0 {
		return bestX, bestY, true
	}

	for split := half - 1; split <= half+1; split++ {
		if split <= 0 || split >= strLen {
			continue
		}
		x, _ := strconv.Atoi(digits[:split])
		y, _ := strconv.Atoi(digits[split:])
		if x > 0 && y > 0 {
			return x, y, true
		}
	}

	return 0, 0, false
}

func applyWidFilter(query *gorm.DB, wid string) *gorm.DB {
	if wid == "" {
		return query
	}
	if strings.Contains(wid, ",") {
		parts := strings.SplitN(wid, ",", 2)
		if len(parts) == 2 {
			x := strings.TrimSpace(parts[0])
			y := strings.TrimSpace(parts[1])
			if x != "" && y != "" {
				return query.Where("wid = ? OR wid = ?", x+","+y, x+y)
			}
		}
	}
	return query.Where("wid = ?", wid)
}

func MigrateWidFormat(c *gin.Context) {
	db := middleware.GetDB(c)
	if db == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	type WidPair struct {
		OldWid string
		NewWid string
	}

	rows, err := db.Raw("SELECT DISTINCT wid FROM battle_report WHERE INSTR(wid, ',') = 0").Rows()
	if err != nil {
		common.Response{Code: 500, Message: "查询失败: " + err.Error()}.Error(c)
		return
	}
	defer rows.Close()

	var numericWids []string
	for rows.Next() {
		var wid string
		if err := rows.Scan(&wid); err == nil && wid != "" {
			numericWids = append(numericWids, wid)
		}
	}

	if len(numericWids) == 0 {
		common.Response{Data: map[string]int{"migrated": 0}}.Success(c)
		return
	}

	type CommaWid struct {
		Wid     string
		WidName string
	}
	var commaWids []CommaWid
	db.Raw("SELECT wid, wid_name FROM battle_report WHERE INSTR(wid, ',') > 0 GROUP BY wid").Scan(&commaWids)

	widNameToComma := make(map[string]string)
	for _, cw := range commaWids {
		parts := strings.SplitN(cw.Wid, ",", 2)
		if len(parts) == 2 {
			x, e1 := strconv.Atoi(strings.TrimSpace(parts[0]))
			y, e2 := strconv.Atoi(strings.TrimSpace(parts[1]))
			if e1 == nil && e2 == nil {
				noComma := fmt.Sprintf("%d%d", x, y)
				widNameToComma[cw.WidName+"|"+noComma] = cw.Wid
			}
		}
	}

	migrated := 0
	for _, numWid := range numericWids {
		digits := ""
		for _, ch := range numWid {
			if ch >= '0' && ch <= '9' {
				digits += string(ch)
			}
		}
		if digits == "" || len(digits) <= 4 {
			continue
		}

		var targetWid string
		var widNames []string
		db.Raw("SELECT DISTINCT wid_name FROM battle_report WHERE wid = ?", numWid).Scan(&widNames)
		for _, wn := range widNames {
			if key := wn + "|" + digits; key != "|" {
				if cw, ok := widNameToComma[key]; ok {
					targetWid = cw
					break
				}
			}
		}

		if targetWid == "" {
			half := len(digits) / 2
			for split := half - 1; split <= half+1; split++ {
				if split <= 0 || split >= len(digits) {
					continue
				}
				x, _ := strconv.Atoi(digits[:split])
				y, _ := strconv.Atoi(digits[split:])
				if x > 0 && y > 0 && x <= 2000 && y <= 2000 {
					targetWid = fmt.Sprintf("%d,%d", x, y)
					break
				}
			}
		}

		if targetWid != "" && targetWid != numWid {
			result := db.Exec("UPDATE battle_report SET wid = ? WHERE wid = ?", targetWid, numWid)
			if result.Error == nil {
				migrated++
			}
		}
	}

	common.Response{Data: map[string]int{"migrated": migrated}}.Success(c)
}

func Example(c *gin.Context) {
	common.Response{Message: "This is example func"}.Success(c)
}
