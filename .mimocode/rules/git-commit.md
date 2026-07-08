# Git Commit Message 规范

## 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | feat(auth): add OAuth2 login |
| fix | Bug 修复 | fix(api): handle null response |
| docs | 文档更新 | docs: update API reference |
| style | 代码格式（不影响逻辑） | style: fix indentation |
| refactor | 重构（非新功能非修复） | refactor: extract user service |
| test | 测试相关 | test: add unit tests for auth |
| chore | 构建/工具变更 | chore: update dependencies |
| perf | 性能优化 | perf: optimize query with index |
| ci | CI/CD 配置 | ci: add GitHub Actions workflow |
| revert | 回滚 | revert: undo changes in v1.2 |

## Subject 规范

- 使用祈使语气（"add" 而非 "added"）
- 首字母小写
- 不加句号
- 简洁明了，不超过 50 字符

## Scope 范围

- 模块名：`auth`, `api`, `db`, `ui`
- 可选，不强制

## Body 补充说明

- 解释 why 而非 what
- 每行不超过 72 字符
- 列出变更的详细说明

## Footer

- 关联 Issue：`Closes #123`, `Fixes #456`
- 破坏性变更：`BREAKING CHANGE: description`

## 示例

```
feat(auth): add JWT token refresh mechanism

Implement automatic token refresh when access token expires.
Refresh token is stored in httpOnly cookie for security.

Closes #234
```

```
fix(api): prevent SQL injection in user search

Use parameterized queries instead of string concatenation
for the user search endpoint.

Fixes #567
```
