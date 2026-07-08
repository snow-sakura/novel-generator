# Docker 容器化规范

## Dockerfile 最佳实践

### 基础镜像
- 使用官方镜像，固定版本号（非 `latest`）
- 优先使用 Alpine 变体减小体积
- 多阶段构建分离构建和运行环境

### 构建优化
- 合并 RUN 指令减少层数
- 利用缓存：先复制依赖文件，后复制源码
- 使用 `.dockerignore` 排除不需要的文件
- 设置 `WORKDIR` 而非大量 `cd`

### 安全
- 不以 root 用户运行
- 不在镜像中存储密钥
- 使用 `COPY` 而非 `ADD`
- 定期更新基础镜像

## docker-compose 规范

### 服务定义
- 每个服务有明确的 `depends_on`
- 使用 `healthcheck` 确保依赖就绪
- 环境变量通过 `.env` 文件或 `env_file` 注入
- 数据持久化使用命名卷

### 网络
- 使用自定义网络隔离服务
- 内部服务不暴露端口到宿主机
- 仅暴露必要的端口

## 日志与监控

- 使用 `json-file` 或 `syslog` 日志驱动
- 设置日志轮转（`max-size`, `max-file`）
- 关键服务配置健康检查
- 使用 `docker stats` 监控资源使用

## 生产环境

- 不在生产中使用 `docker-compose`，使用编排工具（K8s/Swarm）
- 镜像推送到私有仓库
- 实现优雅停机（SIGTERM 处理）
- 设置资源限制（CPU/内存）
