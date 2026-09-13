# 概念素材说明

这些素材用于作品集基础版的视觉预览，不是蒋涛既有商业项目。使用内置 imagegen 工具，并行生成 3 张，一图一请求，无重试、无变体。生成日期：2026-09-09。

## 文件映射

- `public/media/hero-graphite.webp`：首页静态封面与 AI / 三维项目概念封面；原始图 `exec-82d58ce9-87c3-4608-adb6-97c81e1e32a6.png`。
- `public/media/hero-loop.mp4`：上一张图经 FFmpeg 转制的静音轻微缩放循环；10 秒 / 24 fps / H.264 / 1600 × 900 / 240 帧。动态幅度约 3%，无粒子和光效。
- `public/media/brand-green.webp`：品牌项目的包装概念占位；原始图 `exec-457f9e55-7126-4664-a5d3-b1e47481a302.png`。
- `public/media/product-blue.webp`：产品视觉项目的概念占位；原始图 `exec-64301530-ac7e-40cd-9249-4577daa00765.png`。

原始 PNG 位于 `C:/Users/TAO/.codex/generated_images/01a08677-23db-7652-9984-50cf31daba5d/`。网站仅引用项目内 WebP / MP4 文件。图像已检查：均无品牌文字，绿色图中包含生成的植物及石块，蓝色图中包含石块；这些均为装饰性概念元素。

## 准确生成提示词

### Hero

```text
Use case: stylized-concept
Asset type: illustrative preview hero cover for a visual designer portfolio, not an actual portfolio work
Primary request: elegant black graphite sculptural folded satin and pleated metallic paper, a singular wide flowing folded ribbon arch with softly lit luminous silver fine ridges.
Scene/backdrop: pure deep charcoal #111312.
Style/medium: architectural and macro sculptural photography, restrained, tactile, premium international editorial creative director website.
Composition/framing: wide 16:9 image, at least 1536 pixels wide; flowing ribbon arch occupying the right two thirds, left one third nearly charcoal black negative space for huge website text to be added later.
Lighting/mood: soft directional studio light, sophisticated quiet contrast.
Materials/textures: black graphite satin, pleated metallic paper, luminous silver fine ridges.
Constraints: no text, no logos, no watermark, no neon, no colored lights, no particles, no glass, no glowing orb.
```

### Green

```text
Use case: product-mockup
Asset type: illustrative preview project cover for a visual designer portfolio, not an actual portfolio work
Primary request: high-end editorial still life of unbranded nutritional supplement packaging: two restrained pale ivory rectangular cartons, one dark forest green frosted cylinder bottle, minimal completely blank labels, and a small dark green paper strip or sachet.
Scene/backdrop: muted eucalyptus and forest green studio floor and background.
Style/medium: premium photorealistic skincare editorial product photography; no medical claims.
Composition/framing: wide landscape 3:2 full-bleed composition, beautiful asymmetrical grouping.
Lighting/mood: soft directional light casting long clean shadows, quiet and refined.
Materials/textures: pale ivory paper cartons, dark forest green frosted bottle, matte dark green paper sachet.
Constraints: completely blank packaging; no words, brands, logos, watermarks, UI.
```

### Blue

```text
Use case: product-mockup
Asset type: illustrative preview project cover for a visual designer portfolio, not an actual portfolio work
Primary request: sculptural frosted blue glass serum bottle and a large clear water droplet form, with pale blue folds in the background.
Scene/backdrop: pale blue folded backdrop.
Style/medium: highly realistic, high-end product photography, quiet and modern.
Composition/framing: landscape 3:2 image, strong refined product photography composition.
Lighting/mood: confident studio light.
Color palette: refined cool muted blue.
Materials/textures: tactile frosted blue glass and crystal-clear water droplet surface, soft pale blue folds.
Constraints: no text, no logos, no watermark, no neon, no glowing orb, no UI.
```

## 英文字体

- DM Sans：Google Fonts `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400..700` 返回的 Latin 可变 WOFF2。
- Manrope：Google Fonts `https://fonts.googleapis.com/css2?family=Manrope:wght@400..800` 返回的 Latin 可变 WOFF2。
- 字体文件与 Google Fonts 官方仓库的 SIL OFL 许可均保存在 `public/fonts/`；中文使用系统字体栈。
