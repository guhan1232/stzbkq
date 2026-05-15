package common

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

// Success 成功的返回
func (r Response) Success(c *gin.Context) {
	r.Code = 200
	if r.Message == "" {
		r.Message = "ok"
	}
	c.JSON(200, r)
}

// Error 发生错误的返回（根据业务码返回对应HTTP状态码）
func (r Response) Error(c *gin.Context) {
	if r.Message == "" {
		r.Message = "error"
	}

	if r.Code == 0 {
		r.Code = 500
	}

	httpCode := r.Code
	if httpCode < 100 || httpCode > 599 {
		httpCode = 500
	}

	c.JSON(httpCode, r)
}

// ErrorWithHTTP 发生错误并返回对应HTTP状态码（用于认证/权限等需要HTTP状态码区分的场景）
func (r Response) ErrorWithHTTP(c *gin.Context) {
	if r.Message == "" {
		r.Message = "error"
	}

	if r.Code == 0 {
		r.Code = 500
	}

	httpCode := r.Code
	if httpCode < 100 || httpCode > 599 {
		httpCode = 500
	}

	c.JSON(httpCode, r)
}

// ParseInt 解析整数
func ParseInt(s string, result *int) (bool, error) {
	val, err := strconv.Atoi(s)
	if err != nil {
		return false, err
	}
	*result = val
	return true, nil
}

// ParseUint 解析无符号整数
func ParseUint(s string, result *uint) (bool, error) {
	val, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return false, err
	}
	*result = uint(val)
	return true, nil
}
