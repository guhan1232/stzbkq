package model

/*
3788协议 - 檄文数据结构

原始数据格式: [msg_type, title, sub_type, player_id, unknown1, alliance_name, alliance_id, flag, time, content, world_id, server_name, pos, value1, value2, value3, value4, uid, faction]

各索引含义:
[0]  消息类型 (7=檄文)
[1]  标题 (如 "百年好合")
[2]  子类型 (1=宣战, 2=庆典, 3=联盟)
[3]  玩家ID
[4]  未知 (通常为0)
[5]  同盟名称
[6]  同盟数值/ID
[7]  标志 (1)
[8]  时间戳 (Unix)
[9]  正文内容
[10] 世界ID
[11] 服务器名称
[12] 坐标 ("x,y,z" 格式)
[13] 数值1
[14] 数值2
[15] 数值3
[16] 数值4
[17] UID字符串
[18] 势力名称 (如 "隋")
*/

type Manifesto struct {
	ID           int64  `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	MsgType      int    `json:"msg_type" gorm:"column:msg_type"`
	Title        string `json:"title" gorm:"column:title;type:varchar(255);index"`
	SubType      int    `json:"sub_type" gorm:"column:sub_type;index"`
	PlayerId     int    `json:"player_id" gorm:"column:player_id;index"`
	AllianceName string `json:"alliance_name" gorm:"column:alliance_name;index"`
	AllianceId   int    `json:"alliance_id" gorm:"column:alliance_id;index"`
	Flag         int    `json:"flag" gorm:"column:flag"`
	Time         int64  `json:"time" gorm:"column:time;index"`
	Content      string `json:"content" gorm:"column:content;type:text"`
	WorldId      int    `json:"world_id" gorm:"column:world_id"`
	ServerName   string `json:"server_name" gorm:"column:server_name;type:varchar(255)"`
	Pos          string `json:"pos" gorm:"column:pos;type:varchar(50)"`
	Value1       int    `json:"value1" gorm:"column:value1"`
	Value2       int    `json:"value2" gorm:"column:value2"`
	Value3       int    `json:"value3" gorm:"column:value3"`
	Value4       int    `json:"value4" gorm:"column:value4"`
	UID          string `json:"uid" gorm:"column:uid;type:varchar(100)"`
	Faction      string `json:"faction" gorm:"column:faction;type:varchar(50);index"`
}

func (Manifesto) TableName() string {
	return "manifesto"
}

func ToManifesto(data []any) Manifesto {
	if len(data) < 19 {
		return Manifesto{}
	}

	return Manifesto{
		MsgType:      toInt(data[0]),
		Title:        toString(data[1]),
		SubType:      toInt(data[2]),
		PlayerId:     toInt(data[3]),
		AllianceName: toString(data[5]),
		AllianceId:   toInt(data[6]),
		Flag:         toInt(data[7]),
		Time:         toInt64(data[8]),
		Content:      toString(data[9]),
		WorldId:      toInt(data[10]),
		ServerName:   toString(data[11]),
		Pos:          toString(data[12]),
		Value1:       toInt(data[13]),
		Value2:       toInt(data[14]),
		Value3:       toInt(data[15]),
		Value4:       toInt(data[16]),
		UID:          toString(data[17]),
		Faction:      toString(data[18]),
	}
}
