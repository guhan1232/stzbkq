package service

import (
	"testing"
)

func TestIPv6CIDR(t *testing.T) {
	tests := []struct {
		name      string
		clientIP  string
		whitelist []string
		expected  bool
	}{
		{
			name:     "IPv6 单个地址匹配",
			clientIP: "2001:db8::1",
			whitelist: []string{
				"2001:db8::1",
			},
			expected: true,
		},
		{
			name:     "IPv6 CIDR /16 匹配",
			clientIP: "2001:abcd::1",
			whitelist: []string{
				"2001::/16",
			},
			expected: true,
		},
		{
			name:     "IPv6 CIDR /32 匹配",
			clientIP: "2001:db8:1234::1",
			whitelist: []string{
				"2001:db8::/32",
			},
			expected: true,
		},
		{
			name:     "IPv6 CIDR /32 不匹配",
			clientIP: "2001:abcd::1",
			whitelist: []string{
				"2001:db8::/32",
			},
			expected: false,
		},
		{
			name:     "IPv6 链路本地地址",
			clientIP: "fe80::1",
			whitelist: []string{
				"fe80::/10",
			},
			expected: true,
		},
		{
			name:     "混合 IPv4 和 IPv6",
			clientIP: "2001:db8::1",
			whitelist: []string{
				"192.168.1.0/24",
				"2001:db8::/32",
				"10.0.0.1",
			},
			expected: true,
		},
		{
			name:     "IPv4 CIDR 匹配",
			clientIP: "192.168.1.100",
			whitelist: []string{
				"192.168.1.0/24",
			},
			expected: true,
		},
		{
			name:     "IPv4 CIDR 不匹配",
			clientIP: "192.168.2.100",
			whitelist: []string{
				"192.168.1.0/24",
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 临时保存白名单
			originalWhitelist, _ := GetIPWhitelist()
			defer SaveIPWhitelist(originalWhitelist)

			// 设置测试白名单
			SaveIPWhitelist(tt.whitelist)

			// 测试
			result, err := IsIPInWhitelist(tt.clientIP)
			if err != nil {
				t.Errorf("IsIPInWhitelist() error = %v", err)
				return
			}

			if result != tt.expected {
				t.Errorf("IsIPInWhitelist(%s) = %v, want %v", tt.clientIP, result, tt.expected)
			}
		})
	}
}

func TestIsValidIP(t *testing.T) {
	tests := []struct {
		name     string
		ip       string
		expected bool
	}{
		{"IPv4 有效", "192.168.1.1", true},
		{"IPv4 无效", "192.168.1.999", false},
		{"IPv6 有效", "2001:db8::1", true},
		{"IPv6 无效", "2001:xyz::1", false},
		{"IPv4 CIDR 有效", "192.168.1.0/24", true},
		{"IPv4 CIDR 无效", "192.168.1.0/33", false},
		{"IPv6 CIDR 有效", "2001::/16", true},
		{"IPv6 CIDR 有效", "2001:db8::/32", true},
		{"IPv6 CIDR 无效", "2001::/129", false},
		{"空字符串", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isValidIP(tt.ip)
			if result != tt.expected {
				t.Errorf("isValidIP(%s) = %v, want %v", tt.ip, result, tt.expected)
			}
		})
	}
}
