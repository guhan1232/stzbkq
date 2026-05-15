package model

// SystemConfig 系统配置表
type SystemConfig struct {
	Key   string `gorm:"column:key;primaryKey;type:varchar(100)"`
	Value string `gorm:"column:value;type:text"`
}

func (SystemConfig) TableName() string {
	return "system_config"
}
