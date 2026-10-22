# 华科药学 · 58天冲刺计划

涵盖药理学、分析化学、有机化学、英语和政治的每日复习计划。

## 功能

- 58天每日任务打卡，支持添加、编辑、删除任务及撤销删除。
- 查看五阶段安排和模拟考试日期。
- 记录每天实际学习时长、当天笔记和每周复盘。
- 查看完成任务、完成科目及每周计划与实际时长。
- 导出、导入JSON备份。

## 使用与保存

学习记录保存在当前浏览器、当前网站地址下，不会自动同步到其他设备或其他网站地址。

换设备或从原网站迁移时，先在原网站点击“备份”导出记录，再在这个网站导入。不要把个人打卡备份提交到仓库。

## GitHub Pages 发布

静态文件已放在仓库根目录。GitHub Pages的发布源选择 `main` 分支、`/ (root)` 根目录即可。无需构建或安装依赖。

`index.html`为入口，脚本、样式和计划数据均使用相对路径，支持GitHub Pages仓库子路径。

## 文件

| 文件 | 用途 |
| --- | --- |
| `index.html` | 页面入口与对话框 |
| `app.js` | 页面展示与交互 |
| `model.js` | 进度、学习时长和备份校验 |
| `plan-data.json` | 完整复习计划与来源说明 |
| `styles.css` | 电脑和手机页面样式 |
| `favicon.svg` | 网站图标 |
| `.nojekyll` | 按静态文件发布 |

官方发布说明：[GitHub Pages 发布源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
