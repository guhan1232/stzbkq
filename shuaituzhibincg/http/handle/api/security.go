package api

import (
	"github.com/gin-gonic/gin"
	"stzbHelper/config"
	"stzbHelper/http/common"
	"stzbHelper/middleware"
)

func GetHostCheckConfig(c *gin.Context) {
	if !middleware.IsAdmin(c) {
		common.Response{Code: 403, Message: "无权限访问"}.Error(c)
		return
	}

	enabled := config.AppConfig.Security.EnableHostCheck

	common.Response{
		Code:    200,
		Message: "ok",
		Data: gin.H{
			"enabled": enabled,
		},
	}.Success(c)
}

func SaveHostCheckConfig(c *gin.Context) {
	if !middleware.IsAdmin(c) {
		common.Response{Code: 403, Message: "无权限访问"}.Error(c)
		return
	}

	enabled := c.PostForm("enabled") == "1"

	common.Response{
		Code:    200,
		Message: "配置已保存，请修改.env 文件并重启服务以生效",
		Data: gin.H{
			"enabled":        enabled,
			"config_file":    ".env",
			"config_key":     "ENABLE_HOST_CHECK",
			"config_value":   map[bool]string{true: "true", false: "false"}[enabled],
			"restart_needed": true,
			"instruction":    "请编辑.env 文件，设置 ENABLE_HOST_CHECK=" + map[bool]string{true: "true", false: "false"}[enabled] + "，然后重启服务",
		},
	}.Success(c)
}
