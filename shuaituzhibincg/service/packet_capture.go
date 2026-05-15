package service

import (
	"bytes"
	"compress/zlib"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcap"
	"io"
	"log"
	"strconv"
	"strings"
	"stzbHelper/database"
	"stzbHelper/global"
	"stzbHelper/model"
	"sync"
	"time"
)

// PacketData 数据包结构
type PacketData struct {
	Timestamp string `json:"timestamp"`
	CmdID     int    `json:"cmd_id"`
	SrcIP     string `json:"src_ip"`
	DstIP     string `json:"dst_ip"`
	Size      int    `json:"size"`
	Parsed    string `json:"parsed,omitempty"`
}

// CaptureStats 捕获统计
type CaptureStats struct {
	TotalPackets               int       `json:"total_packets"`
	StartTime                  time.Time `json:"start_time"`
	IsRunning                  bool      `json:"is_running"`
	Interfaces                 int       `json:"interfaces"`
	BattlefieldRealtimeEnabled bool      `json:"battlefield_realtime_enabled"`
}

var (
	capturedPackets []PacketData
	packetMutex     sync.Mutex
	stats           = CaptureStats{
		StartTime: time.Now(),
		IsRunning: false,
	}
	configPort = 8001

	// WebSocket客户端列表（用于实时推送）
	wsClients   []interface{}
	wsClientsMu sync.Mutex
)

// StartCapture 开始数据包捕获
func StartCapture() error {
	if stats.IsRunning {
		return fmt.Errorf("捕获已在运行中")
	}

	stats.IsRunning = true
	stats.StartTime = time.Now()
	stats.TotalPackets = 0
	capturedPackets = []PacketData{}

	// 获取网络接口
	devices, err := pcap.FindAllDevs()
	if err != nil {
		return fmt.Errorf("获取网络接口失败: %v", err)
	}

	var selectedDevices []string
	for _, device := range devices {
		if len(device.Addresses) > 0 {
			selectedDevices = append(selectedDevices, device.Name)
		}
	}

	if len(selectedDevices) == 0 {
		stats.IsRunning = false
		return fmt.Errorf("未找到可用的网络接口")
	}

	stats.Interfaces = len(selectedDevices)
	log.Printf("开始在 %d 个网络接口上捕获数据包", len(selectedDevices))

	// 启动捕获
	go captureMultiInterface(selectedDevices)

	return nil
}

// StopCapture 停止数据包捕获
func StopCapture() {
	stats.IsRunning = false
	log.Println("数据包捕获已停止")
}

// GetStats 获取捕获统计
func GetStats() CaptureStats {
	stats.BattlefieldRealtimeEnabled = global.ExVar.NeedGetBattlefieldRealtime
	return stats
}

// GetPackets 获取数据包列表
func GetPackets(limit int) []PacketData {
	packetMutex.Lock()
	defer packetMutex.Unlock()

	packets := capturedPackets
	if limit > 0 && len(packets) > limit {
		packets = packets[len(packets)-limit:]
	}

	// 返回副本
	result := make([]PacketData, len(packets))
	copy(result, packets)
	return result
}

func GetPacketsByCmdID(limit int, cmdID int) []PacketData {
	packetMutex.Lock()
	defer packetMutex.Unlock()

	packets := make([]PacketData, 0)
	for _, packet := range capturedPackets {
		if packet.CmdID == cmdID {
			packets = append(packets, packet)
		}
	}
	if limit > 0 && len(packets) > limit {
		packets = packets[len(packets)-limit:]
	}

	log.Printf("[battlefield-realtime] GetPacketsByCmdID: cmdID=%d, total=%d, returning=%d", cmdID, len(capturedPackets), len(packets))

	result := make([]PacketData, len(packets))
	copy(result, packets)
	return result
}

func ClearPacketsByCmdID(cmdID int) int {
	packetMutex.Lock()
	defer packetMutex.Unlock()

	kept := make([]PacketData, 0, len(capturedPackets))
	cleared := 0
	for _, packet := range capturedPackets {
		if packet.CmdID == cmdID {
			cleared++
			continue
		}
		kept = append(kept, packet)
	}
	capturedPackets = kept
	log.Printf("[battlefield-realtime] ClearPacketsByCmdID: cmdID=%d, cleared=%d, remaining=%d", cmdID, cleared, len(kept))
	return cleared
}

// captureMultiInterface 多接口捕获
func captureMultiInterface(deviceNames []string) {
	var wg sync.WaitGroup

	for _, deviceName := range deviceNames {
		wg.Add(1)
		go func(dev string) {
			defer wg.Done()
			captureSingleInterface(dev)
		}(deviceName)
	}

	wg.Wait()
}

// captureSingleInterface 单接口捕获
func captureSingleInterface(deviceName string) {
	handle, err := pcap.OpenLive(deviceName, 65535, true, pcap.BlockForever)
	if err != nil {
		log.Printf("无法打开接口 %s: %v", deviceName, err)
		return
	}
	defer handle.Close()

	filter := fmt.Sprintf("tcp and src port %d", configPort)
	err = handle.SetBPFFilter(filter)
	if err != nil {
		log.Printf("无法在接口 %s 上设置过滤器: %v", deviceName, err)
		return
	}

	packetSource := gopacket.NewPacketSource(handle, handle.LinkType())

	for packet := range packetSource.Packets() {
		if !stats.IsRunning {
			return
		}
		processPacket(packet)
	}
}

// processPacket 处理数据包
func processPacket(packet gopacket.Packet) {
	tcpLayer := packet.Layer(layers.LayerTypeTCP)
	if tcpLayer == nil {
		return
	}

	appLayer := packet.ApplicationLayer()
	if appLayer == nil {
		return
	}

	payload := appLayer.Payload()
	if len(payload) < 8 {
		return
	}

	buf := NewBufferFrom(payload)
	packetSize := buf.ReadInt()
	cmdID := buf.ReadInt()

	if cmdID == 5028 {
		log.Printf("[battlefield-realtime] 捕获到原始5028包: packet_size=%d payload_len=%d enabled=%v", packetSize, len(payload), global.ExVar.NeedGetBattlefieldRealtime)
	}

	if !shouldCaptureCmdID(cmdID) {
		if cmdID == 5028 {
			log.Printf("[battlefield-realtime] 跳过5028包: 战场实时监控未开启")
		}
		return
	}

	var srcIP, dstIP string
	if ipLayer := packet.NetworkLayer(); ipLayer != nil {
		switch ip := ipLayer.(type) {
		case *layers.IPv4:
			srcProt := int(tcpLayer.(*layers.TCP).SrcPort)
			dstProt := int(tcpLayer.(*layers.TCP).DstPort)
			srcIP = ip.SrcIP.String() + ":" + strconv.Itoa(srcProt)
			dstIP = ip.DstIP.String() + ":" + strconv.Itoa(dstProt)
		case *layers.IPv6:
			srcProt := int(tcpLayer.(*layers.TCP).SrcPort)
			dstProt := int(tcpLayer.(*layers.TCP).DstPort)
			srcIP = ip.SrcIP.String() + ":" + strconv.Itoa(srcProt)
			dstIP = ip.DstIP.String() + ":" + strconv.Itoa(dstProt)
		}
	}

	pktData := PacketData{
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		CmdID:     cmdID,
		SrcIP:     srcIP,
		DstIP:     dstIP,
		Size:      packetSize,
	}

	// 解析数据内容
	if len(payload) > 12 {
		dataType := payload[12]
		var parsedData []byte

		if dataType == 3 {
			parsedData = parseZlibData(payload[17:])
		} else if dataType == 2 {
			parsedData = payload[13:]
		} else if dataType == 5 {
			parsedData = []byte(DecodeType5(payload[12:]))
		}

		if parsedData != nil && len(parsedData) > 0 {
			rawJSON := string(parsedData)
			pktData.Parsed = rawJSON

			if cmdID == 5028 {
				pushCaptured5028MonitorPacket(rawJSON)
			}

			// 如果是6314数据包，保存原始JSON到数据库并格式化显示
			if cmdID == 6314 {
				// 保存原始数据到数据库（使用原始JSON）
				go save6314Data(rawJSON)
				// 格式化显示
				pktData.Parsed = format6314Data(rawJSON)
			}
		}
	}

	// 保存数据包
	packetMutex.Lock()
	capturedPackets = append(capturedPackets, pktData)
	stats.TotalPackets++
	currentCount := stats.TotalPackets
	packetMutex.Unlock()

	if cmdID == 5028 {
		log.Printf("[battlefield-realtime] 已缓存5028包: total_packets=%d src=%s dst=%s parsed_len=%d", currentCount, srcIP, dstIP, len(pktData.Parsed))
	}

	// 广播给WebSocket客户端
	broadcastPacket(pktData, currentCount)
}

func pushCaptured5028MonitorPacket(rawJSON string) {
	// 尝试作为 JSON 数组解析
	var rawData []interface{}
	if err := json.Unmarshal([]byte(rawJSON), &rawData); err != nil {
		// 标准 JSON 解析失败，尝试修复非标准格式（无引号的数字 key）
		fixed := fixNonStandardJSON(rawJSON)
		if fixed != rawJSON {
			if err2 := json.Unmarshal([]byte(fixed), &rawData); err2 != nil {
				log.Printf("[battlefield-realtime] 5028缓存包JSON解析失败(修复后仍失败): %v raw_prefix=%s", err2, truncateStr(rawJSON, 100))
				// 即使解析失败也推送空上下文的包，让前端自行处理
				packet := model.RealtimeMonitorPacket{
					TS:      time.Now().Unix(),
					CmdID:   5028,
					RawData: rawJSON,
				}
				PushProtocol5028MonitorPacket(packet)
				return
			}
		} else {
			log.Printf("[battlefield-realtime] 5028缓存包JSON解析失败: %v raw_prefix=%s", err, truncateStr(rawJSON, 100))
			packet := model.RealtimeMonitorPacket{
				TS:      time.Now().Unix(),
				CmdID:   5028,
				RawData: rawJSON,
			}
			PushProtocol5028MonitorPacket(packet)
			return
		}
	}

	ctx := extractCaptured5028Context(rawData)
	packet := model.RealtimeMonitorPacket{
		TS:              time.Now().Unix(),
		CmdID:           5028,
		RawData:         rawJSON,
		RealtimeContext: ctx,
	}
	PushProtocol5028MonitorPacket(packet)

	if ctx != nil && ctx.MainID != "" {
		log.Printf("[battlefield-realtime] 5028缓存包已进入处理队列: main_id=%s attacker=%s target=%s", ctx.MainID, ctx.AttackerName, ctx.TargetWid)
	} else if ctx != nil && ctx.AttackerName != "" {
		log.Printf("[battlefield-realtime] 5028缓存包已进入处理队列: main_id为空 attacker=%s target=%s", ctx.AttackerName, ctx.TargetWid)
	} else {
		log.Printf("[battlefield-realtime] 5028缓存包已进入处理队列: 上下文为空 raw_len=%d", len(rawJSON))
	}
}

func truncateStr(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// fixNonStandardJSON 修复非标准 JSON（数字 key 没有引号的情况）
// 例如: [{1:"value",...}] -> [{"1":"value",...}]
func fixNonStandardJSON(s string) string {
	// 快速检查是否包含非标准格式
	if !strings.Contains(s, "{") {
		return s
	}

	var result strings.Builder
	result.Grow(len(s) + 100)
	i := 0
	for i < len(s) {
		ch := s[i]
		if ch == '{' || ch == ',' {
			result.WriteByte(ch)
			i++
			// 跳过空白
			for i < len(s) && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n' || s[i] == '\r') {
				result.WriteByte(s[i])
				i++
			}
			// 检查是否是无引号的数字 key
			if i < len(s) && s[i] >= '0' && s[i] <= '9' {
				// 读取数字 key
				keyStart := i
				for i < len(s) && s[i] >= '0' && s[i] <= '9' {
					i++
				}
				// 检查后面是否跟着冒号
				if i < len(s) && s[i] == ':' {
					result.WriteByte('"')
					result.WriteString(s[keyStart:i])
					result.WriteByte('"')
				} else {
					result.WriteString(s[keyStart:i])
				}
			}
		} else {
			result.WriteByte(ch)
			i++
		}
	}
	return result.String()
}

func extractCaptured5028Context(rawData []interface{}) *model.RealtimeContext {
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

func shouldCaptureCmdID(cmdID int) bool {
	switch cmdID {
	case 2200, 6314:
		return true
	case 5028:
		return global.ExVar.NeedGetBattlefieldRealtime
	default:
		return false
	}
}

func EnableBattlefieldRealtimeCapture() {
	global.ExVar.NeedGetBattlefieldRealtime = true
	log.Println("[battlefield-realtime] 已开启战场实时监控抓包 (cmd 5028)")

	// 如果数据包捕获未运行，自动启动
	if !stats.IsRunning {
		log.Println("[battlefield-realtime] 数据包捕获未运行，自动启动...")
		if err := StartCapture(); err != nil {
			log.Printf("[battlefield-realtime] 自动启动捕获失败: %v", err)
		} else {
			log.Printf("[battlefield-realtime] 自动启动捕获成功, total_packets=%d, is_running=%v", stats.TotalPackets, stats.IsRunning)
		}
	} else {
		log.Printf("[battlefield-realtime] 捕获已在运行中, total_packets=%d", stats.TotalPackets)
	}
}

func DisableBattlefieldRealtimeCapture() {
	global.ExVar.NeedGetBattlefieldRealtime = false
	log.Println("[battlefield-realtime] 已关闭战场实时监控抓包")
}

// Buffer 字节缓冲区
type Buffer struct {
	Byte   []byte
	offset int
}

func NewBufferFrom(b []byte) *Buffer {
	return &Buffer{Byte: b, offset: 0}
}

func (bb *Buffer) ReadInt() int {
	if bb.offset+4 > len(bb.Byte) {
		return 0
	}
	value := binary.BigEndian.Uint32(bb.Byte[bb.offset : bb.offset+4])
	bb.offset += 4
	return int(value)
}

// DecodeType5 解码类型5的数据
func DecodeType5(data []byte) string {
	if len(data) > 0 && data[0] == 5 {
		result := make([]byte, len(data)-1)
		for index, value := range data[1:] {
			result[index] = value ^ 152
		}
		return string(result)
	}
	return ""
}

// format6314Data 格式化6314排行榜数据包数据
// 原始格式: [[499875,11536,"11321,11018,..."],[499876,14113,"11321,11018,..."],...]
// 格式化后更易读
func format6314Data(data string) string {
	// 尝试解析为JSON数组
	var records [][]interface{}
	if err := json.Unmarshal([]byte(data), &records); err != nil {
		// 如果解析失败，直接返回原始数据
		return data
	}

	// 格式化输出
	var result strings.Builder
	result.WriteString("6314 排行榜数据\n")
	result.WriteString(fmt.Sprintf("共 %d 条记录\n\n", len(records)))

	for i, record := range records {
		if len(record) >= 3 {
			timestamp := int(record[0].(float64))
			playerID := int(record[1].(float64))
			playerList := record[2].(string)

			// 计算玩家数量
			playerCount := 0
			if playerList != "" {
				playerCount = len(strings.Split(playerList, ","))
			}

			result.WriteString(fmt.Sprintf("[%d] 玩家ID: %d | 时间戳: %d | 联盟人数: %d\n",
				i+1, playerID, timestamp, playerCount))
			if playerList != "" {
				result.WriteString(fmt.Sprintf("    成员: %s\n", playerList))
			} else {
				result.WriteString("    成员: (空)\n")
			}
			result.WriteString("\n")
		}
	}

	return result.String()
}

// save6314Data 保存6314排行榜数据到数据库
func save6314Data(rawJSON string) {
	if rawJSON == "" || !global.ExVar.NeedGetLeaderboard {
		return
	}

	// 获取所有活跃的游戏数据库
	var dbList []database.GameDatabase
	if err := database.SystemDB.Where("status = 1").Find(&dbList).Error; err != nil {
		log.Printf("[6314-save] 查询游戏数据库列表失败: %v", err)
		return
	}

	if len(dbList) == 0 {
		return
	}

	// 保存到每个活跃的游戏数据库
	for _, gameDB := range dbList {
		go func(dbName string) {
			db, err := database.GetGameDB(dbName)
			if err != nil {
				log.Printf("[6314-save] 获取数据库[%s]连接失败: %v", dbName, err)
				return
			}

			model.SavePlayerTerritoryRankFromDecoded(rawJSON, 6314, db)
		}(gameDB.Name)
	}
}

// parseZlibData 解压缩zlib数据
func parseZlibData(data []byte) []byte {
	if len(data) >= 2 && data[0] == 120 && data[1] == 156 {
		return decompressZlib(data)
	}
	return data
}

// decompressZlib zlib解压缩
func decompressZlib(data []byte) []byte {
	compressedReader := bytes.NewReader(data)
	zlibReader, err := zlib.NewReader(compressedReader)
	if err != nil {
		log.Printf("创建zlib reader失败: %v", err)
		return []byte{}
	}
	defer zlibReader.Close()

	uncompressedData, err := io.ReadAll(zlibReader)
	if err != nil {
		log.Printf("读取解压数据失败: %v", err)
		return []byte{}
	}
	return uncompressedData
}

// broadcastPacket 广播数据包到WebSocket客户端
func broadcastPacket(packet PacketData, count int) {
	wsClientsMu.Lock()
	defer wsClientsMu.Unlock()

	// 这里需要通过WebSocket发送数据
	// 实际实现需要在HTTP handler中注册回调
	for _, client := range wsClients {
		// 发送数据给客户端
		_ = client
		_ = packet
		_ = count
	}
}

// RegisterWSClient 注册WebSocket客户端
func RegisterWSClient(client interface{}) {
	wsClientsMu.Lock()
	defer wsClientsMu.Unlock()
	wsClients = append(wsClients, client)
}

// UnregisterWSClient 注销WebSocket客户端
func UnregisterWSClient(client interface{}) {
	wsClientsMu.Lock()
	defer wsClientsMu.Unlock()

	for i, c := range wsClients {
		if c == client {
			wsClients = append(wsClients[:i], wsClients[i+1:]...)
			break
		}
	}
}

// ExportToCSV 导出为CSV格式
func ExportToCSV() (string, error) {
	packetMutex.Lock()
	defer packetMutex.Unlock()

	var csv strings.Builder
	csv.WriteString("时间戳,协议号,源IP,目标IP,数据包大小,解析内容\n")

	for _, pkt := range capturedPackets {
		// CSV转义
		parsed := strings.ReplaceAll(pkt.Parsed, "\"", "\"\"")
		if strings.ContainsAny(parsed, ",\"\n") {
			parsed = "\"" + parsed + "\""
		}

		csv.WriteString(fmt.Sprintf("%s,%d,%s,%s,%d,%s\n",
			pkt.Timestamp, pkt.CmdID, pkt.SrcIP, pkt.DstIP, pkt.Size, parsed))
	}

	return csv.String(), nil
}

// ExportToJSON 导出为JSON格式
func ExportToJSON() (string, error) {
	packetMutex.Lock()
	defer packetMutex.Unlock()

	// 简单的JSON格式化
	var json strings.Builder
	json.WriteString("[\n")

	for i, pkt := range capturedPackets {
		json.WriteString("  {\n")
		json.WriteString(fmt.Sprintf("    \"timestamp\": \"%s\",\n", pkt.Timestamp))
		json.WriteString(fmt.Sprintf("    \"cmd_id\": %d,\n", pkt.CmdID))
		json.WriteString(fmt.Sprintf("    \"src_ip\": \"%s\",\n", pkt.SrcIP))
		json.WriteString(fmt.Sprintf("    \"dst_ip\": \"%s\",\n", pkt.DstIP))
		json.WriteString(fmt.Sprintf("    \"size\": %d,\n", pkt.Size))
		if pkt.Parsed != "" {
			escaped := strings.ReplaceAll(pkt.Parsed, "\\", "\\\\")
			escaped = strings.ReplaceAll(escaped, "\"", "\\\"")
			json.WriteString(fmt.Sprintf("    \"parsed\": \"%s\"\n", escaped))
		} else {
			json.WriteString("    \"parsed\": \"\"\n")
		}

		if i < len(capturedPackets)-1 {
			json.WriteString("  },\n")
		} else {
			json.WriteString("  }\n")
		}
	}

	json.WriteString("]")

	return json.String(), nil
}
