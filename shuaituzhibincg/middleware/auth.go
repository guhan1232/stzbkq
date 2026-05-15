package middleware

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"stzbHelper/database"
	"stzbHelper/http/common"
	"stzbHelper/model"

	"gorm.io/gorm"
)

// AuthRequired Session认证中间件
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从Session中获取用户ID
		userID := getSessionUint(c, "user_id")
		if userID == 0 {
			common.Response{Code: 401, Message: "请先登录"}.ErrorWithHTTP(c)
			c.Abort()
			return
		}

		// 将用户信息存入上下文
		c.Set("user_id", userID)
		c.Set("username", getSessionString(c, "username"))
		c.Set("role", getSessionString(c, "role"))

		// 尝试获取并设置数据库连接
		// 优先从 Session 获取，其次从请求参数获取（支持小程序传递 db_id）
		databaseID := getSessionUint(c, "database_id")
		if databaseID == 0 {
			// 尝试从请求参数获取（GET 和 POST 都支持）
			dbIDStr := c.Query("db_id")
			if dbIDStr == "" {
				dbIDStr = c.PostForm("db_id")
			}
			if dbIDStr != "" {
				var id uint
				if _, err := common.ParseUint(dbIDStr, &id); err == nil {
					databaseID = id
				}
			}
		}

		// 如果 session 和参数都没有，尝试从数据库读取最新的用户配置
		if databaseID == 0 && userID > 0 {
			var u model.User
			if err := database.SystemDB.First(&u, userID).Error; err == nil && u.DatabaseID > 0 {
				databaseID = u.DatabaseID
			}
		}

		var dbConnectErr string

		if databaseID > 0 {
			savedDbID := databaseID
			gameDBMap, err := database.GetGameDatabaseByID(databaseID)
			if err == nil {
				dbName := gameDBMap["name"].(string)
				db, err := database.GetGameDB(dbName)
				if err == nil {
					c.Set("db", db)
					c.Set("db_id", databaseID)
				} else {
					databaseID = 0
					dbConnectErr = fmt.Sprintf("数据库连接失败(ID=%d, name=%s): %v", savedDbID, dbName, err)
				}
			} else {
				databaseID = 0
				dbConnectErr = fmt.Sprintf("数据库记录不存在(ID=%d)", savedDbID)
			}
		}

		// 兜底逻辑：如果仍未指定数据库或上面获取失败，则使用用户的可视列表（管理员如果认领了，ListGameDatabases只返回认领的）
		if databaseID == 0 {
			isAdmin := getSessionString(c, "role") == "admin"
			dbs, _, err := database.ListGameDatabases(1, 1, userID, isAdmin)
			if err == nil && len(dbs) > 0 {
				databaseID = dbs[0]["id"].(uint)
				gameDBMap, err := database.GetGameDatabaseByID(databaseID)
				if err == nil {
					dbName := gameDBMap["name"].(string)
					db, err := database.GetGameDB(dbName)
					if err == nil {
						c.Set("db", db)
						c.Set("db_id", databaseID)
						dbConnectErr = ""
					} else {
						if dbConnectErr == "" {
							dbConnectErr = fmt.Sprintf("兜底数据库连接也失败(ID=%d): %v", databaseID, err)
						}
					}
				}
			}
		}

		if dbConnectErr != "" {
			c.Set("db_connect_error", dbConnectErr)
		}

		c.Next()
	}
}

// GetDB 从上下文获取数据库连接
func GetDB(c *gin.Context) *gorm.DB {
	if db, exists := c.Get("db"); exists {
		return db.(*gorm.DB)
	}
	// 回退到全局 Conn
	return model.Conn
}

// AdminRequired 管理员权限中间件
func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role != "admin" {
			common.Response{Code: 403, Message: "需要管理员权限"}.ErrorWithHTTP(c)
			c.Abort()
			return
		}
		c.Next()
	}
}

// getSessionUint 从Session获取uint值
func getSessionUint(c *gin.Context, key string) uint {
	session := getSession(c)
	if session == nil {
		return 0
	}
	if val, ok := session[key]; ok {
		switch v := val.(type) {
		case uint:
			return v
		case float64:
			return uint(v)
		case int:
			return uint(v)
		}
	}
	return 0
}

// getSessionString 从Session获取string值
func getSessionString(c *gin.Context, key string) string {
	session := getSession(c)
	if session == nil {
		return ""
	}
	if val, ok := session[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

// getSession 获取Session数据
func getSession(c *gin.Context) map[string]interface{} {
	session := c.GetHeader("X-Session-ID")
	if session == "" {
		// 尝试从Cookie获取
		session, _ = c.Cookie("session_id")
	}
	if session == "" {
		// 尝试从URL参数获取（用于文件下载等场景）
		session = c.Query("session_id")
	}

	if session == "" {
		return nil
	}

	// 从全局Session存储获取
	if sessionData, ok := globalSessions[session]; ok {
		return sessionData
	}
	return nil
}

// 全局Session存储（简单实现）
var globalSessions = make(map[string]map[string]interface{})

// SetSession 设置Session
func SetSession(sessionID string, data map[string]interface{}) {
	globalSessions[sessionID] = data
}

// GetSessionData 获取Session数据
func GetSessionData(sessionID string) map[string]interface{} {
	return globalSessions[sessionID]
}

// DeleteSession 删除Session
func DeleteSession(sessionID string) {
	delete(globalSessions, sessionID)
}

// GetCurrentUserID 获取当前用户ID
func GetCurrentUserID(c *gin.Context) uint {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0
	}
	return userID.(uint)
}

// GetCurrentUsername 获取当前用户名
func GetCurrentUsername(c *gin.Context) string {
	username, exists := c.Get("username")
	if !exists {
		return ""
	}
	return username.(string)
}

// UpdateSessionDatabase 更新Session中的数据库ID
func UpdateSessionDatabase(c *gin.Context, databaseID uint) {
	session := c.GetHeader("X-Session-ID")
	if session == "" {
		session, _ = c.Cookie("session_id")
	}
	if session != "" {
		if sessionData, ok := globalSessions[session]; ok {
			sessionData["database_id"] = databaseID
		}
	}
}

// IsAdmin 判断当前用户是否为管理员
func IsAdmin(c *gin.Context) bool {
	role, exists := c.Get("role")
	if !exists {
		return false
	}
	return role == "admin"
}

// DBRequired 数据库连接中间件（需要先选择数据库）
func DBRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, exists := c.Get("db"); !exists {
			errMsg := "请先选择数据库"
			if dbErr, ok := c.Get("db_connect_error"); ok {
				if msg, ok := dbErr.(string); ok && msg != "" {
					errMsg = msg
				}
			}
			common.Response{Code: 400, Message: errMsg}.ErrorWithHTTP(c)
			c.Abort()
			return
		}
		c.Next()
	}
}

// ShareDBRequired 分享访问的数据库中间件（通过URL参数获取数据库）
func ShareDBRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从URL参数获取数据库ID
		dbIDStr := c.Query("db_id")
		if dbIDStr == "" {
			common.Response{Code: 400, Message: "缺少数据库参数"}.ErrorWithHTTP(c)
			c.Abort()
			return
		}

		// 转换数据库ID
		dbID := uint(0)
		for _, c := range dbIDStr {
			if c >= '0' && c <= '9' {
				dbID = dbID*10 + uint(c-'0')
			}
		}

		if dbID == 0 {
			common.Response{Code: 400, Message: "数据库ID无效"}.ErrorWithHTTP(c)
			c.Abort()
			return
		}

		// 获取数据库信息
		gameDBMap, err := database.GetGameDatabaseByID(dbID)
		if err != nil {
			common.Response{Code: 400, Message: "数据库不存在"}.ErrorWithHTTP(c)
			c.Abort()
			return
		}

		// 获取数据库连接
		dbName := gameDBMap["name"].(string)
		db, err := database.GetGameDB(dbName)
		if err != nil {
			common.Response{Code: 500, Message: "数据库连接失败"}.ErrorWithHTTP(c)
			c.Abort()
			return
		}

		// 设置数据库连接
		c.Set("db", db)
		c.Set("db_id", dbID)

		c.Next()
	}
}
