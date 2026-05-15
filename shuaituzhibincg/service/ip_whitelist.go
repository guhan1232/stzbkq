package service

import (
	"fmt"
	"net"
	"strings"

	"stzbHelper/database"
	"stzbHelper/model"
)

// GetIPWhitelist 获取 IP 白名单列表
func GetIPWhitelist() ([]string, error) {
	var config model.SystemConfig
	result := database.SystemDB.Where("key = ?", "ip_whitelist").First(&config)
	if result.Error != nil {
		// 如果配置不存在，返回空列表
		return []string{}, nil
	}

	if config.Value == "" {
		return []string{}, nil
	}

	// 按逗号分割 IP 列表
	ips := strings.Split(config.Value, ",")
	var validIPs []string
	for _, ip := range ips {
		ip = strings.TrimSpace(ip)
		if ip != "" && isValidIP(ip) {
			validIPs = append(validIPs, ip)
		}
	}

	return validIPs, nil
}

// SaveIPWhitelist 保存 IP 白名单
func SaveIPWhitelist(ips []string) error {
	// 验证所有 IP 地址
	for _, ip := range ips {
		ip = strings.TrimSpace(ip)
		if ip != "" && !isValidIP(ip) {
			return fmt.Errorf("无效的 IP 地址: %s", ip)
		}
	}

	// 过滤空值并拼接
	var validIPs []string
	for _, ip := range ips {
		ip = strings.TrimSpace(ip)
		if ip != "" {
			validIPs = append(validIPs, ip)
		}
	}

	value := strings.Join(validIPs, ",")

	// 保存或更新配置
	config := model.SystemConfig{
		Key:   "ip_whitelist",
		Value: value,
	}

	result := database.SystemDB.Save(&config)
	return result.Error
}

// IsIPInWhitelist 检查 IP 是否在白名单中
func IsIPInWhitelist(clientIP string) (bool, error) {
	whitelist, err := GetIPWhitelist()
	if err != nil {
		return false, err
	}

	// 如果白名单为空，允许所有 IP（不限制）
	if len(whitelist) == 0 {
		return true, nil
	}

	// 解析客户端 IP
	clientParsedIP := net.ParseIP(clientIP)
	if clientParsedIP == nil {
		return false, fmt.Errorf("无效的客户端 IP: %s", clientIP)
	}

	// 检查是否匹配
	for _, allowedIP := range whitelist {
		allowedIP = strings.TrimSpace(allowedIP)

		// 检查是否是 CIDR 格式（支持 IPv4 和 IPv6）
		if strings.Contains(allowedIP, "/") {
			_, ipNet, err := net.ParseCIDR(allowedIP)
			if err != nil {
				// CIDR 格式错误，跳过
				continue
			}

			// 检查 IP 是否在网段内
			if ipNet.Contains(clientParsedIP) {
				return true, nil
			}
		} else {
			// 普通 IP 地址，直接比较
			allowedParsedIP := net.ParseIP(allowedIP)
			if allowedParsedIP != nil && clientParsedIP.Equal(allowedParsedIP) {
				return true, nil
			}
		}
	}

	return false, nil
}

// EnableIPWhitelist 启用/禁用 IP 白名单功能
func EnableIPWhitelist(enabled bool) error {
	value := "0"
	if enabled {
		value = "1"
	}

	config := model.SystemConfig{
		Key:   "ip_whitelist_enabled",
		Value: value,
	}

	result := database.SystemDB.Save(&config)
	return result.Error
}

// IsIPWhitelistEnabled 检查 IP 白名单是否启用
func IsIPWhitelistEnabled() (bool, error) {
	var config model.SystemConfig
	result := database.SystemDB.Where("key = ?", "ip_whitelist_enabled").First(&config)
	if result.Error != nil {
		// 如果配置不存在，默认禁用
		return false, nil
	}

	return config.Value == "1", nil
}

// isValidIP 验证 IP 地址是否有效（支持 IPv4 和 IPv6）
func isValidIP(ip string) bool {
	// 检查是否是 CIDR 格式
	if strings.Contains(ip, "/") {
		_, _, err := net.ParseCIDR(ip)
		return err == nil
	}

	// 检查是否是普通 IP 地址
	return net.ParseIP(ip) != nil
}

// normalizeIP 标准化 IP 地址
func normalizeIP(ip string) string {
	ip = strings.TrimSpace(ip)
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return ip
	}
	return parsedIP.String()
}
