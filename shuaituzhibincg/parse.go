package main

import (
	"bytes"
	"compress/zlib"
	"encoding/json"
	"fmt"
	"gorm.io/gorm"
	"io"
	"log"
	"strconv"
	"strings"
	"stzbHelper/database"
	"stzbHelper/global"
	"stzbHelper/http/handle/api"
	"stzbHelper/model"
	"stzbHelper/service"
	"time"
)

// getDBByIP 根据抓包到的IP获取对应的数据库连接
func getDBByIP(dstIP string) *gorm.DB {
	ipOnly := dstIP
	if idx := strings.LastIndex(ipOnly, ":"); idx != -1 {
		ipOnly = ipOnly[:idx]
	}
	dbName := global.GetUserDBName(ipOnly)
	if dbName != "" {
		db, err := database.GetGameDB(dbName)
		if err == nil {
			return db
		}
	}
	return model.Conn // 降级使用全局连接
}

func ParseData(cmdId int, data []byte, dstIP string) {
	if global.IsDebug {
		log.Println("收到[" + strconv.Itoa(cmdId) + "]消息:" + string(parseZlibData(data)))
	}

	db := getDBByIP(dstIP)

	if cmdId == 103 {
		parseTeamUser(data, db)
	} else if cmdId == 92 {
		if global.ExVar.NeedGetBattleData {
			parseBattleData(data, db)
		}
		if global.ExVar.NeedGetReport {
			parseReport(data, db)
		}
		if !global.ExVar.NeedGetBattleData && !global.ExVar.NeedGetReport {
			log.Println("收到同盟战报消息，但未开启任何抓取，跳过解析")
		}
	} else if cmdId == 700 || cmdId == 514 || cmdId == 6314 {
		if global.ExVar.NeedGetLeaderboard {
			parseLeaderboard(cmdId, data, db)
		}
	} else if cmdId == 724 {
		if global.ExVar.NeedGetChatMessage {
			parseChatMessage(data, db)
		}
	} else if cmdId == 5028 {
		if global.ExVar.NeedGetBattlefieldRealtime {
			log.Printf("[realtime-monitor] 解析5028包: data_len=%d", len(data))
			parseRealtime5028(data, db)
		} else {
			log.Printf("[realtime-monitor] 收到5028包但实时监控未开启: data_len=%d", len(data))
		}
	} else if cmdId == 3788 {
		if global.ExVar.NeedGetManifesto {
			parseManifesto(data, db)
		}
	}
}

// parseLeaderboard 解析排行榜数据 (cmd 700/514/6314)
func parseLeaderboard(cmdId int, data []byte, db *gorm.DB) {
	msgdata := parseZlibData(data)
	if len(msgdata) == 0 {
		log.Printf("[leaderboard] cmd%d 解压数据为空", cmdId)
		return
	}
	decoded := string(msgdata)
	switch cmdId {
	case 700:
		if model.IsPersonalLeaderboardData(decoded) {
			log.Println("[leaderboard] 收到个人排行榜消息 cmd700")
			model.SavePersonalLeaderboardFromCmd700(decoded, cmdId, db)
		} else {
			log.Println("[leaderboard] 收到同盟排行榜消息 cmd700")
			model.SaveUnionLeaderboardFromDecoded(decoded, cmdId, db)
		}
	case 514:
		log.Println("[leaderboard] 收到个人积分排行消息 cmd514")
	case 6314:
		log.Println("[leaderboard] 收到领地排行消息 cmd6314")
		model.SavePlayerTerritoryRankFromDecoded(decoded, cmdId, db)
	}
}

func DecodeType5(data []byte) string {
	if data[0] == 5 {
		result := make([]byte, len(data)-1)
		for index, value := range data[1:] {
			result[index] = value ^ 152
		}
		return string(result)
	}
	return ""
}

// 原始数据结构
type RawData []interface{}

type BattleData struct {
	BattleId              int64       `json:"battle_id"`
	AttackHelpId          string      `json:"attack_help_id"`
	Time                  int64       `json:"time"`
	Wid                   interface{} `json:"wid"`
	WidName               string      `json:"wid_name"`
	AttackName            string      `json:"attack_name"`
	AttackUnionName       string      `json:"attack_union_name"`
	AttackClanName        string      `json:"attack_clan_name"`
	DefendClanName        string      `json:"defend_clan_name"`
	DefendName            string      `json:"defend_name"`
	DefendUnionName       string      `json:"defend_union_name"`
	AttackAdvance         string      `json:"attack_advance"`
	AttackAllHeroInfo     string      `json:"attack_all_hero_info"`
	AttackerGearInfo      string      `json:"attacker_gear_info"`
	DefendAdvance         string      `json:"defend_advance"`
	DefendAllHeroInfo     string      `json:"defend_all_hero_info"`
	DefenderGearInfo      string      `json:"defender_gear_info"`
	AttackHeroType        string      `json:"attack_hero_type"`
	AttackHeroTypeAdvance string      `json:"attack_hero_type_advance"`
	DefendHeroType        string      `json:"defend_hero_type"`
	DefendHeroTypeAdvance string      `json:"defend_hero_type_advance"`
	AttackHp              int64       `json:"attack_hp"`
	DefendHp              int64       `json:"defend_hp"`
	Npc                   int64       `json:"npc"`
	AllSkillInfo          string      `json:"all_skill_info"`
	Result                int64       `json:"result"`
	AttackIdu             string      `json:"attack_idu"` //进攻方队伍ID
	DefendIdu             string      `json:"defend_idu"` //防守方队伍ID
}

func parseBattleData(data []byte, db *gorm.DB) {
	msgdata := parseZlibData(data)
	fmt.Println("原始数据:", string(msgdata))

	if len(msgdata) > 0 {
		var rawData RawData
		err := json.Unmarshal(msgdata, &rawData)
		if err != nil {
			log.Printf("解析JSON失败: %v", err)
			return
		}

		fmt.Printf("数据长度: %d\n", len(rawData))

		// 遍历所有战斗记录
		battleCount := 0
		for _, item := range rawData {
			// 每个item是一个数组 [战斗数据, 其他数据...]
			battleArray, ok := item.([]interface{})
			if !ok || len(battleArray) == 0 {
				continue
			}

			// 第一个元素是战斗数据
			battleMap, ok := battleArray[0].(map[string]interface{})
			if !ok {
				continue
			}

			// 转换为结构体
			var battleData BattleData
			jsonData, err := json.Marshal(battleMap)
			if err != nil {
				log.Printf("转换战斗数据失败: %v", err)
				continue
			}

			if err := json.Unmarshal(jsonData, &battleData); err != nil {
				log.Printf("解析战斗数据失败: %v", err)
				continue
			}

			fmt.Printf("处理战斗ID: %d\n", battleData.BattleId)

			widStr := ""
			switch v := battleData.Wid.(type) {
			case string:
				widStr = v
			case float64:
				widStr = strconv.FormatInt(int64(v), 10)
			case int64:
				widStr = strconv.FormatInt(v, 10)
			case int:
				widStr = strconv.Itoa(v)
			default:
				widStr = fmt.Sprintf("%v", v)
			}

			if widStr != "" && !strings.Contains(widStr, ",") {
				digits := ""
				for _, ch := range widStr {
					if ch >= '0' && ch <= '9' {
						digits += string(ch)
					}
				}
				if len(digits) > 4 {
					var existing model.BattleReport
					if err := db.Where("wid_name = ? AND INSTR(wid, ',') > 0", battleData.WidName).First(&existing).Error; err == nil && existing.Wid != "" {
						widStr = existing.Wid
					}
				}
			}

			// 创建战斗报告
			report := model.BattleReport{
				BattleId:              battleData.BattleId,
				AttackHelpId:          battleData.AttackHelpId,
				Time:                  battleData.Time,
				Wid:                   widStr,
				WidName:               battleData.WidName,
				AttackName:            battleData.AttackName,
				AttackUnionName:       battleData.AttackUnionName,
				AttackClanName:        battleData.AttackClanName,
				DefendClanName:        battleData.DefendClanName,
				DefendName:            battleData.DefendName,
				DefendUnionName:       battleData.DefendUnionName,
				AttackAdvance:         battleData.AttackAdvance,
				AttackAllHeroInfo:     battleData.AttackAllHeroInfo,
				AttackerGearInfo:      battleData.AttackerGearInfo,
				DefendAdvance:         battleData.DefendAdvance,
				DefendAllHeroInfo:     battleData.DefendAllHeroInfo,
				DefenderGearInfo:      battleData.DefenderGearInfo,
				AttackHeroType:        battleData.AttackHeroType,
				AttackHeroTypeAdvance: battleData.AttackHeroTypeAdvance,
				DefendHeroType:        battleData.DefendHeroType,
				DefendHeroTypeAdvance: battleData.DefendHeroTypeAdvance,
				AttackHp:              battleData.AttackHp,
				DefendHp:              battleData.DefendHp,
				Npc:                   battleData.Npc,
				AllSkillInfo:          battleData.AllSkillInfo,
				Result:                battleData.Result,
				AttackIdu:             battleData.AttackIdu,
				DefendIdu:             battleData.DefendIdu,
			}

			// 解析进阶信息和武将信息
			report = parseHeroInfo(report)

			fmt.Printf("保存战斗报告: %+v\n", report)

			// 保存到数据库
			saveResult := db.Save(&report)
			if saveResult.Error != nil {
				log.Printf("保存战斗报告失败: %v", saveResult.Error)
			} else {
				battleCount++
				fmt.Printf("成功保存战斗报告, ID: %d, 影响行数: %d\n", report.BattleId, saveResult.RowsAffected)

				// result = 2 表示占领成功，创建翻地记录
				if battleData.Result == 2 {
					// 解析土地坐标 (wid 格式如 "123,456")
					landPos := 0
					if widStr != "" {
						// 移除可能的逗号，转为整数
						for _, c := range widStr {
							if c >= '0' && c <= '9' {
								landPos = landPos*10 + int(c-'0')
							}
						}
					}

					// 解析土地等级 (从土地名称中提取，如 "3级地")
					landLevel := 0
					landName := battleData.WidName
					if len(landName) > 0 && landName[0] >= '1' && landName[0] <= '9' {
						landLevel = int(landName[0] - '0')
					}

					// 查找进攻方的 PlayerId
					var teamUser model.TeamUser
					db.Where("name = ?", battleData.AttackName).First(&teamUser)

					landRecord := model.LandRecord{
						PlayerId:     teamUser.Id,
						PlayerName:   battleData.AttackName,
						LandPos:      landPos,
						LandName:     landName,
						LandLevel:    landLevel,
						AttackTime:   battleData.Time,
						BattleId:     battleData.BattleId,
						IsSuccess:    1,
						DefenderName: battleData.DefendName,
					}

					if err := db.Create(&landRecord).Error; err != nil {
						log.Printf("保存翻地记录失败: %v", err)
					} else {
						log.Printf("成功保存翻地记录: 玩家=%s, 土地=%s, 战报ID=%d", battleData.AttackName, landName, battleData.BattleId)
					}
				}
			}
		}

		log.Printf("共处理 %d 条战斗记录", battleCount)
	}
}

// 解析武将信息
func parseHeroInfo(report model.BattleReport) model.BattleReport {
	// 解析进攻方进阶信息
	attackAdvance := splitAndFilter(report.AttackAdvance, ";")
	fmt.Printf("进攻方进阶信息: %v\n", attackAdvance)

	attackTotal := int64(0)
	for i, advance := range attackAdvance {
		if i == 0 { // 跳过第一个元素
			continue
		}
		if len(advance) > 0 {
			star, err := strconv.ParseInt(advance[0], 10, 64)
			if err == nil {
				switch i {
				case 1:
					report.AttackHero1Star = star
				case 2:
					report.AttackHero2Star = star
				case 3:
					report.AttackHero3Star = star
				}
				attackTotal += star
			}
		}
	}
	report.AttackTotalStar = attackTotal

	// 解析防守方进阶信息
	defendAdvance := splitAndFilter(report.DefendAdvance, ";")
	fmt.Printf("防守方进阶信息: %v\n", defendAdvance)

	defendTotal := int64(0)
	for i, advance := range defendAdvance {
		if i == 3 { // 跳过第三个元素
			continue
		}
		if len(advance) > 0 {
			star, err := strconv.ParseInt(advance[0], 10, 64)
			if err == nil {
				switch i {
				case 0:
					report.DefendHero3Star = star
				case 1:
					report.DefendHero2Star = star
				case 2:
					report.DefendHero1Star = star
				}
				defendTotal += star
			}
		}
	}
	report.DefendTotalStar = defendTotal

	// 解析进攻方武将信息
	attackHeroInfo := splitAndFilter(report.AttackAllHeroInfo, ";")
	fmt.Printf("进攻方武将信息: %v\n", attackHeroInfo)

	for i, hero := range attackHeroInfo {
		if len(hero) >= 2 {
			heroID, _ := strconv.ParseInt(hero[0], 10, 64)
			heroLevel, _ := strconv.ParseInt(hero[1], 10, 64)

			switch i {
			case 0:
				report.AttackHero1Id = heroID
				report.AttackHero1Level = heroLevel
			case 1:
				report.AttackHero2Id = heroID
				report.AttackHero2Level = heroLevel
			case 2:
				report.AttackHero3Id = heroID
				report.AttackHero3Level = heroLevel
			}
		}
	}

	// 解析防守方武将信息
	defendHeroInfo := splitAndFilter(report.DefendAllHeroInfo, ";")
	fmt.Printf("防守方武将信息: %v\n", defendHeroInfo)

	for i, hero := range defendHeroInfo {
		if len(hero) >= 2 {
			heroID, _ := strconv.ParseInt(hero[0], 10, 64)
			heroLevel, _ := strconv.ParseInt(hero[1], 10, 64)

			switch i {
			case 0:
				report.DefendHero1Id = heroID
				report.DefendHero1Level = heroLevel
			case 1:
				report.DefendHero2Id = heroID
				report.DefendHero2Level = heroLevel
			case 2:
				report.DefendHero3Id = heroID
				report.DefendHero3Level = heroLevel
			}
		}
	}

	return report
}

// 分割和过滤字符串
func splitAndFilter(input string, delimiter string) [][]string {
	if input == "" {
		return [][]string{}
	}

	parts := strings.Split(input, delimiter)
	var result [][]string

	for _, part := range parts {
		if part != "" {
			// 进一步按逗号分割
			subParts := strings.Split(part, ",")
			var filtered []string
			for _, subPart := range subParts {
				if subPart != "" {
					filtered = append(filtered, subPart)
				}
			}
			if len(filtered) > 0 {
				result = append(result, filtered)
			}
		}
	}

	return result
}

func parseReport(data []byte, db *gorm.DB) {
	log.Println("收到同盟战报消息")
	if !global.ExVar.NeedGetReport {
		log.Println("由于未开启获取战报,本次跳过解析")
		return
	}
	msgdata := parseZlibData(data)
	if len(msgdata) > 0 {
		var jsondata [][]any
		json.Unmarshal(msgdata, &jsondata)

		var reports []model.Report
		var neededreports []model.Report

		// 输出需要匹配的坐标
		log.Printf("需要匹配的坐标 (NeededReportPos): %d", global.ExVar.NeededReportPos)

		for _, v := range jsondata {
			reportJSON, err := json.Marshal(v[0])
			if err != nil {
				fmt.Println("Error marshalling report:", err)
				continue
			}

			var report model.Report
			err = json.Unmarshal(reportJSON, &report)
			if err != nil {
				fmt.Println("Error unmarshalling report:", err)
				continue
			}

			reports = append(reports, report)
			// NeededReportPos=0 表示匹配所有战报
			if global.ExVar.NeededReportPos == 0 || report.Wid == global.ExVar.NeededReportPos {
				// 检查时间范围
				timeInRange := true
				if global.ExVar.ReportStartTime > 0 && int64(report.Time) < global.ExVar.ReportStartTime {
					timeInRange = false
				}
				if global.ExVar.ReportEndTime > 0 && int64(report.Time) > global.ExVar.ReportEndTime {
					timeInRange = false
				}
				if timeInRange {
					neededreports = append(neededreports, report)
				}
			}
		}

		log.Println("解析同盟战报成功,共" + strconv.Itoa(len(reports)) + "条 符合条件的共" + strconv.Itoa(len(neededreports)) + "条")

		// 仅保存符合条件的战报到数据库
		if len(neededreports) > 0 {
			action := db.Save(&neededreports)
			log.Printf("数据库共保存 %d 条符合条件的战报", action.RowsAffected)
		}
	} else {
		log.Println("解析同盟战报消息失败")
	}
}

func parseTeamUser(data []byte, db *gorm.DB) {
	log.Println("收到同盟成员消息")
	if global.IsDebug {
		log.Println(string(parseZlibData(data)))
	}

	msgdata := parseZlibData(data)
	if len(msgdata) > 0 {
		var jsondata [][]any
		err := json.Unmarshal(msgdata, &jsondata)
		if err != nil {
			log.Printf("解析同盟成员JSON失败: %v, 解压数据长度=%d, 前100字节=%s", err, len(msgdata), string(msgdata[:min(100, len(msgdata))]))
			return
		}

		var validUsers []model.TeamUser
		var ids []int
		for _, item := range jsondata {
			u := model.ToTeamUser(item)
			if u.Id == 0 {
				continue
			}
			validUsers = append(validUsers, u)
			ids = append(ids, u.Id)
		}

		if len(validUsers) == 0 {
			log.Println("同盟成员消息解析后无有效数据，跳过同步")
			return
		}

		log.Println("同盟成员消息解析成功！共" + strconv.Itoa(len(validUsers)) + "人")

		err = db.Transaction(func(tx *gorm.DB) error {
			var oldUsers []model.TeamUser
			if err := tx.Find(&oldUsers).Error; err != nil {
				return err
			}

			api.RecordMemberChange(tx, oldUsers, validUsers)

			for _, u := range validUsers {
				if err := tx.Save(&u).Error; err != nil {
					log.Printf("保存用户 %s(id=%d) 失败: %v", u.Name, u.Id, err)
				}
			}

			if len(ids) > 0 {
				if err := tx.Not("id", ids).Delete(&model.TeamUser{}).Error; err != nil {
					log.Printf("删除已退出成员失败: %v", err)
				}
			}

			return nil
		})

		if err != nil {
			log.Printf("同步同盟成员事务失败: %v", err)
		}
	} else {
		log.Printf("解析同盟成员消息失败，解压数据为空，原始数据长度=%d, 前16字节=%x", len(data), data[:min(16, len(data))])
	}
}

func parseZlibData(data []byte) []byte {
	if len(data) >= 2 && data[0] == 120 && data[1] == 156 {
		compressedReader := bytes.NewReader(data)
		zlibReader, err := zlib.NewReader(compressedReader)
		if err != nil {
			log.Printf("创建zlib reader失败: %v, 数据长度=%d, 前16字节=%x", err, len(data), data[:min(16, len(data))])
			// 尝试跳过可能的前缀字节，从不同偏移寻找zlib头
			return tryAlternativeZlibDecompress(data)
		}
		defer zlibReader.Close()

		uncompressedData, err := io.ReadAll(zlibReader)
		if err != nil {
			log.Printf("解压数据失败: %v, 数据长度=%d, 已解压长度=%d", err, len(data), len(uncompressedData))
			// 即使解压报错，也尝试使用已解压的部分数据
			if len(uncompressedData) > 0 {
				log.Printf("尝试使用部分解压数据，长度=%d", len(uncompressedData))
				return uncompressedData
			}
			// 如果主解压完全失败，尝试从不同偏移重新解压
			return tryAlternativeZlibDecompress(data)
		}
		return uncompressedData
	}
	return data
}

// tryAlternativeZlibDecompress 尝试从不同偏移位置寻找zlib头并解压
func tryAlternativeZlibDecompress(data []byte) []byte {
	// 在数据中搜索zlib魔数 0x78 0x9C
	for i := 0; i < min(len(data)-1, 32); i++ {
		if data[i] == 120 && (data[i+1] == 156 || data[i+1] == 1 || data[i+1] == 94 || data[i+1] == 218) {
			if i == 0 {
				continue // 已经尝试过偏移0
			}
			compressedReader := bytes.NewReader(data[i:])
			zlibReader, err := zlib.NewReader(compressedReader)
			if err != nil {
				continue
			}
			defer zlibReader.Close()

			uncompressedData, err := io.ReadAll(zlibReader)
			if err != nil {
				if len(uncompressedData) > 0 {
					log.Printf("从偏移%d处部分解压成功，已解压长度=%d", i, len(uncompressedData))
					return uncompressedData
				}
				continue
			}
			log.Printf("从偏移%d处解压成功，解压长度=%d", i, len(uncompressedData))
			return uncompressedData
		}
	}
	return []byte{}
}

func parseChatMessage(data []byte, db *gorm.DB) {
	log.Println("[724] 收到同盟聊天消息")
	msgdata := parseZlibData(data)
	if len(msgdata) == 0 {
		log.Printf("[724] 解压数据为空")
		return
	}

	var rawData [][]any
	if err := json.Unmarshal(msgdata, &rawData); err != nil {
		log.Printf("[724] 解析JSON失败: %v", err)
		return
	}

	var messages []model.ChatMessage
	for _, item := range rawData {
		if len(item) < 2 {
			continue
		}

		msgId, ok := item[0].(float64)
		if !ok {
			continue
		}

		msgData, ok := item[1].([]any)
		if !ok {
			continue
		}

		msg := model.ToChatMessage(int64(msgId), msgData)
		if msg.Content == "" && msg.PlayerId == 0 {
			continue
		}
		messages = append(messages, msg)
	}

	if len(messages) > 0 {
		result := db.Create(&messages)
		if result.Error != nil {
			if strings.Contains(result.Error.Error(), "doesn't exist") {
				log.Printf("[724] 聊天消息表不存在，尝试自动迁移...")
				if migrateErr := db.AutoMigrate(&model.ChatMessage{}); migrateErr != nil {
					log.Printf("[724] 自动迁移失败: %v", migrateErr)
				} else {
					result = db.Create(&messages)
					if result.Error != nil {
						log.Printf("[724] 迁移后保存仍失败: %v", result.Error)
					} else {
						log.Printf("[724] 共处理 %d 条聊天消息，保存 %d 条", len(messages), result.RowsAffected)
					}
				}
			} else {
				log.Printf("[724] 保存聊天消息失败: %v", result.Error)
			}
		} else {
			log.Printf("[724] 共处理 %d 条聊天消息，保存 %d 条", len(messages), result.RowsAffected)
		}
	} else {
		log.Println("[724] 无有效聊天消息")
	}
}

func parseManifesto(data []byte, db *gorm.DB) {
	log.Println("[3788] 收到檄文消息")
	msgdata := parseZlibData(data)
	if len(msgdata) == 0 {
		log.Printf("[3788] 解压数据为空")
		return
	}

	var rawData []any
	if err := json.Unmarshal(msgdata, &rawData); err != nil {
		log.Printf("[3788] 解析JSON失败: %v", err)
		return
	}

	manifesto := model.ToManifesto(rawData)
	if manifesto.Title == "" && manifesto.Content == "" {
		log.Println("[3788] 檄文数据为空，跳过")
		return
	}

	result := db.Create(&manifesto)
	if result.Error != nil {
		if strings.Contains(result.Error.Error(), "doesn't exist") {
			log.Printf("[3788] 檄文表不存在，尝试自动迁移...")
			if migrateErr := db.AutoMigrate(&model.Manifesto{}); migrateErr != nil {
				log.Printf("[3788] 自动迁移失败: %v", migrateErr)
				return
			}
			result = db.Create(&manifesto)
			if result.Error != nil {
				log.Printf("[3788] 迁移后保存仍失败: %v", result.Error)
				return
			}
		} else {
			log.Printf("[3788] 保存檄文失败: %v", result.Error)
			return
		}
	}
	log.Printf("[3788] 保存檄文: 标题=%s, 同盟=%s, 势力=%s, 影响=%d行",
		manifesto.Title, manifesto.AllianceName, manifesto.Faction, result.RowsAffected)
}

// parseRealtime5028 解析5028战场实时监控数据包
func parseRealtime5028(data []byte, db *gorm.DB) {
	msgdata := parseZlibData(data)
	if len(msgdata) == 0 {
		log.Printf("[5028] 解压数据为空: data_len=%d", len(data))
		return
	}

	var rawData []interface{}
	if err := json.Unmarshal(msgdata, &rawData); err != nil {
		log.Printf("[5028] JSON解析失败: %v", err)
		return
	}

	rawJSON := string(msgdata)
	ctx := extract5028Context(rawData)

	packet := model.RealtimeMonitorPacket{
		TS:              time.Now().Unix(),
		CmdID:           5028,
		RawData:         rawJSON,
		RealtimeContext: ctx,
	}

	service.PushProtocol5028MonitorPacket(packet)

	if ctx != nil && ctx.MainID != "" {
		log.Printf("[5028] 实时监控: main_id=%s, attacker=%s, union=%s, wid=%s, target=%s, arrive=%d",
			ctx.MainID, ctx.AttackerName, ctx.AttackUnionName, ctx.Wid, ctx.TargetWid, ctx.ArriveTime)
	} else if ctx == nil {
		log.Printf("[5028] 实时监控上下文为空: raw_len=%d", len(rawJSON))
	} else {
		log.Printf("[5028] 实时监控MainID为空: attacker=%s, union=%s, wid=%s, target=%s, arrive=%d",
			ctx.AttackerName, ctx.AttackUnionName, ctx.Wid, ctx.TargetWid, ctx.ArriveTime)
	}
}

// extract5028Context 从5028包JSON中提取上下文信息
func extract5028Context(rawData []interface{}) *model.RealtimeContext {
	if len(rawData) < 7 {
		return nil
	}

	ctx := &model.RealtimeContext{}
	playerMap, _ := rawData[1].(map[string]interface{})
	entityMap, _ := rawData[6].(map[string]interface{})

	if entityMap != nil {
		for entityID, entity := range entityMap {
			entityFields, ok := entity.([]interface{})
			if !ok || len(entityFields) < 6 {
				continue
			}

			playerID := format5028Number(entityFields, 1)
			ctx.MainID = firstNonEmptyString(playerID, entityID)
			ctx.Wid = format5028Number(entityFields, 2)
			ctx.TargetWid = format5028Number(entityFields, 3)
			ctx.ArriveTime = int64FromInterface(entityFields[5])

			if playerFields, ok := playerMap[playerID].([]interface{}); ok {
				if len(playerFields) > 0 {
					ctx.AttackerName = fmt.Sprintf("%v", playerFields[0])
				}
				if len(playerFields) > 12 {
					if unionFields, ok := playerFields[12].([]interface{}); ok && len(unionFields) > 2 {
						ctx.AttackUnionName = fmt.Sprintf("%v", unionFields[2])
					}
				}
			}
			break
		}
	}

	if ctx.MainID == "" && len(rawData) > 0 {
		if root0, ok := rawData[0].(map[string]interface{}); ok {
			if mid, ok := root0["main_id"]; ok {
				ctx.MainID = fmt.Sprintf("%v", mid)
			}
		}
	}

	if ctx.MainID == "" && ctx.AttackerName == "" {
		return nil
	}
	return ctx
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func format5028Number(fields []interface{}, index int) string {
	if len(fields) <= index {
		return ""
	}
	value := int64FromInterface(fields[index])
	if value == 0 {
		return fmt.Sprintf("%v", fields[index])
	}
	return strconv.FormatInt(value, 10)
}

func int64FromInterface(value interface{}) int64 {
	switch v := value.(type) {
	case float64:
		return int64(v)
	case int64:
		return v
	case int:
		return int64(v)
	case json.Number:
		parsed, _ := v.Int64()
		return parsed
	default:
		return 0
	}
}
