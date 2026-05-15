package service

import (
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
	"stzbHelper/database"
	"stzbHelper/model"
)

// CleanupService 数据清理服务
type CleanupService struct {
	stopChan chan struct{}
	ticker   *time.Ticker
}

// NewCleanupService 创建清理服务
func NewCleanupService() *CleanupService {
	return &CleanupService{
		stopChan: make(chan struct{}),
	}
}

// Start 启动定时清理任务
func (c *CleanupService) Start() {
	log.Println("[CleanupService] 启动定时清理服务")

	// 每天凌晨2点执行清理
	c.ticker = time.NewTicker(1 * time.Hour) // 每小时检查一次

	go func() {
		for {
			select {
			case <-c.ticker.C:
				c.executeCleanup()
			case <-c.stopChan:
				log.Println("[CleanupService] 停止定时清理服务")
				return
			}
		}
	}()

	// 立即执行一次
	go c.executeCleanup()
}

// Stop 停止定时清理任务
func (c *CleanupService) Stop() {
	if c.ticker != nil {
		c.ticker.Stop()
	}
	close(c.stopChan)
}

// ExecuteCleanupNow 立即执行清理（用于手动触发）
func (c *CleanupService) ExecuteCleanupNow() {
	c.executeCleanup()
	// 更新最后清理时间戳，通知小程序刷新
	c.updateLastCleanupTimestamp()
}

// ExecuteCleanupAllReports 清理所有战报（用于手动触发）
func (c *CleanupService) ExecuteCleanupAllReports() {
	log.Println("[CleanupService] 开始执行所有战报清理...")

	// 获取所有游戏数据库
	var gameDBs []database.GameDatabase
	result := database.SystemDB.Where("status = 1").Find(&gameDBs)
	if result.Error != nil {
		log.Printf("[CleanupService] 获取数据库列表失败: %v\n", result.Error)
		return
	}

	totalDeletedReports := 0

	for _, gameDB := range gameDBs {
		db, err := database.GetGameDB(gameDB.Name)
		if err != nil {
			log.Printf("[CleanupService] 连接数据库 %s 失败: %v\n", gameDB.Name, err)
			continue
		}

		deletedReports := c.cleanupAllReports(db, gameDB.Name)
		totalDeletedReports += deletedReports
	}

	log.Printf("[CleanupService] 所有战报清理完成 - 删除战报总数: %d\n", totalDeletedReports)

	// 更新最后清理时间戳，通知小程序刷新
	c.updateLastCleanupTimestamp()
}

// executeCleanup 执行清理操作
func (c *CleanupService) executeCleanup() {
	log.Println("[CleanupService] 开始执行数据清理...")

	// 获取所有游戏数据库
	var gameDBs []database.GameDatabase
	result := database.SystemDB.Where("status = 1").Find(&gameDBs)
	if result.Error != nil {
		log.Printf("[CleanupService] 获取数据库列表失败: %v\n", result.Error)
		return
	}

	totalDeletedTasks := 0
	totalDeletedReports := 0

	for _, gameDB := range gameDBs {
		db, err := database.GetGameDB(gameDB.Name)
		if err != nil {
			log.Printf("[CleanupService] 连接数据库 %s 失败: %v\n", gameDB.Name, err)
			continue
		}

		deletedTasks, deletedReports := c.cleanupDatabase(db, gameDB.Name)
		totalDeletedTasks += deletedTasks
		totalDeletedReports += deletedReports
	}

	log.Printf("[CleanupService] 清理完成 - 删除任务: %d, 删除战报: %d\n", totalDeletedTasks, totalDeletedReports)

	// 更新最后清理时间戳，通知小程序刷新
	c.updateLastCleanupTimestamp()
}

// cleanupDatabase 清理单个数据库的旧数据
func (c *CleanupService) cleanupDatabase(db *gorm.DB, dbName string) (int, int) {
	sevenDaysAgo := time.Now().AddDate(0, 0, -7).Unix()

	// 1. 删除超过7天的任务
	var tasks []model.Task
	result := db.Where("created_at < ? AND created_at > 0", sevenDaysAgo).Find(&tasks)
	if result.Error != nil {
		log.Printf("[CleanupService] 查询数据库 %s 的旧任务失败: %v\n", dbName, result.Error)
		return 0, 0
	}

	deletedTasks := 0
	for _, task := range tasks {
		// 删除任务关联的考勤战报
		reportResult := db.Where("wid = ?", task.Pos).Delete(&model.Report{})
		if reportResult.Error != nil {
			log.Printf("[CleanupService] 删除任务 %d 的考勤战报失败: %v\n", task.Id, reportResult.Error)
		}

		// 删除任务关联的详细战报
		battleReportResult := db.Where("wid = ?", fmt.Sprintf("%d", task.Pos)).Delete(&model.BattleReport{})
		if battleReportResult.Error != nil {
			log.Printf("[CleanupService] 删除任务 %d 的详细战报失败: %v\n", task.Id, battleReportResult.Error)
		}

		// 删除任务
		taskResult := db.Delete(&model.Task{}, task.Id)
		if taskResult.Error != nil {
			log.Printf("[CleanupService] 删除任务 %d 失败: %v\n", task.Id, taskResult.Error)
		} else {
			deletedTasks++
			log.Printf("[CleanupService] 删除过期任务: ID=%d, Name=%s, Pos=%d, 删除考勤战报: %d 条, 删除详细战报: %d 条\n",
				task.Id, task.Name, task.Pos, reportResult.RowsAffected, battleReportResult.RowsAffected)
		}
	}

	// 2. 删除没有关联任务的孤立战报（超过7天）
	// 获取所有任务的Pos
	var allTasks []model.Task
	db.Find(&allTasks)
	taskPosMap := make(map[int]bool)
	for _, task := range allTasks {
		taskPosMap[task.Pos] = true
	}

	// 2.1 查找孤立的考勤战报（Report表）
	var orphanReports []model.Report
	result = db.Where("time < ?", sevenDaysAgo).Find(&orphanReports)
	if result.Error != nil {
		log.Printf("[CleanupService] 查询数据库 %s 的孤立考勤战报失败: %v\n", dbName, result.Error)
		return deletedTasks, 0
	}

	deletedReports := 0
	for _, report := range orphanReports {
		// 如果战报的wid不在任何任务中，则认为是孤立战报
		if !taskPosMap[report.Wid] {
			deleteResult := db.Where("battle_id = ?", report.BattleID).Delete(&model.Report{})
			if deleteResult.Error != nil {
				log.Printf("[CleanupService] 删除孤立考勤战报 %d 失败: %v\n", report.BattleID, deleteResult.Error)
			} else {
				deletedReports++
			}
		}
	}

	if deletedReports > 0 {
		log.Printf("[CleanupService] 数据库 %s 删除孤立考勤战报: %d 条\n", dbName, deletedReports)
	}

	// 2.2 查找孤立的详细战报（BattleReport表）
	// BattleReport的wid是string类型，需要转换为int对比
	var orphanBattleReports []model.BattleReport
	result = db.Where("time < ?", sevenDaysAgo).Find(&orphanBattleReports)
	if result.Error != nil {
		log.Printf("[CleanupService] 查询数据库 %s 的孤立详细战报失败: %v\n", dbName, result.Error)
		return deletedTasks, deletedReports
	}

	deletedBattleReports := 0
	for _, battleReport := range orphanBattleReports {
		// 将string类型的wid转换为int进行对比
		var widInt int
		_, err := fmt.Sscanf(battleReport.Wid, "%d", &widInt)
		if err != nil {
			// 转换失败，跳过
			continue
		}

		// 如果战报的wid不在任何任务中，则认为是孤立战报
		if !taskPosMap[widInt] {
			deleteResult := db.Where("battle_id = ?", battleReport.BattleId).Delete(&model.BattleReport{})
			if deleteResult.Error != nil {
				log.Printf("[CleanupService] 删除孤立详细战报 %d 失败: %v\n", battleReport.BattleId, deleteResult.Error)
			} else {
				deletedBattleReports++
			}
		}
	}

	if deletedBattleReports > 0 {
		log.Printf("[CleanupService] 数据库 %s 删除孤立详细战报: %d 条\n", dbName, deletedBattleReports)
	}

	totalDeleted := deletedReports + deletedBattleReports
	return deletedTasks, totalDeleted
}

// cleanupAllReports 清理数据库中所有战报
func (c *CleanupService) cleanupAllReports(db *gorm.DB, dbName string) int {
	log.Printf("[CleanupService] 开始清理数据库 %s 的所有战报...\n", dbName)

	// 先统计战报数量
	var count int64
	result := db.Model(&model.Report{}).Count(&count)
	if result.Error != nil {
		log.Printf("[CleanupService] 统计数据库 %s 的战报数量失败: %v\n", dbName, result.Error)
		return 0
	}

	if count == 0 {
		log.Printf("[CleanupService] 数据库 %s 没有战报，跳过清理\n", dbName)
		return 0
	}

	log.Printf("[CleanupService] 数据库 %s 共有 %d 条战报，开始删除...\n", dbName, count)

	// 删除所有战报
	deleteResult := db.Where("1=1").Delete(&model.Report{})
	if deleteResult.Error != nil {
		log.Printf("[CleanupService] 删除数据库 %s 的战报失败: %v\n", dbName, deleteResult.Error)
		return 0
	}

	deletedCount := deleteResult.RowsAffected
	log.Printf("[CleanupService] 数据库 %s 成功删除 %d 条战报\n", dbName, deletedCount)

	return int(deletedCount)
}

// updateLastCleanupTimestamp 更新最后清理时间戳，通知小程序刷新数据
func (c *CleanupService) updateLastCleanupTimestamp() {
	now := time.Now().Unix()

	// 使用 GORM 的 FirstOrCreate + Updates，兼容 MySQL
	var config model.SystemConfig
	result := database.SystemDB.Where("key = ?", "last_cleanup_timestamp").First(&config)

	if result.Error == gorm.ErrRecordNotFound {
		// 记录不存在，创建新记录
		database.SystemDB.Create(&model.SystemConfig{
			Key:   "last_cleanup_timestamp",
			Value: fmt.Sprintf("%d", now),
		})
	} else {
		// 记录存在，更新
		database.SystemDB.Model(&model.SystemConfig{}).
			Where("key = ?", "last_cleanup_timestamp").
			Update("value", fmt.Sprintf("%d", now))
	}

	log.Printf("[CleanupService] 已更新清理时间戳: %d\n", now)
}
