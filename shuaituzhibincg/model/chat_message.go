package model

/*
724协议 - 同盟聊天消息数据结构

原始数据格式: [[msg_id, [message_data]], ...]

message_data 数组各索引含义:
[0]  消息类型 (9=聊天消息)
[1]  未知
[2]  未知 (有时有值如13820)
[3]  未知
[4]  消息内容
[5]  时间戳 (Unix)
[6]  玩家ID
[7]  同盟名称
[8]  同盟ID
[9]  玩家ID数组
[10] 职位 (0=普通成员, 1=有职位, 2=副盟主等, 13=特殊)
[11] 未知
[12] 区服ID
[13] 未知 (0或1)
[14] 未知
[15] 同盟ID (重复)
[16] 未知
[17] 未知
[18] 未知
[19] 坐标 ("x,y" 格式)
[20] 未知
[21] 未知
[22] 未知
[23] 未知
[24] 未知
[25] 未知
[26] 武将ID/头像ID
[27] 未知
[28] 未知
[29] 未知
[30] 未知
[31] 未知
[32] 未知
[33] 未知
[34] 未知
[35] 未知
[36] 未知
[37] 未知
[38] 未知
[39] 未知
[40] 未知
[41] 未知
[42] 未知
[43] 未知
[44] 玩家全名 (含#ID, 如 "茶丨小帅#8319204")
[45] 未知
*/

type ChatMessage struct {
	ID           int64  `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	MsgId        int64  `json:"msg_id" gorm:"column:msg_id;uniqueIndex"`
	MsgType      int    `json:"msg_type" gorm:"column:msg_type"`
	Content      string `json:"content" gorm:"column:content;type:text"`
	Time         int64  `json:"time" gorm:"column:time;index"`
	PlayerId     int    `json:"player_id" gorm:"column:player_id;index"`
	PlayerName   string `json:"player_name" gorm:"column:player_name;index"`
	PlayerFullName string `json:"player_full_name" gorm:"column:player_full_name"`
	AllianceName string `json:"alliance_name" gorm:"column:alliance_name;index"`
	AllianceId   int    `json:"alliance_id" gorm:"column:alliance_id;index"`
	Position     int    `json:"position" gorm:"column:position"`
	ServerId     int    `json:"server_id" gorm:"column:server_id"`
	Coordinates  string `json:"coordinates" gorm:"column:coordinates"`
	HeroId       int    `json:"hero_id" gorm:"column:hero_id"`
}

func (ChatMessage) TableName() string {
	return "chat_message"
}

func ToChatMessage(msgId int64, data []any) ChatMessage {
	if len(data) < 46 {
		return ChatMessage{}
	}

	playerName := ""
	playerFullName := toString(data[44])
	if playerFullName != "" {
		parts := splitAtHash(playerFullName)
		playerName = parts
	} else {
		playerName = playerFullName
	}

	return ChatMessage{
		MsgId:          msgId,
		MsgType:        toInt(data[0]),
		Content:        toString(data[4]),
		Time:           toInt64(data[5]),
		PlayerId:       toInt(data[6]),
		PlayerName:     playerName,
		PlayerFullName: playerFullName,
		AllianceName:   toString(data[7]),
		AllianceId:     toInt(data[8]),
		Position:       toInt(data[10]),
		ServerId:       toInt(data[12]),
		Coordinates:    toString(data[19]),
		HeroId:         toInt(data[26]),
	}
}

func splitAtHash(s string) string {
	for i, c := range s {
		if c == '#' {
			return s[:i]
		}
	}
	return s
}
