package model

import "time"

// MemberHistory 成员历史记录（加入/退出）
type MemberHistory struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Name       string    `json:"player_name" gorm:"column:name;index"`
	PlayerId   int       `json:"player_id" gorm:"column:player_id;index"`
	Action     string    `json:"action" gorm:"column:action"`           // join: 加入, leave: 退出
	ActionTime int64     `json:"action_time" gorm:"column:action_time"` // 操作时间
	GroupName  string    `json:"group_name" gorm:"column:group_name"`   // 当时所在分组
	Power      int       `json:"power" gorm:"column:power"`             // 当时势力值
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (MemberHistory) TableName() string {
	return "member_history"
}

// LandRecord 翻地记录
type LandRecord struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	PlayerId     int       `json:"player_id" gorm:"column:player_id;index"`
	PlayerName   string    `json:"player_name" gorm:"column:player_name;index"`
	LandPos      int       `json:"land_pos" gorm:"column:land_pos"`           // 土地坐标
	LandName     string    `json:"land_name" gorm:"column:land_name"`         // 土地名称
	LandLevel    int       `json:"land_level" gorm:"column:land_level"`       // 土地等级
	AttackTime   int64     `json:"attack_time" gorm:"column:attack_time"`     // 攻击时间
	BattleId     int64     `json:"battle_id" gorm:"column:battle_id"`         // 关联战报ID
	IsSuccess    int       `json:"is_success" gorm:"column:is_success"`       // 是否成功(1成功,0失败)
	DefenderName string    `json:"defender_name" gorm:"column:defender_name"` // 防守方名称
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (LandRecord) TableName() string {
	return "land_record"
}
