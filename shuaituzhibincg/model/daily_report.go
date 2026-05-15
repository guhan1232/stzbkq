package model

import "time"

type DailyReport struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	Date           string    `json:"date" gorm:"column:date;type:varchar(20);uniqueIndex"`                     // 报告日期 格式: 2006-01-02
	DBName         string    `json:"db_name" gorm:"column:db_name;index"`                     // 对应数据库名称
	Content        string    `json:"content" gorm:"column:content;type:text"`                 // JSON格式的报告内容
	LandStats      string    `json:"land_stats" gorm:"column:land_stats;type:text"`           // 翻地统计JSON
	MemberChanges  string    `json:"member_changes" gorm:"column:member_changes;type:text"`   // 成员变动JSON
	TaskAttendance string    `json:"task_attendance" gorm:"column:task_attendance;type:text"` // 任务出勤JSON
	MemberList     string    `json:"member_list" gorm:"column:member_list;type:text"`         // 同盟成员列表JSON
	WuStats        string    `json:"wu_stats" gorm:"column:wu_stats;type:text"`               // 武勋统计JSON
	CreatedAt      time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (DailyReport) TableName() string {
	return "daily_report"
}

type LandStatsByGroup struct {
	GroupName    string            `json:"group_name"`
	TotalCount   int               `json:"total_count"`
	SuccessCount int               `json:"success_count"`
	FailCount    int               `json:"fail_count"`
	Players      []LandPlayerStats `json:"players"`
}

type LandPlayerStats struct {
	PlayerName   string `json:"player_name"`
	GroupName    string `json:"group_name"`
	Count        int    `json:"count"`
	SuccessCount int    `json:"success_count"`
}

type MemberChangeInfo struct {
	GroupName string             `json:"group_name"`
	JoinList  []MemberChangeItem `json:"join_list"`
	LeaveList []MemberChangeItem `json:"leave_list"`
}

type MemberChangeItem struct {
	Name       string `json:"name"`
	ActionTime int64  `json:"action_time"`
	Power      int    `json:"power"`
}

type TaskAttendanceInfo struct {
	TaskID     int                    `json:"task_id"`
	TaskName   string                 `json:"task_name"`
	TaskPos    int                    `json:"task_pos"`
	GroupStats []GroupAttendanceStats `json:"group_stats"`
}

type GroupAttendanceStats struct {
	GroupName       string `json:"group_name"`
	TotalMembers    int    `json:"total_members"`
	AttendedMembers int    `json:"attended_members"`
	AtkNum          int    `json:"atk_num"`
	DisNum          int    `json:"dis_num"`
}

type MemberInfo struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Group string `json:"group"`
	Power int    `json:"power"`
	Wu    int    `json:"wu"`
}

type WuStatsByGroup struct {
	GroupName   string          `json:"group_name"`
	MemberCount int             `json:"member_count"`
	TotalWu     int             `json:"total_wu"`
	AverageWu   int             `json:"average_wu"`
	ZeroWuCount int             `json:"zero_wu_count"`
	Players     []WuPlayerStats `json:"players"`
}

type WuPlayerStats struct {
	PlayerName string `json:"player_name"`
	GroupName  string `json:"group_name"`
	Wu         int    `json:"wu"`
}
