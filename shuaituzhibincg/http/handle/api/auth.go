package api

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"stzbHelper/http/common"
	"stzbHelper/middleware"
	"stzbHelper/service"
)

func generateSessionID() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func Register(c *gin.Context) {
	username := c.PostForm("username")
	password := c.PostForm("password")
	nickname := c.PostForm("nickname")

	log.Printf("[Register] 收到注册请求: username=%s, Content-Type=%s", username, c.GetHeader("Content-Type"))

	if username == "" || password == "" {
		common.Response{Code: 400, Message: "用户名和密码不能为空"}.Error(c)
		return
	}

	lowerUsername := strings.ToLower(strings.TrimSpace(username))
	forbiddenKeywords := []string{"test", "测试", "admin", "管理员", "root", "系统"}
	for _, keyword := range forbiddenKeywords {
		if strings.Contains(lowerUsername, strings.ToLower(keyword)) {
			common.Response{Code: 400, Message: fmt.Sprintf("用户名不能包含'%s'等敏感词", keyword)}.Error(c)
			return
		}
	}

	if len(username) < 3 || len(username) > 50 {
		common.Response{Code: 400, Message: "用户名长度需要在3-50字符之间"}.Error(c)
		return
	}

	if len(password) < 6 {
		common.Response{Code: 400, Message: "密码长度至少6个字符"}.Error(c)
		return
	}

	if nickname == "" {
		nickname = username
	}

	user, err := service.Register(username, password, nickname)
	if err != nil {
		common.Response{Code: 400, Message: err.Error()}.Error(c)
		return
	}

	sessionID := generateSessionID()
	middleware.SetSession(sessionID, map[string]interface{}{
		"user_id":     user.ID,
		"username":    user.Username,
		"role":        user.Role,
		"database_id": user.DatabaseID,
		"created_at":  time.Now(),
	})

	c.SetCookie("session_id", sessionID, 86400, "/", "", false, true)
	c.Header("X-Session-ID", sessionID)

	common.Response{Message: "注册成功", Data: gin.H{
		"session_id": sessionID,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"nickname": user.Nickname,
			"role":     user.Role,
		},
	}}.Success(c)
}

func Login(c *gin.Context) {
	username := c.PostForm("username")
	password := c.PostForm("password")

	log.Printf("[Login] 收到登录请求: username=%s, Content-Type=%s", username, c.GetHeader("Content-Type"))

	if username == "" || password == "" {
		common.Response{Code: 400, Message: "用户名和密码不能为空"}.Error(c)
		return
	}

	clientIP := c.ClientIP()
	enabled, err := service.IsIPWhitelistEnabled()
	if err != nil {
		common.Response{Code: 500, Message: "系统错误: " + err.Error()}.Error(c)
		return
	}

	if enabled {
		allowed, err := service.IsIPInWhitelist(clientIP)
		if err != nil {
			common.Response{Code: 500, Message: "IP验证失败: " + err.Error()}.Error(c)
			return
		}
		if !allowed {
			common.Response{Code: 403, Message: "您的 IP 地址不在白名单中，禁止登录"}.Error(c)
			return
		}
	}

	ip := clientIP
	user, err := service.Login(username, password, ip)
	if err != nil {
		common.Response{Code: 401, Message: err.Error()}.Error(c)
		return
	}

	sessionID := generateSessionID()
	middleware.SetSession(sessionID, map[string]interface{}{
		"user_id":     user.ID,
		"username":    user.Username,
		"role":        user.Role,
		"database_id": user.DatabaseID,
		"created_at":  time.Now(),
	})

	c.SetCookie("session_id", sessionID, 86400, "/", "", false, true)
	c.Header("X-Session-ID", sessionID)

	common.Response{Message: "登录成功", Data: gin.H{
		"session_id": sessionID,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"nickname": user.Nickname,
			"role":     user.Role,
		},
	}}.Success(c)
}

func Logout(c *gin.Context) {
	sessionID, err := c.Cookie("session_id")
	if err == nil && sessionID != "" {
		middleware.DeleteSession(sessionID)
	}

	c.SetCookie("session_id", "", -1, "/", "", false, true)

	common.Response{Message: "登出成功"}.Success(c)
}

func GetUserInfo(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	user, err := service.GetUserByID(userID)
	if err != nil {
		common.Response{Code: 500, Message: "获取用户信息失败"}.Error(c)
		return
	}

	common.Response{Data: gin.H{
		"id":            user.ID,
		"username":      user.Username,
		"nickname":      user.Nickname,
		"role":          user.Role,
		"status":        user.Status,
		"last_login_at": user.LastLoginAt,
		"last_login_ip": user.LastLoginIP,
		"created_at":    user.CreatedAt,
		"database_id":   user.DatabaseID,
	}}.Success(c)
}

func SelectDatabase(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	databaseID := c.PostForm("database_id")

	if databaseID == "" {
		common.Response{Code: 400, Message: "数据库ID不能为空"}.Error(c)
		return
	}

	var id uint
	_, err := common.ParseUint(databaseID, &id)
	if err != nil {
		common.Response{Code: 400, Message: "数据库ID错误"}.Error(c)
		return
	}

	err = service.SelectDatabase(userID, id)
	if err != nil {
		common.Response{Code: 400, Message: err.Error()}.Error(c)
		return
	}

	middleware.UpdateSessionDatabase(c, id)

	common.Response{Message: "数据库选择成功", Data: gin.H{
		"database_id": id,
	}}.Success(c)
}

func ChangePassword(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	oldPassword := c.PostForm("old_password")
	newPassword := c.PostForm("new_password")

	if oldPassword == "" || newPassword == "" {
		common.Response{Code: 400, Message: "旧密码和新密码不能为空"}.Error(c)
		return
	}

	if len(newPassword) < 6 {
		common.Response{Code: 400, Message: "新密码长度至少6个字符"}.Error(c)
		return
	}

	err := service.ChangePassword(userID, oldPassword, newPassword)
	if err != nil {
		common.Response{Code: 400, Message: err.Error()}.Error(c)
		return
	}

	common.Response{Message: "密码修改成功"}.Success(c)
}

func ListUsers(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("page_size", "20")

	var pageNum, pageSizeNum int
	_, err1 := common.ParseInt(page, &pageNum)
	_, err2 := common.ParseInt(pageSize, &pageSizeNum)
	if err1 != nil || err2 != nil {
		common.Response{Code: 400, Message: "参数错误"}.Error(c)
		return
	}

	users, total, err := service.ListUsers(pageNum, pageSizeNum)
	if err != nil {
		common.Response{Code: 500, Message: "获取用户列表失败"}.Error(c)
		return
	}

	common.Response{Data: gin.H{
		"list":     users,
		"total":    total,
		"page":     pageNum,
		"pageSize": pageSizeNum,
	}}.Success(c)
}

func ResetPassword(c *gin.Context) {
	adminID := middleware.GetCurrentUserID(c)
	targetUserID := c.PostForm("user_id")
	newPassword := c.PostForm("new_password")

	if targetUserID == "" || newPassword == "" {
		common.Response{Code: 400, Message: "参数错误"}.Error(c)
		return
	}

	var userID uint
	_, err := common.ParseUint(targetUserID, &userID)
	if err != nil {
		common.Response{Code: 400, Message: "用户ID错误"}.Error(c)
		return
	}

	err = service.ResetPassword(adminID, userID, newPassword)
	if err != nil {
		common.Response{Code: 400, Message: err.Error()}.Error(c)
		return
	}

	common.Response{Message: "密码重置成功"}.Success(c)
}

func UpdateUserStatus(c *gin.Context) {
	adminID := middleware.GetCurrentUserID(c)
	targetUserID := c.PostForm("user_id")
	status := c.PostForm("status")

	if targetUserID == "" || status == "" {
		common.Response{Code: 400, Message: "参数错误"}.Error(c)
		return
	}

	var userID uint
	var statusNum int
	_, err1 := common.ParseUint(targetUserID, &userID)
	_, err2 := common.ParseInt(status, &statusNum)
	if err1 != nil || err2 != nil {
		common.Response{Code: 400, Message: "参数错误"}.Error(c)
		return
	}

	err := service.UpdateUserStatus(adminID, userID, statusNum)
	if err != nil {
		common.Response{Code: 400, Message: err.Error()}.Error(c)
		return
	}

	common.Response{Message: "状态更新成功"}.Success(c)
}

func DeleteUser(c *gin.Context) {
	adminID := middleware.GetCurrentUserID(c)
	targetUserID := c.Param("id")

	if targetUserID == "" {
		common.Response{Code: 400, Message: "参数错误"}.Error(c)
		return
	}

	var userID uint
	_, err := common.ParseUint(targetUserID, &userID)
	if err != nil {
		common.Response{Code: 400, Message: "用户ID错误"}.Error(c)
		return
	}

	err = service.DeleteUser(adminID, userID)
	if err != nil {
		common.Response{Code: 400, Message: err.Error()}.Error(c)
		return
	}

	common.Response{Message: "删除成功"}.Success(c)
}

func UpdateUserRole(c *gin.Context) {
	adminID := middleware.GetCurrentUserID(c)
	targetUserID := c.PostForm("user_id")
	role := c.PostForm("role")

	if targetUserID == "" || role == "" {
		common.Response{Code: 400, Message: "参数错误"}.Error(c)
		return
	}

	var userID uint
	_, err := common.ParseUint(targetUserID, &userID)
	if err != nil {
		common.Response{Code: 400, Message: "用户ID错误"}.Error(c)
		return
	}

	err = service.UpdateUserRole(adminID, userID, role)
	if err != nil {
		common.Response{Code: 400, Message: err.Error()}.Error(c)
		return
	}

	common.Response{Message: "角色更新成功"}.Success(c)
}
