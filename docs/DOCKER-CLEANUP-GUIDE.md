# Docker 容器清理与故障排查

**更新日期**：2026-03-12

---

## 容器名称冲突问题

### 错误信息

```
Error response from daemon: Conflict. The container name "/topivra-mysql" is already in use by container "81db0b69066fcfebcb977e474948e13a0258377e714bb23a27d8e47bbdd728f8". 
You have to remove (or rename) that container to be able to reuse that name.
```

### 原因

- 之前的容器没有完全停止或清理
- 容器名称被占用
- 需要先清理旧容器才能启动新容器

### 解决方案

#### 自动清理（推荐）

脚本已自动添加清理逻辑：

```batch
REM 在启动新容器前自动清理旧容器
docker-compose -f "%PROJECT_ROOT%\config\docker-compose.yml" down 2>nul
```

#### 手动清理

如果仍然遇到问题，执行以下命令：

```bash
# 停止并删除所有容器
docker-compose -f config/docker-compose.yml down

# 删除所有容器（包括未停止的）
docker-compose -f config/docker-compose.yml down -v

# 或直接删除特定容器
docker rm -f topivra-mysql
docker rm -f topivra-redis
docker rm -f topivra-server
docker rm -f topivra-client
docker rm -f topivra-nginx

# 查看所有容器
docker ps -a

# 删除所有停止的容器
docker container prune -f
```

---

## 常见 Docker 错误

### 1. 容器名称冲突

**错误**：`The container name is already in use`

**解决**：
```bash
docker-compose -f config/docker-compose.yml down -v
docker-compose -f config/docker-compose.yml up -d
```

### 2. 端口被占用

**错误**：`port is already allocated`

**解决**：
```bash
# 查找占用端口的进程
netstat -ano | findstr :3306
netstat -ano | findstr :3001
netstat -ano | findstr :5174
netstat -ano | findstr :6379

# 杀死进程
taskkill /PID <PID> /F

# 或修改 docker-compose.yml 中的端口映射
```

### 3. 镜像构建失败

**错误**：`failed to build image`

**解决**：
```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建镜像
docker-compose -f config/docker-compose.yml build --no-cache
```

### 4. 网络连接失败

**错误**：`network not found`

**解决**：
```bash
# 删除网络
docker network rm topivra-network

# 重新创建
docker-compose -f config/docker-compose.yml up -d
```

---

## 完整清理流程

### 开发环境完全清理

```bash
# 1. 停止所有容器
docker-compose -f config/docker-compose.yml down

# 2. 删除所有卷（数据）
docker-compose -f config/docker-compose.yml down -v

# 3. 删除所有镜像
docker-compose -f config/docker-compose.yml down --rmi all

# 4. 清理 Docker 系统
docker system prune -a -f

# 5. 重新启动
scripts/deploy/START-DEV-WINDOWS.bat
```

### 生产环境完全清理

```bash
# 1. 备份数据
bash scripts/deploy/backup.sh

# 2. 停止服务
bash scripts/deploy/stop-production.sh

# 3. 删除容器和卷
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml down -v

# 4. 清理镜像
docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml down --rmi all

# 5. 重新部署
bash scripts/deploy/deploy-production.sh
```

---

## Docker 命令速查表

| 命令 | 功能 |
|------|------|
| `docker ps` | 查看运行中的容器 |
| `docker ps -a` | 查看所有容器 |
| `docker logs <container>` | 查看容器日志 |
| `docker exec -it <container> bash` | 进入容器 |
| `docker stop <container>` | 停止容器 |
| `docker rm <container>` | 删除容器 |
| `docker images` | 查看镜像 |
| `docker rmi <image>` | 删除镜像 |
| `docker network ls` | 查看网络 |
| `docker volume ls` | 查看卷 |
| `docker system prune -a` | 清理所有未使用资源 |

---

## 脚本自动清理逻辑

### START-DEV-WINDOWS.bat

```batch
REM Step 2a: Clean up old containers (if any)
echo [Step 2a/6] Cleaning up old containers...
docker-compose -f "%PROJECT_ROOT%\config\docker-compose.yml" down 2>nul
echo [PASS] Old containers cleaned
echo.

REM Step 2b: Start Database Containers
echo [Step 2b/6] Starting MySQL and Redis containers...
docker-compose -f "%PROJECT_ROOT%\config\docker-compose.yml" up -d mysql redis
```

**优点**：
- ✅ 自动清理旧容器
- ✅ 避免名称冲突
- ✅ 确保干净的启动环境
- ✅ 用户无需手动清理

---

## 最佳实践

### 开发环境

1. ✅ 定期清理容器
   ```bash
   docker-compose -f config/docker-compose.yml down -v
   ```

2. ✅ 检查容器状态
   ```bash
   docker-compose -f config/docker-compose.yml ps
   ```

3. ✅ 查看日志
   ```bash
   docker-compose -f config/docker-compose.yml logs -f
   ```

4. ✅ 使用脚本启动
   ```bash
   scripts/deploy/START-DEV-WINDOWS.bat
   ```

### 生产环境

1. ✅ 备份数据后再清理
   ```bash
   bash scripts/deploy/backup.sh
   ```

2. ✅ 使用脚本部署
   ```bash
   bash scripts/deploy/deploy-production.sh
   ```

3. ✅ 定期检查健康状态
   ```bash
   bash scripts/deploy/health-check.sh
   ```

4. ✅ 监控容器日志
   ```bash
   docker-compose -f config/docker-compose.yml -f config/docker-compose.prod.yml logs -f server
   ```

---

## 故障排查流程

```
遇到容器错误
    ↓
查看错误信息
    ↓
确定错误类型
    ├─ 容器名称冲突 → docker-compose down -v
    ├─ 端口被占用 → 查找进程并杀死
    ├─ 镜像构建失败 → docker system prune -a
    └─ 网络问题 → docker network rm
    ↓
重新启动
    ├─ 开发环境 → scripts/deploy/START-DEV-WINDOWS.bat
    └─ 生产环境 → bash scripts/deploy/deploy-production.sh
    ↓
验证
    ├─ 开发环境 → 访问 http://localhost:5174
    └─ 生产环境 → bash scripts/deploy/health-check.sh
```

---

**最后更新**：2026-03-12

