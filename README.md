# Curio · 趣闻，一张一张看

把世界的新发现，变成可以拿起、倾斜、划走的一叠卡片。

**网站：[curio.wiki-power.com](https://curio.wiki-power.com)** · **仓库：[linyuxuanlin/curio](https://github.com/linyuxuanlin/curio)**

## 给负责更新内容的 ChatGPT

先读 [发布操作指南](docs/PUBLISHING.md)，再使用 [每小时任务完整提示词](docs/HOURLY_PROMPT.md)。每次只新增一个 `content/cards/<id>.json` 和必要的图片，推送到 `main`；Cloudflare 自动校验、构建和发布。**提交成功不等于网站上线成功：必须核对线上 `/feed.json` 已出现本轮卡片 ID。**

当前没有创建或修改你的定时任务。请在有联网检索和 GitHub 写入能力的 ChatGPT Work / Codex 环境中设置每小时任务，并先手动跑通一次。没有这些能力的普通聊天任务不能仅靠提示词获得发布权限。

## 体验

- 初次打开：最新入库的未读卡片优先。
- 卡片采用竖向标准信用卡比例（宽高约 0.63:1）；正面看图和简介，点击按钮以 3D 方式翻到背面查看正文、来源与图片署名。
- 鼠标拖动、触屏向任意方向划、键盘左右键或“下一张”按钮：甩出并标记已读。
- 轻轻拖动后松手：弹回，不标记已读。误划可以撤回。
- 未读耗尽：出现有按压行程的“手气不错”按钮，随机掉落最多 5 张历史卡片。
- 排除本次会话及近 30 分钟划走的卡片；可抽卡片不足时不重复凑数，全部看完时明确提示稍后再来。
- 已读状态使用浏览器 localStorage，跨刷新保留；不同设备不同步。无需账号、数据库或邮件。
- 页面回到前台或每 5 分钟自动检查新卡片，已有阅读顺序不被打断。
- 支持减少动态效果设置、键盘操作、卡片正反面、图片失败与网络错误状态；页面和卡片本身不会出现滚动条。

## 开发

需要 Node.js 22（或 Vite 支持的较新版本）。

```sh
npm ci
npm run build
npm run dev
```

```sh
npm run validate
npm test
npm run build
```

## 架构

```text
ChatGPT 每小时检索、核实并选题
  → content/cards/<稳定 ID>.json + public/media/图片
  → GitHub main
  → Cloudflare Pages Git integration
  → npm run build（校验 → feed.json → Vite 静态打包）
  → curio.wiki-power.com
  → 浏览器 localStorage 记录已读，客户端随机抽卡
```

内容与界面分离，无运行时 API 密钥。JSON 内容通过 DOM `textContent` 渲染，不能注入 HTML。校验器拒绝危险 URL、重复事件、缺少来源的内容和未经批准的生成图模型。

完整说明：[架构与部署](docs/ARCHITECTURE.md) · [内容格式](docs/CONTENT_FORMAT.md) · [图片授权记录](docs/MEDIA.md)

## 首批内容

2026-09-12 建站时核实了五则真实事件。四则对应 2026-09-10 的近期研究或活动；蓝色章鱼为 2026-05 的往期精选。`eventDate` 是事件或研究公布日期，`publishedAt` 是本站入库时间，绝不通过改日期把旧闻伪装成新闻。首批批量入库的分钟顺序仅用于阅读排序，不是每小时任务的运行记录。

## 版权

界面和项目代码由本仓库维护；第三方照片版权归各署名方。新闻素材仅用于相应事件报道，具体许可见各卡片 `image.licenseUrl` 与 [MEDIA.md](docs/MEDIA.md)，不视为可任意复用的图库。项目没有发信功能，也不调用 Gmail。
