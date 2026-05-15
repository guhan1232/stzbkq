package service

import (
	"errors"
	"log"
	"stzbHelper/database"
	"stzbHelper/model"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Register 用户注册
func Register(username, password, nickname string) (*model.User, error) {
	// 检查用户名是否已存在
	var existingUser model.User
	result := database.SystemDB.Where("username = ?", username).First(&existingUser)
	if result.Error == nil {
		return nil, errors.New("用户名已存在")
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("密码加密失败")
	}

	// 检查是否为第一个用户（自动设为管理员）
	var userCount int64
	database.SystemDB.Model(&model.User{}).Count(&userCount)
	role := "user"
	if userCount == 0 {
		role = "admin"
	}

	user := &model.User{
		Username:  username,
		Password:  string(hashedPassword),
		Nickname:  nickname,
		Role:      role,
		Status:    1,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result = database.SystemDB.Create(user)
	if result.Error != nil {
		log.Printf("[Register] 创建用户失败: %v", result.Error)
		return nil, errors.New("创建用户失败: " + result.Error.Error())
	}

	log.Printf("[Register] 用户创建成功: id=%d, username=%s, role=%s", user.ID, user.Username, user.Role)
	return user, nil
}

// Login 用户登录
func Login(username, password, ip string) (*model.User, error) {
	var user model.User
	result := database.SystemDB.Where("username = ?", username).First(&user)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			log.Printf("[Login] 用户不存在: username=%s", username)
			return nil, errors.New("用户名或密码错误")
		}
		log.Printf("[Login] 查询用户失败: username=%s, error=%v", username, result.Error)
		return nil, errors.New("登录失败")
	}

	if !user.IsActive() {
		log.Printf("[Login] 用户已被禁用: username=%s", username)
		return nil, errors.New("账户已被禁用")
	}

	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		log.Printf("[Login] 密码验证失败: username=%s", username)
		return nil, errors.New("用户名或密码错误")
	}

	log.Printf("[Login] 登录成功: username=%s, ip=%s", username, ip)

	now := time.Now()
	database.SystemDB.Model(&user).Updates(map[string]interface{}{
		"last_login_at": &now,
		"last_login_ip": ip,
	})

	return &user, nil
}

// ChangePassword 修改密码
func ChangePassword(userID uint, oldPassword, newPassword string) error {
	var user model.User
	result := database.SystemDB.First(&user, userID)
	if result.Error != nil {
		return errors.New("用户不存在")
	}

	// 验证旧密码
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(oldPassword))
	if err != nil {
		return errors.New("旧密码错误")
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("密码加密失败")
	}

	// 更新密码
	result = database.SystemDB.Model(&user).Update("password", string(hashedPassword))
	if result.Error != nil {
		return errors.New("更新密码失败")
	}

	return nil
}

// ResetPassword 重置密码（管理员操作）
func ResetPassword(adminID, targetUserID uint, newPassword string) error {
	// 检查操作者是否为管理员
	var admin model.User
	result := database.SystemDB.First(&admin, adminID)
	if result.Error != nil || !admin.IsAdmin() {
		return errors.New("无权限操作")
	}

	var targetUser model.User
	result = database.SystemDB.First(&targetUser, targetUserID)
	if result.Error != nil {
		return errors.New("目标用户不存在")
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("密码加密失败")
	}

	// 更新密码
	database.SystemDB.Model(&targetUser).Update("password", string(hashedPassword))
	return nil
}

// GetUserByID 根据ID获取用户
func GetUserByID(id uint) (*model.User, error) {
	var user model.User
	result := database.SystemDB.First(&user, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

// ListUsers 获取用户列表
func ListUsers(page, pageSize int) ([]model.User, int64, error) {
	var users []model.User
	var total int64

	database.SystemDB.Model(&model.User{}).Count(&total)

	offset := (page - 1) * pageSize
	result := database.SystemDB.Offset(offset).Limit(pageSize).Order("id DESC").Find(&users)
	if result.Error != nil {
		return nil, 0, result.Error
	}

	return users, total, nil
}

// UpdateUserStatus 更新用户状态
func UpdateUserStatus(adminID, targetUserID uint, status int) error {
	// 检查操作者是否为管理员
	var admin model.User
	result := database.SystemDB.First(&admin, adminID)
	if result.Error != nil || !admin.IsAdmin() {
		return errors.New("无权限操作")
	}

	var targetUser model.User
	result = database.SystemDB.First(&targetUser, targetUserID)
	if result.Error != nil {
		return errors.New("目标用户不存在")
	}

	// 不能禁用自己
	if adminID == targetUserID {
		return errors.New("不能修改自己的状态")
	}

	return database.SystemDB.Model(&targetUser).Update("status", status).Error
}

// DeleteUser 删除用户
func DeleteUser(adminID, targetUserID uint) error {
	// 检查操作者是否为管理员
	var admin model.User
	result := database.SystemDB.First(&admin, adminID)
	if result.Error != nil || !admin.IsAdmin() {
		return errors.New("无权限操作")
	}

	if adminID == targetUserID {
		return errors.New("不能删除自己")
	}

	return database.SystemDB.Delete(&model.User{}, targetUserID).Error
}

// UpdateUserRole 更新用户角色（管理员操作）
func UpdateUserRole(adminID, targetUserID uint, role string) error {
	// 检查操作者是否为管理员
	var admin model.User
	result := database.SystemDB.First(&admin, adminID)
	if result.Error != nil || !admin.IsAdmin() {
		return errors.New("无权限操作")
	}

	// 验证角色值
	if role != "admin" && role != "user" {
		return errors.New("无效的角色值")
	}

	var targetUser model.User
	result = database.SystemDB.First(&targetUser, targetUserID)
	if result.Error != nil {
		return errors.New("目标用户不存在")
	}

	// 不能修改自己的角色
	if adminID == targetUserID {
		return errors.New("不能修改自己的角色")
	}

	return database.SystemDB.Model(&targetUser).Update("role", role).Error
}

// SelectDatabase 选择数据库
func SelectDatabase(userID, databaseID uint) error {
	// 检查用户是否存在
	var user model.User
	result := database.SystemDB.First(&user, userID)
	if result.Error != nil {
		return errors.New("用户不存在")
	}

	// 检查数据库是否存在
	var db database.GameDatabase
	result = database.SystemDB.First(&db, databaseID)
	if result.Error != nil {
		return errors.New("数据库不存在")
	}

	// 检查数据库状态
	if db.Status != 1 {
		return errors.New("数据库不可用")
	}

	// 更新用户的数据库绑定
	now := time.Now()
	result = database.SystemDB.Model(&user).Updates(map[string]interface{}{
		"database_id": databaseID,
		"updated_at":  now,
	})
	if result.Error != nil {
		return errors.New("更新数据库绑定失败")
	}

	return nil
}
