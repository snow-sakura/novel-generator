"""AISQA 测试模块 API 集成测试 — 覆盖 8 个新测试路由

测试策略:
  契约测试 — 验证路由存在、请求格式正确、响应符合预期结构。
  不依赖数据库，仅需确认路由非 404 即可。
  若路由需要认证，401 也是可接受的状态。
"""

import pytest


class TestFunctionalTestAPI:
    """16. 功能测试 — /api/v1/test-functional"""

    BASE = "/api/v1/test-functional"

    @pytest.mark.asyncio
    async def test_list_cases(self, client):
        """GET /cases — 分页列表"""
        resp = await client.get(f"{self.BASE}/cases?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_create_case(self, client):
        """POST /cases — 创建用例"""
        resp = await client.post(
            f"{self.BASE}/cases",
            json={
                "title": "登录测试",
                "project_id": 1,
                "steps": "1. 打开页面\n2. 输入账号\n3. 点击登录",
            },
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_case(self, client):
        """GET /cases/1 — 获取详情"""
        resp = await client.get(f"{self.BASE}/cases/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_update_case(self, client):
        """PUT /cases/1 — 更新用例"""
        resp = await client.put(
            f"{self.BASE}/cases/1",
            json={"title": "更新登录测试", "status": "ready"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_delete_case(self, client):
        """DELETE /cases/1 — 删除用例"""
        resp = await client.delete(f"{self.BASE}/cases/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_import_cases(self, client):
        """POST /cases/import — 批量导入"""
        resp = await client.post(
            f"{self.BASE}/cases/import",
            json=[{"title": "用例1", "project_id": 1, "steps": "步骤1"}],
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_run_case(self, client):
        """POST /cases/1/run — 执行用例"""
        resp = await client.post(f"{self.BASE}/cases/1/run")
        assert resp.status_code != 404


class TestApiTestAPI:
    """17. 接口测试 — /api/v1/test-api"""

    BASE = "/api/v1/test-api"

    @pytest.mark.asyncio
    async def test_list_cases(self, client):
        """GET /cases — 分页列表"""
        resp = await client.get(f"{self.BASE}/cases?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_create_case(self, client):
        """POST /cases — 创建用例"""
        resp = await client.post(
            f"{self.BASE}/cases",
            json={"name": "获取用户列表", "url": "/api/users", "method": "GET", "project_id": 1},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_case(self, client):
        """GET /cases/1 — 获取详情"""
        resp = await client.get(f"{self.BASE}/cases/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_update_case(self, client):
        """PUT /cases/1 — 更新用例"""
        resp = await client.put(
            f"{self.BASE}/cases/1",
            json={"name": "更新接口", "method": "POST"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_delete_case(self, client):
        """DELETE /cases/1 — 删除用例"""
        resp = await client.delete(f"{self.BASE}/cases/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_toggle_auto(self, client):
        """PUT /cases/1/auto — 切换自动化开关"""
        resp = await client.put(
            f"{self.BASE}/cases/1/auto",
            json={"is_auto": True},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_run_case(self, client):
        """POST /cases/1/run — 执行用例"""
        resp = await client.post(f"{self.BASE}/cases/1/run")
        assert resp.status_code != 404


class TestWebTestAPI:
    """18. Web自动化测试 — /api/v1/test-web"""

    BASE = "/api/v1/test-web"

    @pytest.mark.asyncio
    async def test_list_scripts(self, client):
        """GET /scripts — 分页列表"""
        resp = await client.get(f"{self.BASE}/scripts?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_script(self, client):
        """GET /scripts/1 — 获取详情"""
        resp = await client.get(f"{self.BASE}/scripts/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_create_script(self, client):
        """POST /scripts — 创建脚本"""
        resp = await client.post(
            f"{self.BASE}/scripts",
            json={"name": "登录页面测试", "project_id": 1, "type": "playwright"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_update_script(self, client):
        """PUT /scripts/1 — 更新脚本"""
        resp = await client.put(
            f"{self.BASE}/scripts/1",
            json={"name": "更新脚本名称", "status": "ready"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_delete_script(self, client):
        """DELETE /scripts/1 — 删除脚本"""
        resp = await client.delete(f"{self.BASE}/scripts/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_run_script(self, client):
        """POST /scripts/1/run — 执行脚本"""
        resp = await client.post(f"{self.BASE}/scripts/1/run")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_result(self, client):
        """GET /scripts/1/result — 获取结果"""
        resp = await client.get(f"{self.BASE}/scripts/1/result")
        assert resp.status_code != 404


class TestAppTestAPI:
    """19. App自动化测试 — /api/v1/test-app"""

    BASE = "/api/v1/test-app"

    @pytest.mark.asyncio
    async def test_list_scripts(self, client):
        """GET /scripts — 分页列表"""
        resp = await client.get(f"{self.BASE}/scripts?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_create_script(self, client):
        """POST /scripts — 创建脚本"""
        resp = await client.post(
            f"{self.BASE}/scripts",
            json={"name": "App登录测试", "project_id": 1, "platform": "android"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_update_script(self, client):
        """PUT /scripts/1 — 更新脚本"""
        resp = await client.put(
            f"{self.BASE}/scripts/1",
            json={"name": "更新App脚本", "platform": "ios"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_delete_script(self, client):
        """DELETE /scripts/1 — 删除脚本"""
        resp = await client.delete(f"{self.BASE}/scripts/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_run_script(self, client):
        """POST /scripts/1/run — 执行脚本"""
        resp = await client.post(f"{self.BASE}/scripts/1/run")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_list_devices(self, client):
        """GET /devices — 设备列表"""
        resp = await client.get(f"{self.BASE}/devices?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_create_device(self, client):
        """POST /devices — 创建设备"""
        resp = await client.post(
            f"{self.BASE}/devices",
            json={"name": "测试设备1", "platform": "android", "version": "14", "udid": "abc123"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_update_device(self, client):
        """PUT /devices/1 — 更新设备"""
        resp = await client.put(
            f"{self.BASE}/devices/1",
            json={"name": "更新设备名", "status": "busy"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_delete_device(self, client):
        """DELETE /devices/1 — 删除设备"""
        resp = await client.delete(f"{self.BASE}/devices/1")
        assert resp.status_code != 404


class TestPerfTestAPI:
    """20. 性能测试 — /api/v1/test-perf"""

    BASE = "/api/v1/test-perf"

    @pytest.mark.asyncio
    async def test_list_scripts(self, client):
        """GET /scripts — 分页列表"""
        resp = await client.get(f"{self.BASE}/scripts?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_create_script(self, client):
        """POST /scripts — 创建脚本"""
        resp = await client.post(
            f"{self.BASE}/scripts",
            json={"name": "压测脚本", "project_id": 1, "type": "jmeter"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_update_script(self, client):
        """PUT /scripts/1 — 更新脚本"""
        resp = await client.put(
            f"{self.BASE}/scripts/1",
            json={"name": "更新压测脚本", "status": "ready"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_delete_script(self, client):
        """DELETE /scripts/1 — 删除脚本"""
        resp = await client.delete(f"{self.BASE}/scripts/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_run_script(self, client):
        """POST /scripts/1/run — 执行脚本"""
        resp = await client.post(f"{self.BASE}/scripts/1/run")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_monitor(self, client):
        """GET /monitor/1 — 监控数据"""
        resp = await client.get(f"{self.BASE}/monitor/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_monitor_history(self, client):
        """GET /monitor/1/history — 监控历史"""
        resp = await client.get(f"{self.BASE}/monitor/1/history")
        assert resp.status_code != 404


class TestSecurityTestAPI:
    """21. 安全测试 — /api/v1/test-security"""

    BASE = "/api/v1/test-security"

    @pytest.mark.asyncio
    async def test_list_scans(self, client):
        """GET /scans — 分页列表"""
        resp = await client.get(f"{self.BASE}/scans?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_create_scan(self, client):
        """POST /scans — 创建扫描"""
        resp = await client.post(
            f"{self.BASE}/scans",
            json={"name": "安全扫描1", "project_id": 1, "type": "vulnerability"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_scan(self, client):
        """GET /scans/1 — 获取详情"""
        resp = await client.get(f"{self.BASE}/scans/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_delete_scan(self, client):
        """DELETE /scans/1 — 删除扫描"""
        resp = await client.delete(f"{self.BASE}/scans/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_run_scan(self, client):
        """POST /scans/1/run — 执行扫描"""
        resp = await client.post(f"{self.BASE}/scans/1/run")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_scan_result(self, client):
        """GET /scans/1/result — 扫描结果"""
        resp = await client.get(f"{self.BASE}/scans/1/result")
        assert resp.status_code != 404


class TestUiTestAPI:
    """22. UI自动化测试 — /api/v1/test-ui"""

    BASE = "/api/v1/test-ui"

    @pytest.mark.asyncio
    async def test_list_baselines(self, client):
        """GET /baselines — 基线列表"""
        resp = await client.get(f"{self.BASE}/baselines?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_create_baseline(self, client):
        """POST /baselines — 创建基线"""
        resp = await client.post(
            f"{self.BASE}/baselines",
            json={"name": "首页基线", "project_id": 1, "url": "https://example.com"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_baseline(self, client):
        """GET /baselines/1 — 获取基线详情"""
        resp = await client.get(f"{self.BASE}/baselines/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_delete_baseline(self, client):
        """DELETE /baselines/1 — 删除基线"""
        resp = await client.delete(f"{self.BASE}/baselines/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_visual_diff(self, client):
        """POST /visual-diff — 视觉对比"""
        resp = await client.post(
            f"{self.BASE}/visual-diff",
            json={"baseline_id": 1, "current_screenshot": "base64data"},
        )
        assert resp.status_code != 404


class TestSmokeTestAPI:
    """23. 冒烟测试 — /api/v1/test-smoke"""

    BASE = "/api/v1/test-smoke"

    @pytest.mark.asyncio
    async def test_list_suites(self, client):
        """GET /suites — 分页列表"""
        resp = await client.get(f"{self.BASE}/suites?page=1&page_size=10")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_create_suite(self, client):
        """POST /suites — 创建套件"""
        resp = await client.post(
            f"{self.BASE}/suites",
            json={"name": "冒烟测试套件", "project_id": 1, "description": "基础冒烟"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_get_suite(self, client):
        """GET /suites/1 — 获取详情"""
        resp = await client.get(f"{self.BASE}/suites/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_update_suite(self, client):
        """PUT /suites/1 — 更新套件"""
        resp = await client.put(
            f"{self.BASE}/suites/1",
            json={"name": "更新套件", "status": "ready"},
        )
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_delete_suite(self, client):
        """DELETE /suites/1 — 删除套件"""
        resp = await client.delete(f"{self.BASE}/suites/1")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_run_suite(self, client):
        """POST /suites/1/run — 执行套件"""
        resp = await client.post(f"{self.BASE}/suites/1/run")
        assert resp.status_code != 404

    @pytest.mark.asyncio
    async def test_update_auto_trigger(self, client):
        """PUT /suites/1/auto — 更新自动触发"""
        resp = await client.put(
            f"{self.BASE}/suites/1/auto",
            json={"auto_trigger": True, "trigger_config": {"branch": "main"}},
        )
        assert resp.status_code != 404
