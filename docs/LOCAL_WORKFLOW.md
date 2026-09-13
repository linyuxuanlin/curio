# 本地开发与推送

本项目的本地工作副本位于：

```text
/Users/power/ai-projects/curio
```

开发网站代码、调整样式或修改文档时，进入这个目录操作；不要直接在 Cloudflare 的构建产物 `dist/` 中修改。内容卡片也先在本地校验，再推送 GitHub。

```sh
cd /Users/power/ai-projects/curio
git pull --ff-only origin main
npm ci

# 修改 src/、public/、docs/ 或 content/cards/
npm run validate
npm test
npm run build

git status
git add <本次修改的文件>
git commit -m "描述本次修改"
git push origin HEAD:main
```

`public/feed.json`、`dist/` 和 `node_modules/` 不要提交。推送后由 Cloudflare Pages 自动部署；代码和文档修改不需要启动第二个部署器。内容自动化任务与网站代码开发是两件事：任务目前保持启用，代码修改仍以这个本地副本为准。

如果推送前远端已有新提交，先执行 `git pull --rebase origin main`，解决冲突后重新运行校验和构建。禁止 force push。
