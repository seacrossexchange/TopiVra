# OpenClaw 完整部署指南

## 目录
1. [环境要求](#环境要求)
2. [安装步骤](#安装步骤)
3. [配置说明](#配置说明)
4. [启动与使用](#启动与使用)
5. [常见问题](#常见问题)

---

## 环境要求

### 系统要求
- Windows 10/11, macOS 10.15+, 或 Linux
- Node.js >= 18 (推荐 20 LTS)
- npm 或 pnpm

### 检查环境
```bash
# 检查 Node.js 版本
node -v   # 应显示 >= v18

# 检查 npm 版本
npm -v
```

### 安装 Node.js (如未安装)

**Windows:**
```bash
winget install -e --id OpenJS.NodeJS.LTS
```

**macOS:**
```bash
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 安装步骤

### 方法一：使用柴犬一键配置工具 (推荐)

```bash
npx doge-cc
```

按照交互式提示：
1. 选择站点 (推荐 `http://wucur.com:6543`)
2. 输入 API Key
3. 选择要配置的工具 (OpenClaw)
4. 选择默认模型
5. 确认配置

### 方法二：手动安装

#### 1. 全局安装 OpenClaw

```bash
npm install -g openclaw
```

验证安装：
```bash
openclaw --version
```

#### 2. 初始化配置

```bash
openclaw configure
```

---

## 配置说明

### 配置文件位置

| 文件 | 路径 |
|------|------|
| 主配置文件 | `~/.openclaw/openclaw.json` |
| Agent配置 | `~/.openclaw/agents/main/agent/models.json` |
| 认证配置 | `~/.openclaw/agents/main/agent/auth-profiles.json` |

### 主配置文件 (`~/.openclaw/openclaw.json`)

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "mode": "safeguard"
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "1h"
      },
      "heartbeat": {
        "every": "30m"
      },
      "model": {
        "primary": "shibacc/gpt-5.4"
      },
      "models": {
        "shibacc/gpt-5.4": {
          "alias": "gpt-5.4"
        }
      },
      "workspace": "~/.openclaw/workspace"
    }
  },
  "auth": {
    "profiles": {
      "anthropic:manual": {
        "mode": "token",
        "provider": "anthropic"
      }
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "ownerDisplay": "raw",
    "restart": true
  },
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "YOUR_GATEWAY_TOKEN"
    },
    "mode": "local"
  },
  "meta": {
    "lastTouchedAt": "2026-03-21T13:37:37.585Z",
    "lastTouchedVersion": "2026.3.13"
  },
  "models": {
    "mode": "merge",
    "providers": {
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "models": [
          {
            "id": "claude-sonnet-4-20250514",
            "name": "claude-sonnet-4-20250514"
          },
          {
            "id": "claude-3-5-sonnet-20241022",
            "name": "claude-3-5-sonnet-20241022"
          },
          {
            "id": "claude-3-5-haiku-20241022",
            "name": "claude-3-5-haiku-20241022"
          }
        ]
      },
      "shibacc": {
        "api": "openai-completions",
        "apiKey": "YOUR_API_KEY",
        "baseUrl": "http://wucur.com:6543/v1",
        "models": [
          {
            "contextWindow": 200000,
            "id": "gpt-5.4",
            "maxTokens": 64000,
            "name": "gpt-5.4"
          },
          {
            "contextWindow": 200000,
            "id": "claude-sonnet-4-6",
            "maxTokens": 64000,
            "name": "Claude Sonnet 4.6"
          },
          {
            "contextWindow": 200000,
            "id": "claude-opus-4-6",
            "maxTokens": 64000,
            "name": "Claude Opus 4.6"
          }
        ]
      }
    }
  }
}
```

### 配置字段说明

#### agents.defaults
| 字段 | 说明 |
|------|------|
| `model.primary` | 默认使用的模型，格式为 `provider/model-id` |
| `workspace` | 工作目录路径 |

#### gateway
| 字段 | 说明 |
|------|------|
| `auth.token` | Gateway认证令牌，随机生成的字符串 |
| `mode` | 运行模式，通常为 `local` |

#### models.providers
| 字段 | 说明 |
|------|------|
| `api` | API类型：`openai-completions` 或 `anthropic` |
| `apiKey` | API密钥 |
| `baseUrl` | API基础URL |
| `models[]` | 可用模型列表 |
| `contextWindow` | 上下文窗口大小 |
| `maxTokens` | 最大输出token数 |

### 可用的 API 服务端点

| 名称 | 地址 | 说明 |
|------|------|------|
| 柴犬国内主站 | `http://wucur.com:6543` | 推荐，国内访问快 |
| 柴犬备用站 | `http://2000.run:6543` | 备用 |
| 柴犬国外站 | `https://us.wucur.com` | 国外用户使用 |

### 可用模型列表

| 模型ID | 说明 |
|--------|------|
| `gpt-5.4` | GPT-5.4 |
| `gpt-4o` | GPT-4o |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-opus-4-6` | Claude Opus 4.6 |
| `claude-haiku-4-5` | Claude Haiku 4.5 |
| `deepseek-chat` | DeepSeek Chat |
| `deepseek-reasoner` | DeepSeek Reasoner |

---

## 启动与使用

### 启动 Gateway

```bash
# 启动 Gateway
openclaw gateway start

# 重启 Gateway
openclaw gateway restart

# 停止 Gateway
openclaw gateway stop

# 查看 Gateway 状态
openclaw gateway status
```

### 打开 Dashboard

```bash
openclaw dashboard
```

Dashboard 地址: `http://127.0.0.1:18789`

### 常用命令

```bash
# 查看配置
openclaw config list

# 查看可用模型
openclaw models list

# 添加模型认证
openclaw models auth add

# 测试连接
openclaw test
```

### Telegram Bot 集成

1. 在 Telegram 中找到您的 Bot
2. 发送 `/start` 开始使用
3. 如果显示 "access not configured"，使用配对码：

```bash
openclaw pairing approve telegram YOUR_PAIRING_CODE
```

---

## 常见问题

### Q: 模型返回 "无可用渠道" 错误

**错误信息:**
```
分组 default 下模型 xxx 无可用渠道（distributor）
```

**解决方案:**
1. 登录 API 服务管理后台: `http://wucur.com:6543/console`
2. 确认账户已充值
3. 检查令牌配置，确保分组设置为 `default`
4. 联系服务商确认模型可用性

### Q: Gateway 无法启动

**解决方案:**
```bash
# 检查端口占用
netstat -ano | findstr :18789

# 清理并重启
openclaw gateway stop
openclaw gateway start
```

### Q: 配置文件损坏

**解决方案:**
```bash
# 备份现有配置
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak

# 重新初始化
openclaw configure

# 或使用柴犬工具重新配置
npx doge-cc
```

### Q: 如何查看日志

```bash
# Windows
type ~/.openclaw/logs/gateway.log

# macOS/Linux
cat ~/.openclaw/logs/gateway.log

# 实时查看
tail -f ~/.openclaw/logs/gateway.log
```

### Q: 如何更新 OpenClaw

```bash
npm update -g openclaw
```

---

## 附录：完整配置模板

### 最小配置 (`~/.openclaw/openclaw.json`)

```json
{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "your-random-token-here"
    },
    "mode": "local"
  },
  "models": {
    "mode": "merge",
    "providers": {
      "shibacc": {
        "api": "openai-completions",
        "apiKey": "YOUR_API_KEY",
        "baseUrl": "http://wucur.com:6543/v1",
        "models": [
          {
            "id": "gpt-5.4",
            "name": "gpt-5.4",
            "contextWindow": 200000,
            "maxTokens": 64000
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "shibacc/gpt-5.4"
      }
    }
  }
}
```

---

## 获取帮助

- **OpenClaw 官方文档**: https://github.com/openclaw-ai/openclaw
- **柴犬服务支持**: http://wucur.com:6543/console
- **问题反馈**: 联系服务提供商

---

*最后更新: 2026-03-21*