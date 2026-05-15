package service

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"gorm.io/gorm"
	"stzbHelper/model"
)

const (
	Protocol5028MonitorMax = 500
	wsWriteWait            = 10 * time.Second
	wsPongWait             = 60 * time.Second
	wsPingPeriod           = 15 * time.Second
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
}

// UpgradeWS 将 HTTP 连接升级为 WebSocket
func UpgradeWS(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	return upgrader.Upgrade(w, r, nil)
}

// WSClient WebSocket 客户端连接
type WSClient struct {
	Conn   *websocket.Conn
	UserID uint
	DB     *gorm.DB
	Send   chan []byte
	hub    *WSHub
	mu     sync.Mutex
	closed bool
}

// WSHub WebSocket 连接管理中心
type WSHub struct {
	clients    map[*WSClient]bool
	register   chan *WSClient
	unregister chan *WSClient
	mu         sync.RWMutex
}

var (
	monitorHub     *WSHub
	monitorHubOnce sync.Once

	protocol5028Queue   []model.RealtimeMonitorPacket
	protocol5028QueueMu sync.Mutex
)

func GetMonitorHub() *WSHub {
	monitorHubOnce.Do(func() {
		monitorHub = &WSHub{
			clients:    make(map[*WSClient]bool),
			register:   make(chan *WSClient, 100),
			unregister: make(chan *WSClient, 100),
		}
		go monitorHub.run()
	})
	return monitorHub
}

func (h *WSHub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.mu.Lock()
				if !client.closed {
					client.closed = true
					close(client.Send)
				}
				client.mu.Unlock()
			}
			h.mu.Unlock()
		}
	}
}

// PushPacketToAllClients 将5028包推送至所有已连接客户端
func PushPacketToAllClients(packet model.RealtimeMonitorPacket, teamResults []*model.RealtimeTeamResult) {
	hub := GetMonitorHub()
	hub.mu.RLock()
	defer hub.mu.RUnlock()

	if len(hub.clients) == 0 {
		return
	}

	msg := model.RealtimeWSMessage{
		Type:      "protocol_5028",
		Packet:    packet,
		Timestamp: time.Now().UnixMilli(),
		Context:   packet.RealtimeContext,
		Results:   teamResults,
		Count:     len(teamResults),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[realtime-monitor] JSON序列化失败: %v", err)
		return
	}

	for client := range hub.clients {
		select {
		case client.Send <- data:
		default:
			go func(c *WSClient) { hub.unregister <- c }(client)
		}
	}
}

// PushProtocol5028MonitorPacket 将包加入内存队列并推送
func PushProtocol5028MonitorPacket(packet model.RealtimeMonitorPacket) {
	protocol5028QueueMu.Lock()
	protocol5028Queue = append(protocol5028Queue, packet)
	if len(protocol5028Queue) > Protocol5028MonitorMax {
		protocol5028Queue = protocol5028Queue[len(protocol5028Queue)-Protocol5028MonitorMax:]
	}
	queueLen := len(protocol5028Queue)
	protocol5028QueueMu.Unlock()

	mainID := ""
	attackerName := ""
	if packet.RealtimeContext != nil {
		mainID = packet.RealtimeContext.MainID
		attackerName = packet.RealtimeContext.AttackerName
	}
	log.Printf("[realtime-monitor] 收到5028包: main_id=%s, attacker=%s, queue_len=%d", mainID, attackerName, queueLen)

	// 尝试构建队伍结果
	var teamResults []*model.RealtimeTeamResult
	if packet.RealtimeContext != nil && (packet.RealtimeContext.MainID != "" || packet.RealtimeContext.AttackerName != "") {
		teamResults = searchRealtimeTeamsFromAllDBs(packet.RealtimeContext, packet.RealtimeContext.AttackerName)
		log.Printf("[realtime-monitor] 推送队伍结果: team_count=%d", len(teamResults))
	} else {
		log.Printf("[realtime-monitor] 无有效RealtimeContext，跳过搜索")
	}

	PushPacketToAllClients(packet, teamResults)
}

// GetProtocol5028MonitorPackets 获取内存队列中的包
func GetProtocol5028MonitorPackets(limit int) []model.RealtimeMonitorPacket {
	protocol5028QueueMu.Lock()
	defer protocol5028QueueMu.Unlock()

	queue := protocol5028Queue
	if limit > 0 && len(queue) > limit {
		queue = queue[len(queue)-limit:]
	}
	result := make([]model.RealtimeMonitorPacket, len(queue))
	copy(result, queue)
	return result
}

// ClearProtocol5028MonitorPackets 清空内存队列
func ClearProtocol5028MonitorPackets() int {
	protocol5028QueueMu.Lock()
	defer protocol5028QueueMu.Unlock()
	count := len(protocol5028Queue)
	protocol5028Queue = nil
	return count
}

// ReplayProtocol5028MonitorPacketsToClient 向指定客户端重放最近的5028监控包
func ReplayProtocol5028MonitorPacketsToClient(client *WSClient, limit int) int {
	if client == nil || client.Send == nil {
		return 0
	}

	packets := GetProtocol5028MonitorPackets(limit)
	if len(packets) == 0 {
		return 0
	}

	sent := 0
	for _, packet := range packets {
		var teamResults []*model.RealtimeTeamResult
		if packet.RealtimeContext != nil && packet.RealtimeContext.MainID != "" {
			teamResults = searchRealtimeTeamsFromAllDBs(packet.RealtimeContext, "")
		}

		msg := model.RealtimeWSMessage{
			Type:      "protocol_5028",
			Packet:    packet,
			Timestamp: time.Now().UnixMilli(),
			Context:   packet.RealtimeContext,
			Results:   teamResults,
			Count:     len(teamResults),
		}

		data, err := json.Marshal(msg)
		if err != nil {
			continue
		}

		select {
		case client.Send <- data:
			sent++
		default:
			return sent
		}
	}

	log.Printf("[realtime-monitor] 重放5028包到客户端: user_id=%d, count=%d", client.UserID, sent)
	return sent
}

// searchRealtimeTeamsFromAllDBs 从所有活跃数据库中搜索队伍
func searchRealtimeTeamsFromAllDBs(ctx *model.RealtimeContext, playerName string) []*model.RealtimeTeamResult {
	hub := GetMonitorHub()
	hub.mu.RLock()
	defer hub.mu.RUnlock()

	seen := make(map[string]bool)
	var results []*model.RealtimeTeamResult

	for client := range hub.clients {
		if client.DB == nil {
			continue
		}
		// 先按 main_id 搜索
		dbResults := searchRealtimeTeams(client.DB, ctx, "", 50)
		// 如果 main_id 没结果且有玩家名，按玩家名搜索
		if len(dbResults) == 0 && playerName != "" {
			dbResults = searchRealtimeTeams(client.DB, nil, playerName, 50)
		}
		for _, r := range dbResults {
			key := buildTeamIdentityKey(r)
			if !seen[key] {
				seen[key] = true
				results = append(results, r)
			}
		}
	}
	return results
}

// searchRealtimeTeams 从数据库BattleReport表中搜索队伍
func searchRealtimeTeams(db *gorm.DB, ctx *model.RealtimeContext, playerName string, limit int) []*model.RealtimeTeamResult {
	var reports []model.BattleReport
	query := db.Model(&model.BattleReport{}).Where("npc = 0")

	if ctx != nil && ctx.MainID != "" {
		mainID := ctx.MainID
		query = query.Where(
			"attack_idu LIKE ? OR defend_idu LIKE ? OR attack_idu = ? OR defend_idu = ?",
			mainID+",%", mainID+",%", mainID, mainID,
		)
	}
	if playerName != "" {
		query = query.Where("attack_name LIKE ? OR defend_name LIKE ?", "%"+playerName+"%", "%"+playerName+"%")
	}
	if ctx != nil && ctx.AttackUnionName != "" {
		query = query.Where("attack_union_name LIKE ?", "%"+ctx.AttackUnionName+"%")
	}

	query.Order("time DESC").Limit(limit).Find(&reports)

	seen := make(map[string]bool)
	var results []*model.RealtimeTeamResult

	for i := range reports {
		r := &reports[i]
		// 进攻方
		atk := battleReportToTeamResult(r, "attack", ctx)
		if atk != nil {
			key := buildTeamIdentityKey(atk)
			if !seen[key] {
				seen[key] = true
				results = append(results, atk)
			}
		}
		// 防守方
		def := battleReportToTeamResult(r, "defend", ctx)
		if def != nil {
			key := buildTeamIdentityKey(def)
			if !seen[key] {
				seen[key] = true
				results = append(results, def)
			}
		}
	}
	return results
}

// battleReportToTeamResult 将 BattleReport 转为 RealtimeTeamResult
func battleReportToTeamResult(r *model.BattleReport, role string, ctx *model.RealtimeContext) *model.RealtimeTeamResult {
	var playerName, unionName, idu, heroType, allSkillInfo, gearInfo string
	var hero1ID, hero2ID, hero3ID int64
	var hero1Level, hero2Level, hero3Level int64
	var hero1Star, hero2Star, hero3Star int64

	if role == "attack" {
		playerName = r.AttackName
		unionName = r.AttackUnionName
		idu = r.AttackIdu
		heroType = r.AttackHeroType
		allSkillInfo = r.AllSkillInfo
		gearInfo = r.AttackerGearInfo
		hero1ID, hero2ID, hero3ID = r.AttackHero1Id, r.AttackHero2Id, r.AttackHero3Id
		hero1Level, hero2Level, hero3Level = r.AttackHero1Level, r.AttackHero2Level, r.AttackHero3Level
		hero1Star, hero2Star, hero3Star = r.AttackHero1Star, r.AttackHero2Star, r.AttackHero3Star
	} else {
		playerName = r.DefendName
		unionName = r.DefendUnionName
		idu = r.DefendIdu
		heroType = r.DefendHeroType
		allSkillInfo = ""
		gearInfo = r.DefenderGearInfo
		hero1ID, hero2ID, hero3ID = r.DefendHero1Id, r.DefendHero2Id, r.DefendHero3Id
		hero1Level, hero2Level, hero3Level = r.DefendHero1Level, r.DefendHero2Level, r.DefendHero3Level
		hero1Star, hero2Star, hero3Star = r.DefendHero1Star, r.DefendHero2Star, r.DefendHero3Star
	}

	if playerName == "" {
		return nil
	}

	arriveTime := int64(0)
	if ctx != nil {
		arriveTime = ctx.ArriveTime
	}

	result := &model.RealtimeTeamResult{
		ID:              fmt.Sprintf("%s_%d_%d", role, r.BattleId, r.ID),
		Side:            role,
		Name:            playerName,
		IDU:             idu,
		PlayerName:      playerName,
		AttackUnionName: unionName,
		ArriveTime:      arriveTime,
		ArriveTimeText:  formatArriveTime(arriveTime),
		Formation:       buildFormation(hero1ID, hero1Level, hero1Star, hero2ID, hero2Level, hero2Star, hero3ID, hero3Level, hero3Star, heroType, allSkillInfo, gearInfo),
		Raw: map[string]interface{}{
			"battle_id": r.BattleId,
			"time":      r.Time,
			"hp":        map[string]int64{"attack": r.AttackHp, "defend": r.DefendHp},
		},
	}

	if ctx != nil {
		result.Wid = ctx.Wid
		result.TargetWid = ctx.TargetWid
		if result.AttackUnionName == "" {
			result.AttackUnionName = ctx.AttackUnionName
		}
	}

	return result
}

func buildFormation(hero1ID, hero1Level, hero1Star, hero2ID, hero2Level, hero2Star, hero3ID, hero3Level, hero3Star int64, heroType, allSkillInfo, gearInfo string) map[string]interface{} {
	formation := make(map[string]interface{})

	formation["front"] = map[string]interface{}{
		"main_hero": map[string]interface{}{"id": hero3ID},
		"sub_hero":  map[string]interface{}{"id": 0},
		"skills":    []interface{}{},
		"level":     hero3Level,
		"star":      hero3Star,
	}
	formation["middle"] = map[string]interface{}{
		"main_hero": map[string]interface{}{"id": hero2ID},
		"sub_hero":  map[string]interface{}{"id": 0},
		"skills":    []interface{}{},
		"level":     hero2Level,
		"star":      hero2Star,
	}
	formation["back"] = map[string]interface{}{
		"main_hero": map[string]interface{}{"id": hero1ID},
		"sub_hero":  map[string]interface{}{"id": 0},
		"skills":    []interface{}{},
		"level":     hero1Level,
		"star":      hero1Star,
	}

	if heroType != "" {
		types := strings.Split(heroType, ",")
		for i, t := range types {
			pos := ""
			switch i {
			case 0:
				pos = "back"
			case 1:
				pos = "middle"
			case 2:
				pos = "front"
			}
			if pos != "" {
				if slot, ok := formation[pos].(map[string]interface{}); ok {
					slot["hero_type"] = t
				}
			}
		}
	}

	if allSkillInfo != "" {
		parseSkillsIntoFormation(formation, allSkillInfo)
	}

	formation["gear_info"] = gearInfo
	return formation
}

func parseSkillsIntoFormation(formation map[string]interface{}, skillInfo string) {
	parts := strings.Split(skillInfo, "|")
	posOrder := []string{"back", "middle", "front"}
	for i, part := range parts {
		if i >= 3 || part == "" {
			break
		}
		skillIDs := strings.Split(part, ",")
		var skills []interface{}
		for _, sid := range skillIDs {
			sid = strings.TrimSpace(sid)
			if sid != "" && sid != "0" {
				skills = append(skills, map[string]interface{}{"id": sid})
			}
		}
		if len(skills) > 0 {
			if slot, ok := formation[posOrder[i]].(map[string]interface{}); ok {
				slot["skills"] = skills
			}
		}
	}
}

func buildTeamIdentityKey(r *model.RealtimeTeamResult) string {
	parts := []string{r.AttackUnionName, r.PlayerName}
	positions := []string{"front", "middle", "back"}
	for _, pos := range positions {
		if r.Formation != nil {
			if slot, ok := r.Formation[pos].(map[string]interface{}); ok {
				mainHero := fmt.Sprintf("%v", getSlotField(slot, "main_hero", "id"))
				subHero := fmt.Sprintf("%v", getSlotField(slot, "sub_hero", "id"))
				var skillIDs []string
				if skills, ok := slot["skills"].([]interface{}); ok {
					for _, s := range skills {
						if sm, ok := s.(map[string]interface{}); ok {
							skillIDs = append(skillIDs, fmt.Sprintf("%v", sm["id"]))
						}
					}
				}
				parts = append(parts, fmt.Sprintf("%s:%s/%s/%s", pos, mainHero, subHero, strings.Join(skillIDs, "|")))
			}
		}
	}
	return strings.Join(parts, "||")
}

func getSlotField(slot map[string]interface{}, key, subkey string) interface{} {
	if v, ok := slot[key].(map[string]interface{}); ok {
		return v[subkey]
	}
	return 0
}

// SearchRealtimeTeamsForClient 为特定客户端搜索队伍
func SearchRealtimeTeamsForClient(client *WSClient, side, mainID, playerName string, limit int) ([]*model.RealtimeTeamResult, int) {
	if client.DB == nil {
		return nil, 0
	}

	var ctx *model.RealtimeContext
	if mainID != "" {
		ctx = &model.RealtimeContext{MainID: mainID}
	}

	results := searchRealtimeTeams(client.DB, ctx, playerName, limit)
	return DedupeTeamResults(results), len(results)
}

// SearchRealtimeTeamsForHTTP HTTP 回退搜索队伍
func SearchRealtimeTeamsForHTTP(db *gorm.DB, ctx *model.RealtimeContext, playerName string, limit int) ([]*model.RealtimeTeamResult, int) {
	mainID := ""
	if ctx != nil {
		mainID = ctx.MainID
	}
	log.Printf("[realtime-monitor] HTTP搜索队伍: mainID=%s, playerName=%s, limit=%d", mainID, playerName, limit)
	results := searchRealtimeTeams(db, ctx, playerName, limit)
	log.Printf("[realtime-monitor] HTTP搜索队伍原始结果: %d条", len(results))
	deduped := DedupeTeamResults(results)
	log.Printf("[realtime-monitor] HTTP搜索队伍去重后: %d条", len(deduped))
	return deduped, len(deduped)
}

func formatArriveTime(ts int64) string {
	if ts == 0 {
		return "--"
	}
	t := time.Unix(ts, 0)
	return t.Format("2006-01-02 15:04:05")
}

// NewWSClient 创建新的 WebSocket 客户端
func NewWSClient(conn *websocket.Conn, userID uint, db *gorm.DB) *WSClient {
	hub := GetMonitorHub()
	client := &WSClient{
		Conn:   conn,
		UserID: userID,
		DB:     db,
		Send:   make(chan []byte, 256),
		hub:    hub,
	}
	hub.register <- client
	return client
}

// ReadPump 从 WebSocket 读取消息
func (c *WSClient) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(wsPongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(wsPongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		msgType, _ := msg["type"].(string)
		switch msgType {
		case "ping":
			c.Send <- []byte(fmt.Sprintf(`{"type":"pong","timestamp":%d}`, time.Now().UnixMilli()))
		case "search_team":
			mainID, _ := msg["main_id"].(string)
			playerName, _ := msg["player_name"].(string)
			side, _ := msg["side"].(string)
			reqID, _ := msg["request_id"].(float64)

			results, count := SearchRealtimeTeamsForClient(c, side, mainID, playerName, 100)

			var ctx *model.RealtimeContext
			if mainID != "" {
				ctx = &model.RealtimeContext{MainID: mainID}
			}

			resp := model.RealtimeWSMessage{
				Type:      "protocol_5028_search_result",
				RequestID: int(reqID),
				Results:   results,
				Count:     count,
				Context:   ctx,
			}
			respData, _ := json.Marshal(resp)
			c.Send <- respData
		}
	}
}

// WritePump 向 WebSocket 写入消息
func (c *WSClient) WritePump() {
	ticker := time.NewTicker(wsPingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(wsWriteWait))
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(wsWriteWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// 将规范化的队伍结果按 identity key 去重，保留最新的
func DedupeTeamResults(rows []*model.RealtimeTeamResult) []*model.RealtimeTeamResult {
	seen := make(map[string]int)
	var result []*model.RealtimeTeamResult

	for i, row := range rows {
		key := buildTeamIdentityKey(row)
		if prevIdx, exists := seen[key]; exists {
			// 保留较新的
			if row.ArriveTime > rows[prevIdx].ArriveTime {
				result[prevIdx] = row
			}
		} else {
			seen[key] = i
			result = append(result, row)
		}
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].ArriveTime < result[j].ArriveTime
	})
	return result
}
