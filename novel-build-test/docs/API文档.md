# API 文档

**基础路径**: `/api/v1`
**认证方式**: JWT Bearer Token（注册/登录除外）

---

## 一、认证

### POST /api/v1/auth/register

注册新用户。

```json
// Request
{ "username": "admin", "email": "admin@aisqa.com", "password": "123456", "display_name": "管理员" }
// Response 201
{ "id": 1, "username": "admin", "email": "admin@aisqa.com", "display_name": "管理员", "role": "engineer", "is_active": true }
```

### POST /api/v1/auth/login

登录获取令牌。

```json
// Request
{ "username": "admin", "password": "123456" }
// Response 200
{ "access_token": "eyJ...", "refresh_token": "eyJ...", "token_type": "bearer", "expires_in": 1800 }
```

### POST /api/v1/auth/refresh

刷新访问令牌。

```json
// Request
{ "refresh_token": "eyJ..." }
// Response 200
{ "access_token": "eyJ...", "refresh_token": "eyJ...", "token_type": "bearer", "expires_in": 1800 }
```

---

## 二、项目管理

### GET /api/v1/projects

获取项目列表（分页，支持搜索）。

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | 页码 |
| page_size | int | 20 | 每页数量 |
| search | str | - | 按名称搜索 |

```json
// Response 200
{ "items": [{ "id": 1, "name": "项目A", "description": "...", "status": "active", "repo_url": "https://...", "owner_id": 1, "created_at": "2026-07-14T10:00:00" }], "total": 1, "page": 1, "page_size": 20, "total_pages": 1 }
```

### POST /api/v1/projects

创建项目。

```json
// Request
{ "name": "项目A", "description": "描述", "repo_url": "https://..." }
// Response 201
{ "id": 1, "name": "项目A", ... }
```

### GET /api/v1/projects/{id}

获取项目详情。

### PUT /api/v1/projects/{id}

更新项目。

```json
// Request
{ "name": "新名称", "status": "archived" }
```

### DELETE /api/v1/projects/{id}

删除项目。返回 204。

### GET /api/v1/projects/{id}/stats

获取项目统计信息。

```json
// Response 200
{ "total_requirements": 12, "total_environments": 3, "total_assets": 45, "total_knowledge": 120 }
```

---

## 三、需求管理

### GET /api/v1/requirements

获取需求列表。

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | 页码 |
| page_size | int | 20 | 每页数量 |
| project_id | int | - | 按项目筛选 |
| status | str | - | 按状态筛选 |
| priority | str | - | 按优先级筛选 |
| search | str | - | 按标题搜索 |

### POST /api/v1/requirements

创建需求。

```json
// Request
{ "project_id": 1, "title": "用户登录", "description": "实现用户名密码登录", "module": "认证", "priority": "P0" }
```

### GET /api/v1/requirements/{id}

获取需求详情。

### PUT /api/v1/requirements/{id}

更新需求。

### DELETE /api/v1/requirements/{id}

删除需求。返回 204。

---

## 四、测试环境

### GET /api/v1/environments

获取环境列表。

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | |
| page_size | int | 20 | |
| project_id | int | - | 按项目筛选 |
| status | str | - | 按状态筛选 |
| type | str | - | 按类型筛选 |

### POST /api/v1/environments

创建环境。

```json
// Request
{ "project_id": 1, "name": "测试环境", "type": "test", "config": { "url": "http://localhost:3000", "db": "test_db" } }
```

### GET /api/v1/environments/{id}

获取环境详情。

### PUT /api/v1/environments/{id}

更新环境。

### DELETE /api/v1/environments/{id}

删除环境。返回 204。

### POST /api/v1/environments/{id}/health-check

执行环境健康检查。

### POST /api/v1/environments/{id}/deploy

部署环境。

---

## 五、测试资产库

### GET /api/v1/assets

获取资产列表。

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | |
| page_size | int | 20 | |
| project_id | int | - | 按项目筛选 |
| type | str | - | 按类型筛选 |
| tags | str | - | 按标签筛选（逗号分隔） |
| search | str | - | 按名称搜索 |

### POST /api/v1/assets

创建资产。

```json
// Request
{ "project_id": 1, "name": "登录测试数据", "type": "data", "tags": "登录,冒烟", "content": "..." }
```

### GET /api/v1/assets/{id}

获取资产详情。

### PUT /api/v1/assets/{id}

更新资产。

### DELETE /api/v1/assets/{id}

删除资产。返回 204。

---

## 六、AI 知识库

### GET /api/v1/knowledge

获取知识条目列表。

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | |
| page_size | int | 20 | |
| project_id | int | - | 按项目筛选（空=全局） |
| source_type | str | - | 按来源筛选 |
| status | str | - | 按状态筛选 |
| search | str | - | 按标题搜索 |

### POST /api/v1/knowledge

创建知识条目。

```json
// Request
{ "project_id": 1, "title": "API 接口文档", "content": "完整文档内容...", "source_type": "document", "tags": "API,文档" }
```

### GET /api/v1/knowledge/{id}

获取知识详情。

### PUT /api/v1/knowledge/{id}

更新知识。

### DELETE /api/v1/knowledge/{id}

删除知识。返回 204。

### POST /api/v1/knowledge/search

语义检索知识库。

```json
// Request
{ "query": "登录测试方法", "project_id": 1, "limit": 5 }
// Response 200
{ "results": [{ "id": 1, "title": "登录测试用例", "content": "...", "score": 0.95, "source_type": "document" }], "total": 3 }
```

### GET /api/v1/knowledge/collections

获取向量集合状态。

```json
// Response 200
{ "collections": [{ "name": "project:1:knowledge", "status": "ready", "points_count": 120, "dimension": 384 }] }
```

---

## 七、设置

### GET /api/v1/settings

获取设置列表。

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| category | str | - | 按分类筛选 (model/prompt/tool/environment/skill) |

### PUT /api/v1/settings/{category}/{key}

更新设置项。

```json
// Request
{ "value": { "api_key": "sk-xxx", "model": "deepseek-v3" }, "description": "DeepSeek 配置" }
```

### GET /api/v1/settings/{category}/{key}

获取单个设置项。

### GET /api/v1/settings/categories

获取所有分类列表。

```json
// Response 200
{ "categories": ["model", "prompt", "tool", "environment", "skill"] }
```

---

## 八、智能体

### POST /api/v1/agents/execute

执行智能体任务。

```json
// Request
{ "project_id": 1, "task_type": "requirement_analysis", "project_name": "项目A", "project_description": "..." }
```

### POST /api/v1/agents/debate

发起智能体辩论。

```json
// Request
{ "topic": "测试策略选择", "pro_side": "自动化优先", "con_side": "手动探索优先" }
```

### GET /api/v1/agents/executions

获取执行记录列表。

### GET /api/v1/agents/executions/{id}

获取执行详情。

### GET /api/v1/agents/costs

获取成本统计。

---

## 九、审计日志

### GET /api/v1/audit-logs

获取审计日志列表。

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | |
| page_size | int | 20 | |
| entity_type | str | - | 按实体类型筛选 |
| entity_id | int | - | 按实体 ID 筛选 |

### GET /api/v1/audit-logs/entity/{type}/{id}

获取指定实体的操作轨迹。

---

## 十、系统

### GET /api/v1/health

健康检查。

```json
// Response 200
{ "status": "ok", "app": "AISQA", "version": "1.0.0", "子系统状态": { "数据库": "healthy", "向量数据库": "healthy", "事件总线": "healthy" } }
```

### GET /api/v1/vector-db/collections

获取所有向量集合信息。

### POST /api/v1/vector-db/search

语义检索。

```json
// Request
{ "文本": "登录测试", "集合": "test_case_knowledge", "限制": 5 }
```

---

## 附录：HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无内容） |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 422 | 验证错误 |
| 500 | 服务器内部错误 |
