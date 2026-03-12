# TopiVra 部署检查清单

## 部署前检查

### 系统环境

- [ ] 操作系统版本确认（Windows 10/11 或 Ubuntu 20.04+）
- [ ] Docker 已安装且版本 >= 20.10
- [ ] Docker Compose 已安装且版本 >= 2.0
- [ ] 磁盘空间充足（至少 20GB）
- [ ] 内存充足（至少 4GB）
- [ ] 网络连接正常

### 代码准备

- [ ] 代码已从 Git 克隆
- [ ] 所有依赖已安装（npm install）
- [ ] 代码编译无错误
- [ ] 测试通过（npm test）

### 配置准备

- [ ] 环境变量文件已准备（.env）
- [ ] 数据库密码已设置（强密码）
- [ ] JWT 密钥已生成（64+ 字符）
- [ ] Redis 密码已设置（生产环境）
- [ ] 域名已配置（生产环境）
- [ ] SSL 证书已准备（生产环境）

### 备份准备

- [ ] 现有数据已备份（如果是更新部署）
- [ ] 备份文件已验证
- [ ] 备份位置已记录

---

## 部署过程

### Windows 本地开发

```bash
# 1. 启动脚本
scripts/deploy/START-DEV-WINDOWS.bat

# 2. 等待完成（2-5 分钟）
# 3. 验证访问
#    - 前端：http://localhost:5174
#    - 后端：http://localhost:3001
#    - API 文档：http://localhost:3001/api/v1/docs
```

**检查清单**：
- [ ] Docker 容器全部启动
- [ ] 数据库初始化成功
- [ ] 前端可访问
- [ ] 后端 API 可访问
- [ ] 测试账号可登录

### Linux 生产环境

```bash
# 1. 生成密钥（本地 Windows）
powershell -ExecutionPolicy Bypass -File gen-keys.ps1 -Domain yourdomain.com

# 2. 上传配置
scp server/.env user@server:/opt/topivra/.env

# 3. 部署
bash scripts/deploy/deploy-production.sh

# 4. 验证
bash scripts/deploy/health-check.sh
```

**检查清单**：
- [ ] 密钥已生成
- [ ] .env 文件已上传
- [ ] 部署脚本执行成功
- [ ] 所有容器已启动
- [ ] 数据库迁移成功
- [ ] 健康检查通过

---

## 部署后验证

### 功能验证

- [ ] 前端应用可访问
- [ ] 后端 API 可访问
- [ ] API 文档可访问
- [ ] 数据库连接正常
- [ ] Redis 连接正常
- [ ] 用户可登录
- [ ] 支付功能可用
- [ ] 邮件发送正常

### 性能验证

- [ ] 页面加载时间 < 3 秒
- [ ] API 响应时间 < 500ms
- [ ] 数据库查询时间 < 100ms
- [ ] 内存使用 < 80%
- [ ] CPU 使用 < 80%
- [ ] 磁盘使用 < 80%

### 安全验证

- [ ] HTTPS 已启用（生产环境）
- [ ] SSL 证书有效
- [ ] 防火墙已配置
- [ ] 默认密码已修改
- [ ] 敏感信息已隐藏
- [ ] 日志记录正常

### 监控验证

- [ ] Prometheus 可访问
- [ ] Grafana 可访问（如果启用）
- [ ] 告警规则已配置
- [ ] 日志收集正常

---

## 常见问题排查

### 容器无法启动

```bash
# 查看错误日志
docker compose -f config/docker-compose.yml logs server

# 检查端口占用
netstat -tulpn | grep 3001

# 检查磁盘空间
df -h
```

**解决方案**：
- [ ] 检查端口是否被占用
- [ ] 检查磁盘空间是否充足
- [ ] 检查内存是否充足
- [ ] 重启 Docker

### 数据库连接失败

```bash
# 测试数据库连接
docker compose -f config/docker-compose.yml exec mysql mysql -uroot -proot -e "SELECT 1"

# 检查数据库日志
docker compose -f config/docker-compose.yml logs mysql
```

**解决方案**：
- [ ] 检查数据库密码
- [ ] 检查数据库 URL
- [ ] 重启数据库容器
- [ ] 检查网络连接

### API 无响应

```bash
# 测试 API 连接
curl http://localhost:3001/health/live

# 查看 API 日志
docker compose -f config/docker-compose.yml logs -f server
```

**解决方案**：
- [ ] 检查 API 是否启动
- [ ] 检查环境变量
- [ ] 检查数据库连接
- [ ] 重启 API 容器

---

## 部署后维护

### 日常维护

- [ ] 每天检查日志
- [ ] 每周检查性能指标
- [ ] 每月检查安全更新
- [ ] 定期备份数据

### 定期任务

- [ ] 每天凌晨 2 点自动备份
- [ ] 每周检查磁盘使用
- [ ] 每月更新依赖包
- [ ] 每季度安全审计

### 监控告警

- [ ] 磁盘使用 > 80%
- [ ] 内存使用 > 80%
- [ ] CPU 使用 > 80%
- [ ] API 响应时间 > 1s
- [ ] 数据库连接失败
- [ ] 容器重启异常

---

## 回滚计划

### 快速回滚

```bash
# 1. 停止当前服务
bash scripts/deploy/stop-production.sh

# 2. 恢复数据
bash scripts/deploy/restore.sh backups/mysql_backup_*.sql

# 3. 重新部署
bash scripts/deploy/deploy-production.sh
```

**检查清单**：
- [ ] 备份文件已验证
- [ ] 回滚前已通知相关人员
- [ ] 回滚过程已记录
- [ ] 回滚后已验证

---

## 文档记录

### 部署记录

- [ ] 部署日期：_______________
- [ ] 部署人员：_______________
- [ ] 部署版本：_______________
- [ ] 部署环境：_______________
- [ ] 部署耗时：_______________

### 问题记录

- [ ] 遇到的问题：_______________
- [ ] 解决方案：_______________
- [ ] 解决耗时：_______________
- [ ] 经验总结：_______________

### 联系方式

- 技术支持：tech@topivra.com
- 紧急联系：+86 xxx-xxxx-xxxx
- 文档地址：https://docs.topivra.com

---

**检查清单版本**：1.0  
**最后更新**：2026-03-12

