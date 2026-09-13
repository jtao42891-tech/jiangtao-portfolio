import { workMedia } from './work-media.js'

// 素材放入 public/works/，然后在 work-media.js 填写对应位置的 src。
// 空字符串代表有意保留的作品位，不会请求不存在的图片或视频。
// 视频可填写 poster；长图保留原始高度，不需要手动切片。
const slots = (prefix, title, count, kind, ratio) => Array.from({ length: count }, (_, index) => {
  const id = prefix + '-' + String(index + 1).padStart(2, '0')
  const media = workMedia[id] || {}
  return { id, title: media.title || title + ' ' + String(index + 1).padStart(2, '0'), src: media.src || '', poster: media.poster || '', alt: media.alt || '', draftAlt: media.draftAlt || '', renderAlt: media.renderAlt || '', splitY: media.splitY || 0, description: media.description || '', background: media.background || '', previewFit: media.previewFit || '', kind: media.kind || kind, ratio: media.ratio || ratio }
})

export const gallerySections = [
  {
    id: 'creative', number: '01', title: 'AI创意设计', english: 'AI Creative Design.',
    description: '让想象落地，让视觉发声。', layout: 'creative',
    rows: [
      {
        id: 'creative-square', title: '方图创意', label: 'SELECTED SQUARES', layout: 'featured-creative',
        items: slots('creative-square', '创意方图', 18, 'image', '1:1'),
        featuredIds: [
          'creative-square-02', 'creative-square-03', 'creative-square-08',
          'creative-square-10', 'creative-square-11', 'creative-square-13',
          'creative-square-14', 'creative-square-07', 'creative-square-04',
          'creative-square-06', 'creative-square-01', 'creative-square-09',
          'creative-square-17', 'creative-square-16', 'creative-square-12',
          'creative-square-05', 'creative-square-18', 'creative-square-15',
        ],
      },
      {
        id: 'creative-long', title: '竖版创意', label: 'SELECTED POSTERS', layout: 'featured-creative',
        frameRatio: '3:4', // 试用统一外框；删除此项即可恢复逐张原比例排版。
        items: slots('creative-long', '竖版海报', 12, 'image', '3:4'),
        featuredIds: [
          'creative-long-02', 'creative-long-03', 'creative-long-05',
          'creative-long-06', 'creative-long-08', 'creative-long-10',
          'creative-long-04', 'creative-long-07', 'creative-long-01',
          'creative-long-11', 'creative-long-09', 'creative-long-12',
        ],
      },
    ],
  },
  {
    id: 'marketing-main', number: '02', title: '营销主图设计', english: 'Marketing design.',
    description: '聚焦产品卖点，设计第一眼的吸引力。', layout: 'square',
    items: slots('marketing-main', '营销主图', 6, 'image', '1:1'),
  },
  {
    id: 'livestream-design', number: '03', title: '直播间设计', english: 'Livestream studio design.',
    description: '', layout: 'image', equalImageHeight: true,
    items: slots('livestream-design', '直播间设计', 3, 'image', '9:16'),
    featuredIds: ['livestream-design-03', 'livestream-design-02', 'livestream-design-01'],
  },
  {
    id: 'content-optimization', number: '04', title: '局部内容优化', english: 'Partial content optimization.',
    description: '', layout: 'image', equalImageHeight: true,
    items: slots('content-optimization', '局部内容优化', 3, 'image', '3:4'),
  },
  {
    id: 'product-detail', number: '05', title: '详情设计', english: 'Detail page design.',
    description: '梳理信息，也设计每一次阅读的节奏。', layout: 'long-page', previewRatio: '9:20',
    items: slots('product-detail', '产品详情', 3, 'long', 'LONG PAGE'),
  },
  {
    id: 'homepage', number: '06', title: '首页设计', english: 'Homepage design.',
    description: '从第一眼的吸引，到整页的叙事。', layout: 'long-page', previewRatio: '9:16',
    items: slots('homepage', '店铺首页', 3, 'long', 'LONG PAGE'),
  },
  {
    id: 'ip-design', number: '07', title: 'IP 设计', english: 'IP design.',
    description: '巴康明 mind · 角色与表情延展。', layout: 'ip-showcase',
    characterName: 'mind', characterLabel: '巴康明 / MIND',
    items: slots('ip-design', 'IP 形象', 4, 'image', 'TRANSPARENT PNG / WEBP'),
  },
  {
    id: 'exhibition', number: '08', title: '展会设计', english: 'Exhibition design.',
    description: '让品牌走出屏幕，在空间里被感知。', layout: 'exhibition',
    items: slots('exhibition', '展会设计', 4, 'image', '4:3'),
  },
  {
    id: 'offline-materials', number: '09', title: '线下物料设计', english: 'Print collateral design.',
    description: '', layout: 'print-collateral', skipInCategoryHeading: true,
    rows: [
      {
        id: 'product-manual', title: '产品手册设计', layout: 'image', showSkip: false,
        collections: [
          {
            id: 'inositol-manual', title: '肌醇产品手册', layout: 'image', gridLayout: 'mosaic', hideCaptions: true,
            // Keep original page numbers; removed chapter/portrait pages stay in the asset library only.
            items: slots('product-manual', '肌醇手册', 28, 'image', '16:9').filter(item => item.src && ![
              'product-manual-04', 'product-manual-07', 'product-manual-08', 'product-manual-09',
            ].includes(item.id)),
            featuredIds: [
              'product-manual-01', 'product-manual-02', 'product-manual-03',
              'product-manual-05', 'product-manual-06', 'product-manual-11',
              'product-manual-12', 'product-manual-28', 'product-manual-25',
            ],
          },
          {
            id: 'sunseasons-manual', title: '宝嘉力产品手册', layout: 'image', gridLayout: 'mosaic', hideCaptions: true,
            items: slots('sunseasons-manual', '宝嘉力产品手册', 25, 'image', '16:9').filter(item => item.src),
            featuredIds: [
              'sunseasons-manual-01', 'sunseasons-manual-02', 'sunseasons-manual-03',
              'sunseasons-manual-05', 'sunseasons-manual-06', 'sunseasons-manual-07',
              'sunseasons-manual-09', 'sunseasons-manual-08', 'sunseasons-manual-13',
              'sunseasons-manual-14', 'sunseasons-manual-16', 'sunseasons-manual-25',
            ],
          },
        ],
      },
      {
        id: 'logo-design', title: 'Logo设计', layout: 'image', showSkip: false,
        collections: [
          {
            id: 'meizhili-logo', title: '美之莉 Logo设计', layout: 'image', hideCaptions: true,
            items: slots('logo-design', 'Logo设计', 4, 'image', '16:9').slice(0, 2),
          },
          {
            id: 'widar-logo', title: '薇达 Logo设计', layout: 'image', hideCaptions: true,
            items: slots('logo-design', 'Logo设计', 4, 'image', '16:9').slice(2),
          },
        ],
      },
      {
        id: 'packaging-design', title: '包装设计', layout: 'packaging-reveal', showSkip: false,
        items: slots('packaging-design', '美之莉 · 洗护系列包装', 2, 'image', '2:3'),
      },
      {
        id: 'china-gt-racing-design', title: 'China GT项目赛车设计', layout: 'image', showSkip: false, hideCaptions: true,
        items: slots('china-gt-racing', 'China GT项目赛车设计', 4, 'image', '5504:3072'),
      },
    ],
  },
  {
    id: 'three-d', number: '10', title: '三维设计', english: '3D design.',
    description: '以形体、材质与光影，重新理解产品。', layout: 'three-d', skipInCategoryHeading: true,
    rows: [
      {
        id: 'three-d-scene-design', title: '三维场景设计', layout: 'image', gridLayout: 'staggered', showSkip: false, hideCaptions: true,
        items: slots('three-d-scene', '三维场景设计', 9, 'image', '1:1'),
      },
      {
        id: 'three-d-motion-design', title: '三维动态/动画设计', layout: 'video', gridLayout: 'aligned', frameRatio: '16:9', showSkip: false, hideCaptions: true,
        items: slots('three-d-motion', '三维动态/动画设计', 6, 'video', '16:9'),
      },
    ],
  },
  {
    id: 'ai-video', number: '11', title: 'AI 视频创作', english: 'AI video creation.',
    description: '借助 AI，把脑海中的画面变成动态表达。', layout: 'video', gridLayout: 'aligned', frameRatio: '16:9',
    items: slots('ai-video', 'AI 视频', 4, 'video', '16:9'),
  },
]

export const sectionItems = section => {
  const groups = section.rows || section.collections
  return groups ? groups.flatMap(sectionItems) : section.items
}
