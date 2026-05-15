package model

import (
	"time"
)

// User 用户模型
type User struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	Username    string     `json:"username" gorm:"uniqueIndex;size:50;not null"`
	Password    string     `json:"-" gorm:"size:255;not null"`
	Nickname    string     `json:"nickname" gorm:"size:50"`
	Role        string     `json:"role" gorm:"size:20;default:'user'"`
	Status      int        `json:"status" gorm:"default:1"`
	LastLoginAt *time.Time `json:"last_login_at" gorm:"index"`
	LastLoginIP string     `json:"last_login_ip" gorm:"size:50"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DatabaseID  uint       `json:"database_id"`
}

func (User) TableName() string {
	return "users"
}

// IsAdmin 判断是否为管理员
func (u *User) IsAdmin() bool {
	return u.Role == "admin"
}

// IsActive 判断用户是否激活
func (u *User) IsActive() bool {
	return u.Status == 1
}
