# 项目说明

## 项目概况

这是一个使用原生 `HTML`、`CSS`、`JavaScript` 搭建的静态农业站点，包含首页、农业知识页和实践计划页三个正式页面。

正式运行页面如下：

- `index.html`
- `pages/knowledge.html`
- `pages/practice.html`

项目没有接入 `Bootstrap`，也没有使用其他现成的 UI 框架，页面结构、样式和交互均为手工编写。

## 页面职责

`index.html`

站点首页，用于展示平台定位、重点内容和基础数据概览。

`pages/knowledge.html`

农业知识页，围绕四季农事内容组织知识阅读、季节切换和问答信息。

`pages/practice.html`

实践计划页，用于展示种植计划生成、结果卡片和任务推进流程。

## 脚本说明

`js/index.js`

负责首页轮播切换和统计数字递增动画。

`js/knowledge.js`

负责四季内容切换和问答手风琴展开收起。

`js/practice.js`

负责种植计划计算器结果生成，以及任务进度条和提示文案更新。

## 本次更新

本次更新主要围绕正式页面的文案、资源和界面表现进行整理：

- 将页面中偏说明性质的提示语改为正式站点文案，使内容更符合真实上线网站的表达方式。
- 将 `assets/images` 中的图片按页面用途重新命名，并改为本地引用。
- 将头部、按钮和卡片中的图标改为页面内置 `SVG` 图标，不再依赖在线字体图标资源。
- 修复了图标未加载时显示成 `notifications`、`account_circle` 等文本的问题。
- 调整了知识页顶部概览区、季节切换区和底部资源区的文案与展示层级。
- 调整了实践页上层信息区的表达方式，使其更接近日常使用的计划与任务入口，同时保留原有功能模块。
- 页面色调已回退到上一版的绿色农业风格，并保留本轮整理后的结构与交互。

## 保留的交互依赖

为了确保脚本继续正常工作，以下节点仍然保留：

首页：

- `slide-card`
- `dot`
- `prevSlide`
- `nextSlide`
- `stat-number`

农业知识页：

- `season-btn`
- `season-panel`
- `accordion-title`
- `accordion-item`

实践计划页：

- `cropSelect`
- `areaInput`
- `planBtn`
- `planTitle`
- `seedResult`
- `dayResult`
- `incomeResult`
- `task-item`
- `nextTaskBtn`
- `progressBar`
- `progressText`
- `taskTip`

## 资源说明

正式页面当前的图标为本地内置 `SVG`，主要展示图片也已切换到 `assets/images` 下的本地文件。

当前图片命名按页面用途整理如下：

- `assets/images`

首页轮播：

- `seedling-closeup.png`
- `field-row-aerial.png`
- `rural-seedling-support.png`

农业知识页：

- `leafy-crop-closeup.png`
- `seedling-closeup.png`
- `field-inspection.png`
- `autumn-harvest-illustration.png`
- `winter-field-rows.png`

实践计划页：

- `rice-field-panorama.png`
- `tomato-cluster.png`
- `field-row-aerial.png`

说明：

- `backup-spring-sign.png` 和 `backup-winter-field.png` 目前作为备用图片保留，未在正式页面中使用。

## 后续维护建议

- 如果只做视觉优化，优先修改 `css/style.css`。
- 如果继续调整页面结构，注意不要改动现有脚本依赖的类名和 `id`。
- 如果新增展示图，可以继续使用本地 `SVG` 资源，保持正式页面的离线可用性。
