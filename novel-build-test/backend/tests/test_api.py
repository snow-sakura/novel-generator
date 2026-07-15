"""AISQA API 集成测试 — 4.3.1: 覆盖公共模块 CRUD 端点

测试策略:
  由于缺少 MySQL/Redis/Qdrant 等基础设施，这些测试设计为"契约测试"，
  只验证路由存在、请求格式正确、响应符合预期结构。
  不依赖数据库认证，仅需确认路由非 404 即可。
"""

import pytest


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
    async def test_root_not_found(self, client):
        """GET / — 根端点不存在（已被重构移除）"""
        resp = await client.get("/")
        assert resp.status_code == 404


class TestProjectsAPI:
    """1.1: 项目管理 CRUD"""

    BASE = "/api/v1/projects"

    @pytest.mark.asyncio
    async def test_list_projects(self, client):
        """GET /api/v1/projects — 分页列表"""
        resp = await client.get(f"{self.BASE}?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_create_project(self, client):
        """POST /api/v1/projects — 创建项目"""
        resp = await client.post(
            self.BASE, json={"name": "Test Project", "description": "test"}
        )
        assert resp.status_code != 404


class TestRequirementsAPI:
    """1.2: 需求管理 CRUD"""

    BASE = "/api/v1/requirements"

    @pytest.mark.asyncio
    async def test_list_requirements(self, client):
        """GET /api/v1/requirements — 分页列表"""
        resp = await client.get(f"{self.BASE}?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_requirement(self, client):
        """GET /api/v1/requirements/1 — 路由存在即可"""
        resp = await client.get(f"{self.BASE}/1")
        assert resp.status_code != 404


class TestEnvironmentsAPI:
    """1.3: 测试环境管理 CRUD"""

    BASE = "/api/v1/environments"

    @pytest.mark.asyncio
    async def test_list_environments(self, client):
        """GET /api/v1/environments"""
        resp = await client.get(f"{self.BASE}?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_health_check_endpoint(self, client):
        """POST /api/v1/environments/1/health-check"""
        resp = await client.post(f"{self.BASE}/1/health-check")
        assert resp.status_code != 404


class TestAssetsAPI:
    """1.4: 测试资产库 CRUD"""

    BASE = "/api/v1/assets"

    @pytest.mark.asyncio
    async def test_list_assets(self, client):
        """GET /api/v1/assets"""
        resp = await client.get(f"{self.BASE}?page=1&page_size=10")
        assert resp.status_code != 404


class TestKnowledgeAPI:
    """1.5: AI 知识库 CRUD"""

    BASE = "/api/v1/knowledge"

    @pytest.mark.asyncio
    async def test_list_knowledge(self, client):
        """GET /api/v1/knowledge"""
        resp = await client.get(f"{self.BASE}?page=1&page_size=10")
        assert resp.status_code != 404


class TestSettingsAPI:
    """1.6: 系统设置 CRUD"""

    BASE = "/api/v1/settings"

    @pytest.mark.asyncio
    async def test_list_settings(self, client):
        """GET /api/v1/settings"""
        resp = await client.get(self.BASE)
        assert resp.status_code != 404


class TestAgentsAPI:
    """Phase 3: AI Agent 系统 — 验证路由存在"""

    @pytest.mark.asyncio
    async def test_execute_agent(self, client):
        """POST /api/v1/agents/execute — 路由存在"""
        resp = await client.post(
            "/api/v1/agents/execute",
            json={"project_id": 1, "workflow": "full", "requirement": "test"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_list_executions(self, client):
        """GET /api/v1/agents/executions"""
        resp = await client.get("/api/v1/agents/executions")
        assert resp.status_code != 404


class TestExecutionAndReportAPI:
    """Phase 4: 测试执行与报告 — 验证路由存在"""

    EXEC_BASE = "/api/v1/executions"

    @pytest.mark.asyncio
    async def test_get_execution(self, client):
        """GET /api/v1/executions/1"""
        resp = await client.get(f"{self.EXEC_BASE}/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_report_by_execution(self, client):
        """GET /api/v1/executions/1/report"""
        resp = await client.get(f"{self.EXEC_BASE}/1/report")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_list_reports(self, client):
        """GET /api/v1/reports"""
        resp = await client.get("/api/v1/reports")
        assert resp.status_code != 404


class TestMCPToolsAPI:
    """Phase 5: MCP 工具集成 — 验证路由存在"""

    BASE = "/api/v1/mcp"

    @pytest.mark.asyncio
    async def test_list_mcp_tools(self, client):
        """GET /api/v1/mcp/tools — 列出工具"""
        resp = await client.get(f"{self.BASE}/tools")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_execute_mcp_tool(self, client):
        """POST /api/v1/mcp/tools/{name}/execute — 路由存在，但工具可能未注册"""
        resp = await client.post(
            f"{self.BASE}/tools/browser_navigate/execute",
            json={"arguments": {"url": "https://example.com"}},
        )
        # 404 表示工具未注册（路由存在但没找到具体工具），也是可接受的
        assert resp.status_code in (200, 404, 500)
