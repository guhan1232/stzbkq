package model

// PlayerTeamData 存储解析后的玩家队伍/武将状态数据
type PlayerTeamData struct {
	TeamKey    string `json:"team_key" gorm:"column:team_key;primaryKey;type:varchar(64)"` // 类似 "28011861" (UID*10+1)
	PlayerID   int    `json:"player_id" gorm:"column:player_id;index"`                     // 玩家UID
	UnionID    int    `json:"union_id" gorm:"column:union_id;index"`                       // 同盟ID
	Pos1       int    `json:"pos1" gorm:"column:pos1"`
	Pos2       int    `json:"pos2" gorm:"column:pos2"`
	Advance    string `json:"advance" gorm:"column:advance;type:varchar(255)"`         // 进阶/兵种信息等 (如 "0,0;0,0;0,0;")
	HeroLevels string `json:"hero_levels" gorm:"column:hero_levels;type:varchar(255)"` // 武将星级/等级 (如 "3,52;3,23;3,13;")
	Timestamp1 int64  `json:"timestamp1" gorm:"column:timestamp1"`                     // 时间戳1
	Timestamp2 int64  `json:"timestamp2" gorm:"column:timestamp2"`                     // 时间戳2
	RawData    string `json:"raw_data" gorm:"column:raw_data;type:text"`               // 完整记录备用
}

func (PlayerTeamData) TableName() string {
	return "player_team_data"
}
