package api

import (
	"strings"

	"github.com/gin-gonic/gin"
	"stzbHelper/http/common"
	"stzbHelper/middleware"
	"stzbHelper/service"
)

func GetIPWhitelist(c *gin.Context) {
	if !middleware.IsAdmin(c) {
		common.Response{Code: 403, Message: "无权限访问"}.Error(c)
		return
	}

	whitelist, err := service.GetIPWhitelist()
	if err != nil {
		common.Response{Code: 500, Message: "获取失败: " + err.Error()}.Error(c)
		return
	}

	enabled, _ := service.IsIPWhitelistEnabled()

	common.Response{
		Code:    200,
		Message: "ok",
		Data: gin.H{
			"enabled":   enabled,
			"whitelist": whitelist,
		},
	}.Success(c)
}

func SaveIPWhitelist(c *gin.Context) {
	if !middleware.IsAdmin(c) {
		common.Response{Code: 403, Message: "无权限访问"}.Error(c)
		return
	}

	enabled := c.PostForm("enabled") == "1"
	whitelistStr := c.PostForm("whitelist")

	var ips []string
	if whitelistStr != "" {
		ips = strings.Split(whitelistStr, ",")
	}

	err := service.SaveIPWhitelist(ips)
	if err != nil {
		common.Response{Code: 500, Message: "保存失败: " + err.Error()}.Error(c)
		return
	}

	err = service.EnableIPWhitelist(enabled)
	if err != nil {
		common.Response{Code: 500, Message: "保存启用状态失败: " + err.Error()}.Error(c)
		return
	}

	common.Response{Message: "保存成功"}.Success(c)
}
