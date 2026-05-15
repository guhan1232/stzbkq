package model

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// toInt 将任意类型转为 int
func toInt(v any) int {
	switch x := v.(type) {
	case float64:
		return int(x)
	case int:
		return x
	case int64:
		return int(x)
	default:
		return 0
	}
}

// toInt64 将任意类型转为 int64
func toInt64(v any) int64 {
	switch x := v.(type) {
	case float64:
		return int64(x)
	case int:
		return int64(x)
	case int64:
		return x
	default:
		return 0
	}
}

// toString 将任意类型转为 string
func toString(v any) string {
	s, _ := v.(string)
	return s
}

// toStringArr 将任意类型转为逗号分隔字符串（支持 string 和 []any 类型）
func toStringArr(v any) string {
	switch x := v.(type) {
	case string:
		return x
	case []any:
		parts := make([]string, 0, len(x))
		for _, item := range x {
			switch ii := item.(type) {
			case float64:
				parts = append(parts, strconv.FormatInt(int64(ii), 10))
			case int64:
				parts = append(parts, strconv.FormatInt(ii, 10))
			case int:
				parts = append(parts, strconv.Itoa(ii))
			case string:
				parts = append(parts, ii)
			}
		}
		return strings.Join(parts, ",")
	default:
		return fmt.Sprintf("%v", v)
	}
}

// unmarshalJSON 封装 JSON 解析
func unmarshalJSON(data []byte, v any) error {
	return json.Unmarshal(data, v)
}
