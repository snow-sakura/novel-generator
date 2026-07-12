# TSS 票务系统 - API 接口文档 v3.0

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v3.0.0 |
| 接口协议 | HTTP/HTTPS |
| 数据格式 | JSON |
| 基础路径 | `/api` |
| 认证方式 | Cookie Session |

---

## 通用约定

### 请求头

| Header | 必填 | 说明 |
|--------|------|------|
| Content-Type | POST/PUT | `application/json` |
| Accept | 否 | `application/json` |

### 统一响应格式

**成功响应：**
```json
{
  "success": true,
  "message": "操作描述",
  "data": {}
}
```

**失败响应：**
```json
{
  "success": false,
  "message": "错误描述"
}
```

### 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / 认证失败 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 认证说明

> **注意**：当前版本 API 接口未实现认证校验，所有接口均可匿名访问。
> 
> Web 路由使用 `@login_required` 和 `@admin_required` 装饰器进行认证，但 API 路由未添加。
> 
> **建议**：生产环境应为 API 接口添加认证机制。

---

## 接口列表总览

| 序号 | 接口地址 | 方法 | 功能 | 认证 |
|------|----------|------|------|------|
| 1 | `/api/login` | POST | 用户登录 | 否 |
| 2 | `/api/register` | POST | 用户注册 | 否 |
| 3 | `/api/users` | GET | 获取用户列表 | 否 |
| 4 | `/api/users/<id>` | GET | 获取用户详情 | 否 |
| 5 | `/api/users/<id>` | PUT | 更新用户 | 否 |
| 6 | `/api/users/<id>` | DELETE | 删除用户 | 否 |
| 7 | `/api/destinations` | GET | 获取目的地列表 | 否 |
| 8 | `/api/destinations` | POST | 添加目的地 | 否 |
| 9 | `/api/destinations/<code>` | GET | 获取目的地详情 | 否 |
| 10 | `/api/destinations/<code>` | PUT | 更新目的地 | 否 |
| 11 | `/api/destinations/<code>` | DELETE | 删除目的地 | 否 |
| 12 | `/api/purchase/price` | POST | 计算票价 | 否 |
| 13 | `/api/purchase/buy` | POST | 购买票务 | 否 |
| 14 | `/api/tickets` | GET | 获取订单列表 | 否 |
| 15 | `/api/tickets/<id>` | GET | 获取订单详情 | 否 |
| 16 | `/api/tickets/<id>` | DELETE | 删除订单 | 否 |
| 17 | `/api/dashboard` | GET | 获取仪表盘统计 | 否 |

---

## 详细接口文档

### 1. 用户登录

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/login` |
| 请求方法 | `POST` |
| 需要认证 | 否 |

**请求参数（Body）**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | String | 是 | 用户名 |
| password | String | 是 | 密码 |

**请求示例**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**成功响应**
```json
{
  "success": true,
  "message": "登录成功",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**失败响应**
```json
{
  "success": false,
  "message": "用户名或密码不能为空"
}
```

```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 登录成功 |
| 400 | 参数错误（字段为空） |
| 401 | 用户名或密码错误 |

---

### 2. 用户注册

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/register` |
| 请求方法 | `POST` |
| 需要认证 | 否 |

**请求参数（Body）**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | String | 是 | 用户名 |
| password | String | 是 | 密码 |
| confirm_password | String | 是 | 确认密码（需与 password 一致） |
| email | String | 否 | 邮箱地址 |

**请求示例**
```json
{
  "username": "testuser",
  "password": "123456",
  "confirm_password": "123456",
  "email": "test@example.com"
}
```

**成功响应**
```json
{
  "success": true,
  "message": "注册成功"
}
```

**失败响应**
```json
{
  "success": false,
  "message": "用户名、密码和确认密码不能为空"
}
```

```json
{
  "success": false,
  "message": "两次输入密码不一致"
}
```

```json
{
  "success": false,
  "message": "用户名已存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 注册成功 |
| 400 | 参数错误 / 用户名已存在 |

---

### 3. 获取用户列表

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/users` |
| 请求方法 | `GET` |
| 需要认证 | 否 |

**请求参数（Query）**

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | Integer | 否 | 1 | 页码（从 1 开始） |

**请求示例**
```
GET /api/users?page=1
```

**成功响应**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@tss.com",
      "role": "admin",
      "status": 1,
      "created_at": "2024-01-01 00:00:00"
    }
  ],
  "total": 10
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Array | 用户列表 |
| data[].id | Integer | 用户 ID |
| data[].username | String | 用户名 |
| data[].email | String | 邮箱 |
| data[].role | String | 角色（admin/user） |
| data[].status | Integer | 状态（1 启用/0 禁用） |
| data[].created_at | String | 创建时间 |
| total | Integer | 总记录数 |

| 状态码 | 说明 |
|--------|------|
| 200 | 查询成功 |

---

### 4. 获取用户详情

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/users/<id>` |
| 请求方法 | `GET` |
| 需要认证 | 否 |

**路径参数**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 用户 ID |

**请求示例**
```
GET /api/users/1
```

**成功响应**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@tss.com",
    "role": "admin",
    "status": 1,
    "created_at": "2024-01-01 00:00:00"
  }
}
```

**失败响应**
```json
{
  "success": false,
  "message": "用户不存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 查询成功 |
| 404 | 用户不存在 |

---

### 5. 更新用户

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/users/<id>` |
| 请求方法 | `PUT` |
| 需要认证 | 否 |

**路径参数**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 用户 ID |

**请求参数（Body）**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | String | 是 | 用户名 |
| email | String | 否 | 邮箱 |
| role | String | 否 | 角色（默认 user） |
| status | Integer | 否 | 状态（1 启用/0 禁用，默认 1） |
| password | String | 否 | 新密码（留空则不修改） |

**请求示例**
```json
{
  "username": "admin",
  "email": "admin@tss.com",
  "role": "admin",
  "status": 1,
  "password": "newpassword"
}
```

**成功响应**
```json
{
  "success": true,
  "message": "更新成功"
}
```

**失败响应**
```json
{
  "success": false,
  "message": "用户名不能为空"
}
```

```json
{
  "success": false,
  "message": "用户不存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 更新成功 |
| 400 | 参数错误 |
| 404 | 用户不存在 |

---

### 6. 删除用户

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/users/<id>` |
| 请求方法 | `DELETE` |
| 需要认证 | 否 |

**路径参数**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 用户 ID |

**请求示例**
```
DELETE /api/users/1
```

**成功响应**
```json
{
  "success": true,
  "message": "删除成功"
}
```

**失败响应**
```json
{
  "success": false,
  "message": "用户不存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 删除成功 |
| 404 | 用户不存在 |

---

### 7. 获取目的地列表

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/destinations` |
| 请求方法 | `GET` |
| 需要认证 | 否 |

**请求示例**
```
GET /api/destinations
```

**成功响应**
```json
{
  "success": true,
  "data": [
    {
      "code": "2U0",
      "name": "总站",
      "price": 10.0,
      "stock": 50
    },
    {
      "code": "3K1",
      "name": "南站",
      "price": 8.5,
      "stock": 30
    }
  ]
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Array | 目的地列表 |
| data[].code | String | 目的地代码（唯一标识） |
| data[].name | String | 目的地名称 |
| data[].price | Number | 基础价格（元） |
| data[].stock | Integer | 剩余票数 |

| 状态码 | 说明 |
|--------|------|
| 200 | 查询成功 |

---

### 8. 添加目的地

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/destinations` |
| 请求方法 | `POST` |
| 需要认证 | 否 |

**请求参数（Body）**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| code | String | 是 | 目的地代码（唯一，自动转大写） |
| name | String | 是 | 目的地名称 |
| price | Number | 是 | 基础价格（元） |
| stock | Integer | 是 | 初始库存数量 |

**请求示例**
```json
{
  "code": "5N3",
  "name": "西站",
  "price": 15.00,
  "stock": 40
}
```

**成功响应**
```json
{
  "success": true,
  "message": "添加成功"
}
```

**失败响应**
```json
{
  "success": false,
  "message": "code、name、price、stock 不能为空"
}
```

```json
{
  "success": false,
  "message": "代码已存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 添加成功 |
| 400 | 参数错误 / 代码已存在 |

---

### 9. 获取目的地详情

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/destinations/<code>` |
| 请求方法 | `GET` |
| 需要认证 | 否 |

**路径参数**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | String | 目的地代码 |

**请求示例**
```
GET /api/destinations/2U0
```

**成功响应**
```json
{
  "success": true,
  "data": {
    "code": "2U0",
    "name": "总站",
    "price": 10.0,
    "stock": 50
  }
}
```

**失败响应**
```json
{
  "success": false,
  "message": "目的地不存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 查询成功 |
| 404 | 目的地不存在 |

---

### 10. 更新目的地

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/destinations/<code>` |
| 请求方法 | `PUT` |
| 需要认证 | 否 |

**路径参数**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | String | 目的地代码 |

**请求参数（Body）**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | String | 是 | 目的地名称 |
| price | Number | 是 | 基础价格（元） |
| stock | Integer | 是 | 库存数量 |

**请求示例**
```json
{
  "name": "总站（新）",
  "price": 12.00,
  "stock": 60
}
```

**成功响应**
```json
{
  "success": true,
  "message": "更新成功"
}
```

**失败响应**
```json
{
  "success": false,
  "message": "name、price、stock 不能为空"
}
```

```json
{
  "success": false,
  "message": "目的地不存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 更新成功 |
| 400 | 参数错误 |
| 404 | 目的地不存在 |

---

### 11. 删除目的地

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/destinations/<code>` |
| 请求方法 | `DELETE` |
| 需要认证 | 否 |

**路径参数**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | String | 目的地代码 |

**请求示例**
```
DELETE /api/destinations/2U0
```

**成功响应**
```json
{
  "success": true,
  "message": "删除成功"
}
```

**失败响应**
```json
{
  "success": false,
  "message": "目的地不存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 删除成功 |
| 404 | 目的地不存在 |

---

### 12. 计算票价

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/purchase/price` |
| 请求方法 | `POST` |
| 需要认证 | 否 |

**请求参数（Body）**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dest_code | String | 是 | 目的地代码 |
| ticket_type | String | 是 | 票种（单程票/多次往返票） |
| seat_type | String | 是 | 座位类型（普通座/舒适座） |

**请求示例**
```json
{
  "dest_code": "2U0",
  "ticket_type": "单程票",
  "seat_type": "舒适座"
}
```

**成功响应**
```json
{
  "success": true,
  "data": {
    "dest_code": "2U0",
    "dest_name": "总站",
    "ticket_type": "单程票",
    "seat_type": "舒适座",
    "base_price": 10.0,
    "price": 12.0,
    "stock": 49
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| data.dest_code | String | 目的地代码 |
| data.dest_name | String | 目的地名称 |
| data.ticket_type | String | 票种 |
| data.seat_type | String | 座位类型 |
| data.base_price | Number | 基础价格 |
| data.price | Number | 计算后价格 |
| data.stock | Integer | 剩余库存 |

**失败响应**
```json
{
  "success": false,
  "message": "dest_code、ticket_type、seat_type 不能为空"
}
```

```json
{
  "success": false,
  "message": "目的地不存在"
}
```

```json
{
  "success": false,
  "message": "库存不足"
}
```

```json
{
  "success": false,
  "message": "无效的票种类型"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 计算成功 |
| 400 | 参数错误 / 库存不足 / 无效类型 |
| 404 | 目的地不存在 |

---

### 13. 购买票务

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/purchase/buy` |
| 请求方法 | `POST` |
| 需要认证 | 否 |

**请求参数（Body）**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| dest_code | String | 是 | 目的地代码 |
| ticket_type | String | 是 | 票种（单程票/多次往返票） |
| seat_type | String | 是 | 座位类型（普通座/舒适座） |
| payment_method | String | 是 | 支付方式（MCard/现金） |
| user_id | Integer | 否 | 用户 ID（可选） |

**请求示例**
```json
{
  "dest_code": "2U0",
  "ticket_type": "单程票",
  "seat_type": "舒适座",
  "payment_method": "MCard",
  "user_id": 1
}
```

**成功响应**
```json
{
  "success": true,
  "message": "购票成功",
  "data": {
    "destination": "总站",
    "ticket_type": "单程票",
    "seat_type": "舒适座",
    "price": 12.0,
    "payment_method": "MCard",
    "time": "2024-01-15 10:30:00",
    "ticket_id": 123456
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| data.destination | String | 目的地名称 |
| data.ticket_type | String | 票种 |
| data.seat_type | String | 座位类型 |
| data.price | Number | 实际支付价格 |
| data.payment_method | String | 支付方式 |
| data.time | String | 购票时间 |
| data.ticket_id | Integer | 票务编号（随机生成） |

**失败响应**
```json
{
  "success": false,
  "message": "dest_code、ticket_type、seat_type、payment_method 不能为空"
}
```

```json
{
  "success": false,
  "message": "支付方式无效，仅支持 MCard 或 现金"
}
```

```json
{
  "success": false,
  "message": "库存不足"
}
```

```json
{
  "success": false,
  "message": "购票失败，请重试"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 购票成功 |
| 400 | 参数错误 / 库存不足 / 无效支付方式 |
| 404 | 目的地不存在 |
| 500 | 购票失败（系统异常） |

**说明**：
- 购票成功后自动扣减库存
- 支付方式仅支持 `MCard` 和 `现金`

---

### 14. 获取订单列表

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/tickets` |
| 请求方法 | `GET` |
| 需要认证 | 否 |
| 请求方法 | `GET` |
| 需要认证 | 否 |

**请求参数（Query）**

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | Integer | 否 | 1 | 页码（从 1 开始） |

**请求示例**
```
GET /api/tickets?page=1
```

**成功响应**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "destination_code": "2U0",
      "ticket_type": "单程票",
      "seat_type": "舒适座",
      "price": 12.0,
      "purchase_time": "2024-01-15 10:30:00",
      "payment_method": "MCard",
      "status": "已支付",
      "user_id": 2,
      "dest_name": "总站"
    }
  ],
  "total": 25
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Array | 订单列表 |
| data[].id | Integer | 订单 ID |
| data[].destination_code | String | 目的地代码 |
| data[].ticket_type | String | 票种（单程票/多次往返票） |
| data[].seat_type | String | 座位类型（普通座/舒适座） |
| data[].price | Number | 实际票价 |
| data[].purchase_time | String | 购票时间 |
| data[].payment_method | String | 支付方式（MCard/现金） |
| data[].status | String | 订单状态 |
| data[].user_id | Integer | 购票用户 ID |
| data[].dest_name | String | 目的地名称（关联查询） |
| total | Integer | 总记录数 |

| 状态码 | 说明 |
|--------|------|
| 200 | 查询成功 |

---

### 15. 获取订单详情

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/tickets/<id>` |
| 请求方法 | `GET` |
| 需要认证 | 否 |

**路径参数**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 订单 ID |

**请求示例**
```
GET /api/tickets/1
```

**成功响应**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "destination_code": "2U0",
    "ticket_type": "单程票",
    "seat_type": "舒适座",
    "price": 12.0,
    "purchase_time": "2024-01-15 10:30:00",
    "payment_method": "MCard",
    "status": "已支付",
    "user_id": 2,
    "dest_name": "总站"
  }
}
```

**失败响应**
```json
{
  "success": false,
  "message": "订单不存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 查询成功 |
| 404 | 订单不存在 |

---

### 16. 删除订单

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/tickets/<id>` |
| 请求方法 | `DELETE` |
| 需要认证 | 否 |

**路径参数**

| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | Integer | 订单 ID |

**请求示例**
```
DELETE /api/tickets/1
```

**成功响应**
```json
{
  "success": true,
  "message": "删除成功"
}
```

**失败响应**
```json
{
  "success": false,
  "message": "订单不存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 删除成功（库存自动恢复） |
| 404 | 订单不存在 |

**说明**：删除订单时会自动恢复对应目的地的库存。

---

### 17. 获取仪表盘统计

**基本信息**

| 项目 | 内容 |
|------|------|
| 接口地址 | `/api/dashboard` |
| 请求方法 | `GET` |
| 需要认证 | 否 |

**请求示例**
```
GET /api/dashboard
```

**成功响应**
```json
{
  "success": true,
  "data": {
    "user_count": 15,
    "destination_count": 5,
    "ticket_count": 120,
    "total_revenue": 1580.50,
    "recent_tickets": [
      {
        "id": 1,
        "destination_code": "2U0",
        "ticket_type": "单程票",
        "seat_type": "舒适座",
        "price": 12.0,
        "purchase_time": "2024-01-15 10:30:00",
        "payment_method": "MCard",
        "status": "已支付",
        "user_id": 2,
        "dest_name": "总站"
      }
    ]
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| data.user_count | Integer | 用户总数 |
| data.destination_count | Integer | 目的地总数 |
| data.ticket_count | Integer | 订单总数 |
| data.total_revenue | Number | 总收入 |
| data.recent_tickets | Array | 最近 5 笔订单 |

| 状态码 | 说明 |
|--------|------|
| 200 | 查询成功 |

---

## 价格计算规则

票务价格根据票种和座位类型动态计算：

| 票种 | 座位类型 | 价格倍率 |
|------|----------|----------|
| 单程票 | 普通座 | 1.0x |
| 单程票 | 舒适座 | 1.2x |
| 多次往返票 | 普通座 | 1.5x |
| 多次往返票 | 舒适座 | 1.8x |

**计算公式：** `实际价格 = 基础价格 × 票种倍率 × 座位倍率`

---

## 错误码汇总

| HTTP 状态码 | 接口 | 错误信息 | 说明 |
|-------------|------|----------|------|
| 400 | /api/login | 用户名和密码不能为空 | 缺少必填字段 |
| 400 | /api/register | 用户名、密码和确认密码不能为空 | 缺少必填字段 |
| 400 | /api/register | 两次输入密码不一致 | 密码与确认密码不匹配 |
| 400 | /api/register | 用户名已存在 | 用户名重复 |
| 400 | /api/destinations | code、name、price、stock 不能为空 | 缺少必填字段 |
| 400 | /api/destinations | 代码已存在 | 目的地代码重复 |
| 400 | /api/purchase/price | dest_code、ticket_type、seat_type 不能为空 | 缺少必填字段 |
| 400 | /api/purchase/price | 库存不足 | 目的地库存为 0 |
| 400 | /api/purchase/price | 无效的票种类型 | 票种不在允许范围内 |
| 400 | /api/purchase/price | 无效的座位类型 | 座位类型不在允许范围内 |
| 400 | /api/purchase/buy | dest_code、ticket_type、seat_type、payment_method 不能为空 | 缺少必填字段 |
| 400 | /api/purchase/buy | 支付方式无效，仅支持 MCard 或 现金 | 支付方式不在允许范围内 |
| 400 | /api/purchase/buy | 库存不足 | 目的地库存为 0 |
| 401 | /api/login | 用户名或密码错误 | 认证失败 |
| 404 | /api/users/<id> | 用户不存在 | 用户 ID 无效 |
| 404 | /api/destinations/<code> | 目的地不存在 | 目的地代码无效 |
| 404 | /api/tickets/<id> | 订单不存在 | 订单 ID 无效 |
| 500 | /api/purchase/buy | 购票失败，请重试 | 系统异常 |

---

## 数据库表结构参考

### users（用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 用户 ID |
| username | TEXT | NOT NULL, UNIQUE | 用户名 |
| password | TEXT | NOT NULL | 密码（MD5） |
| email | TEXT | - | 邮箱 |
| role | TEXT | DEFAULT 'user' | 角色（admin/user） |
| status | INTEGER | DEFAULT 1 | 状态（1 启用/0 禁用） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

### destinations（目的地表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| code | TEXT | PRIMARY KEY | 目的地代码 |
| name | TEXT | - | 目的地名称 |
| price | REAL | - | 基础价格 |
| stock | INTEGER | - | 库存数量 |

### tickets（订单表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 订单 ID |
| destination_code | TEXT | FOREIGN KEY | 目的地代码 |
| ticket_type | TEXT | - | 票种 |
| seat_type | TEXT | - | 座位类型 |
| price | REAL | - | 实际票价 |
| purchase_time | DATETIME | - | 购票时间 |
| payment_method | TEXT | - | 支付方式 |
| status | TEXT | - | 订单状态 |
| user_id | INTEGER | FOREIGN KEY | 用户 ID |

---

## 附录：测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
