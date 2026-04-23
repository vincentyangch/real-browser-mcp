# real-browser-mcp

[English](README.md) | [简体中文](README.zh-CN.md)

用于操作真实已登录 Chrome 会话的 Alpha 版 MCP 服务器。

这个项目希望用更安全、更窄的方式重写“真实浏览器会话”模式：

- 浏览器侧连接器
- 本地桥接/会话管理器
- stdio MCP 服务器

初始目标：

1. 连接到真实浏览器会话，而不是启动一个沙盒浏览器。
2. 保留登录状态和现有标签页。
3. 暴露最小、易审计的 MCP 工具面。
4. 默认避免或限制高风险能力。

## Alpha 状态

`real-browser-mcp` 已经可以给支持 MCP 的本地 Agent 做早期 Alpha 试用，包括 CCBuddy。它还不是稳定的公共 API。

目前已经验证：

- `npm test`
- `npm run typecheck`
- `npm run build`
- CCBuddy 通过托管桥接路径完成 live smoke

在把它接入能力较强的 Agent 之前，请先阅读 `docs/security.md` 和 `docs/known-limitations.md`。

## 快速开始

前置要求：

- Node.js 22 或更新版本
- Google Chrome
- 一个支持 MCP 的本地 Agent Host

构建服务器和未打包的 Chrome 扩展：

```bash
git clone https://github.com/vincentyangch/real-browser-mcp.git
cd real-browser-mcp
npm install
npm run build
```

加载 Chrome 扩展：

1. 打开 `chrome://extensions`。
2. 启用 Developer mode。
3. 点击 Load unpacked。
4. 选择 `dist/chrome-extension`。
5. 确认扩展已启用，并且对你想使用的网站有站点访问权限。

检查桥接状态：

```bash
node dist/cli.js doctor
```

以 stdio MCP 服务器方式运行：

```bash
node dist/cli.js mcp
```

## 命令

```bash
npm run dev -- bridge-serve
npm run dev -- doctor
npm run dev -- mcp
npm run build
```

- `bridge-serve`：在 `127.0.0.1:18767` 启动本地桥接服务器。
- `doctor`：查询本地桥接并输出状态 JSON。
- `mcp`：启动 stdio MCP 服务器。默认情况下，如果没有健康的本地桥接，它会自动启动一个。
- `build`：编译服务器，并把可加载的未打包扩展生成到 `dist/chrome-extension/`。

## MCP Host 示例

Codex CLI：

```bash
codex mcp add real-browser \
  --env REAL_BROWSER_MCP_ALLOWED_DOMAINS=yahoo.com \
  --env REAL_BROWSER_MCP_DENIED_DOMAINS=discord.com \
  -- node /absolute/path/to/real-browser-mcp/dist/cli.js mcp
```

Claude Code CLI：

```bash
claude mcp add -s user \
  -e REAL_BROWSER_MCP_ALLOWED_DOMAINS=yahoo.com \
  -e REAL_BROWSER_MCP_DENIED_DOMAINS=discord.com \
  real-browser -- node /absolute/path/to/real-browser-mcp/dist/cli.js mcp
```

CCBuddy：

```yaml
ccbuddy:
  agent:
    external_mcp_servers:
      - name: "real-browser"
        command: "/usr/bin/env"
        args:
          - "node"
          - "/absolute/path/to/real-browser-mcp/dist/cli.js"
          - "mcp"
        env:
          REAL_BROWSER_MCP_ALLOWED_DOMAINS: "yahoo.com"
          REAL_BROWSER_MCP_DENIED_DOMAINS: "discord.com"
```

通用 MCP JSON：

```json
{
  "mcpServers": {
    "real-browser": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/real-browser-mcp/dist/cli.js", "mcp"],
      "env": {
        "REAL_BROWSER_MCP_ALLOWED_DOMAINS": "yahoo.com",
        "REAL_BROWSER_MCP_DENIED_DOMAINS": "discord.com"
      }
    }
  }
}
```

## 桥接生命周期

`real-browser-mcp mcp` 默认使用 `REAL_BROWSER_MCP_BRIDGE_MODE=auto`：

1. 如果 `REAL_BROWSER_MCP_BRIDGE_HOST` / `REAL_BROWSER_MCP_BRIDGE_PORT` 上已经有健康的桥接，MCP 服务器会复用它。
2. 如果没有健康的桥接，MCP 服务器会在当前进程内启动一个托管桥接。
3. 托管桥接会使用和 MCP 服务器相同的域名策略环境变量，所以像 CCBuddy 这样的 Host 在正常路径下只需要配置一个外部 MCP 条目。
4. 如果配置了 allow/deny 策略，但已有桥接没有报告同样的策略，启动会失败，避免静默绕过用户请求的策略。

可选桥接生命周期模式：

- `REAL_BROWSER_MCP_BRIDGE_MODE=auto`：复用已有健康桥接；如果不存在则启动一个。
- `REAL_BROWSER_MCP_BRIDGE_MODE=managed`：总是启动进程内桥接；如果端口被占用则失败。
- `REAL_BROWSER_MCP_BRIDGE_MODE=external`：要求用户单独启动 `bridge-serve` 进程。

## 域名策略

可以通过环境变量配置可选的桥接本地域名策略：

- `REAL_BROWSER_MCP_ALLOWED_DOMAINS`
- `REAL_BROWSER_MCP_DENIED_DOMAINS`

两个变量都接受逗号分隔的主机名，例如 `yahoo.com,example.com`。

当前匹配规则：

1. 规则大小写不敏感。
2. 规则会匹配精确主机和其子域名。
3. deny 规则优先于 allow 规则。
4. 如果 `REAL_BROWSER_MCP_ALLOWED_DOMAINS` 为空，则除 deny 规则命中的域名外，其它域名都允许。
5. 桥接会在命令进入浏览器连接器队列之前拒绝被阻止的命令。

## 当前桥接协议

本地桥接当前暴露：

- `GET /health`
- `GET /v1/tabs`
- `POST /v1/connector/snapshot`
- `GET /v1/connector/next-command?connector=<name>`
- `POST /v1/connector/command-result`
- `POST /v1/commands/open-url`
- `POST /v1/commands/switch-tab`
- `POST /v1/commands/click`
- `POST /v1/commands/scroll`
- `POST /v1/commands/type`
- `POST /v1/commands/scan-page`
- `POST /v1/commands/capture-screenshot`

`POST /v1/connector/snapshot` 是浏览器连接器的集成点。Chrome 扩展会发送类似这样的快照：

```json
{
  "connector": "chrome-extension",
  "browser": "chrome",
  "mode": "attached-session",
  "tabs": [
    {
      "id": "tab-1",
      "url": "https://example.com",
      "title": "Example Domain",
      "active": true
    }
  ],
  "updatedAt": "2026-04-21T21:20:00.000Z"
}
```

## 连接器脚手架

仓库现在包含第一个 Chrome 扩展连接器脚手架：

- `src/connectors/chrome-extension/background.ts`
- `src/connectors/chrome-extension/snapshot.ts`
- `src/connectors/chrome-extension/tab-target.ts`
- `src/connectors/chrome-extension/manifest.json`

当前行为：

1. 查询已打开的 `http` / `https` 标签页。
2. 将标签页映射为桥接快照格式。
3. 在安装、启动、标签页变化时向本地桥接 POST 快照。
4. 从扩展后台 worker 轮询桥接命令。
5. 在当前支持的目标标签页中执行桥接命令。

当前限制：

1. 未打包扩展目录生成在 `dist/chrome-extension/`。
2. 命令执行目前支持 `open_url`、`switch_tab`、`click`、`scroll`、`type`、`scan_page` 和 `capture_screenshot`。
3. 第一版点击原语基于文本，点击第一个匹配的可见交互元素。
4. 第一版滚动原语基于视口，按请求的页面数滚动当前页面。
5. 第一版输入原语只会向当前聚焦的可编辑元素输入文本。
6. 桥接本地域名策略是可选且由环境变量驱动的；更完整的 Host 侧策略仍应由使用它的 Agent Host 实现。
7. 它有意不暴露原始 JS 执行、cookies 或 CDP。

## 初始范围

Phase 1 工具：

- `browser_status`
- `browser_list_tabs`
- `browser_switch_tab`
- `browser_open_url`
- `browser_click`
- `browser_scroll`
- `browser_type`
- `browser_scan_page`
- `browser_capture_screenshot`

后续阶段暂缓：

- 更多浏览器输入动作
- 原始 JS 执行
- 原始 CDP passthrough
- cookie 导出
- 桌面级物理输入

## 设计原则

1. 先以读取为主。
2. 不移除 CSP。
3. 不静默压制对话框。
4. 默认不提供宽泛危险工具。
5. 将浏览器能力和策略执行分离。

用户审批、角色门控、域名限制等策略应由使用它的 Agent Host 执行，例如 CCBuddy。
本仓库也提供可选的桥接本地 allow/deny 层，作为基础域名控制的安全兜底。

## 发布计划

请查看 `docs/release-todos.md` 了解 `v0.1.0-alpha` 发布清单。

## 许可证

MIT。见 `LICENSE`。
