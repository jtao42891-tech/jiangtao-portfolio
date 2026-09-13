# 作品素材位置

把真实图片和视频放在这个目录，然后修改 `src/work-media.js` 对应条目的 `src`。

- 图片：`src: '/works/your-image.jpg'`；可以用 JPG、PNG、WebP。
- 长图：使用完整原图，无需切片；首页和详情模块会在固定窗口内纵向滚动。
- 视频：`src: '/works/your-video.mp4'`，建议 H.264 MP4；`poster` 可填预览封面路径。
- `title` 修改作品名；`alt` 填写实际图片描述。
- 15 张真实方图保存在 `creative-square/`，编号 `01` 至 `15` 对应 `src/work-media.js` 的同号条目。展台随下滑展示全部 15 张，`featuredIds` 中的 6 张优先展出，其余紧接展示，点击作品可查看大图。
- 9 张真实竖版海报保存在 `creative-portrait/`，对应 `creative-long-01` 至 `creative-long-09`。优先第 9、8、4 张，再展示其余 6 张；保留各图原比例，使用普通图片预览，不使用超长图滚动模式。方图与竖版均可跳过本组。
- 已放入 mind 角色原图：`mind-laugh.png`、`mind-magic.png`、`mind-like.png`、`mind-hello.png`。它们使用原始透明通道，不需抠图；IP 栏目的说明和背景色同样在 `src/work-media.js` 修改。

空 `src` 会显示有意预留的空位，不会生成假作品或发起无效请求。
