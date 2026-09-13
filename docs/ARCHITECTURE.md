# 架构与部署

## 技术选择

Vite + 原生 JavaScript + CSS，生产环境只包含静态文件。卡片的 Pointer Events 处理任意方向位移和速度，Web Animations API 负责甩出，CSS 负责纸张、回弹和掉落。避免为这一个页面引入重型应用框架。

- `src/main.js`：读卡、手势、撤回、空状态、前台刷新。
- `src/deck.js`：已读过滤、随机洗牌、最近阅读排除、手势判定。
- `src/style.css`：桌面、移动端、减少动画与纸张外观。
- `content/cards/*.json`：内容唯一事实源，一事件一文件。
- `scripts/build-content.mjs`：校验并按入库时间倒序合成 `public/feed.json`，构建产物不提交。
- `public/media/*`：有授权的原图或通过规定能力生成且已核验的示意图。
- `public/manifest.webmanifest`、`public/sw.js`、`public/icons/*`：PWA 安装清单、离线缓存和应用图标。
- `public/_headers`：安全头与缓存策略。

## Cloudflare Pages

- 项目名：`curio`
- 生产分支：`main`
- 构建命令：`npm run build`
- 输出目录：`dist`
- Node 环境变量：`NODE_VERSION=22`
- 生产域名：`curio.wiki-power.com`
- 默认域名：`curio-eup.pages.dev`
- 集成：Cloudflare 自带 GitHub Git integration，自动构建每次推送。

不需要给内容作者 Cloudflare API Token。内容作者只需 GitHub 仓库 Contents 写权限，部署由已经授权的 Cloudflare GitHub App 处理。新增域名时先在 Pages 中绑定，再配置 CNAME 指向默认域名。

官方文档：[Git 集成](https://developers.cloudflare.com/pages/configuration/git-integration/) · [自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)

## 数据与阅读语义

`curio:read:v1` 永久记录已划走卡片 ID 到时间戳。`curio:recent:v1` 记录最近阅读；抽卡时只计算最近 30 分钟，并与当前页面会话内已划走 ID 取并集。刷新之后仍排除刚刚阅读的内容。全部候选读完后不制造重复卡，稍后重新打开才重新计算会话。

初次访问者的所有真实卡片都是未读，因此首次看完整个库后可能没有可随机抽取的卡片。这是“排除刚读过”的正确结果；不是故障。老访客已有历史库，读完本次新卡后可以抽取以前读过但非刚刚读过的卡片。

卡片采用竖版标准信用卡比例（宽高约 0.63:1），正面固定展示图片、标题和简介；点击整张卡片通过 3D 翻面分页查看完整正文、来源与图片署名。页面和卡片都不提供滚动区域，避免移动端手势与页面滚动冲突。仅成功划走或点击下一张才记已读；浏览到、翻面或拖动回弹不会记已读。撤回恢复此前已读/最近阅读状态。多标签页同步读取 localStorage 的变化。读完最后一张未读卡片时触发一次烟花动画。

## 规模与演进

静态 feed 适合初期内容规模，图片独立缓存。按每小时五张长期积累后，需要关注 feed 大小；达到数 MB 后可把归档拆成月度分片，并保留最近索引。当前没有声称已实现无限规模分页。图片优先压缩为适当尺寸（建议每张不超过 1 MB），不要将超大原图、临时签名链接或整份论文提交仓库。

## 发布失败

构建校验不通过时不发布，新提交仍在 GitHub，但线上维持上一成功版本。查看 Cloudflare Pages 对应提交日志并修正内容，不要绕过校验。修复提交不要改变事件 ID。网站的 `/feed.json` 是最终发布验证点；读到 JSON 并找到卡片 ID 才能报告“已上线”。

每小时发布会持续消耗 Pages 构建额度。上线前请在账户中确认当前配额足以支撑所需频率；额度因计划变化，以 [Cloudflare 当前限制文档](https://developers.cloudflare.com/pages/platform/limits/) 和仪表盘为准。如果不足，选择提升构建配额或降低部署频率，不能假定无限构建。

界面缓存：HTML 导航使用网络优先、离线回退，带哈希静态资源使用缓存优先；feed 在网络断开或 HTTP 错误时回退缓存。背面按实际可用高度分页，保留全文与来源链接，Enter / 空格支持键盘翻面。

更新通知由 `src/notifications.js` 管理，只有用户点击开启并授予浏览器权限后才发送。页面每 5 分钟检查 feed，开启通知时后台标签页也参与检查；通知 ID 保存在本地，并通过 Web Locks 在支持的浏览器中串行发送，避免多标签页重复提醒。Service Worker 负责显示持久通知和点击后聚焦页面；不支持服务工作线程时尝试桌面 Notification。此实现没有服务端 Web Push，页面关闭或浏览器暂停计时器时无法保证每小时即时送达。

卡片开始拖动或离场前停止掉落和回弹动画；当前卡片离场期间锁定消费操作，下一张始终保持在下层。动画结束后才替换卡片与清理拖拽层级，避免重复划走和层级交错。
