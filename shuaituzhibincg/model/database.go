package model

import "gorm.io/gorm"

// Conn 全局数据库连接（由database包设置）
var Conn *gorm.DB
