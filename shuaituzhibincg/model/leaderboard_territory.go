package model

import (
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// PlayerTerritoryRank 存储 cmd 6314 的个人领地排行数据
type PlayerTerritoryRank struct {
	ID             int64  `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	Rank           int    `json:"rank" gorm:"column:rank;index"`
	PlayerPos      int64  `json:"player_pos" gorm:"column:player_pos;uniqueIndex:idx_ptr_pos_cmd"`
	AllianceID     int64  `json:"alliance_id" gorm:"column:alliance_id;index"`
	TerritoryIDs   string `json:"territory_ids" gorm:"column:territory_ids;type:text"`
	TerritoryCount int    `json:"territory_count" gorm:"column:territory_count;index"`
	SourceCmd      int    `json:"source_cmd" gorm:"column:source_cmd;uniqueIndex:idx_ptr_pos_cmd"`
	CaptureTime    int64  `json:"capture_time" gorm:"column:capture_time;index"`
}

func (PlayerTerritoryRank) TableName() string { return "player_territory_rank" }

// SavePlayerTerritoryRankFromDecoded 解析 cmd 6314 的 JSON 数据并写入数据库
func SavePlayerTerritoryRankFromDecoded(decoded string, sourceCmd int, db *gorm.DB) {
	if db == nil {
		return
	}
	// 调试：打印原始 JSON 结构前 500 字符
	preview := decoded
	if len(preview) > 500 {
		preview = preview[:500]
	}
	log.Printf("[territory-rank] cmd6314 原始JSON前500字符: %s", preview)

	var top []any
	if err := unmarshalJSON([]byte(decoded), &top); err != nil {
		log.Printf("[territory-rank] JSON解析失败: %v", err)
		return
	}
	if len(top) == 0 {
		log.Printf("[territory-rank] JSON数组为空")
		return
	}

	log.Printf("[territory-rank] 顶层元素个数=%d, 类型: %v", len(top), typeNames(top))

	// 尝试找到数据行数组
	// 策略1: 顶层直接就是 [[pos, aid, tids], ...] 扁平结构
	// 策略2: 类似 cmd700，数据在 top[N] 中
	var rows []any

	// 先检查顶层第一个元素是否为数组（策略1）
	if firstArr, ok := top[0].([]any); ok && len(firstArr) >= 2 {
		// 看第一个元素是否为数字（playerPos），如果是说明是扁平结构
		if isNumber(firstArr[0]) {
			rows = top
			log.Printf("[territory-rank] 使用策略1: 顶层扁平结构")
		}
	}

	// 策略1 不匹配，尝试策略2: 遍历找内层数组
	if rows == nil {
		for idx, item := range top {
			if arr, ok := item.([]any); ok && len(arr) > 0 {
				// 检查内层第一个元素是否也是数组
				if inner, ok := arr[0].([]any); ok && len(inner) >= 2 && isNumber(inner[0]) {
					rows = arr
					log.Printf("[territory-rank] 使用策略2: 数据在 top[%d], 行数=%d", idx, len(arr))
					break
				}
			}
		}
	}

	// 策略3: 类似 cmd514，数据是交替配对格式
	if rows == nil {
		for _, item := range top {
			if arr, ok := item.([]any); ok && len(arr) >= 3 {
				// 检查是否 [objID, paramRaw, flag, extra] 格式
				if isNumber(arr[0]) {
					rows = top
					log.Printf("[territory-rank] 使用策略3: 交替配对格式(顶层)")
					break
				}
			}
		}
	}

	if rows == nil {
		log.Printf("[territory-rank] 无法识别数据结构，尝试遍历所有顶层元素")
		rows = top
	}

	now := time.Now().Unix()
	saved := 0
	skipped := 0
	for _, item := range rows {
		row, ok := item.([]any)
		if !ok {
			skipped++
			continue
		}
		if len(row) < 1 {
			skipped++
			continue
		}
		playerPos := toInt64(row[0])
		if playerPos == 0 {
			// 可能是交替配对格式，如 cmd514: [eventID, [objID, ...]]
			skipped++
			continue
		}
		var allianceID int64
		if len(row) >= 2 {
			allianceID = toInt64(row[1])
		}
		var territoryIDs string
		if len(row) >= 3 {
			territoryIDs = strings.TrimSpace(toStringArr(row[2]))
		}
		count := 0
		if territoryIDs != "" {
			count = strings.Count(territoryIDs, ",") + 1
		}
		rec := PlayerTerritoryRank{
			Rank:           saved + 1,
			PlayerPos:      playerPos,
			AllianceID:     allianceID,
			TerritoryIDs:   territoryIDs,
			TerritoryCount: count,
			SourceCmd:      sourceCmd,
			CaptureTime:    now,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "player_pos"}, {Name: "source_cmd"}},
			DoUpdates: clause.AssignmentColumns([]string{"rank", "alliance_id", "territory_ids", "territory_count", "capture_time"}),
		}).Create(&rec).Error; err != nil {
			log.Printf("[territory-rank] 写库失败 rank=%d pos=%d err=%v", saved+1, playerPos, err)
		} else {
			saved++
		}
	}
	log.Printf("[territory-rank] cmd6314 处理完成 saved=%d skipped=%d total=%d", saved, skipped, len(rows))
}

// isNumber 判断值是否为数字类型
func isNumber(v any) bool {
	switch v.(type) {
	case float64, int, int64:
		return true
	default:
		return false
	}
}

// typeNames 返回数组中每个元素的类型名
func typeNames(arr []any) []string {
	names := make([]string, 0, len(arr))
	for i, v := range arr {
		if i > 10 {
			names = append(names, "...")
			break
		}
		switch v.(type) {
		case []any:
			names = append(names, "[]any")
		case map[string]any:
			names = append(names, "map")
		case float64:
			names = append(names, "float64")
		case string:
			names = append(names, "string")
		case nil:
			names = append(names, "nil")
		default:
			names = append(names, fmt.Sprintf("%T", v))
		}
	}
	return names
}
