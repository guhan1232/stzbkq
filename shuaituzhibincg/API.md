# 率土助手 API 文档

## 基础信息

| 项目 | 说明 |
|------|------|
| API 基础路径 | `/v1` |
| 协议 | HTTP/HTTPS |
| 默认端口 | `9527`（可通过 `.env` 中 `SERVER_PORT` 配置） |
| 认证方式 | Session ID，通过 `X-Session-ID` 请求头、`Cookie: session_id=xxx` 或 URL 参数 `session_id=xxx` 传递 |
| 数据库参数 | 需要数据库的接口通过 Session 中的 `database_id` 或请求参数 `db_id` 传递 |
| CORS | 允许所有域名跨域，支持 `GET/POST/PUT/DELETE/OPTIONS` |

---

## 统一响应格式

```json
{
  "code": 200,
  "message": "ok",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | int | 状态码，200 表示成功，其他表示错误 |
| `message` | string | 响应消息 |
| `data` | any | 响应数据，错误时可能为 null |

### 常见状态码

| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数错误 / 缺少数据库参数 |
| 401 | 未登录 |
| 403 | 无权限（需要管理员权限） |
| 500 | 服务器内部错误 |

---

## 认证机制

### Session 认证

系统使用基于内存的 Session 认证，登录后返回 `session_id`，后续请求需携带该 ID。

**传递方式（优先级从高到低）：**

1. 请求头 `X-Session-ID: <session_id>`
2. Cookie `session_id=<session_id>`
3. URL 参数 `?session_id=<session_id>`（适用于文件下载等场景）

### 权限等级

| 权限 | 说明 |
|------|------|
| 公开 | 无需认证 |
| 分享 | 无需登录，通过 `db_id` 参数访问 |
| 认证用户 | 需要登录 |
| 数据库用户 | 需要登录 + 选择数据库 |
| 管理员 | 需要登录 + `role=admin` |

---

## 一、公开接口（无需认证）

### 1.1 用户注册

**POST** `/v1/auth/register`

注册新用户，注册成功后自动登录。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 用户名，3-50 字符，不能包含 test/测试/admin/管理员/root/系统 等敏感词 |
| `password` | string | 是 | 密码，至少 6 个字符 |
| `nickname` | string | 否 | 昵称，为空时使用 username |

**响应示例：**

```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "session_id": "a1b2c3d4e5f6...",
    "user": {
      "id": 1,
      "username": "player1",
      "nickname": "玩家1",
      "role": "user"
    }
  }
}
```

**错误情况：**

| message | 说明 |
|---------|------|
| 用户名和密码不能为空 | 缺少必填参数 |
| 用户名不能包含'xxx'等敏感词 | 用户名包含禁止关键词 |
| 用户名长度需要在3-50字符之间 | 用户名长度不合规 |
| 密码长度至少6个字符 | 密码过短 |
| 用户名已存在 | 用户名被占用 |

---

### 1.2 用户登录

**POST** `/v1/auth/login`

用户登录，如果启用了 IP 白名单会进行 IP 验证。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 用户名 |
| `password` | string | 是 | 密码 |

**响应示例：**

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "session_id": "a1b2c3d4e5f6...",
    "user": {
      "id": 1,
      "username": "player1",
      "nickname": "玩家1",
      "role": "user"
    }
  }
}
```

**错误情况：**

| message | 说明 |
|---------|------|
| 用户名和密码不能为空 | 缺少必填参数 |
| 您的 IP 地址不在白名单中，禁止登录 | IP 白名单验证失败 |
| 用户名或密码错误 | 凭证无效 |
| 用户已被禁用 | 用户状态为禁用 |

---

### 1.3 用户登出

**POST** `/v1/auth/logout`

登出当前用户，清除 Session 和 Cookie。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "登出成功",
  "data": null
}
```

---

### 1.4 数据包捕获

#### 1.4.1 开始抓包

**POST** `/v1/packet-capture/start`

开始捕获网络数据包。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "开始捕获数据包",
  "data": {
    "interfaces": ["eth0", "wlan0"]
  }
}
```

---

#### 1.4.2 停止抓包

**POST** `/v1/packet-capture/stop`

停止捕获网络数据包。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "已停止捕获",
  "data": null
}
```

---

#### 1.4.3 获取抓包统计

**GET** `/v1/packet-capture/stats`

获取当前抓包统计信息。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "interfaces": ["eth0"],
    "packet_count": 1500,
    "is_capturing": true
  }
}
```

---

#### 1.4.4 获取抓包数据

**GET** `/v1/packet-capture/packets`

获取捕获到的数据包列表。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `limit` | int | 否 | 100 | 返回数据包数量上限 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": [
    {
      "timestamp": 1710000000,
      "src_ip": "192.168.1.100",
      "dst_ip": "10.0.0.1",
      "protocol": "TCP",
      "length": 256,
      "cmd_id": 92
    }
  ]
}
```

---

#### 1.4.5 导出 CSV

**GET** `/v1/packet-capture/export/csv`

导出抓包数据为 CSV 格式文件。

**请求参数：** 无

**响应：** 直接下载 `packets.csv` 文件，Content-Type 为 `text/csv`。

---

#### 1.4.6 导出 JSON

**GET** `/v1/packet-capture/export/json`

导出抓包数据为 JSON 格式文件。

**请求参数：** 无

**响应：** 直接下载 `packets.json` 文件，Content-Type 为 `application/json`。

---

### 1.5 获取清理时间戳

**GET** `/v1/cleanup/timestamp`

获取最后一次数据清理的时间戳（小程序调用）。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "timestamp": 1710000000
  }
}
```

---

## 二、分享接口（无需登录，通过 db_id 参数访问）

> 所有分享接口需要在 URL 中传递 `db_id` 参数指定数据库。

### 2.1 获取任务列表（分享）

**GET** `/v1/share/taskList?db_id=<数据库ID>`

获取指定数据库的任务列表（不含 user_list 字段）。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `db_id` | uint | 是 | 数据库 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": [
    {
      "id": 1,
      "status": 0,
      "name": "攻城任务",
      "time": 1710000000,
      "end_time": 1710003600,
      "pos": 2110195,
      "target": ["一团", "二团"],
      "target_user_num": 50,
      "complete_user_num": 30,
      "created_at": 1709999999
    }
  ]
}
```

---

### 2.2 获取任务详情（分享）

**GET** `/v1/share/task/:tid?db_id=<数据库ID>`

获取指定任务的详细信息。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `tid` | int | 任务 ID |

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `db_id` | uint | 是 | 数据库 ID |
| `refresh` | string | 否 | 传 `1` 时从战报表实时重新统计出勤数据 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "id": 1,
    "status": 0,
    "name": "攻城任务",
    "time": 1710000000,
    "end_time": 1710003600,
    "pos": 2110195,
    "target": ["一团", "二团"],
    "target_user_num": 50,
    "complete_user_num": 30,
    "user_list": {
      "101": {
        "id": 101,
        "name": "张三",
        "group": "一团",
        "atk_num": 5,
        "dis_num": 3,
        "atk_team_num": 3,
        "dis_team_num": 2
      }
    },
    "created_at": 1709999999
  }
}
```

---

### 2.3 获取任务战报列表（分享）

**GET** `/v1/share/taskReportList/:tid?db_id=<数据库ID>`

获取指定任务的战报列表，含分页和出勤统计。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `tid` | int | 任务 ID |

**Query 参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `db_id` | uint | 是 | - | 数据库 ID |
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量（1-100） |
| `attack_name` | string | 否 | - | 按攻击方名称筛选 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "task_name": "攻城任务",
    "task_pos": 2110195,
    "total_users": 50,
    "attended_users": 30,
    "not_attended_users": 20,
    "user_list": {}
  }
}
```

---

### 2.4 获取任务战报数量（分享）

**GET** `/v1/share/reportNum/:tid?db_id=<数据库ID>`

获取指定任务的战报数量。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `tid` | int | 任务 ID |

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `db_id` | uint | 是 | 数据库 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "count": 150
  }
}
```

---

### 2.5 获取队伍分组（分享）

**GET** `/v1/share/teamGroups?db_id=<数据库ID>`

获取同盟中所有分组名称。

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `db_id` | uint | 是 | 数据库 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": ["一团", "二团", "三团", "未分组"]
}
```

---

## 三、需认证接口

### 3.1 用户信息

#### 3.1.1 获取当前用户信息

**GET** `/v1/user/info`

获取当前登录用户的详细信息。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "id": 1,
    "username": "player1",
    "nickname": "玩家1",
    "role": "user",
    "status": 1,
    "last_login_at": "2024-03-10T12:00:00Z",
    "last_login_ip": "192.168.1.100",
    "created_at": "2024-01-01T00:00:00Z",
    "database_id": 3
  }
}
```

---

#### 3.1.2 修改密码

**POST** `/v1/user/changePassword`

修改当前用户密码。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `old_password` | string | 是 | 旧密码 |
| `new_password` | string | 是 | 新密码，至少 6 个字符 |

**响应示例：**

```json
{
  "code": 200,
  "message": "密码修改成功",
  "data": null
}
```

**错误情况：**

| message | 说明 |
|---------|------|
| 旧密码和新密码不能为空 | 缺少必填参数 |
| 新密码长度至少6个字符 | 新密码过短 |
| 旧密码错误 | 旧密码验证失败 |

---

#### 3.1.3 选择数据库

**POST** `/v1/user/selectDatabase`

为当前用户选择/切换操作的数据库。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `database_id` | uint | 是 | 数据库 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "数据库选择成功",
  "data": {
    "database_id": 3
  }
}
```

---

### 3.2 安全配置

#### 3.2.1 获取主机检查配置

**GET** `/v1/security/host-check`

获取主机名检查（禁止 IP 直接访问）的配置状态。仅管理员可访问。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "enabled": false
  }
}
```

---

#### 3.2.2 保存主机检查配置

**POST** `/v1/security/host-check/save`

保存主机名检查配置。仅管理员可访问。

> 注意：运行时无法动态修改已加载的配置，需修改 `.env` 文件并重启服务。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enabled` | string | 是 | `1` 启用，其他值禁用 |

**响应示例：**

```json
{
  "code": 200,
  "message": "配置已保存，请修改 .env 文件并重启服务以生效",
  "data": {
    "enabled": true,
    "config_file": ".env",
    "config_key": "ENABLE_HOST_CHECK",
    "config_value": "true",
    "restart_needed": true,
    "instruction": "请编辑 .env 文件，设置 ENABLE_HOST_CHECK=true，然后重启服务"
  }
}
```

---

### 3.3 IP 白名单

#### 3.3.1 获取 IP 白名单

**GET** `/v1/ip-whitelist`

获取 IP 白名单配置。仅管理员可访问。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "enabled": true,
    "whitelist": ["192.168.1.0/24", "10.0.0.1"]
  }
}
```

---

#### 3.3.2 保存 IP 白名单

**POST** `/v1/ip-whitelist/save`

保存 IP 白名单配置。仅管理员可访问。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enabled` | string | 是 | `1` 启用白名单，其他值禁用 |
| `whitelist` | string | 否 | IP 列表，逗号分隔，如 `192.168.1.0/24,10.0.0.1` |

**响应示例：**

```json
{
  "code": 200,
  "message": "保存成功",
  "data": null
}
```

---

### 3.4 数据库管理

> 数据库管理接口需要登录，但不需要预先选择数据库。

#### 3.4.1 获取数据库列表

**GET** `/v1/databases`

获取当前用户可见的数据库列表。普通用户只能看到自己认领的数据库，管理员可以看到所有。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "张三_1区",
        "display_name": "张三的数据库",
        "server": "1区",
        "state": "active",
        "alliance_name": "率土有米",
        "bind_ip": "192.168.1.100",
        "priority": 0,
        "user_id": 1,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 5
  }
}
```

---

#### 3.4.2 获取数据库详情

**GET** `/v1/databases/:id`

获取指定数据库的详情和统计数据。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 数据库 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "database": {
      "id": 1,
      "name": "张三_1区",
      "display_name": "张三的数据库",
      "server": "1区",
      "state": "active",
      "alliance_name": "率土有米",
      "bind_ip": "",
      "priority": 0
    },
    "stats": {
      "team_user_count": 150,
      "task_count": 10,
      "report_count": 500,
      "battle_report_count": 2000
    }
  }
}
```

---

#### 3.4.3 创建数据库

**POST** `/v1/databases/create`

手动创建新的游戏数据库。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 数据库名称（唯一标识） |
| `display_name` | string | 否 | 显示名称 |
| `server` | string | 否 | 服务器 |
| `state` | string | 否 | 状态 |
| `alliance_name` | string | 否 | 同盟名称 |

**响应示例：**

```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": 2,
    "name": "新数据库"
  }
}
```

---

#### 3.4.4 自动生成数据库

**POST** `/v1/databases/autoGenerate`

自动生成数据库（功能开发中）。

**响应示例：**

```json
{
  "code": 500,
  "message": "功能开发中",
  "data": null
}
```

---

#### 3.4.5 认领数据库

**POST** `/v1/databases/:id/claim`

将指定数据库认领到当前用户。管理员可认领任何数据库。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 数据库 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "认领成功",
  "data": null
}
```

---

#### 3.4.6 释放数据库

**POST** `/v1/databases/:id/release`

释放当前用户认领的数据库。管理员可释放任何数据库。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 数据库 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "释放成功",
  "data": null
}
```

---

#### 3.4.7 更新数据库

**PUT** `/v1/databases/:id`

更新数据库信息。管理员可更新任何数据库。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 数据库 ID |

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `display_name` | string | 否 | 显示名称 |
| `server` | string | 否 | 服务器 |
| `state` | string | 否 | 状态 |
| `alliance_name` | string | 否 | 同盟名称 |
| `bind_ip` | string | 否 | 绑定内网 IP（用于自动匹配数据库） |
| `priority` | int | 否 | 优先级 |

**响应示例：**

```json
{
  "code": 200,
  "message": "更新成功",
  "data": null
}
```

---

#### 3.4.8 删除数据库

**DELETE** `/v1/databases/:id`

删除指定数据库。管理员可删除任何数据库。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 数据库 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

---

## 四、需数据库连接接口

> 需要先通过 `/v1/user/selectDatabase` 选择数据库，或在请求中传递 `db_id` 参数。
> 系统会按以下优先级获取数据库连接：
> 1. Session 中的 `database_id`
> 2. 请求参数 `db_id`（Query 或 Form）
> 3. 用户记录中最近绑定的 `database_id`
> 4. 用户可见列表中的第一个数据库

### 4.1 同盟成员

#### 4.1.1 获取同盟成员列表

**GET/POST** `/v1/getTeamUser`

获取当前数据库的同盟成员列表。

**请求参数（Query/Form）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `group` | string | 否 | 按分组筛选 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": [
    {
      "id": 101,
      "name": "张三",
      "contribute_total": 50000,
      "contribute_week": 3000,
      "pos": 2110195,
      "power": 35000,
      "wu": 12000,
      "group": "一团",
      "join_time": 1700000000
    }
  ]
}
```

**TeamUser 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 成员 ID |
| `name` | string | 成员名称 |
| `contribute_total` | int | 总贡献 |
| `contribute_week` | int | 本周贡献 |
| `pos` | int | 坐标 |
| `power` | int | 势力值 |
| `wu` | int | 武勋 |
| `group` | string | 分组名称 |
| `join_time` | int | 加入时间戳 |

---

#### 4.1.2 获取同盟分组

**GET/POST** `/v1/getTeamGroup`

获取同盟中所有不重复的分组名称。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": ["一团", "二团", "三团", "未分组"]
}
```

---

### 4.2 任务管理

#### 4.2.1 获取任务列表

**GET/POST** `/v1/getTaskList`

获取所有任务列表（不含 `user_list` 字段），按 ID 降序排列。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": [
    {
      "id": 1,
      "status": 0,
      "name": "攻城任务",
      "time": 1710000000,
      "end_time": 1710003600,
      "pos": 2110195,
      "target": ["一团", "二团"],
      "target_user_num": 50,
      "complete_user_num": 30,
      "created_at": 1709999999
    }
  ]
}
```

**Task 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 任务 ID |
| `status` | int | 任务状态 |
| `name` | string | 任务名称 |
| `time` | int | 任务开始时间戳 |
| `end_time` | int | 任务结束时间戳 |
| `pos` | int | 任务坐标（格式：X*10000+Y，如 2110195 表示 211,195） |
| `target` | []string | 目标分组列表 |
| `target_user_num` | int | 目标人数 |
| `complete_user_num` | int | 已完成人数 |
| `user_list` | map | 参与成员详情（仅详情接口返回） |
| `created_at` | int64 | 创建时间戳 |

---

#### 4.2.2 获取任务详情

**GET/POST** `/v1/getTask/:tid`

获取指定任务的详细信息，包含 `user_list`。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `tid` | int | 任务 ID |

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `refresh` | string | 否 | 传 `1` 时从战报表实时重新统计出勤数据 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "id": 1,
    "status": 0,
    "name": "攻城任务",
    "time": 1710000000,
    "end_time": 1710003600,
    "pos": 2110195,
    "target": ["一团", "二团"],
    "target_user_num": 50,
    "complete_user_num": 30,
    "user_list": {
      "101": {
        "id": 101,
        "name": "张三",
        "group": "一团",
        "atk_num": 5,
        "dis_num": 3,
        "atk_team_num": 3,
        "dis_team_num": 2
      }
    },
    "created_at": 1709999999
  }
}
```

**TaskUserList 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 成员 ID |
| `name` | string | 成员名称 |
| `group` | string | 分组 |
| `atk_num` | int | 主力次数 |
| `dis_num` | int | 拆迁次数 |
| `atk_team_num` | int | 主力队伍数量 |
| `dis_team_num` | int | 拆迁队伍数量 |

---

#### 4.2.3 创建任务

**POST** `/v1/createTask`

创建新的考勤任务。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `taskname` | string | 是 | 任务名称 |
| `tasktime` | string | 是 | 任务开始时间戳（秒） |
| `taskendtime` | string | 是 | 任务结束时间戳（秒） |
| `targetgroup` | []string | 是 | 目标分组列表（可传多个值） |
| `taskpos` | []string | 是 | 任务坐标，格式为 `[X, Y]`，如 `["211", "195"]` |

**响应示例：**

```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": 5,
    "rows": 1
  }
}
```

**错误情况：**

| message | 说明 |
|---------|------|
| 任务坐标格式错误 | taskpos 格式不正确 |
| 任务时间格式错误 | tasktime 不是有效数字 |
| 任务结束时间格式错误 | taskendtime 不是有效数字 |
| 创建出错:目标人数为0 | 目标分组中没有成员 |

---

#### 4.2.4 删除任务

**GET/POST/DELETE** `/v1/deleteTask/:tid`

删除指定任务及其关联的所有战报和详细战报。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `tid` | int | 任务 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "删除成功",
  "data": 1
}
```

---

### 4.3 战报管理

#### 4.3.1 开启自动获取战报

**POST** `/v1/enable/getReport`

开启考勤战报自动抓取功能。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pos` | string | 是 | 目标坐标（整数格式，如 2110195） |
| `start_time` | string | 否 | 战报开始时间戳（秒） |
| `end_time` | string | 否 | 战报结束时间戳（秒） |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

---

#### 4.3.2 关闭自动获取战报

**GET/POST** `/v1/disable/getReport`

关闭考勤战报自动抓取功能。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

---

#### 4.3.3 获取任务战报数量

**GET/POST** `/v1/getReportNumByTaskId/:tid`

获取指定任务的考勤战报数量。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `tid` | int | 任务 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "count": 150
  }
}
```

---

#### 4.3.4 获取任务战报列表

**GET/POST** `/v1/getTaskReportList/:tid`

获取指定任务的考勤战报列表，含分页和出勤统计。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `tid` | int | 任务 ID |

**Query 参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量（1-100） |
| `attack_name` | string | 否 | - | 按攻击方名称模糊搜索 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "task_name": "攻城任务",
    "task_pos": 2110195,
    "total_users": 50,
    "attended_users": 30,
    "not_attended_users": 20,
    "user_list": {}
  }
}
```

---

#### 4.3.5 战报统计

**GET/POST** `/v1/statisticsReport/:tid`

对指定任务进行考勤统计，统计每个成员的攻城次数、拆迁次数、主力/拆迁队伍数量，并更新任务的 `complete_user_num`。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `tid` | int | 任务 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "统计完成，共 30 人参与",
  "data": 1
}
```

**错误情况：**

| message | 说明 |
|---------|------|
| 未找到匹配战报（任务坐标: xxx） | 该坐标下没有战报数据 |

---

#### 4.3.6 获取分组武勋信息

**GET/POST** `/v1/getGroupWu`

获取各分组的武勋统计信息。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": [
    {
      "group": "一团",
      "member_count": 50,
      "total_wu": 600000,
      "average_wu": 12000,
      "zero_wu_count": 5
    },
    {
      "group": "二团",
      "member_count": 45,
      "total_wu": 500000,
      "average_wu": 11111,
      "zero_wu_count": 3
    }
  ]
}
```

**GroupWuStats 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `group` | string | 分组名称 |
| `member_count` | int | 成员数量 |
| `total_wu` | int | 总武勋 |
| `average_wu` | int | 平均武勋（四舍五入） |
| `zero_wu_count` | int | 武勋为 0 的成员数量 |

---

#### 4.3.7 删除任务战报

**GET/POST/DELETE** `/v1/deleteTaskReport/:tid`

删除指定任务关联的所有考勤战报（Report 表中 wid 匹配的记录）。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `tid` | int | 任务 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "清理战报成功",
  "data": 150
}
```

---

#### 4.3.8 战报列表（详细战报）

**GET** `/v1/stzb/report/list`

获取详细战报（BattleReport）列表，支持多种筛选条件。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `nextid` | string | 是 | - | 分页游标，传入上一次返回的最小 ID，首次传 `0` |
| `atkname` | string | 否 | - | 攻击方/防守方名称模糊搜索 |
| `atkunionname` | string | 否 | - | 攻击方/防守方同盟名称模糊搜索 |
| `atkhp` | string | 否 | - | 最低兵力筛选 |
| `atklevel` | string | 否 | - | 最低武将等级筛选 |
| `atkstar` | string | 否 | - | 最低总红度筛选 |
| `type` | string | 否 | - | 筛选类型：`1`=双方（默认），`2`=仅攻击方，`3`=仅防守方，`4`=双方同时满足 |
| `nonpc` | string | 否 | - | 传 `1` 排除 NPC 战报 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "report": [
      {
        "id": 1000,
        "battle_id": 500001,
        "time": 1710000000,
        "wid": "2110195",
        "wid_name": "洛阳",
        "attack_name": "张三",
        "attack_union_name": "率土有米",
        "defend_name": "李四",
        "defend_union_name": "天下无双",
        "attack_hp": 30000,
        "defend_hp": 25000,
        "attack_hero1_id": 101,
        "attack_hero1_level": 50,
        "attack_hero1_star": 5,
        "attack_total_star": 15,
        "defend_hero1_id": 201,
        "defend_hero1_level": 45,
        "defend_total_star": 12,
        "npc": 0,
        "result": 1
      }
    ],
    "total": 5000
  }
}
```

**BattleReport 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 记录 ID |
| `battle_id` | int64 | 战斗 ID（唯一） |
| `time` | int64 | 战斗时间戳 |
| `wid` | string | 战斗地点坐标 |
| `wid_name` | string | 战斗地点名称 |
| `attack_name` | string | 进攻方名称 |
| `attack_union_name` | string | 进攻方同盟名称 |
| `attack_clan_name` | string | 进攻方家族名称 |
| `attack_idu` | string | 进攻方队伍 ID |
| `defend_name` | string | 防守方名称 |
| `defend_union_name` | string | 防守方同盟名称 |
| `defend_clan_name` | string | 防守方家族名称 |
| `defend_idu` | string | 防守方队伍 ID |
| `attack_advance` | string | 进攻方武将进阶信息 |
| `attack_all_hero_info` | string | 进攻方武将信息 |
| `attacker_gear_info` | string | 进攻方宝物信息 |
| `defend_advance` | string | 防守方武将进阶信息 |
| `defend_all_hero_info` | string | 防守方武将信息 |
| `defender_gear_info` | string | 防守方宝物信息 |
| `attack_hero_type` | string | 进攻方武将兵种信息 |
| `attack_hero_type_advance` | string | 进攻方武将兵种进阶信息 |
| `defend_hero_type` | string | 防守方武将兵种信息 |
| `defend_hero_type_advance` | string | 防守方武将兵种进阶信息 |
| `attack_hero1_id` | int64 | 进攻方大营武将 ID |
| `attack_hero2_id` | int64 | 进攻方中军武将 ID |
| `attack_hero3_id` | int64 | 进攻方前锋武将 ID |
| `attack_hero1_level` | int64 | 进攻方大营武将等级 |
| `attack_hero2_level` | int64 | 进攻方中军武将等级 |
| `attack_hero3_level` | int64 | 进攻方前锋武将等级 |
| `attack_hero1_star` | int64 | 进攻方大营武将红度 |
| `attack_hero2_star` | int64 | 进攻方中军武将红度 |
| `attack_hero3_star` | int64 | 进攻方前锋武将红度 |
| `attack_total_star` | int64 | 进攻方总红度 |
| `defend_hero1_id` | int64 | 防守方大营武将 ID |
| `defend_hero2_id` | int64 | 防守方中军武将 ID |
| `defend_hero3_id` | int64 | 防守方前锋武将 ID |
| `defend_hero1_level` | int64 | 防守方大营武将等级 |
| `defend_hero2_level` | int64 | 防守方中军武将等级 |
| `defend_hero3_level` | int64 | 防守方前锋武将等级 |
| `defend_hero1_star` | int64 | 防守方大营武将红度 |
| `defend_hero2_star` | int64 | 防守方中军武将红度 |
| `defend_hero3_star` | int64 | 防守方前锋武将红度 |
| `defend_total_star` | int64 | 防守方总红度 |
| `attack_hp` | int64 | 进攻方总兵力 |
| `defend_hp` | int64 | 防守方总兵力 |
| `npc` | int64 | 是否为 NPC 战斗 |
| `all_skill_info` | string | 技能信息 |
| `result` | int64 | 战斗结果 |

---

### 4.4 战斗数据

#### 4.4.1 开启自动获取战斗报告

**POST** `/v1/enable/getBattleReport`

开启详细战报数据抓取。开启时会自动同时开启考勤战报抓取（详细战报依赖考勤战报的解析）。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

---

#### 4.4.2 关闭自动获取战斗报告

**GET/POST** `/v1/disable/getBattleReport`

关闭详细战报数据抓取。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

---

#### 4.4.3 战斗报告详情

**GET** `/v1/battle/report/:battle_id`

获取指定战斗报告的详细信息。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `battle_id` | int64 | 战斗 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "id": 1,
    "battle_id": 500001,
    "attack_name": "张三",
    "defend_name": "李四",
    "attack_all_hero_info": "...",
    "defend_all_hero_info": "..."
  }
}
```

---

#### 4.4.4 战斗报告列表

**GET** `/v1/battle/reports`

获取战斗报告列表，支持分页和多种筛选条件。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量（1-100） |
| `atk_name` | string | 否 | - | 进攻方名称模糊搜索 |
| `def_name` | string | 否 | - | 防守方名称模糊搜索 |
| `union_name` | string | 否 | - | 同盟名称模糊搜索（匹配攻守双方） |
| `min_hp` | int | 否 | 0 | 最低兵力筛选（攻守双方任一满足即可） |
| `nonpc` | string | 否 | - | 传 `1` 排除 NPC 战报 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 1000,
        "battle_id": 500001,
        "time": 1710000000,
        "wid": "2110195",
        "attack_name": "张三",
        "attack_union_name": "率土有米",
        "defend_name": "李四",
        "defend_union_name": "天下无双",
        "attack_hp": 30000,
        "defend_hp": 25000,
        "npc": 0,
        "result": 1
      }
    ],
    "total": 5000,
    "page": 1,
    "page_size": 20
  }
}
```

---

### 4.5 排行榜抓包开关

#### 4.5.1 开启排行榜抓包

**GET/POST** `/v1/enable/getLeaderboard`

开启排行榜数据抓取（协议号 700/514/6314）。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

---

#### 4.5.2 关闭排行榜抓包

**GET/POST** `/v1/disable/getLeaderboard`

关闭排行榜数据抓取。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": null
}
```

---

### 4.6 聊天消息抓包（724协议）

#### 4.6.1 开启聊天消息抓包

**GET/POST** `/v1/enable/getChatMessage`

开启聊天消息数据抓取（协议号 724）。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "已开启聊天消息抓取 (cmd 724)",
  "data": null
}
```

---

#### 4.6.2 关闭聊天消息抓包

**GET/POST** `/v1/disable/getChatMessage`

关闭聊天消息数据抓取。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "已关闭聊天消息抓取",
  "data": null
}
```

---

#### 4.6.3 获取聊天消息列表

**GET** `/v1/chat/messages`

获取聊天消息列表，支持分页和多种筛选条件。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量（1-100） |
| `alliance_name` | string | 否 | - | 同盟名称模糊搜索 |
| `player_name` | string | 否 | - | 玩家名称模糊搜索 |
| `content` | string | 否 | - | 消息内容关键词搜索 |
| `start_time` | int64 | 否 | - | 开始时间戳（Unix） |
| `end_time` | int64 | 否 | - | 结束时间戳（Unix） |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 1,
        "msg_id": 403026,
        "msg_type": 9,
        "content": "这波武勋我收下了！",
        "time": 1777377408,
        "player_id": 43083,
        "player_name": "茶丨小帅",
        "player_full_name": "茶丨小帅#8319204",
        "alliance_name": "一品茶社",
        "alliance_id": 1094,
        "position": 1,
        "server_id": 44511,
        "coordinates": "0,0",
        "hero_id": 120103
      }
    ],
    "total": 18,
    "page": 1,
    "page_size": 20
  }
}
```

**724协议数据结构说明：**

| 字段 | 说明 |
|------|------|
| `msg_id` | 消息唯一ID |
| `msg_type` | 消息类型（9=聊天消息） |
| `content` | 消息内容 |
| `time` | 发送时间（Unix时间戳） |
| `player_id` | 玩家ID |
| `player_name` | 玩家名称（去掉#后缀） |
| `player_full_name` | 玩家全名（含#ID） |
| `alliance_name` | 同盟名称 |
| `alliance_id` | 同盟ID |
| `position` | 职位（0=成员, 1=官员, 2=副盟主, 13=特殊） |
| `server_id` | 区服ID |
| `coordinates` | 坐标（"x,y"格式） |
| `hero_id` | 武将/头像ID |

---

#### 4.6.4 获取聊天消息统计

**GET** `/v1/chat/stats`

获取聊天消息的统计信息，包括同盟消息统计和发言排行。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "total_messages": 18,
    "capture_enabled": true,
    "alliance_stats": [
      {
        "alliance_name": "一品茶社",
        "msg_count": 10,
        "player_count": 4
      },
      {
        "alliance_name": "武安丨",
        "msg_count": 5,
        "player_count": 3
      }
    ],
    "top_players": [
      {
        "player_id": 43083,
        "player_name": "茶丨小帅",
        "player_full_name": "茶丨小帅#8319204",
        "alliance_name": "一品茶社",
        "msg_count": 5
      }
    ]
  }
}
```

---

#### 4.6.5 删除聊天消息

**DELETE** `/v1/chat/messages`

删除聊天消息，可按时间范围删除。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `before_time` | int64 | 否 | - | 删除此时间戳之前的消息（Unix时间戳），不传则清空所有 |

**响应示例：**

```json
{
  "code": 200,
  "message": "删除成功",
  "data": 18
}
```

---

### 4.7 成员历史

#### 4.7.1 获取成员历史记录

**GET** `/v1/member/history`

获取同盟成员加入/退出的历史记录。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量 |
| `action` | string | 否 | - | 筛选类型：`join` 加入，`leave` 退出 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 1,
        "player_name": "张三",
        "player_id": 101,
        "action": "join",
        "action_time": 1710000000,
        "group_name": "一团",
        "power": 35000,
        "created_at": "2024-03-10T12:00:00Z"
      }
    ],
    "total": 50,
    "page": 1
  }
}
```

**MemberHistory 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 记录 ID |
| `player_name` | string | 成员名称 |
| `player_id` | int | 成员 ID |
| `action` | string | 操作类型：`join` 加入，`leave` 退出 |
| `action_time` | int64 | 操作时间戳 |
| `group_name` | string | 当时所在分组 |
| `power` | int | 当时势力值 |
| `created_at` | time | 记录创建时间 |

---

### 4.8 翻地记录

#### 4.8.1 获取翻地记录

**GET** `/v1/land/records`

获取翻地记录列表，支持多种筛选条件。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量 |
| `player_name` | string | 否 | - | 玩家名称模糊搜索 |
| `is_success` | string | 否 | - | 筛选结果：`1` 成功，`0` 失败 |
| `start_time` | string | 否 | - | 开始时间戳（秒） |
| `end_time` | string | 否 | - | 结束时间戳（秒） |
| `only_members` | string | 否 | `1` | 是否只显示同盟成员，`1` 是，`0` 否 |
| `group_name` | string | 否 | - | 按团筛选 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 1,
        "player_id": 101,
        "player_name": "张三",
        "land_pos": 2110195,
        "land_name": "洛阳",
        "land_level": 5,
        "attack_time": 1710000000,
        "battle_id": 500001,
        "is_success": 1,
        "defender_name": "李四",
        "created_at": "2024-03-10T12:00:00Z"
      }
    ],
    "total": 200,
    "page": 1
  }
}
```

**LandRecord 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 记录 ID |
| `player_id` | int | 玩家 ID |
| `player_name` | string | 玩家名称 |
| `land_pos` | int | 土地坐标 |
| `land_name` | string | 土地名称 |
| `land_level` | int | 土地等级 |
| `attack_time` | int64 | 攻击时间戳 |
| `battle_id` | int64 | 关联战报 ID |
| `is_success` | int | 是否成功（1 成功，0 失败） |
| `defender_name` | string | 防守方名称 |
| `created_at` | time | 记录创建时间 |

---

#### 4.8.2 导出翻地记录 Excel

**GET** `/v1/land/records/export`

导出翻地记录为 Excel 文件。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `player_name` | string | 否 | - | 玩家名称模糊搜索 |
| `is_success` | string | 否 | - | 筛选结果 |
| `start_time` | string | 否 | - | 开始时间戳 |
| `end_time` | string | 否 | - | 结束时间戳 |
| `only_members` | string | 否 | `1` | 是否只显示同盟成员 |
| `group_name` | string | 否 | - | 按团筛选/导出 |

**响应：** 直接下载 Excel 文件，文件名格式为 `翻地记录_YYYYMMDDHHmmss.xlsx`。

Excel 表头：玩家名称 | 土地位置 | 土地名称 | 土地等级 | 结果 | 防守方 | 时间

---

#### 4.8.3 翻地记录统计

**GET** `/v1/land/records/stats`

获取翻地记录的按玩家统计信息。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `player_name` | string | 否 | 玩家名称模糊搜索 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "list": [
      {
        "player_id": 101,
        "player_name": "张三",
        "total_count": 50,
        "success_count": 45,
        "fail_count": 5
      }
    ]
  }
}
```

**LandRecordStats 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `player_id` | int | 玩家 ID |
| `player_name` | string | 玩家名称 |
| `total_count` | int | 总翻地次数 |
| `success_count` | int | 成功次数 |
| `fail_count` | int | 失败次数 |

---

### 4.9 队伍查询

#### 4.9.1 获取玩家队伍

**GET** `/v1/stzb/player/team/get`

获取玩家队伍数据。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `atkname` | string | 否 | 玩家名称筛选 |
| `atkunionname` | string | 否 | 同盟名称筛选 |
| `idu` | string | 否 | 队伍 ID 筛选 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": [
    {
      "team_key": "28011861",
      "player_id": 2801186,
      "union_id": 1001,
      "pos1": 1,
      "pos2": 2,
      "advance": "0,0;0,0;0,0;",
      "hero_levels": "3,52;3,23;3,13;",
      "timestamp1": 1710000000,
      "timestamp2": 1710000000,
      "raw_data": "..."
    }
  ]
}
```

**PlayerTeamData 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `team_key` | string | 队伍唯一键（如 UID*10+1） |
| `player_id` | int | 玩家 UID |
| `union_id` | int | 同盟 ID |
| `pos1` | int | 位置 1 |
| `pos2` | int | 位置 2 |
| `advance` | string | 进阶/兵种信息 |
| `hero_levels` | string | 武将星级/等级 |
| `timestamp1` | int64 | 时间戳 1 |
| `timestamp2` | int64 | 时间戳 2 |
| `raw_data` | string | 完整原始数据 |

---

#### 4.9.2 按关键词获取队伍

**GET** `/v1/stzb/player/team/getByKey`

按队伍关键词（team_key）获取队伍数据。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `key` | string | 是 | 队伍唯一键（如 UID*10+1） |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "team_key": "28011861",
    "player_id": 2801186,
    "union_id": 1001,
    "pos1": 1,
    "pos2": 2,
    "advance": "0,0;0,0;0,0;",
    "hero_levels": "3,52;3,23;3,13;",
    "timestamp1": 1710000000,
    "timestamp2": 1710000000,
    "raw_data": "..."
  }
}
```

**错误情况：**

| code | message | 说明 |
|------|---------|------|
| 400 | 参数 key 不能为空 | 缺少必填参数 |
| 400 | 请先选择数据库 | 未关联数据库 |
| 404 | 未找到该队伍数据 | 队伍不存在 |

---

### 4.10 排行榜

#### 4.10.1 同盟排行榜

**GET** `/v1/stzb/leaderboard/union`

获取同盟排行榜数据。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `limit` | int | 否 | 50 | 返回数量上限（最大 500） |
| `name` | string | 否 | - | 同盟名称模糊搜索 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": 1,
        "rank": 1,
        "union_id": 1001,
        "name": "率土有米",
        "power": 50000000,
        "total_member": 150,
        "total_npc_city": 10,
        "region": 1,
        "refresh_time": 1710000000,
        "source_cmd": 700,
        "capture_time": 1710000000
      }
    ],
    "count": 50
  }
}
```

**UnionLeaderboard 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 记录 ID |
| `rank` | int | 排名 |
| `union_id` | int64 | 同盟 ID |
| `name` | string | 同盟名称 |
| `power` | int64 | 势力值 |
| `total_member` | int | 成员总数 |
| `total_npc_city` | int | NPC 城池数 |
| `region` | int | 州 |
| `refresh_time` | int64 | 刷新时间 |
| `source_cmd` | int | 来源协议号 |
| `capture_time` | int64 | 抓取时间 |

---

#### 4.10.2 个人积分排行榜

**GET** `/v1/stzb/leaderboard/personal`

获取个人积分事件排行榜数据，关联 team_user 表显示玩家名称。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `limit` | int | 否 | 200 | 返回数量上限（最大 1000） |
| `event_id` | string | 否 | - | 事件 ID 筛选 |
| `object_id` | string | 否 | - | 对象 ID 筛选 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": 1,
        "event_id": 100,
        "object_id": 2801186,
        "param_raw": "500,12000",
        "param_a": "500",
        "param_b": "12000",
        "extra_raw": "...",
        "flag": 0,
        "source_cmd": 514,
        "capture_time": 1710000000,
        "player_name": "张三"
      }
    ],
    "count": 200
  }
}
```

**PersonalLeaderboard 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 记录 ID |
| `event_id` | int64 | 事件 ID |
| `object_id` | int64 | 对象 ID |
| `param_raw` | string | 原始参数 |
| `param_a` | string | 参数 A（从 param_raw 拆分） |
| `param_b` | string | 参数 B（从 param_raw 拆分） |
| `extra_raw` | string | 附加数据 |
| `flag` | int | 标记 |
| `source_cmd` | int | 来源协议号 |
| `capture_time` | int64 | 抓取时间 |
| `player_name` | string | 玩家名称（关联 team_user） |

---

#### 4.10.3 个人领地排行

**GET** `/v1/stzb/leaderboard/territory`

获取个人领地排行数据，关联 team_user 表显示玩家名称。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `limit` | int | 否 | 100 | 返回数量上限（最大 500） |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": 1,
        "rank": 1,
        "player_pos": 2110195,
        "alliance_id": 1001,
        "territory_ids": "1,2,3,4,5",
        "territory_count": 5,
        "source_cmd": 6314,
        "capture_time": 1710000000,
        "player_name": "张三"
      }
    ],
    "count": 100
  }
}
```

**PlayerTerritoryRank 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 记录 ID |
| `rank` | int | 排名 |
| `player_pos` | int64 | 玩家坐标 |
| `alliance_id` | int64 | 同盟 ID |
| `territory_ids` | string | 领地 ID 列表（逗号分隔） |
| `territory_count` | int | 领地数量 |
| `source_cmd` | int | 来源协议号 |
| `capture_time` | int64 | 抓取时间 |
| `player_name` | string | 玩家名称（关联 team_user） |

---

### 4.10 每日报告

#### 4.10.1 获取每日报告列表

**GET** `/v1/daily-report/list`

获取每日报告列表，按日期降序排列。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量（1-100） |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 1,
        "date": "2024-03-10",
        "db_name": "张三_1区",
        "content": "...",
        "land_stats": "...",
        "member_changes": "...",
        "task_attendance": "...",
        "member_list": "...",
        "wu_stats": "...",
        "created_at": "2024-03-10T12:00:00Z"
      }
    ],
    "total": 30,
    "page": 1,
    "page_size": 20
  }
}
```

**DailyReport 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 记录 ID |
| `date` | string | 报告日期（格式 YYYY-MM-DD） |
| `db_name` | string | 对应数据库名称 |
| `content` | string | JSON 格式的报告内容 |
| `land_stats` | string | 翻地统计 JSON |
| `member_changes` | string | 成员变动 JSON |
| `task_attendance` | string | 任务出勤 JSON |
| `member_list` | string | 同盟成员列表 JSON |
| `wu_stats` | string | 武勋统计 JSON |
| `created_at` | time | 创建时间 |

---

#### 4.10.2 获取指定日期报告

**GET** `/v1/daily-report/:date`

获取指定日期的每日报告详情，包含解析后的内容。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `date` | string | 日期，格式 YYYY-MM-DD |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "report": {
      "id": 1,
      "date": "2024-03-10",
      "content": "...",
      "land_stats": "...",
      "member_changes": "...",
      "task_attendance": "...",
      "member_list": "...",
      "wu_stats": "..."
    },
    "content": {
      "land_stats": { "groups": [] },
      "member_changes": { "groups": [] },
      "task_attendance": { "tasks": [] },
      "member_list": { "members": [] },
      "wu_stats": { "groups": [] }
    }
  }
}
```

---

#### 4.10.3 获取指定日期报告文本

**GET** `/v1/daily-report/:date/text`

获取指定日期每日报告的纯文本格式。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `date` | string | 日期，格式 YYYY-MM-DD |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "date": "2024-03-10",
    "text": "=== 2024-03-10 每日报告 ===\n\n【翻地统计】\n一团: 总50次, 成功45次\n二团: 总30次, 成功28次\n..."
  }
}
```

---

#### 4.10.4 生成今日报告

**POST** `/v1/daily-report/generate`

手动触发生成今日的每日报告。

**请求参数：** 无

**响应示例：**

```json
{
  "code": 200,
  "message": "报告生成成功",
  "data": null
}
```

---

#### 4.10.5 删除指定日期报告

**DELETE** `/v1/daily-report/:date`

删除指定日期的每日报告。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `date` | string | 日期，格式 YYYY-MM-DD |

**响应示例：**

```json
{
  "code": 200,
  "message": "删除成功",
  "data": 1
}
```

---

## 五、管理员接口

> 所有管理员接口需要 `role=admin` 权限。

### 5.1 用户管理

#### 5.1.1 获取用户列表

**GET** `/v1/admin/users`

获取系统用户列表。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | int | 否 | 1 | 页码 |
| `page_size` | int | 否 | 20 | 每页数量 |

**响应示例：**

```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 1,
        "username": "player1",
        "nickname": "玩家1",
        "role": "user",
        "status": 1,
        "last_login_at": "2024-03-10T12:00:00Z",
        "last_login_ip": "192.168.1.100",
        "created_at": "2024-01-01T00:00:00Z",
        "database_id": 3
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

**User 数据结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 用户 ID |
| `username` | string | 用户名 |
| `nickname` | string | 昵称 |
| `role` | string | 角色：`admin` 或 `user` |
| `status` | int | 状态：1 正常，0 禁用 |
| `last_login_at` | time | 最后登录时间 |
| `last_login_ip` | string | 最后登录 IP |
| `created_at` | time | 创建时间 |
| `database_id` | uint | 绑定的数据库 ID |

---

#### 5.1.2 重置用户密码

**POST** `/v1/admin/users/resetPassword`

管理员重置指定用户的密码。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | 是 | 目标用户 ID |
| `new_password` | string | 是 | 新密码 |

**响应示例：**

```json
{
  "code": 200,
  "message": "密码重置成功",
  "data": null
}
```

---

#### 5.1.3 更新用户状态

**POST** `/v1/admin/users/status`

管理员更新用户状态（启用/禁用）。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | 是 | 目标用户 ID |
| `status` | string | 是 | 状态值：1 启用，0 禁用 |

**响应示例：**

```json
{
  "code": 200,
  "message": "状态更新成功",
  "data": null
}
```

---

#### 5.1.4 更新用户角色

**POST** `/v1/admin/users/role`

管理员更新用户角色。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | 是 | 目标用户 ID |
| `role` | string | 是 | 角色值：`admin` 或 `user` |

**响应示例：**

```json
{
  "code": 200,
  "message": "角色更新成功",
  "data": null
}
```

---

#### 5.1.5 删除用户

**DELETE** `/v1/admin/users/:id`

管理员删除指定用户。

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 用户 ID |

**响应示例：**

```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

---

### 5.2 数据清理

#### 5.2.1 执行数据清理

**POST** `/v1/admin/cleanup/execute`

手动触发数据清理任务。

**请求参数（Form 表单）：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `type` | string | 否 | `auto` | 清理类型：`auto` 自动清理（7天前的数据），`all_reports` 清理所有战报 |

**响应示例：**

```json
{
  "code": 200,
  "message": "清理任务已启动，请稍后查看日志",
  "data": null
}
```

---

## 六、中间件说明

### 6.1 HostCheck 主机名检查

当 `.env` 中 `ENABLE_HOST_CHECK=true` 时启用。拒绝通过 IP 地址直接访问，只允许通过域名访问。

**触发条件：** 请求的 Host 头为 IP 地址格式。

**响应：**

```json
{
  "code": 500,
  "message": "禁止通过 IP 地址直接访问，请使用域名访问",
  "data": null
}
```

### 6.2 AuthRequired 认证中间件

从请求中获取 Session ID，验证用户身份。同时尝试获取数据库连接：

1. 从 Session 获取 `database_id`
2. 从请求参数 `db_id` 获取
3. 从用户记录获取最近绑定的 `database_id`
4. 从用户可见数据库列表获取第一个

**未认证响应：**

```json
{
  "code": 401,
  "message": "请先登录",
  "data": null
}
```

### 6.3 DBRequired 数据库中间件

验证当前请求是否已关联数据库连接。

**未选择数据库响应：**

```json
{
  "code": 400,
  "message": "请先选择数据库",
  "data": null
}
```

### 6.4 AdminRequired 管理员中间件

验证当前用户是否为管理员。

**无权限响应：**

```json
{
  "code": 403,
  "message": "需要管理员权限",
  "data": null
}
```

### 6.5 ShareDBRequired 分享数据库中间件

从 URL 参数 `db_id` 获取数据库连接，用于无需登录的分享场景。

**缺少参数响应：**

```json
{
  "code": 400,
  "message": "缺少数据库参数",
  "data": null
}
```

**数据库ID无效响应：**

```json
{
  "code": 400,
  "message": "数据库ID无效",
  "data": null
}
```

**数据库不存在响应：**

```json
{
  "code": 400,
  "message": "数据库不存在",
  "data": null
}
```

**数据库连接失败响应：**

```json
{
  "code": 500,
  "message": "数据库连接失败",
  "data": null
}
```

---

## 七、数据模型

### 7.1 User 用户

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 用户 ID |
| `username` | string | 用户名（唯一） |
| `password` | string | 密码（bcrypt 加密） |
| `nickname` | string | 昵称 |
| `role` | string | 角色：`admin` 或 `user` |
| `status` | int | 状态：1 正常，0 禁用 |
| `database_id` | uint | 绑定的数据库 ID |
| `last_login_at` | time | 最后登录时间 |
| `last_login_ip` | string | 最后登录 IP |
| `created_at` | time | 创建时间 |
| `updated_at` | time | 更新时间 |

### 7.2 GameDatabase 游戏数据库

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 数据库 ID |
| `name` | string | 数据库名称（唯一标识） |
| `display_name` | string | 显示名称 |
| `server` | string | 服务器 |
| `state` | string | 状态 |
| `alliance_name` | string | 同盟名称 |
| `bind_ip` | string | 绑定内网 IP |
| `priority` | int | 优先级 |
| `user_id` | uint | 认领用户 ID |
| `created_at` | time | 创建时间 |
| `updated_at` | time | 更新时间 |

### 7.3 TeamUser 同盟成员

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 成员 ID |
| `name` | string | 成员名称 |
| `contribute_total` | int | 总贡献 |
| `contribute_week` | int | 本周贡献 |
| `pos` | int | 坐标 |
| `power` | int | 势力值 |
| `wu` | int | 武勋 |
| `group` | string | 分组名称 |
| `join_time` | int | 加入时间戳 |

### 7.4 Task 任务

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 任务 ID |
| `status` | int | 任务状态 |
| `name` | string | 任务名称 |
| `time` | int | 任务开始时间戳 |
| `end_time` | int | 任务结束时间戳 |
| `pos` | int | 任务坐标（格式：X*10000+Y） |
| `target` | []string | 目标分组列表 |
| `target_user_num` | int | 目标人数 |
| `complete_user_num` | int | 已完成人数 |
| `user_list` | map | 参与成员详情 |
| `created_at` | int64 | 创建时间戳 |

### 7.5 Report 考勤战报

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 记录 ID |
| `wid` | int | 战斗地点坐标 |
| `attack_name` | string | 进攻方名称 |
| `attack_base_heroid` | int | 进攻方大营武将 ID |
| `garrison` | int | 是否驻守（0 攻城，1 拆迁） |
| `time` | int64 | 战斗时间戳 |

### 7.6 BattleReport 详细战报

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 记录 ID |
| `battle_id` | int64 | 战斗 ID（唯一） |
| `time` | int64 | 战斗时间戳 |
| `wid` | string | 战斗地点坐标 |
| `wid_name` | string | 战斗地点名称 |
| `attack_name` | string | 进攻方名称 |
| `attack_union_name` | string | 进攻方同盟名称 |
| `attack_clan_name` | string | 进攻方家族名称 |
| `attack_idu` | string | 进攻方队伍 ID |
| `defend_name` | string | 防守方名称 |
| `defend_union_name` | string | 防守方同盟名称 |
| `defend_clan_name` | string | 防守方家族名称 |
| `defend_idu` | string | 防守方队伍 ID |
| `attack_hp` | int64 | 进攻方总兵力 |
| `defend_hp` | int64 | 防守方总兵力 |
| `attack_hero1_id` | int64 | 进攻方大营武将 ID |
| `attack_hero2_id` | int64 | 进攻方中军武将 ID |
| `attack_hero3_id` | int64 | 进攻方前锋武将 ID |
| `attack_hero1_level` | int64 | 进攻方大营武将等级 |
| `attack_hero2_level` | int64 | 进攻方中军武将等级 |
| `attack_hero3_level` | int64 | 进攻方前锋武将等级 |
| `attack_hero1_star` | int64 | 进攻方大营武将红度 |
| `attack_hero2_star` | int64 | 进攻方中军武将红度 |
| `attack_hero3_star` | int64 | 进攻方前锋武将红度 |
| `attack_total_star` | int64 | 进攻方总红度 |
| `defend_hero1_id` | int64 | 防守方大营武将 ID |
| `defend_hero2_id` | int64 | 防守方中军武将 ID |
| `defend_hero3_id` | int64 | 防守方前锋武将 ID |
| `defend_hero1_level` | int64 | 防守方大营武将等级 |
| `defend_hero2_level` | int64 | 防守方中军武将等级 |
| `defend_hero3_level` | int64 | 防守方前锋武将等级 |
| `defend_hero1_star` | int64 | 防守方大营武将红度 |
| `defend_hero2_star` | int64 | 防守方中军武将红度 |
| `defend_hero3_star` | int64 | 防守方前锋武将红度 |
| `defend_total_star` | int64 | 防守方总红度 |
| `npc` | int64 | 是否为 NPC 战斗 |
| `result` | int64 | 战斗结果 |
| `attack_advance` | string | 进攻方武将进阶信息 |
| `attack_all_hero_info` | string | 进攻方武将信息 |
| `attacker_gear_info` | string | 进攻方宝物信息 |
| `defend_advance` | string | 防守方武将进阶信息 |
| `defend_all_hero_info` | string | 防守方武将信息 |
| `defender_gear_info` | string | 防守方宝物信息 |
| `attack_hero_type` | string | 进攻方武将兵种信息 |
| `attack_hero_type_advance` | string | 进攻方武将兵种进阶信息 |
| `defend_hero_type` | string | 防守方武将兵种信息 |
| `defend_hero_type_advance` | string | 防守方武将兵种进阶信息 |
| `all_skill_info` | string | 技能信息 |

### 7.7 MemberHistory 成员变动历史

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 记录 ID |
| `player_id` | int | 成员 ID |
| `name` | string | 成员名称 |
| `action` | string | 操作类型：`join` 加入，`leave` 退出 |
| `action_time` | int64 | 操作时间戳 |
| `group_name` | string | 当时所在分组 |
| `power` | int | 当时势力值 |
| `created_at` | time | 记录创建时间 |

### 7.8 LandRecord 翻地记录

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 记录 ID |
| `player_id` | int | 玩家 ID |
| `player_name` | string | 玩家名称 |
| `land_pos` | int | 土地坐标 |
| `land_name` | string | 土地名称 |
| `land_level` | int | 土地等级 |
| `attack_time` | int64 | 攻击时间戳 |
| `battle_id` | int64 | 关联战报 ID |
| `is_success` | int | 是否成功（1 成功，0 失败） |
| `defender_name` | string | 防守方名称 |
| `created_at` | time | 记录创建时间 |

### 7.9 PlayerTeamData 玩家队伍数据

| 字段 | 类型 | 说明 |
|------|------|------|
| `team_key` | string | 队伍唯一键（如 UID*10+1） |
| `player_id` | int | 玩家 UID |
| `union_id` | int | 同盟 ID |
| `pos1` | int | 位置 1 |
| `pos2` | int | 位置 2 |
| `advance` | string | 进阶/兵种信息 |
| `hero_levels` | string | 武将星级/等级 |
| `timestamp1` | int64 | 时间戳 1 |
| `timestamp2` | int64 | 时间戳 2 |
| `raw_data` | string | 完整原始数据 |

### 7.10 UnionLeaderboard 同盟排行榜

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 记录 ID |
| `rank` | int | 排名 |
| `name` | string | 同盟名称 |
| `server_id` | int | 服务器 ID |
| `score` | int64 | 积分 |
| `source_cmd` | int | 来源协议号 |
| `capture_time` | int64 | 抓取时间 |

### 7.11 PersonalLeaderboard 个人积分排行榜

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 记录 ID |
| `event_id` | int64 | 事件 ID |
| `object_id` | int64 | 对象 ID |
| `param_raw` | string | 原始参数 |
| `extra_raw` | string | 附加数据 |
| `flag` | int | 标记 |
| `source_cmd` | int | 来源协议号 |
| `capture_time` | int64 | 抓取时间 |

### 7.12 PlayerTerritoryRank 个人领地排行

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 记录 ID |
| `rank` | int | 排名 |
| `player_pos` | int64 | 玩家坐标 |
| `alliance_id` | int64 | 同盟 ID |
| `territory_ids` | string | 领地 ID 列表（逗号分隔） |
| `territory_count` | int | 领地数量 |
| `source_cmd` | int | 来源协议号 |
| `capture_time` | int64 | 抓取时间 |

### 7.13 DailyReport 每日报告

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 记录 ID |
| `date` | string | 报告日期（格式 YYYY-MM-DD） |
| `db_name` | string | 对应数据库名称 |
| `content` | string | JSON 格式的报告内容 |
| `land_stats` | string | 翻地统计 JSON |
| `member_changes` | string | 成员变动 JSON |
| `task_attendance` | string | 任务出勤 JSON |
| `member_list` | string | 同盟成员列表 JSON |
| `wu_stats` | string | 武勋统计 JSON |
| `created_at` | time | 创建时间 |

### 7.14 SystemConfig 系统配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uint | 记录 ID |
| `key` | string | 配置键（唯一） |
| `value` | string | 配置值 |

---

## 八、配置说明

### 8.1 环境变量（.env 文件）

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `SERVER_PORT` | string | `9527` | 服务监听端口 |
| `DB_TYPE` | string | `sqlite` | 系统数据库类型（sqlite/mysql） |
| `DB_PATH` | string | `data/stzbHelper.db` | SQLite 数据库路径 |
| `DB_HOST` | string | - | MySQL 主机地址 |
| `DB_PORT` | string | - | MySQL 端口 |
| `DB_USER` | string | - | MySQL 用户名 |
| `DB_PASSWORD` | string | - | MySQL 密码 |
| `DB_NAME` | string | - | MySQL 数据库名 |
| `GAME_DB_DIR` | string | `data/game_dbs` | 游戏数据库存储目录 |
| `ENABLE_HOST_CHECK` | bool | `false` | 是否启用主机名检查（禁止 IP 直接访问） |
| `CAPTURE_INTERFACE` | string | - | 抓包网络接口 |
| `CAPTURE_FILTER` | string | - | 抓包 BPF 过滤器 |

---

## 九、错误码汇总

| code | 说明 | 常见场景 |
|------|------|----------|
| 200 | 成功 | 请求处理成功 |
| 400 | 请求参数错误 | 缺少必填参数、参数格式错误、未选择数据库 |
| 401 | 未认证 | 未登录或 Session 过期 |
| 403 | 无权限 | 非管理员访问管理员接口 |
| 404 | 资源不存在 | 战报/任务/用户不存在 |
| 500 | 服务器内部错误 | 数据库错误、功能开发中 |

---

## 十、接口索引

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/v1/auth/register` | 无 | 用户注册 |
| POST | `/v1/auth/login` | 无 | 用户登录 |
| POST | `/v1/auth/logout` | 无 | 用户登出 |
| POST | `/v1/packet-capture/start` | 无 | 开始抓包 |
| POST | `/v1/packet-capture/stop` | 无 | 停止抓包 |
| GET | `/v1/packet-capture/stats` | 无 | 获取抓包统计 |
| GET | `/v1/packet-capture/packets` | 无 | 获取抓包数据 |
| GET | `/v1/packet-capture/export/csv` | 无 | 导出 CSV |
| GET | `/v1/packet-capture/export/json` | 无 | 导出 JSON |
| GET | `/v1/cleanup/timestamp` | 无 | 获取清理时间戳 |
| GET | `/v1/share/taskList` | db_id | 分享-任务列表 |
| GET | `/v1/share/task/:tid` | db_id | 分享-任务详情 |
| GET | `/v1/share/taskReportList/:tid` | db_id | 分享-战报列表 |
| GET | `/v1/share/reportNum/:tid` | db_id | 分享-战报数量 |
| GET | `/v1/share/teamGroups` | db_id | 分享-队伍分组 |
| GET | `/v1/user/info` | 登录 | 获取用户信息 |
| POST | `/v1/user/changePassword` | 登录 | 修改密码 |
| POST | `/v1/user/selectDatabase` | 登录 | 选择数据库 |
| GET | `/v1/security/host-check` | 管理员 | 获取主机检查配置 |
| POST | `/v1/security/host-check/save` | 管理员 | 保存主机检查配置 |
| GET | `/v1/ip-whitelist` | 管理员 | 获取 IP 白名单 |
| POST | `/v1/ip-whitelist/save` | 管理员 | 保存 IP 白名单 |
| GET | `/v1/databases` | 登录 | 数据库列表 |
| GET | `/v1/databases/:id` | 登录 | 数据库详情 |
| POST | `/v1/databases/create` | 登录 | 创建数据库 |
| POST | `/v1/databases/autoGenerate` | 登录 | 自动生成数据库 |
| POST | `/v1/databases/:id/claim` | 登录 | 认领数据库 |
| POST | `/v1/databases/:id/release` | 登录 | 释放数据库 |
| PUT | `/v1/databases/:id` | 登录 | 更新数据库 |
| DELETE | `/v1/databases/:id` | 登录 | 删除数据库 |
| GET/POST | `/v1/getTeamUser` | 登录+DB | 同盟成员列表 |
| GET/POST | `/v1/getTeamGroup` | 登录+DB | 同盟分组 |
| GET/POST | `/v1/getTaskList` | 登录+DB | 任务列表 |
| GET/POST | `/v1/getTask/:tid` | 登录+DB | 任务详情 |
| POST | `/v1/createTask` | 登录+DB | 创建任务 |
| GET/POST | `/v1/deleteTask/:tid` | 登录+DB | 删除任务 |
| POST | `/v1/enable/getReport` | 登录+DB | 开启战报抓取 |
| GET/POST | `/v1/disable/getReport` | 登录+DB | 关闭战报抓取 |
| GET/POST | `/v1/getReportNumByTaskId/:tid` | 登录+DB | 战报数量 |
| GET/POST | `/v1/getTaskReportList/:tid` | 登录+DB | 战报列表 |
| GET/POST | `/v1/statisticsReport/:tid` | 登录+DB | 战报统计 |
| GET/POST | `/v1/getGroupWu` | 登录+DB | 分组武勋 |
| GET/POST | `/v1/deleteTaskReport/:tid` | 登录+DB | 删除任务战报 |
| GET | `/v1/stzb/report/list` | 登录+DB | 详细战报列表 |
| POST | `/v1/enable/getBattleReport` | 登录+DB | 开启详细战报抓取 |
| GET/POST | `/v1/disable/getBattleReport` | 登录+DB | 关闭详细战报抓取 |
| GET | `/v1/battle/report/:battle_id` | 登录+DB | 战报详情 |
| GET | `/v1/battle/reports` | 登录+DB | 战报分页列表 |
| GET/POST | `/v1/enable/getLeaderboard` | 登录+DB | 开启排行榜抓取 |
| GET/POST | `/v1/disable/getLeaderboard` | 登录+DB | 关闭排行榜抓取 |
| GET | `/v1/member/history` | 登录+DB | 成员历史 |
| GET | `/v1/land/records` | 登录+DB | 翻地记录 |
| GET | `/v1/land/records/export` | 登录+DB | 导出翻地记录 |
| GET | `/v1/land/records/stats` | 登录+DB | 翻地统计 |
| GET | `/v1/stzb/player/team/get` | 登录+DB | 玩家队伍 |
| GET | `/v1/stzb/player/team/getByKey` | 登录+DB | 按键查队伍 |
| GET | `/v1/stzb/leaderboard/union` | 登录+DB | 同盟排行榜 |
| GET | `/v1/stzb/leaderboard/personal` | 登录+DB | 个人积分排行 |
| GET | `/v1/stzb/leaderboard/territory` | 登录+DB | 领地排行 |
| GET | `/v1/daily-report/list` | 登录+DB | 每日报告列表 |
| GET | `/v1/daily-report/:date` | 登录+DB | 每日报告详情 |
| GET | `/v1/daily-report/:date/text` | 登录+DB | 每日报告文本 |
| POST | `/v1/daily-report/generate` | 登录+DB | 生成今日报告 |
| DELETE | `/v1/daily-report/:date` | 登录+DB | 删除每日报告 |
| GET | `/v1/admin/users` | 管理员 | 用户列表 |
| POST | `/v1/admin/users/resetPassword` | 管理员 | 重置密码 |
| POST | `/v1/admin/users/status` | 管理员 | 更新用户状态 |
| POST | `/v1/admin/users/role` | 管理员 | 更新用户角色 |
| DELETE | `/v1/admin/users/:id` | 管理员 | 删除用户 |
| POST | `/v1/admin/cleanup/execute` | 管理员 | 执行数据清理 |