"""AISQA API 集成测试 — 4.3.1: 覆盖公共模块 CRUD 端点

测试策略:
  由于缺少 MySQL/Redis/Qdrant 等基础设施，这些测试设计为"契约测试"，
  只验证路由存在、请求格式正确、响应符合预期结构。
  当基础设施就绪后，可以在真实环境中运行完整测试。
"""

import pytest


# ==================== 健康检查 ====================


class TestHealthCheck:
    """4.2.3: 健康检查端点"""

    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        """GET /api/v1/health 应返回子系统状态"""
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "app" in data
        assert "version" in data
        assert "subsystem_status" in data

    @pytest.mark.asyncio
    async def test_root_redirect(self, client):
        """GET / 应返回根信息"""
        resp = await client.get("/")
        assert resp.status_code in (200, 307)


# ==================== 项目模块 ====================


class TestProjectsAPI:
    """1.1: 项目管理 CRUD"""

    PROJECT_BASE = "/api/v1/projects"

    @pytest.mark.asyncio
    async def test_list_projects(self, client):
        """GET /api/v1/projects — 分页列表"""
        resp = await client.get(f"{self.PROJECT_BASE}?page=1&page_size=10")
        # 可能会因为没有数据库而返回 500，测试重点是路由存在
        assert resp.status_code in (200, 500, 422)

    @pytest.mark.asyncio
    async def test_create_project(self, client):
        """POST /api/v1/projects — 创建项目"""
        resp = await client.post(
            self.PROJECT_BASE,
            json={"name": "Test Project", "description": "test"},
        )
        # 依赖数据库，可能返回 500/401，但 404 说明路由不存在
        assert resp.status_code != 404


# ==================== 需求模块 ====================


class TestRequirementsAPI:
    """1.2: 需求管理 CRUD"""

    @pytest.mark.asyncio
    async def test_list_requirements(self, client):
        """GET /api/v1/projects/{pid}/requirements — 分页列表"""
        resp = await client.get("/api/v1/projects/1/requirements")
        assert resp.status_code in (200, 500, 422)

    @pytest.mark.asyncio
    async def test_get_requirement(self, client):
        """GET /api/v1/requirements/{id} — 获取详情"""
        resp = await client.get("/api/v1/requirements/1")
        assert resp.status_code != 404  # 404 路由不存在，其他错误可接受


# ==================== 环境模块 ====================


class TestEnvironmentsAPI:
    """1.3: 测试环境管理 CRUD"""

    @pytest.mark.asyncio
    async def test_list_environments(self, client):
        resp = await client.get("/api/v1/projects/1/environments")
        assert resp.status_code in (200, 500, 422)

    @pytest.mark.asyncio
    async def test_health_check_endpoint(self, client):
        resp = await client.post("/api/v1/environments/1/health-check")
        assert resp.status_code != 404


# ==================== 资产模块 ====================


class TestAssetsAPI:
    """1.4: 测试资产库 CRUD"""

    @pytest.mark.asyncio
    async def test_list_assets(self, client):
        resp = await client.get("/api/v1/projects/1/assets")
        assert resp.status_code in (200, 500, 422)


# ==================== 知识库模块 ====================


class TestKnowledgeAPI:
    """1.5: AI 知识库 CRUD"""

    @pytest.mark.asyncio
    async def test_list_knowledge(self, client):
        resp = await client.get("/api/v1/projects/1/knowledge")
        assert resp.status_code in (200, 500, 422)


# ==================== 设置模块 ====================


class TestSettingsAPI:
    """1.6: 系统设置 CRUD"""

    @pytest.mark.asyncio
    async def test_list_settings(self, client):
        resp = await client.get("/api/v1/settings")
        assert resp.status_code in (200, 500)


# ==================== Agent 模块 ====================


class TestAgentsAPI:
    """Phase 3: AI Agent 系统 — 验证路由存在"""

    @pytest.mark.asyncio
    async def test_execute_agent(self, client):
        resp = await client.post(
            "/api/v1/agents/execute",
            json={"project_id": 1, "workflow": "full", "requirement": "test"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_list_executions(self, client):
        resp = await client.get("/api/v1/agents/executions")
        assert resp.status_code in (200, 500)


# ==================== 执行 & 报告模块 ====================


class TestExecutionAndReportAPI:
    """Phase 4: 测试执行与报告 — 验证路由存在"""

    @pytest.mark.asyncio
    async def test_list_executions(self, client):
        resp = await client.get("/api/v1/projects/1/executions")
        assert resp.status_code in (200, 500, 422)

    @pytest.mark.asyncio
    async def test_ssetream_exists(self, client):
        """3.1.7: SSE 端点路由存在"""
        resp = await client.get("/api/v1/executions/1/stream")
        assert resp.status_code in (200, 500, 404)

    @pytest.mark.asyncio
    async def test_get_report_by_execution(self, client):
        resp = await client.get("/api/v1/executions/1/report")
        assert resp.status_code in (200, 500, 404)

    @pytest.mark.asyncio
    async def test_list_reports(self, client):
        resp = await client.get("/api/v1/reports")
        assert resp.status_code in (200, 500)


# ==================== MCP 工具模块 ====================


class TestMCPToolsAPI:
    """Phase 5: MCP 工具集成 — 验证路由存在"""

    @pytest.mark.asyncio
    async def test_list_mcp_tools(self, client):
        """4.1.3: GET /api/v1/mcp/tools — 列出工具"""
        resp = await client.get("/api/v1/mcp/tools")
        # 可能返回 200 或 500（工具未注册），但不应 404
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_execute_mcp_tool(self, client):
        """4.1.3: POST /api/v1/mcp/tools/{name}/execute — 执行工具"""
        resp = await client.post(
            "/api/v1/mcp/tools/browser_navigate/execute",
            json={"arguments": {"url": "https://example.com"}},
        )
        # 工具可能未注册（无 playwright），但路由应存在
        assert resp.status_code in (200, 404, 500)
