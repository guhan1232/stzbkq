package global

import "sync"

type WebExVar struct {
	NeededReportPos             int   //需要获取战报的坐标
	NeedGetReport               bool  //是否需要获取战报
	NeedSyncTeamUser            bool  //是否需要同步同盟成员信息
	BindIpInfo                  bool  //是否绑定IP信息 开启后将过滤掉其他IP的数据包(特殊情况使用)
	NeedGetBattleData           bool  //是否开启抓取详细战报数据 用于抓取队伍
	NeedGetLeaderboard          bool  //是否开启抓取排行榜数据 (cmd 700/514/6314)
	NeedGetChatMessage          bool  //是否开启抓取聊天消息 (cmd 724)
	NeedGetManifesto            bool  //是否开启抓取檄文 (cmd 3788)
	NeedGetBattlefieldRealtime  bool  //是否开启战场实时监控 (cmd 5028)
	ReportStartTime             int64 //战报开始时间戳
	ReportEndTime               int64 //战报结束时间戳
}

var ExVar = WebExVar{
	0, false, false, false, false, false, false, false, false, 0, 0,
}

var IsDebug bool = false
var Version string = "0.0.3-rc2-segcount"
var OnlySrcIp = ""
var OnlyDstIp = ""
var OnlyDevice = ""           // 锁定的网卡设备，防止多网卡重复抓包
var MultiUserMode bool = true // 支持多用户/多终端考勤抓取

var (
	UserIPToDBName = make(map[string]string)
	IPMapMutex     sync.RWMutex
)

// SetUserDBName 设置用户的数据库映射
func SetUserDBName(ip string, dbName string) {
	IPMapMutex.Lock()
	defer IPMapMutex.Unlock()
	UserIPToDBName[ip] = dbName
}

// GetUserDBName 获取用户的数据库映射
func GetUserDBName(ip string) string {
	IPMapMutex.RLock()
	defer IPMapMutex.RUnlock()
	return UserIPToDBName[ip]
}
