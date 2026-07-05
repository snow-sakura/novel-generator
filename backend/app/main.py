"""FastAPI 应用入口"""
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.config import settings
from app.routers import generate, novel, export


@asynccontextmanager
async def lifespan(application: FastAPI):
    """启动时创建数据库表，关闭时清理"""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="番茄小说生成智能体", version="1.0.0", lifespan=lifespan)

# CORS 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(generate.router)
app.include_router(novel.router)
app.include_router(export.router)


@app.get("/")
async def root():
    return {"message": "番茄小说生成智能体 API v1", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
