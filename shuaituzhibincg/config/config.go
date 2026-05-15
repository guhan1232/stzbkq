package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Server         ServerConfig
	Database       DatabaseConfig
	Session        SessionConfig
	Security       SecurityConfig
	DevicePriority []string
}

type ServerConfig struct {
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
}

type SessionConfig struct {
	Secret   string
	MaxAge   int // Session过期时间（秒），默认24小时
	Secure   bool
	SameSite string // "strict", "lax", "none"
}

type SecurityConfig struct {
	EnableHostCheck bool // 是否启用主机名检查（禁止IP访问）
}

var AppConfig *Config

// InitConfig 初始化配置
func InitConfig() {
	// 加载.env文件
	if err := godotenv.Load(); err != nil {
		log.Println("未找到.env文件，使用环境变量")
	}

	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "3306"))

	// 读取设备优先级，例如: DEVICE_PRIORITY=eth0,wg0,any
	devicePriorityStr := getEnv("DEVICE_PRIORITY", "")
	var devicePriority []string
	if devicePriorityStr != "" {
		for _, v := range splitAndTrim(devicePriorityStr, ",") {
			if v != "" {
				devicePriority = append(devicePriority, v)
			}
		}
	} else {
		// 默认优先级
		devicePriority = []string{"eth0", "eth1", "ens33", "wlan0", "wg0", "any"}
	}

	AppConfig = &Config{
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "9527"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "127.0.0.1"),
			Port:     dbPort,
			User:     getEnv("DB_USER", "root"),
			Password: getEnv("DB_PASSWORD", ""),
			Name:     getEnv("DB_NAME", "stzbhelper"),
		},
		Session: SessionConfig{
			Secret:   getEnv("SESSION_SECRET", "stzbhelper-session-secret-key"),
			MaxAge:   86400, // 24小时
			Secure:   false, // 开发环境设为false，生产环境HTTPS设为true
			SameSite: "lax",
		},
		Security: SecurityConfig{
			EnableHostCheck: getEnv("ENABLE_HOST_CHECK", "false") == "true",
		},
		DevicePriority: devicePriority,
	}
}

func splitAndTrim(s, sep string) []string {
	var res []string
	for _, v := range strings.Split(s, sep) {
		v = strings.TrimSpace(v)
		if v != "" {
			res = append(res, v)
		}
	}
	return res
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
