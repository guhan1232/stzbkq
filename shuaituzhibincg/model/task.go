package model

import (
	"fmt"
	"strconv"
)

type Task struct {
	Id              int                   `json:"id" gorm:"column:id"`
	Status          int                   `json:"status" gorm:"column:status"`
	Name            string                `json:"name" gorm:"column:name"`
	Time            int                   `json:"time" gorm:"column:time"`
	EndTime         int                   `json:"end_time" gorm:"column:end_time"`
	Pos             int                   `json:"pos" gorm:"column:pos"`
	Target          []string              `json:"target" gorm:"column:target;serializer:json"`
	TargetUserNum   int                   `json:"target_user_num" gorm:"column:target_user_num"`
	CompleteUserNum int                   `json:"complete_user_num" gorm:"column:complete_user_num"`
	LeaveUserNum    int                   `json:"leave_user_num" gorm:"column:leave_user_num"`
	UserList        map[int]*TaskUserList `json:"user_list,omitempty" gorm:"column:user_list;serializer:json"`
	CreatedAt       int64                 `json:"created_at" gorm:"column:created_at"`
}

type TaskUserList struct {
	Id          int    `json:"id"`
	Name        string `json:"name"`
	Group       string `json:"group"`
	AtkNum      int    `json:"atk_num"`
	DisNum      int    `json:"dis_num"`
	AtkTeamNum  int    `json:"atk_team_num"`
	DisTeamNum  int    `json:"dis_team_num"`
	IsLeave     bool   `json:"is_leave"`
	LeaveReason string `json:"leave_reason"`
	LeaveTime   int64  `json:"leave_time"`
}

func (Task) TableName() string {
	return "task"
}

func TeamUserListToTaskUserList(data []TeamUser) map[int]*TaskUserList {
	taskUserList := map[int]*TaskUserList{}
	for _, user := range data {
		taskUserList[user.Id] = &TaskUserList{
			Id:         user.Id,
			Name:       user.Name,
			Group:      user.Group,
			AtkNum:     0,
			DisNum:     0,
			AtkTeamNum: 0,
			DisTeamNum: 0,
			IsLeave:    false,
		}
	}
	return taskUserList
}

func ToTaskPos(pos []string) int {
	if len(pos) != 2 {
		return 0
	}

	part1, err := strconv.Atoi(pos[0])
	if err != nil {
		return 0
	}

	part2, err := strconv.Atoi(pos[1])
	if err != nil {
		return 0
	}

	part2Str := fmt.Sprintf("%04d", part2)
	resultStr := fmt.Sprintf("%d%s", part1, part2Str)
	result, err := strconv.Atoi(resultStr)
	if err != nil {
		return 0
	}
	return result
}
