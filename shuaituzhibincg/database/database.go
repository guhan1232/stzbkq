package database

import (
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"stzbHelper/config"
	"stzbHelper/model"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// 全局数据库连接（用于用户认证等系统级操作）
var SystemDB *gorm.DB

// GameDatabase 游戏数据库连接管理
type GameDatabase struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	Name         string `gorm:"uniqueIndex;size:255" json:"name"`
	DisplayName  string `gorm:"size:255" json:"display_name"`
	DBName       string `gorm:"size:500" json:"db_name"`            // MySQL数据库名
	OwnerID      uint   `gorm:"default:0" json:"owner_id"`          // 认领者ID
	Status       int    `gorm:"default:1" json:"status"`            // 1=正常, 0=禁用
	Server       string `gorm:"size:50" json:"server"`              // 区服，如 X5536
	State        string `gorm:"size:50" json:"state"`               // 所在州，如 凉州、冀州
	AllianceName string `gorm:"size:255" json:"alliance_name"`      // 同盟名字，如 率土有米
	BindIP       string `gorm:"type:text" json:"bind_ip"`           // 绑定的内网IP(支持多个，逗号分隔)
	Priority     int    `gorm:"type:int;default:0" json:"priority"` // 优先级(数字越大优先级越高)
	CreatedAt    int64  `json:"created_at"`
	UpdatedAt    int64  `json:"updated_at"`
}

// GetServerName 获取用于选择列表显示的区服名称
func (g *GameDatabase) GetServerName() string {
	if g.Server != "" {
		return g.Server
	}
	// 如果没有设置 Server，尝试从 Name 中提取 _X 开头的部分
	// 例如: 率土有米#5664034_X5536 -> X5536
	for i := len(g.Name) - 1; i >= 0; i-- {
		if g.Name[i] == '_' && i+1 < len(g.Name) && g.Name[i+1] == 'X' {
			return g.Name[i+1:]
		}
	}
	return g.Name
}

// GetFullName 获取进入区服后显示的完整名称
func (g *GameDatabase) GetFullName() string {
	parts := []string{}
	if g.AllianceName != "" {
		parts = append(parts, g.AllianceName)
	}
	if g.Server != "" {
		parts = append(parts, g.Server)
	}
	if len(parts) > 0 {
		return strings.Join(parts, "#")
	}
	return g.Name
}

func (GameDatabase) TableName() string {
	return "game_databases"
}

// InitSystemDB 初始化系统数据库
func InitSystemDB() {
	var err error

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		config.AppConfig.Database.User,
		config.AppConfig.Database.Password,
		config.AppConfig.Database.Host,
		config.AppConfig.Database.Port,
		config.AppConfig.Database.Name,
	)

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	SystemDB, err = gorm.Open(mysql.Open(dsn), gormConfig)
	if err != nil {
		log.Fatal("连接MySQL数据库失败:", err)
	}

	log.Printf("连接MySQL数据库成功: %s@%s:%d/%s",
		config.AppConfig.Database.User,
		config.AppConfig.Database.Host,
		config.AppConfig.Database.Port,
		config.AppConfig.Database.Name)

	// 自动迁移系统表
	err = SystemDB.AutoMigrate(
		&model.User{},
		&GameDatabase{},
		&model.SystemConfig{},
	)
	if err != nil {
		log.Fatal("系统数据库迁移失败:", err)
	}

	log.Println("系统数据库初始化完成")
}

// 全局游戏数据库连接池缓存
var gameDBPool = make(map[string]*gorm.DB)
var gameDBMutex sync.RWMutex
var migratedDBs = make(map[string]bool)
var migratedMutex sync.Mutex

func runAutoMigrate(db *gorm.DB, dbName string) error {
	model.DropAndRecreatePersonalTable(db)
	err := db.AutoMigrate(
		&model.TeamUser{}, &model.Task{}, &model.Report{}, &model.BattleReport{},
		&model.MemberHistory{}, &model.LandRecord{}, &model.DailyReport{},
		&model.UnionLeaderboard{}, &model.PersonalLeaderboard{}, &model.PlayerTerritoryRank{},
		&model.PlayerTeamData{}, &model.ChatMessage{},
		&model.Manifesto{},
	)
	if err == nil {
		migratedMutex.Lock()
		migratedDBs[dbName] = true
		migratedMutex.Unlock()
	}
	return err
}

// GetGameDB 获取游戏数据库连接
func GetGameDB(dbName string) (*gorm.DB, error) {
	gameDBMutex.RLock()
	if db, ok := gameDBPool[dbName]; ok {
		gameDBMutex.RUnlock()
		migratedMutex.Lock()
		if !migratedDBs[dbName] {
			migratedMutex.Unlock()
			if err := runAutoMigrate(db, dbName); err != nil {
				log.Printf("[GetGameDB] 缓存连接补迁移失败 db=%s: %v", dbName, err)
			}
		} else {
			migratedMutex.Unlock()
		}
		return db, nil
	}
	gameDBMutex.RUnlock()

	var gameDB GameDatabase
	result := SystemDB.Where("name = ?", dbName).First(&gameDB)
	if result.Error != nil {
		return nil, result.Error
	}

	if gameDB.Status != 1 {
		return nil, fmt.Errorf("数据库已禁用")
	}

	actualDBName := gameDB.DBName
	if actualDBName == "" {
		actualDBName = gameDB.Name
	}

	db, err := connectGameDB(actualDBName)
	if err != nil {
		if strings.Contains(err.Error(), "Unknown database") {
			var realName string
			r := SystemDB.Raw("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE LOWER(SCHEMA_NAME) = LOWER(?) LIMIT 1", actualDBName).Scan(&realName)
			if r.Error == nil && realName != "" && realName != actualDBName {
				log.Printf("[GetGameDB] 数据库名大小写不匹配: 记录=%s, 实际=%s, 自动修正", actualDBName, realName)
				actualDBName = realName
				if gameDB.DBName != realName {
					SystemDB.Model(&gameDB).Update("db_name", realName)
				}
				db, err = connectGameDB(actualDBName)
			}
		}

		if err != nil && strings.Contains(err.Error(), "Unknown database") {
			log.Printf("[GetGameDB] 数据库 %s 不存在，自动创建", actualDBName)
			createErr := createMySQLDatabase(actualDBName)
			if createErr != nil {
				log.Printf("[GetGameDB] 自动创建数据库失败: %v", createErr)
				return nil, fmt.Errorf("数据库 %s 不存在且自动创建失败: %v", actualDBName, createErr)
			}
			db, err = connectGameDB(actualDBName)
		}

		if err != nil {
			return nil, err
		}
	}

	if err := runAutoMigrate(db, actualDBName); err != nil {
		log.Printf("[GetGameDB] AutoMigrate失败 db=%s: %v", actualDBName, err)
	}

	gameDBMutex.Lock()
	gameDBPool[dbName] = db
	gameDBMutex.Unlock()

	return db, nil
}

// connectGameDB 连接游戏数据库
func connectGameDB(dbName string) (*gorm.DB, error) {
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		config.AppConfig.Database.User,
		config.AppConfig.Database.Password,
		config.AppConfig.Database.Host,
		config.AppConfig.Database.Port,
		dbName,
	)
	return gorm.Open(mysql.Open(dsn), gormConfig)
}

// createMySQLDatabase 创建MySQL数据库
func createMySQLDatabase(dbName string) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=utf8mb4",
		config.AppConfig.Database.User,
		config.AppConfig.Database.Password,
		config.AppConfig.Database.Host,
		config.AppConfig.Database.Port,
	)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("连接MySQL失败: %v", err)
	}
	defer closeDB(db)

	result := db.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", dbName))
	if result.Error != nil {
		return fmt.Errorf("创建数据库失败: %v", result.Error)
	}

	log.Printf("[createMySQLDatabase] 数据库 %s 创建成功", dbName)
	return nil
}

// GetGameDBByBindIP 根据绑定的内网IP获取游戏数据库连接
func GetGameDBByBindIP(ip string) (*gorm.DB, string, error) {
	var gameDBs []GameDatabase
	// 查找所有正常状态且绑定了IP的区服，按优先级降序排序
	result := SystemDB.Where("status = 1 AND bind_ip != '' AND bind_ip IS NOT NULL").Order("priority DESC").Find(&gameDBs)
	if result.Error != nil {
		return nil, "", fmt.Errorf("未找到绑定此IP的区服: %v", result.Error)
	}

	// 遍历查找匹配的IP
	for _, db := range gameDBs {
		ips := strings.Split(db.BindIP, ",")
		for _, bindIP := range ips {
			if strings.TrimSpace(bindIP) == ip {
				// 找到匹配的区服，获取其数据库连接
				gameDB, err := GetGameDB(db.Name)
				if err != nil {
					return nil, "", err
				}
				return gameDB, db.Name, nil
			}
		}
	}

	return nil, "", fmt.Errorf("未找到绑定IP %s 的区服", ip)
}

// CreateGameDatabase 创建游戏数据库（如果记录已存在则确保MySQL数据库也存在）
func CreateGameDatabase(name, displayName, server, state, allianceName string) (*GameDatabase, error) {
	var existingDB GameDatabase
	result := SystemDB.Where("name = ?", name).First(&existingDB)
	if result.Error == nil {
		if existingDB.DBName == "" {
			SystemDB.Model(&existingDB).Update("db_name", existingDB.Name)
		}
		if err := createMySQLDatabase(existingDB.DBName); err != nil {
			log.Printf("[CreateGameDatabase] 记录已存在但MySQL数据库缺失，自动创建失败: %v", err)
		}
		return nil, fmt.Errorf("数据库名称 '%s' 已存在", name)
	}

	if displayName != "" {
		var existingByDisplay GameDatabase
		result2 := SystemDB.Where("display_name = ?", displayName).First(&existingByDisplay)
		if result2.Error == nil {
			return nil, fmt.Errorf("显示名称 '%s' 已被使用", displayName)
		}
	}

	gameDB := &GameDatabase{
		Name:         name,
		DisplayName:  displayName,
		DBName:       name,
		Status:       1,
		Server:       server,
		State:        state,
		AllianceName: allianceName,
	}

	if err := createMySQLDatabase(name); err != nil {
		return nil, fmt.Errorf("创建数据库失败: %v", err)
	}

	result2 := SystemDB.Create(gameDB)
	if result2.Error != nil {
		return nil, result2.Error
	}

	return gameDB, nil
}

// DeleteGameDatabase 删除游戏数据库
func DeleteGameDatabase(id uint, userID uint, isAdmin bool) error {
	var gameDB GameDatabase
	result := SystemDB.First(&gameDB, id)
	if result.Error != nil {
		return result.Error
	}

	// 权限检查：只有管理员或所有者可以删除
	if !isAdmin && gameDB.OwnerID != userID {
		return fmt.Errorf("无权限删除此数据库")
	}

	// 从连接池中移除
	gameDBMutex.Lock()
	if db, ok := gameDBPool[gameDB.Name]; ok {
		closeDB(db)
		delete(gameDBPool, gameDB.Name)
	}
	gameDBMutex.Unlock()

	// 删除MySQL数据库
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/?charset=utf8mb4",
		config.AppConfig.Database.User,
		config.AppConfig.Database.Password,
		config.AppConfig.Database.Host,
		config.AppConfig.Database.Port,
	)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err == nil {
		db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS `%s`", gameDB.DBName))
		closeDB(db)
	}

	return SystemDB.Delete(&gameDB).Error
}

// closeDB 关闭数据库连接
func closeDB(db *gorm.DB) {
	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.Close()
	}
}

// ClaimDatabase 认领数据库（仅管理员可操作）
func ClaimDatabase(id uint, userID uint, isAdmin bool) error {
	// 权限检查：只有管理员可以认领数据库
	if !isAdmin {
		return fmt.Errorf("只有管理员可以认领数据库")
	}

	var gameDB GameDatabase
	result := SystemDB.First(&gameDB, id)
	if result.Error != nil {
		return result.Error
	}

	if gameDB.OwnerID != 0 {
		return fmt.Errorf("该数据库已被认领")
	}

	gameDB.OwnerID = userID
	return SystemDB.Save(&gameDB).Error
}

// ReleaseDatabase 释放数据库认领
func ReleaseDatabase(id uint, userID uint, isAdmin bool) error {
	var gameDB GameDatabase
	result := SystemDB.First(&gameDB, id)
	if result.Error != nil {
		return result.Error
	}

	// 权限检查：只有管理员或所有者可以释放
	if !isAdmin && gameDB.OwnerID != userID {
		return fmt.Errorf("无权限释放此数据库")
	}

	gameDB.OwnerID = 0
	return SystemDB.Save(&gameDB).Error
}

// UpdateGameDatabase 更新数据库信息
func UpdateGameDatabase(id uint, displayName, server, state, allianceName, bindIP string, priority int, userID uint, isAdmin bool) error {
	var gameDB GameDatabase
	result := SystemDB.First(&gameDB, id)
	if result.Error != nil {
		return result.Error
	}

	// 权限检查：只有管理员或所有者可以更新
	if !isAdmin && gameDB.OwnerID != userID {
		return fmt.Errorf("无权限更新此数据库")
	}

	// 更新字段
	if displayName != "" {
		gameDB.DisplayName = displayName
	}
	if server != "" {
		gameDB.Server = server
	}
	if state != "" {
		gameDB.State = state
	}
	if allianceName != "" {
		gameDB.AllianceName = allianceName
	}
	if bindIP != "" {
		gameDB.BindIP = bindIP
	}
	gameDB.Priority = priority
	gameDB.UpdatedAt = time.Now().Unix()

	return SystemDB.Save(&gameDB).Error
}

// ListGameDatabases 列出游戏数据库（用户认领了区服则只显示认领的，未认领时管理员看所有，普通用户看公共以及自己绑定的区服）
func ListGameDatabases(page, pageSize int, currentUserID uint, isAdmin bool) ([]map[string]interface{}, int64, error) {
	var databases []GameDatabase
	var total int64

	// 查询所有状态正常的数据库
	query := SystemDB.Model(&GameDatabase{}).Where("status = 1")

	// 先查询当前用户是否认领了区服
	var count int64
	SystemDB.Model(&GameDatabase{}).Where("owner_id = ?", currentUserID).Count(&count)

	log.Printf("[ListGameDatabases] 用户ID: %d, 是否管理员: %v, 认领数量: %d", currentUserID, isAdmin, count)

	if count > 0 {
		// 如果认领了区服（无论是管理员还是普通用户），则只显示认领的区服
		log.Printf("[ListGameDatabases] 显示用户认领的区服")
		query = query.Where("owner_id = ?", currentUserID)
	} else {
		// 如果没有认领区服
		if !isAdmin {
			// 普通用户：显示所有状态正常的数据库（可以查看但不能管理）
			log.Printf("[ListGameDatabases] 普通用户，显示所有数据库")
			// 不需要添加额外的 where 条件，已经过滤了 status = 1
		} else {
			log.Printf("[ListGameDatabases] 管理员，显示所有区服")
		}
		// 如果是管理员，则可以看到所有的（不加额外 where 条件）
	}

	query.Count(&total)
	log.Printf("[ListGameDatabases] 符合条件的总数: %d", total)

	offset := (page - 1) * pageSize
	result := query.Offset(offset).Limit(pageSize).Order("id DESC").Find(&databases)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	// 转换为带额外字段的 map 数组
	databasesMap := make([]map[string]interface{}, len(databases))
	for i, db := range databases {
		m := make(map[string]interface{})
		m["id"] = db.ID
		m["name"] = db.Name
		m["display_name"] = db.DisplayName
		m["db_name"] = db.DBName
		m["owner_id"] = db.OwnerID
		m["status"] = db.Status
		m["server"] = db.Server
		m["state"] = db.State
		m["alliance_name"] = db.AllianceName
		m["server_name"] = db.GetServerName() // 用于选择列表显示
		m["full_name"] = db.GetFullName()     // 进入区服后显示
		m["created_at"] = db.CreatedAt
		m["updated_at"] = db.UpdatedAt
		databasesMap[i] = m
	}

	return databasesMap, total, nil
}

// ListAllGameDatabases 列出所有状态正常的数据库（用于小程序）
func ListAllGameDatabases(page, pageSize int) ([]map[string]interface{}, int64, error) {
	var databases []GameDatabase
	var total int64

	// 查询所有状态正常的数据库
	query := SystemDB.Model(&GameDatabase{}).Where("status = 1")
	query.Count(&total)

	offset := (page - 1) * pageSize
	result := query.Offset(offset).Limit(pageSize).Order("id DESC").Find(&databases)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	// 转换为带额外字段的 map 数组
	databasesMap := make([]map[string]interface{}, len(databases))
	for i, db := range databases {
		m := make(map[string]interface{})
		m["id"] = db.ID
		m["name"] = db.Name
		m["display_name"] = db.DisplayName
		m["db_name"] = db.DBName
		m["owner_id"] = db.OwnerID
		m["status"] = db.Status
		m["server"] = db.Server
		m["state"] = db.State
		m["alliance_name"] = db.AllianceName
		m["server_name"] = db.GetServerName() // 用于选择列表显示
		m["full_name"] = db.GetFullName()     // 进入区服后显示
		m["created_at"] = db.CreatedAt
		m["updated_at"] = db.UpdatedAt
		databasesMap[i] = m
	}

	return databasesMap, total, nil
}

// GetGameDatabaseByID 根据ID获取游戏数据库信息
func GetGameDatabaseByID(id uint) (map[string]interface{}, error) {
	var gameDB GameDatabase
	result := SystemDB.First(&gameDB, id)
	if result.Error != nil {
		return nil, result.Error
	}
	m := make(map[string]interface{})
	m["id"] = gameDB.ID
	m["name"] = gameDB.Name
	m["display_name"] = gameDB.DisplayName
	m["db_name"] = gameDB.DBName
	m["owner_id"] = gameDB.OwnerID
	m["status"] = gameDB.Status
	m["server"] = gameDB.Server
	m["state"] = gameDB.State
	m["alliance_name"] = gameDB.AllianceName
	m["server_name"] = gameDB.GetServerName()
	m["full_name"] = gameDB.GetFullName()
	m["created_at"] = gameDB.CreatedAt
	m["updated_at"] = gameDB.UpdatedAt
	return m, nil
}
