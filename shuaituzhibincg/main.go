package main

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcap"
	"stzbHelper/config"
	"stzbHelper/database"
	"stzbHelper/global"
	"stzbHelper/model"
	"stzbHelper/service"
)

var databaseSelected bool = false

func initLogOutput() {
	logFile, err := os.OpenFile("stzbhelper.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		log.Printf("日志文件打开失败: %v", err)
		return
	}
	log.SetOutput(io.MultiWriter(os.Stdout, logFile))
	log.SetFlags(log.LstdFlags | log.Lshortfile)
}

func main() {
	initLogOutput()
	config.InitConfig()
	database.InitSystemDB()

	// 执行数据迁移
	service.InitTaskCreatedAt()

	// 启动数据清理服务
	cleanupService := service.NewCleanupService()
	cleanupService.Start()
	defer cleanupService.Stop()

	// 启动每日报告服务
	dailyReportService := service.NewDailyReportService()
	dailyReportService.Start()
	defer dailyReportService.Stop()

	devices, err := pcap.FindAllDevs()
	if err != nil {
		log.Fatal("无法获取网络接口列表:", err)
	}

	if len(devices) == 0 {
		log.Fatal("未找到可用的网络接口")
	}

	if global.IsDebug == true {
		fmt.Println("可用的网络接口:")
		for i, device := range devices {
			fmt.Printf("%d: %s (%s)\n", i+1, device.Name, device.Description)
		}
	}

	var wg sync.WaitGroup
	go StartHttpService(&wg)
	wg.Add(1)
	log.Println("stzbHelper开始运行!")
	log.Println("version:", global.Version)
	time.Sleep(100 * time.Millisecond)
	log.Println("等待打开主公簿激活软件...")
	log.Println("未打开主公簿激活软件前软件可能会出现报错！")

	for _, device := range devices {
		wg.Add(1)
		go captureTCPPackets(device.Name, &wg)
	}
	wg.Wait()
}

func captureTCPPackets(deviceName string, wg *sync.WaitGroup) {
	defer wg.Done()

	handle, err := pcap.OpenLive(deviceName, 65535, true, pcap.BlockForever)
	if err != nil {
		log.Printf("无法打开接口 %s: %v\n", deviceName, err)
		return
	}
	defer handle.Close()

	filter := "tcp and src port 8001"
	err = handle.SetBPFFilter(filter)
	if err != nil {
		log.Printf("无法在接口 %s 上设置过滤器: %v\n", deviceName, err)
		return
	}
	packetSource := gopacket.NewPacketSource(handle, handle.LinkType())

	if global.IsDebug == true {
		fmt.Printf("开始在接口 %s 上捕获 TCP 数据包（端口 8001）...\n", deviceName)
	}
	for packet := range packetSource.Packets() {
		handlePacket(packet, deviceName)
	}
}

type ConnState struct {
	WaitBuf      bool
	FullBuf      []byte
	PacketLoss   bool
	LossCmdId    int
	LossBytes    []byte
	NeedBufSize  int
	LostSegCount int
	DeviceName   string
	ReasmKey     string
	LastTCPSeq   uint32
	LastSegHash  string
}

var (
	connStates = make(map[string]*ConnState)
	connMutex  sync.Mutex
)

func getDevicePriority(name string) int {
	if config.AppConfig == nil || len(config.AppConfig.DevicePriority) == 0 {
		return 0
	}
	for i, v := range config.AppConfig.DevicePriority {
		if strings.Contains(name, v) {
			// 返回值越大优先级越高
			return len(config.AppConfig.DevicePriority) - i
		}
	}
	return -1 // 未匹配到的优先级最低
}

func getConnState(key string, deviceName string) *ConnState {
	connMutex.Lock()
	defer connMutex.Unlock()
	if state, ok := connStates[key]; ok {
		return state
	}
	state := &ConnState{
		DeviceName: deviceName,
	}
	connStates[key] = state
	return state
}

var dbSelectMutex sync.Mutex

// seenPackets 用于去重已完整解析过的包（按 payload hash 去重，避免多网卡重复解析）
var (
	seenPackets = make(map[string]bool)
	seenMutex   sync.Mutex
)

// checkAndMarkPacket 检查是否已经处理过这个包，防止多网卡重复解析
// 返回 true 表示重复，应该跳过；返回 false 表示新包，可以处理
func checkAndMarkPacket(dataHash string) bool {
	seenMutex.Lock()
	defer seenMutex.Unlock()
	if seenPackets[dataHash] {
		return true
	}
	seenPackets[dataHash] = true
	if len(seenPackets) > 1000 {
		seenPackets = make(map[string]bool)
	}
	return false
}

var (
	activeReassemblies = make(map[string]bool)
	activeReasmMutex   sync.Mutex
)

func checkAndMarkActiveReassembly(key string) bool {
	activeReasmMutex.Lock()
	defer activeReasmMutex.Unlock()
	if activeReassemblies[key] {
		return true
	}
	activeReassemblies[key] = true
	if len(activeReassemblies) > 500 {
		activeReassemblies = make(map[string]bool)
	}
	return false
}

func clearActiveReassembly(key string) {
	activeReasmMutex.Lock()
	defer activeReasmMutex.Unlock()
	delete(activeReassemblies, key)
}

// isPacketLossCmd 判断 cmdId 是否为需要丢包重组的大包协议号
func isPacketLossCmd(cmdId int) bool {
	return cmdId == 103 || cmdId == 92 || cmdId == 700 || cmdId == 514 || cmdId == 6314 || cmdId == 724 || cmdId == 3788
}

func handlePacket(packet gopacket.Packet, deviceName string) {
	if tcpLayer := packet.Layer(layers.LayerTypeTCP); tcpLayer != nil {
		if appLayer := packet.ApplicationLayer(); appLayer != nil {
			PSH := tcpLayer.(*layers.TCP).PSH
			tcpSeq := tcpLayer.(*layers.TCP).Seq
			payload := appLayer.Payload()
			if len(payload) < 8 {
				return
			}
			var srcIP string
			var dstIP string
			var srcProt int
			var dstProt int
			if ipLayer := packet.NetworkLayer(); ipLayer != nil {
				switch ip := ipLayer.(type) {
				case *layers.IPv4:
					srcProt = int(tcpLayer.(*layers.TCP).SrcPort)
					dstProt = int(tcpLayer.(*layers.TCP).DstPort)
					srcIP = ip.SrcIP.String() + ":" + strconv.Itoa(srcProt)
					dstIP = ip.DstIP.String() + ":" + strconv.Itoa(dstProt)
				case *layers.IPv6:
					srcProt = int(tcpLayer.(*layers.TCP).SrcPort)
					dstProt = int(tcpLayer.(*layers.TCP).DstPort)
					srcIP = ip.SrcIP.String() + ":" + strconv.Itoa(srcProt)
					dstIP = ip.DstIP.String() + ":" + strconv.Itoa(dstProt)
				}
			}

			// 识别到游戏连接后自动启用 IP 过滤，避免多网卡重复抓包
			// 当启用 MultiUserMode 时，不再根据单一 IP 进行过滤，而是通过包去重机制处理
			if !global.MultiUserMode && global.OnlySrcIp != "" && global.OnlyDstIp != "" {
				if global.OnlySrcIp != srcIP || global.OnlyDstIp != dstIP {
					return
				}
				// 限制只在锁定的网卡上抓包，彻底避免多网卡并发重复抓包导致的重组混乱
				if global.OnlyDevice != "" && global.OnlyDevice != deviceName {
					return
				}
			}

			// 使用IP对作为唯一键，确保同一连接只在一个网卡上处理
			connKey := srcIP + "|" + dstIP
			state := getConnState(connKey, deviceName)

			// 检查是否需要切换网卡
			connMutex.Lock()
			if state.DeviceName != deviceName {
				if state.PacketLoss {
					connMutex.Unlock()
					return
				}

				currentPriority := getDevicePriority(deviceName)
				boundPriority := getDevicePriority(state.DeviceName)

				if currentPriority > boundPriority {
					if global.IsDebug {
						log.Printf("[priority] 连接 %s 切换到更高优先级网卡: %s -> %s", connKey, state.DeviceName, deviceName)
					}
					if state.ReasmKey != "" {
						clearActiveReassembly(state.ReasmKey)
					}
					state.DeviceName = deviceName
					state.WaitBuf = false
					state.FullBuf = nil
					state.PacketLoss = false
					state.LossBytes = nil
					state.LossCmdId = 0
					state.NeedBufSize = 0
					state.LostSegCount = 0
					state.ReasmKey = ""
					connMutex.Unlock()
				} else {
					connMutex.Unlock()
					return
				}
			} else {
				connMutex.Unlock()
			}

			var buf []byte
			connMutex.Lock()
			if PSH != true {
				state.WaitBuf = true
				state.FullBuf = append(state.FullBuf, payload...)
				connMutex.Unlock()
				return
			} else {
				if state.WaitBuf == true {
					state.WaitBuf = false
					buf = append(state.FullBuf, payload...)
					state.FullBuf = nil
				} else {
					buf = payload
				}
			}
			connMutex.Unlock()

			// 优先处理丢包重组（针对当前连接）
			// 在锁内完成整个读-改-写操作，避免多网卡并发导致竞态条件
			connMutex.Lock()
			if state.PacketLoss {
				if state.DeviceName != deviceName {
					connMutex.Unlock()
					return
				}
				// LastTCPSeq 记录已接受段的末端 seq（即下一个合法新包应有的 seq）。
				// 任何 tcpSeq < LastTCPSeq 的包都是已覆盖区间内的重传/乱序，必须丢弃，
				// 否则旧包会被误判为新数据再次拼接，污染重组流。
				if tcpSeq < state.LastTCPSeq {
					connMutex.Unlock()
					log.Printf("[%s] [packet-reassembly] 跳过乱序/重传包 seq=%d (lastEnd=%d) cmd=%d", deviceName, tcpSeq, state.LastTCPSeq, state.LossCmdId)
					return
				}
				segHash := fmt.Sprintf("%x", buf[:min(20, len(buf))])
				if segHash == state.LastSegHash {
					connMutex.Unlock()
					log.Printf("[%s] [packet-reassembly] 跳过重复数据段 cmd=%d", deviceName, state.LossCmdId)
					return
				}
				state.LastTCPSeq = tcpSeq + uint32(len(buf))
				state.LastSegHash = segHash
				lossCmdId := state.LossCmdId
				needBufSize := state.NeedBufSize
				expectedLen := needBufSize + 4
				currentLen := len(state.LossBytes)
				bytesNeeded := expectedLen - currentLen

				appendData := buf

				// 检测后续段是否包含协议头
				// 游戏协议在每个TCP段前都加了17字节头：[4B size][4B cmdId][4B ?][1B type][4B ?]
				// 通过 buf[12] == 3（zlib压缩类型标记）来判断是否有协议头
				if len(buf) > 17 && buf[12] == 3 {
					segCmdId := int(binary.BigEndian.Uint32(buf[4:8]))
					log.Printf("[%s] [packet-reassembly] 后续段包含协议头(段cmd=%d, 目标cmd=%d)，跳过17字节头", deviceName, segCmdId, lossCmdId)
					appendData = buf[17:]
				} else if len(buf) > 8 {
					// 没有检测到协议头，记录前20字节用于诊断
					diagLen := min(20, len(buf))
					log.Printf("[%s] [packet-reassembly] 后续段无协议头标记(buf[12]=%d)，直接拼接，前%d字节=%x", deviceName, buf[12], diagLen, buf[:diagLen])
				}

				if len(appendData) > bytesNeeded {
					appendData = appendData[:bytesNeeded]
				}

				result := make([]byte, len(appendData)+len(state.LossBytes))
				copy(result, state.LossBytes)
				copy(result[len(state.LossBytes):], appendData)

				if len(result) < expectedLen {
					state.LostSegCount++
					segCount := state.LostSegCount
					state.LossBytes = result
					connMutex.Unlock()
					log.Printf("[%s] [packet-reassembly] 重组中 cmd=%d 段=%d 当前长度=%d 预期长度=%d", deviceName, lossCmdId, segCount, len(result), expectedLen)
				} else {
					segCount := state.LostSegCount + 1
					state.PacketLoss = false
					state.LossBytes = nil
					state.LossCmdId = 0
					state.NeedBufSize = 0
					state.LostSegCount = 0
					state.ReasmKey = ""
					connMutex.Unlock()
					// 不立即清除 activeReassemblies，防止同一数据包被重复重组
					// map 超过 500 条时会自动清理

					log.Printf("[%s] [packet-reassembly] 重组完成 cmd=%d 段=%d 总长=%d", deviceName, lossCmdId, segCount, len(result))

					if len(result) > 17 {
						data := result[17:]
						hash := fmt.Sprintf("%d-%d-%x", lossCmdId, len(data), data[:min(8, len(data))])
						if checkAndMarkPacket(hash) {
							if global.IsDebug {
								log.Printf("[dedup] 跳过重复重组包 cmd=%d", lossCmdId)
							}
						} else {
							// 解决多网卡重组导致数据重复的问题：提取 IP 部分用于 DB 映射
							ipOnly := dstIP
							if idx := strings.LastIndex(ipOnly, ":"); idx != -1 {
								ipOnly = ipOnly[:idx]
							}
							go ParseData(lossCmdId, data, ipOnly)
						}
					}
				}
				return // 当前数据包已作为重组分片处理，直接返回
			}
			connMutex.Unlock()

			if global.IsDebug == true {
				fmt.Println("")
				fmt.Println("====================================================")
				fmt.Println("")
			}
			bufread := NewBufferFrom(buf)
			bufsize := bufread.ReadInt()
			if global.IsDebug == true {
				fmt.Println("包大小", bufsize)
			}
			cmdId := bufread.ReadInt()
			if global.IsDebug == true {
				fmt.Println("协议号", cmdId)
			}

			if len(buf) > 14 {
				if global.IsDebug == true {
					fmt.Println("数据类型", buf[12])
				}

				if buf[12] == 3 {
					if len(buf)-bufsize != 4 {
						if isPacketLossCmd(cmdId) {
							reasmKey := fmt.Sprintf("%d-%d-%x", cmdId, bufsize+4, buf[:min(8, len(buf))])
							if checkAndMarkActiveReassembly(reasmKey) {
								return
							}
							connMutex.Lock()
							if state.DeviceName != deviceName {
								clearActiveReassembly(reasmKey)
								connMutex.Unlock()
								return
							}
							log.Printf("[%s] [packet-reassembly] 检测到丢包 cmd=%d 包长=%d 预期=%d", deviceName, cmdId, len(buf), bufsize+4)
							state.PacketLoss = true
							state.LossCmdId = cmdId
							state.LossBytes = make([]byte, len(buf))
							copy(state.LossBytes, buf)
							state.NeedBufSize = bufsize
							state.LostSegCount = 1
							state.ReasmKey = reasmKey
							state.LastTCPSeq = tcpSeq + uint32(len(buf))
							state.LastSegHash = fmt.Sprintf("%x", buf[:min(20, len(buf))])
							connMutex.Unlock()
						} else {
							if global.IsDebug {
								log.Printf("[%s] [packet-reassembly] 未支持的丢包重组 cmd=%d 包长=%d 预期=%d，跳过", deviceName, cmdId, len(buf), bufsize+4)
							}
						}
					} else {
						if len(buf) > 17 {
							data := buf[17:]
							hash := fmt.Sprintf("%d-%d-%x", cmdId, len(data), data[:min(8, len(data))])
							if checkAndMarkPacket(hash) {
								if global.IsDebug {
									log.Printf("[dedup] 跳过重复包 cmd=%d", cmdId)
								}
							} else {
								go ParseData(cmdId, data, dstIP)
							}
						}
					}

				} else if buf[12] == 5 {
					if len(buf) > 17 {
						data := []byte(DecodeType5(buf[12:]))
						if len(data) > 0 {
							hash := fmt.Sprintf("%d-%d-%x", cmdId, len(data), data[:min(8, len(data))])
							if !checkAndMarkPacket(hash) {
								go ParseData(cmdId, data, dstIP)
							}
						}
					}
				} else if buf[12] == 2 {
				}

				if cmdId == 3686 && databaseSelected == false {
					var data []byte
					if len(buf) > 17 {
						if buf[12] == 5 {
							data = []byte(DecodeType5(buf[12:]))
						} else if buf[12] == 3 {
							data = parseZlibData(buf[17:])
						}
					}
					var raw []interface{}
					err := json.Unmarshal([]byte(data), &raw)
					if err != nil {
						log.Fatal(err)
					} else {
						dataMap := raw[1].(map[string]interface{})
						server, ok := dataMap["server"].([]interface{})
						if ok {
							log.Printf("服务器信息: %v\n", server)
						}

						var roleName string
						if logData, ok := dataMap["log"].(map[string]interface{}); ok {
							roleName = logData["role_name"].(string)
							log.Printf("角色名: %s\n", roleName)
						}

						dbSelectMutex.Lock()
						// 如果如果是多用户模式，只要解析到新角色就可以建立对应的数据连接
						// 如果之前没选中过任何数据库，或者正在以多用户模式运行
						if !databaseSelected || global.MultiUserMode {
							ipOnly := dstIP
							if !databaseSelected {
								log.Println("本地IP：" + dstIP)
								log.Println("游戏服务器IP：" + srcIP)
								log.Println("锁定抓包网卡：" + deviceName)
								global.OnlySrcIp = srcIP
								global.OnlyDstIp = dstIP
								global.OnlyDevice = deviceName
							}

							if idx := strings.LastIndex(ipOnly, ":"); idx != -1 {
								ipOnly = ipOnly[:idx]
							}

							// 在创建数据库前，检查该IP是否在后台配置了固定绑定
							var existingDBName string
							var databaseName string
							dbByIP, bindName, errByIP := database.GetGameDBByBindIP(ipOnly)
							if errByIP == nil && dbByIP != nil && bindName != "" {
								// 使用后台绑定的数据库
								databaseName = bindName
								existingDBName = bindName
								log.Printf("匹配到Web后台内网IP配置: IP %s -> 数据库 %s", ipOnly, databaseName)
							} else {
								databaseName = roleName + "_" + server[0].(string)
								log.Println("收到主公簿数据，将打开或更新数据库文件" + databaseName)
							}

							_, err := database.CreateGameDatabase(databaseName, roleName, "", "", "")

							// 无论创建是否成功，都确保该数据库存在，并设置IP到数据库名的映射
							db, err := database.GetGameDB(databaseName)
							if err != nil {
								log.Printf("连接游戏数据库失败: %v\n", err)
							} else {
								databaseSelected = true
								// 记录 IP -> dbName 的映射关系
								global.SetUserDBName(ipOnly, databaseName)
								if existingDBName != "" {
									log.Printf("游戏数据库已通过IP绑定成功: %s, 设备IP: %s\n", databaseName, ipOnly)
								} else {
									log.Printf("游戏数据库动态连接成功: %s, 绑定设备IP: %s\n", databaseName, ipOnly)
								}

								// 如果兼容老代码，可暂时保留 model.Conn 设置，但在多用户模式下应尽量不依赖
								model.Conn = db
							}
						}
						dbSelectMutex.Unlock()
					}
				}
			}

			if global.IsDebug == true {
				fmt.Print("[]byte{")
				for i, b := range buf {
					if i > 0 {
						fmt.Print(", ")
					}
					fmt.Print(b)
				}
				fmt.Println("}")
				fmt.Println("")
				fmt.Println("====================================================")
				fmt.Println("")
			}
		}
	}
}

type Buffer struct {
	Byte   []byte
	pos    int
	offset int
}

func (bb *Buffer) ResetOffset() {
	bb.offset = 0
}

func NewBufferFrom(b []byte) *Buffer {
	return &Buffer{Byte: b}
}

func (bb *Buffer) ReadInt() int {
	if bb.offset+4 > len(bb.Byte) {
		return 0
	}
	value := binary.BigEndian.Uint32(bb.Byte[bb.offset : bb.offset+4])
	bb.offset += 4
	return int(value)
}

func (bb *Buffer) ReadByte() byte {
	if bb.offset+1 > len(bb.Byte) {
		return 0
	}
	value := bb.Byte[bb.offset : bb.offset+1]
	bb.offset += 1
	return value[0]
}
