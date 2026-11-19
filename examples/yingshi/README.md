<!-- 用途：复现映室案例，说明如何用发布版模板运行原前端。独立保留案例专属路径、启动命令和状态数据说明；通用安装与技能流程见仓库首页。案例文件或模板结构变化时同步更新。 -->
# 映室案例 · 本地运行

映室示例保留了原有的图片生成前端及 22 个页面状态。评审入口通过 `review` 参数读取独立的内存演示数据，单独打开原型时可以体验本地模拟的登录、支付和生成流程。更多背景和截图见[仓库首页](../../README.md)。

## 启动画布

克隆仓库后，在仓库根目录执行：

```sh
mkdir -p examples/yingshi/board
cp skills/ui-state-board/assets/canvas/index.html skills/ui-state-board/assets/canvas/canvas.css skills/ui-state-board/assets/canvas/canvas.js examples/yingshi/board/
cp examples/yingshi/board.json examples/yingshi/board/board.json
python3 -m http.server 1104 --bind 127.0.0.1 --directory examples/yingshi
```

打开 [映室画布](http://127.0.0.1:1104/board/)，在左侧目录切换状态。点顶部「单独打开原型」可在新标签页打开 [映室原型](http://127.0.0.1:1104/studio.html)。如果本机的 1104 端口已被占用，启动命令和浏览器地址可使用另一个空闲端口。

## 查看代码

| 文件 | 用途 |
| --- | --- |
| [board.json](board.json) | 5 个页面组、22 个状态、视口与入口 |
| [studio.html](studio.html) | 画布与独立原型共用的前端入口 |
| [app/main.js](app/main.js) | 前端渲染、元素 ID 和页面交互 |
| [app/review.js](app/review.js) | 每个评审状态使用的示例数据 |
