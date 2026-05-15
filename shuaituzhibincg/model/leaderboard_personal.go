package model

import (
	"log"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PersonalLeaderboard struct {
	ID              int64  `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	Rank            int    `json:"rank" gorm:"column:rank;index"`
	UserID          int64  `json:"user_id" gorm:"column:user_id;uniqueIndex"`
	Name            string `json:"name" gorm:"column:name;index"`
	Power           int64  `json:"power" gorm:"column:power;index"`
	Area            int    `json:"area" gorm:"column:area"`
	Region          int    `json:"region" gorm:"column:region;index"`
	Force           int    `json:"force" gorm:"column:force"`
	LandCount       int    `json:"land_count" gorm:"column:land_count;index"`
	FortCount       int    `json:"fort_count" gorm:"column:fort_count"`
	BranchCityCount int    `json:"branch_city_count" gorm:"column:branch_city_count"`
	ShuChengCount   int    `json:"shu_cheng_count" gorm:"column:shu_cheng_count"`
	RoleID          string `json:"role_id" gorm:"column:role_id;size:64"`
	ShowInfo        string `json:"show_info" gorm:"column:show_info;size:255"`
	RefreshTime     int64  `json:"refresh_time" gorm:"column:refresh_time;index"`
	SourceCmd       int    `json:"source_cmd" gorm:"column:source_cmd"`
	CaptureTime     int64  `json:"capture_time" gorm:"column:capture_time;index"`
}

func (PersonalLeaderboard) TableName() string { return "personal_leaderboard" }

func DropAndRecreatePersonalTable(db *gorm.DB) {
	if db == nil {
		return
	}
	if db.Migrator().HasTable(&PersonalLeaderboard{}) {
		var count int64
		db.Table("personal_leaderboard").Count(&count)
		if count == 0 {
			db.Exec("DROP TABLE IF EXISTS personal_leaderboard")
			log.Println("[personal-lb] 旧表已清空并删除，将自动重建")
		} else {
			hasOldIdx := db.Migrator().HasIndex(&PersonalLeaderboard{}, "idx_personal_event_obj")
			if hasOldIdx {
				db.Exec("DROP TABLE IF EXISTS personal_leaderboard")
				log.Println("[personal-lb] 检测到旧索引，删除旧表将自动重建")
			}
		}
	}
}

func SavePersonalLeaderboardFromCmd700(decoded string, sourceCmd int, db *gorm.DB) {
	if db == nil {
		return
	}
	var top []any
	if err := unmarshalJSON([]byte(decoded), &top); err != nil {
		log.Printf("[personal-lb] JSON解析失败: %v", err)
		return
	}

	preview := decoded
	if len(preview) > 500 {
		preview = preview[:500]
	}
	log.Printf("[personal-lb] 顶层元素个数=%d 类型=%v 前500字符: %s", len(top), typeNames(top), preview)

	var rows []any
	if len(top) >= 5 {
		if arr, ok := top[4].([]any); ok && len(arr) > 0 {
			rows = arr
			log.Printf("[personal-lb] 从top[4]提取数据，行数=%d", len(rows))
		}
	}
	if rows == nil {
		rows = top
		log.Printf("[personal-lb] top[4]无效，使用顶层遍历，元素数=%d", len(rows))
	}

	now := time.Now().Unix()
	saved := 0
	skipped := 0
	for i, row := range rows {
		pair, ok := row.([]any)
		if !ok {
			skipped++
			if i < 3 {
				log.Printf("[personal-lb] rows[%d] 不是数组，类型=%T", i, row)
			}
			continue
		}
		if len(pair) < 2 {
			skipped++
			continue
		}
		rank := toInt(pair[0])
		obj, ok := pair[1].(map[string]any)
		if !ok {
			skipped++
			if i < 3 {
				log.Printf("[personal-lb] rows[%d] pair[1] 不是对象，类型=%T val=%v", i, pair[1], pair[1])
			}
			continue
		}
		userID := toInt64(obj["user_id"])
		if userID <= 0 {
			skipped++
			if i < 3 {
				log.Printf("[personal-lb] rows[%d] user_id<=0, obj=%v", i, obj)
			}
			continue
		}
		rec := PersonalLeaderboard{
			Rank:            rank,
			UserID:          userID,
			Name:            toString(obj["name"]),
			Power:           toInt64(obj["power"]),
			Area:            toInt(obj["area"]),
			Region:          toInt(obj["region"]),
			Force:           toInt(obj["force"]),
			LandCount:       toInt(obj["land_count"]),
			FortCount:       toInt(obj["fort_count"]),
			BranchCityCount: toInt(obj["branch_city_count"]),
			ShuChengCount:   toInt(obj["shu_cheng_count"]),
			RoleID:          toString(obj["role_id"]),
			ShowInfo:        toString(obj["show_info"]),
			RefreshTime:     toInt64(obj["refresh_time"]),
			SourceCmd:       sourceCmd,
			CaptureTime:     now,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "user_id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"rank", "name", "power", "area", "region", "force",
				"land_count", "fort_count", "branch_city_count", "shu_cheng_count",
				"role_id", "show_info", "refresh_time", "source_cmd", "capture_time",
			}),
		}).Create(&rec).Error; err != nil {
			log.Printf("[personal-lb] 写库失败 rank=%d user_id=%d err=%v", rank, userID, err)
		} else {
			saved++
		}
	}
	log.Printf("[personal-lb] cmd700 处理完成 saved=%d skipped=%d total=%d", saved, skipped, len(rows))
}

func IsPersonalLeaderboardData(decoded string) bool {
	var top []any
	if err := unmarshalJSON([]byte(decoded), &top); err != nil {
		return false
	}
	var rows []any
	if len(top) >= 5 {
		if arr, ok := top[4].([]any); ok && len(arr) > 0 {
			rows = arr
		}
	}
	if rows == nil {
		rows = top
	}
	for _, row := range rows {
		pair, ok := row.([]any)
		if !ok || len(pair) < 2 {
			continue
		}
		obj, ok := pair[1].(map[string]any)
		if !ok {
			continue
		}
		if _, exists := obj["user_id"]; exists {
			return true
		}
		if _, exists := obj["union_id"]; exists {
			return false
		}
		break
	}
	return false
}
