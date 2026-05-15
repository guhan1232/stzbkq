package model

import (
	"log"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UnionLeaderboard struct {
	ID           int64  `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	Rank         int    `json:"rank" gorm:"column:rank;index"`
	UnionID      int64  `json:"union_id" gorm:"column:union_id;uniqueIndex"`
	Name         string `json:"name" gorm:"column:name;index"`
	Power        int64  `json:"power" gorm:"column:power;index"`
	TotalMember  int    `json:"total_member" gorm:"column:total_member"`
	TotalNPCCity int    `json:"total_npc_city" gorm:"column:total_npc_city"`
	Region       int    `json:"region" gorm:"column:region"`
	RefreshTime  int64  `json:"refresh_time" gorm:"column:refresh_time;index"`
	SourceCmd    int    `json:"source_cmd" gorm:"column:source_cmd"`
	CaptureTime  int64  `json:"capture_time" gorm:"column:capture_time;index"`
}

func (UnionLeaderboard) TableName() string { return "union_leaderboard" }

// SaveUnionLeaderboardFromDecoded 解析 cmd 700 的 JSON 数据并写入数据库
func SaveUnionLeaderboardFromDecoded(decoded string, sourceCmd int, db *gorm.DB) {
	if db == nil {
		return
	}
	var top []any
	if err := unmarshalJSON([]byte(decoded), &top); err != nil {
		log.Printf("[union-lb] JSON解析失败: %v", err)
		return
	}
	// 调试：打印顶层结构
	preview := decoded
	if len(preview) > 500 {
		preview = preview[:500]
	}
	log.Printf("[union-lb] 顶层元素个数=%d 类型=%v 前500字符: %s", len(top), typeNames(top), preview)

	if len(top) < 5 {
		log.Printf("[union-lb] 顶层元素不足5个, 尝试直接遍历")
		// 降级：直接遍历顶层
		saveUnionRows(top, sourceCmd, db)
		return
	}
	rows, ok := top[4].([]any)
	if !ok || len(rows) == 0 {
		log.Printf("[union-lb] top[4]不是数组或为空, 类型=%T, 尝试直接遍历", top[4])
		// 降级：直接遍历顶层
		saveUnionRows(top, sourceCmd, db)
		return
	}
	saveUnionRows(rows, sourceCmd, db)
}

func saveUnionRows(rows []any, sourceCmd int, db *gorm.DB) {
	now := time.Now().Unix()
	saved := 0
	skipped := 0
	for _, row := range rows {
		pair, ok := row.([]any)
		if !ok || len(pair) < 2 {
			skipped++
			continue
		}
		rank := toInt(pair[0])
		obj, ok := pair[1].(map[string]any)
		if !ok {
			skipped++
			continue
		}
		uid := toInt64(obj["union_id"])
		if uid <= 0 {
			skipped++
			continue
		}
		rec := UnionLeaderboard{
			Rank:         rank,
			UnionID:      uid,
			Name:         toString(obj["name"]),
			Power:        toInt64(obj["power"]),
			TotalMember:  toInt(obj["total_member"]),
			TotalNPCCity: toInt(obj["total_npc_city"]),
			Region:       toInt(obj["region"]),
			RefreshTime:  toInt64(obj["refresh_time"]),
			SourceCmd:    sourceCmd,
			CaptureTime:  now,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "union_id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"rank", "name", "power", "total_member", "total_npc_city",
				"region", "refresh_time", "source_cmd", "capture_time",
			}),
		}).Create(&rec).Error; err != nil {
			log.Printf("[union-lb] 写库失败 rank=%d union_id=%d err=%v", rank, uid, err)
		} else {
			saved++
		}
	}
	log.Printf("[union-lb] cmd700 处理完成 saved=%d skipped=%d total=%d", saved, skipped, len(rows))
}
