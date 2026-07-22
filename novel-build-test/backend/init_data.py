"""初始化脚本 — 创建管理员账号和示例数据"""

import asyncio
import os
import sys

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, async_session, engine
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.user import User
from app.utils.security import hash_password


async def init_database():
    """初始化数据库表"""
    print("正在创建数据库表...")

    # 导入所有模型
    from app.models import (  # noqa: F401
        agent,
        asset,
        audit_log,
        environment,
        knowledge,
        project,
        requirement,
        role,
        setting,
        user,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("✅ 数据库表创建完成")


async def create_admin_user():
    """创建管理员用户"""
    print("正在创建管理员用户...")

    async with async_session() as session:
        from sqlalchemy import select

        # 检查是否已存在管理员
        result = await session.execute(select(User).where(User.username == "admin"))
        if result.scalar_one_or_none():
            print("⚠️  管理员用户已存在，跳过")
            return

        admin = User(
            username="admin",
            email="admin@aisqa.com",
            hashed_password=hash_password("admin123"),
            display_name="管理员",
            role="admin",
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        await session.refresh(admin)

        print(f"✅ 管理员用户创建成功 (ID: {admin.id})")
        print(f"   用户名: admin")
        print(f"   密码: admin123")


async def create_demo_project():
    """创建示例项目"""
    print("正在创建示例项目...")

    async with async_session() as session:
        from sqlalchemy import select

        # 获取管理员用户
        result = await session.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        if not admin:
            print("⚠️  管理员用户不存在，跳过项目创建")
            return

        # 检查是否已存在项目
        result = await session.execute(select(Project).where(Project.name == "AISQA 示例项目"))
        if result.scalar_one_or_none():
            print("⚠️  示例项目已存在，跳过")
            return

        project = Project(
            name="AISQA 示例项目",
            description="这是一个用于演示AISQA平台功能的示例项目，包含需求、测试环境、测试资产等完整配置。",
            status="active",
            owner_id=admin.id,
        )
        session.add(project)
        await session.commit()
        await session.refresh(project)

        print(f"✅ 示例项目创建成功 (ID: {project.id})")

        # 创建示例需求
        requirements = [
            Requirement(
                project_id=project.id,
                title="用户登录功能",
                description="支持用户名密码登录，JWT令牌认证",
                module="认证模块",
                priority="P0",
                status="approved",
                created_by=admin.id,
            ),
            Requirement(
                project_id=project.id,
                title="项目管理功能",
                description="支持项目的CRUD操作，分页搜索",
                module="项目模块",
                priority="P1",
                status="draft",
                created_by=admin.id,
            ),
            Requirement(
                project_id=project.id,
                title="需求管理功能",
                description="支持需求的CRUD操作，状态流转",
                module="需求模块",
                priority="P1",
                status="review",
                created_by=admin.id,
            ),
        ]

        for req in requirements:
            session.add(req)

        await session.commit()
        print(f"✅ 创建了 {len(requirements)} 个示例需求")


async def main():
    """主函数"""
    print("=" * 50)
    print("AISQA 平台初始化")
    print("=" * 50)
    print()

    try:
        await init_database()
        await create_admin_user()
        await create_demo_project()

        print()
        print("=" * 50)
        print("✅ 初始化完成!")
        print()
        print("启动服务:")
        print("  后端: cd backend && uvicorn app.main:app --reload --port 8000")
        print("  前端: cd frontend && npm run dev")
        print()
        print("访问地址:")
        print("  前端: http://localhost:5173")
        print("  后端API: http://localhost:8000/api/v1")
        print("  API文档: http://localhost:8000/docs")
        print()
        print("管理员账号:")
        print("  用户名: admin")
        print("  密码: admin123")
        print("=" * 50)

    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
