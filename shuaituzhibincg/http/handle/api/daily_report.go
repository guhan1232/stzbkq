package api

import (
	"log"
	"strconv"
	"stzbHelper/http/common"
	"stzbHelper/middleware"
	"stzbHelper/model"
	"stzbHelper/service"

	"github.com/gin-gonic/gin"
)

func GetDailyReportList(c *gin.Context) {
	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var total int64
	middleware.GetDB(c).Model(&model.DailyReport{}).Count(&total)

	var reports []model.DailyReport
	offset := (page - 1) * pageSize
	middleware.GetDB(c).Order("date DESC").Offset(offset).Limit(pageSize).Find(&reports)

	if reports == nil {
		reports = []model.DailyReport{}
	}

	common.Response{Data: gin.H{
		"list":      reports,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	}}.Success(c)
}

func GetDailyReport(c *gin.Context) {
	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	date := c.Param("date")
	if date == "" {
		common.Response{Code: 400, Message: "日期参数错误"}.Error(c)
		return
	}

	var report model.DailyReport
	result := middleware.GetDB(c).Where("date = ?", date).First(&report)
	if result.Error != nil {
		common.Response{Code: 404, Message: "未找到该日期的报告"}.Error(c)
		return
	}

	content, err := service.ParseReportContent(report.Content)
	if err != nil {
		common.Response{Code: 500, Message: "解析报告内容失败"}.Error(c)
		return
	}

	common.Response{Data: gin.H{
		"report":  report,
		"content": content,
	}}.Success(c)
}

func GetDailyReportText(c *gin.Context) {
	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	date := c.Param("date")
	if date == "" {
		common.Response{Code: 400, Message: "日期参数错误"}.Error(c)
		return
	}

	var report model.DailyReport
	result := middleware.GetDB(c).Where("date = ?", date).First(&report)
	if result.Error != nil {
		common.Response{Code: 404, Message: "未找到该日期的报告"}.Error(c)
		return
	}

	text, err := service.GenerateTextReport(&report)
	if err != nil {
		common.Response{Code: 500, Message: "生成文本报告失败: " + err.Error()}.Error(c)
		return
	}

	common.Response{Data: gin.H{
		"date": report.Date,
		"text": text,
	}}.Success(c)
}

func GenerateTodayReport(c *gin.Context) {
	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	db := middleware.GetDB(c)
	reportService := service.NewDailyReportService()

	reportService.GenerateDailyReport(db, "manual", service.GetTodayDate())

	common.Response{Message: "报告生成成功"}.Success(c)
}

func DeleteDailyReport(c *gin.Context) {
	if middleware.GetDB(c) == nil {
		common.Response{Code: 400, Message: "请先选择数据库"}.Error(c)
		return
	}

	date := c.Param("date")
	if date == "" {
		common.Response{Code: 400, Message: "日期参数错误"}.Error(c)
		return
	}

	result := middleware.GetDB(c).Where("date = ?", date).Delete(&model.DailyReport{})
	if result.Error != nil {
		common.Response{Code: 500, Message: "删除报告失败: " + result.Error.Error()}.Error(c)
		return
	}

	if result.RowsAffected == 0 {
		common.Response{Code: 404, Message: "未找到该日期的报告"}.Error(c)
		return
	}

	log.Printf("[API] 删除每日报告: %s\n", date)
	common.Response{Message: "删除成功", Data: result.RowsAffected}.Success(c)
}
