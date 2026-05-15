package service

import (
	"log"
	"time"

	"gorm.io/gorm"
	"stzbHelper/database"
	"stzbHelper/model"
)

// InitTaskCreatedAt 为现有任务初始化创建时间
func InitTaskCreatedAt() {
	log.Println("[Migration] 开始为现有任务初始化创建时间...")

	// 获取所有游戏数据库
	var gameDBs []database.GameDatabase
	result := database.SystemDB.Where("status = 1").Find(&gameDBs)
	if result.Error != nil {
		log.Printf("[Migration] 获取数据库列表失败: %v\n", result.Error)
		return
	}

	totalUpdated := 0

	for _, gameDB := range gameDBs {
		db, err := database.GetGameDB(gameDB.Name)
		if err != nil {
			log.Printf("[Migration] 连接数据库 %s 失败: %v\n", gameDB.Name, err)
			continue
		}

		updated := initTaskCreatedAtForDB(db, gameDB.Name)
		totalUpdated += updated
	}

	log.Printf("[Migration] 完成 - 共更新 %d 个任务的创建时间\n", totalUpdated)
}

// initTaskCreatedAtForDB 为单个数据库中的任务初始化创建时间
func initTaskCreatedAtForDB(db *gorm.DB, dbName string) int {
	// 查找created_at为0的任务
	var tasks []model.Task
	result := db.Where("created_at = 0 OR created_at IS NULL").Find(&tasks)
	if result.Error != nil {
		log.Printf("[Migration] 查询数据库 %s 的任务失败: %v\n", dbName, result.Error)
		return 0
	}

	if len(tasks) == 0 {
		return 0
	}

	updated := 0
	now := time.Now().Unix()

	for _, task := range tasks {
		// 使用任务的时间字段作为创建时间的近似值
		createdAt := int64(task.Time)
		if createdAt <= 0 {
			createdAt = now
		}

		result := db.Model(&task).Update("created_at", createdAt)
		if result.Error != nil {
			log.Printf("[Migration] 更新任务 %d 的创建时间失败: %v\n", task.Id, result.Error)
		} else {
			updated++
		}
	}

	if updated > 0 {
		log.Printf("[Migration] 数据库 %s 更新了 %d 个任务的创建时间\n", dbName, updated)
	}

	return updated
}
