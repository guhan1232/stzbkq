package model

// RealtimeContext 5028 实时监控上下文（从包解析出的关键信息）
type RealtimeContext struct {
	MainID          string `json:"main_id"`
	AttackerName    string `json:"attacker_name"`
	AttackUnionName string `json:"attack_union_name"`
	Wid             string `json:"wid"`
	TargetWid       string `json:"target_wid"`
	ArriveTime      int64  `json:"arrive_time"`
}

// RealtimeMonitorPacket 5028 实时监控包（内存队列元素）
type RealtimeMonitorPacket struct {
	TS              int64            `json:"ts"`
	CmdID           int              `json:"cmd_id"`
	RawData         string           `json:"raw_data"`
	RealtimeContext *RealtimeContext `json:"realtime_context,omitempty"`
}

// RealtimeTeamResult 实时队伍查询结果（前端表格行）
type RealtimeTeamResult struct {
	ID              string                 `json:"id"`
	Side            string                 `json:"side"`
	Name            string                 `json:"name"`
	IDU             string                 `json:"idu"`
	PlayerName      string                 `json:"player_name"`
	AttackUnionName string                 `json:"attack_union_name"`
	Wid             string                 `json:"wid"`
	TargetWid       string                 `json:"target_wid"`
	ArriveTime      int64                  `json:"arrive_time"`
	ArriveTimeText  string                 `json:"arrive_time_text"`
	Formation       map[string]interface{} `json:"formation,omitempty"`
	Raw             map[string]interface{} `json:"raw,omitempty"`
}

// RealtimeWSMessage WebSocket 消息结构
type RealtimeWSMessage struct {
	Type      string                 `json:"type"`
	Packet    interface{}            `json:"packet,omitempty"`
	Timestamp int64                  `json:"timestamp,omitempty"`
	RequestID int                    `json:"request_id,omitempty"`
	Results   []*RealtimeTeamResult  `json:"results,omitempty"`
	Count     int                    `json:"count,omitempty"`
	Context   *RealtimeContext       `json:"realtime_context,omitempty"`
	Message   string                 `json:"message,omitempty"`
	Raw       map[string]interface{} `json:"raw,omitempty"`
}
