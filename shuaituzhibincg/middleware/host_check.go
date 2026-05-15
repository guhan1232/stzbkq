package middleware

import (
	"net"
	"strings"

	"github.com/gin-gonic/gin"
	"stzbHelper/http/common"
)

// HostCheck 主机名检查中间件
// 如果启用，将拒绝直接通过 IP 地址的访问，只允许通过域名访问
func HostCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		host := c.Request.Host

		// 如果 Host 为空，拒绝访问
		if host == "" {
			common.Response{Message: "无效的请求"}.Error(c)
			c.Abort()
			return
		}

		// 提取主机名（去掉端口号）
		hostname := host
		if strings.Contains(host, ":") {
			hostname, _, _ = net.SplitHostPort(host)
		}

		// 检查是否是 IP 地址
		if net.ParseIP(hostname) != nil {
			// 是 IP 地址，拒绝访问
			common.Response{
				Message: "禁止通过 IP 地址直接访问，请使用域名访问",
			}.Error(c)
			c.Abort()
			return
		}

		// 是域名，允许访问
		c.Next()
	}
}
