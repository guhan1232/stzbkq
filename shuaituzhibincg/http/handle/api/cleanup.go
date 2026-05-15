package api

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"stzbHelper/database"
	"stzbHelper/http/common"
	"stzbHelper/model"
	"stzbHelper/service"
)

// ExecuteCleanup 手动执行数据清理（仅管理员）
func ExecuteCleanup(c *gin.Context) {
	// 权限检查由中间件 AdminRequired 处理

	// 获取清理类型参数
	cleanupType := c.DefaultPostForm("type", "auto") // auto=自动清理(7天), all_reports=清理所有战报

	// 创建清理服务并立即执行
	cleanupService := service.NewCleanupService()

	// 直接执行清理
	go func() {
		if cleanupType == "all_reports" {
			cleanupService.ExecuteCleanupAllReports()
		} else {
			cleanupService.ExecuteCleanupNow()
		}
	}()

	message := "清理任务已启动，请稍后查看日志"
	if cleanupType == "all_reports" {
		message = "所有战报清理任务已启动，请稍后查看日志"
	}

	common.Response{Message: message}.Success(c)
}

// GetLastCleanupTimestamp 获取最后清理时间戳（小程序调用）
func GetLastCleanupTimestamp(c *gin.Context) {
	var config model.SystemConfig

	// 查询系统配置表中的清理时间戳
	result := database.SystemDB.Where("key = ?", "last_cleanup_timestamp").First(&config)

	var timestamp int64
	if result.Error == nil && config.Value != "" {
		// 将字符串转换为 int64
		fmt.Sscanf(config.Value, "%d", &timestamp)
	}

	common.Response{
		Data: map[string]interface{}{
			"timestamp": timestamp,
		},
	}.Success(c)
}
