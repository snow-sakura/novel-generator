# RESTful API 设计规范

## URL 设计

- 使用名词复数：`/users`, `/orders`（非 `/user`, `/order`）
- 嵌套资源：`/users/{id}/orders`
- 版本控制：`/api/v1/users` 或 Header 方式
- 查询参数用于过滤/排序/分页：`?status=active&page=1&limit=20`

## HTTP 方法

| 方法 | 用途 | 幂等 |
|------|------|------|
| GET | 查询资源 | 是 |
| POST | 创建资源 | 否 |
| PUT | 全量更新 | 是 |
| PATCH | 部分更新 | 是 |
| DELETE | 删除资源 | 是 |

## 状态码

- `200` OK - 成功
- `201` Created - 创建成功
- `204` No Content - 删除成功（无返回体）
- `400` Bad Request - 参数错误
- `401` Unauthorized - 未认证
- `403` Forbidden - 无权限
- `404` Not Found - 资源不存在
- `409` Conflict - 冲突（如重复创建）
- `422` Unprocessable Entity - 业务逻辑错误
- `429` Too Many Requests - 限流
- `500` Internal Server Error - 服务器内部错误

## 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { }
}
```

分页响应：
```json
{
  "code": 0,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

## 错误响应

```json
{
  "code": 40001,
  "message": "Invalid parameter: email format",
  "details": {
    "field": "email",
    "reason": "must be a valid email address"
  }
}
```

## 认证与授权

- 使用 Bearer Token（JWT）
- Token 放在 `Authorization` Header
- 敏感操作需要二次验证
- 实现 Token 刷新机制

## 其他

- 所有 API 必须有请求/响应日志
- 关键操作需要幂等性保证
- 文件上传使用 multipart/form-data
- 大文件支持断点续传
