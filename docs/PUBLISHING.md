# ChatGPT 每小时更新与发布指南

## 0. 先确认运行环境

目标仓库：**https://github.com/linyuxuanlin/curio**；目标分支：**main**；线上数据：**https://curio.wiki-power.com/feed.json**。

应选择具有联网检索、文件/仓库读写、GitHub 提交能力的 ChatGPT Work 或 Codex 定时任务环境。先连接 GitHub，并确认当前任务能访问本仓库且有 Contents 写入权限。仅能搜索 GitHub、只能读、或只能在聊天里输出的任务，不能实现自动发布。

[OpenAI 官方计划任务文档](https://learn.chatgpt.com/docs/automations)说明 Work/Codex 计划任务可使用插件与技能；具体能力取决于套餐、工作区配置和连接授权。**实际手动运行成功一次才设置每小时运行**。本地项目任务依赖机器开机、桌面应用运行及目录可用；希望电脑关机时也运行，应选择实际可用的云端 Work 任务并验证写入。

不需要邮件、Gmail、数据库或 Cloudflare 密钥。不要把任何令牌写入提示词、JSON、提交消息或仓库文件。

## 1. 每次先读历史

读取 `README.md`、`docs/HOURLY_PROMPT.md`、`docs/CONTENT_FORMAT.md`，然后列出 `content/cards/`。

按 `publishedAt` 读取最近至少 20 期，比较 `eventKey`、标题、来源 URL、论文 DOI。对候选再查整个目录，防止隔了一段时间重复。不要依赖聊天记忆。最近一张的大领域必须轮换，最近 6 期天文/航天最多 1 期（特别重大例外需写明依据）。

## 2. 检索和核实

严格遵循完整提示词。优先当天/前一天及 24–72 小时；只有新鲜候选不足才逐步扩大日期，并给旧内容标记 `archive: true`。每轮一件，2–4 个可点击可靠来源，尽量至少两个独立来源交叉验证。机构新闻与同机构另一页不能假称独立验证。

日期按来源精度记录，新闻发布日不等于发现日。图片必须核对版权、内容与事件一致性。没有图片不影响发布文字卡。

## 3A. 有终端/仓库工作区时

```sh
git pull --ff-only origin main
npm ci
```

按规范创建唯一 JSON 文件和必要图片，然后：

```sh
npm run validate
npm test
npm run build
git add content/cards/<id>.json public/media/<image>
git diff --cached --stat
git commit -m "content: add <id>"
git push origin HEAD:main
```

没有图片时省略相应路径。使用真实 ID 替换占位符。不要提交 `public/feed.json`、`dist/`、`node_modules/`。网络或冲突失败时重新读取远端并 `git pull --rebase origin main`，重新校验后再推送；禁止强制推送。若处于脱离分支的工作树，用 `git fetch origin main` / `git rebase origin/main` 处理对应流程。

## 3B. 只有 GitHub 写入工具时

1. 读取 `main` 当前提交 SHA 和它的 tree SHA。
2. 使用 GitHub Git Data API / 插件 `create_blob` 上传新图片（base64）；只有 JSON 时可在 tree entry 中直接提供 UTF-8 `content`。
3. `create_tree` 的 `base_tree_sha` 使用刚读取的远端树；只添加本轮 JSON / 图片条目，`mode: "100644"`、`type: "blob"`。
4. `create_commit` 使用新 tree SHA，parent 为刚读取的主分支提交。
5. `update_ref` 将 main 指向新 commit，`force: false`。
6. 若并发更新导致非快进失败，读取最新 SHA，基于新 base tree 重建提交并重新检查事件是否已经存在；不要覆盖其他任务提交。

只有单个文字卡时，也可通过 `create_file` 在 `main` 新建一份 JSON。工具参数以实际可用工具的定义为准，不要虚构成功输出。如果无法运行本地校验，应逐项检查格式并等待 Pages 构建校验；构建失败必须修正。

## 4. 验证真正上线

Cloudflare Pages 已连接本仓库，main 推送会自动执行 `npm run build`。任务不需要另行触发部署，也不要另建第二套定时发布器。

- 记录本轮 commit SHA。
- 读取对应 Cloudflare 部署/GitHub check，等其成功。
- 获取 `https://curio.wiki-power.com/feed.json`（强制重新验证或添加无秘密的 cache-busting 参数），解析 JSON，确认包含本轮 ID、标题、来源以及图片路径。
- 如有图片，验证线上图片返回成功且可以解码。
- 有本地终端可运行 `node scripts/verify-live.mjs <id>`；脚本单次验证，不会无限等候。
- 失败可有限次数重试；超时应报告“提交成功，发布尚未确认”，附 commit，不要宣称已上线，不要发邮件，不要停用任务。

## 5. 完成回执

在任务对话里简短报告：`已发布：趣闻｜<领域>｜<短标题>`、卡片 ID、GitHub 提交链接、网站链接。若失败，明确阶段：检索不足 / GitHub 写入失败 / Pages 构建失败 / 上线验证未通过。

如果没有合格候选，本轮输出原因和已查来源，保留下一小时运行；不为了满足数量伪造内容或重复事件。失败不会自动禁用、删除或暂停任务。

## 设置定时任务

复制 [HOURLY_PROMPT.md](HOURLY_PROMPT.md) 到目标 ChatGPT 任务，要求“每小时执行一次，使用已连接的 GitHub 对 linyuxuanlin/curio 进行写入，首次现在手动跑通并验证上线”。用户本次只要求准备网站与文档，因此建站过程没有替你启用新任务，也没有动原有聊天任务。
