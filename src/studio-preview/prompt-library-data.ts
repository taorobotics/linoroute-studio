/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */

import type { MediaKind } from './contracts'

export interface PromptSource {
  id: string
  name: string
  url: string
  license: string
  licenseUrl: string
}

export interface CuratedPrompt {
  id: string
  kind: MediaKind
  categoryZh: string
  categoryEn: string
  titleZh: string
  titleEn: string
  descriptionZh: string
  descriptionEn: string
  promptZh: string
  promptEn: string
  tagsZh: string[]
  tagsEn: string[]
  sourceId: string
  tone: 'blue' | 'cyan' | 'amber' | 'coral'
}

export type ImagePromptModel =
  | 'GPT Image 2.5'
  | 'GPT Image 2'
  | 'Nano Banana Pro'

export type VideoPromptModel =
  | 'MiniMax H3'
  | 'Seedance 2.0'
  | 'Seedance 2.0 Fast'
  | 'Kling Video 3.0'
  | 'Kling Video 3.0 Omni'
  | 'Veo 3.1'
  | 'Veo 3.1 Fast'
  | 'Grok Imagine Video'

export interface ImagePromptCatalogItem extends CuratedPrompt {
  kind: 'image'
  sourceCaseUrl: string
  creatorName: string
  creatorUrl: string
  imageUrl: string
  imageAltZh: string
  imageAltEn: string
  models: ImagePromptModel[]
}

export interface VideoPromptCatalogItem extends CuratedPrompt {
  kind: 'video'
  sourceCaseUrl: string
  creatorName: string
  creatorUrl: string
  videoUrl: string
  videoPosterUrl: string
  videoAltZh: string
  videoAltEn: string
  generationModel: string
  originalSourceLabel: string
  models: VideoPromptModel[]
}

export const PROMPT_SOURCES: PromptSource[] = [
  {
    id: 'aiwind-imagegen',
    name: 'AiWind · adapted prompts',
    url: 'https://www.aiwind.org/',
    license: 'Source terms',
    licenseUrl: 'https://www.aiwind.org/terms',
  },
  {
    id: 'awesome-gpt-image-2',
    name: 'awesome-gpt-image-2',
    url: 'https://github.com/freestylefly/awesome-gpt-image-2',
    license: 'MIT',
    licenseUrl:
      'https://github.com/freestylefly/awesome-gpt-image-2/blob/main/LICENSE',
  },
  {
    id: 'gpt-image2-skill',
    name: 'GPT-Image2-Skill',
    url: 'https://github.com/wuyoscar/GPT-Image2-Skill',
    license: 'MIT',
    licenseUrl:
      'https://github.com/wuyoscar/GPT-Image2-Skill/blob/main/LICENSE',
  },
  {
    id: 'youmind-nano-banana-pro',
    name: 'YouMind Nano Banana Pro Prompts',
    url: 'https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts',
    license: 'CC BY 4.0',
    licenseUrl:
      'https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/blob/622c3c6f6a3caf1f935a49a42e605cd35882bc83/LICENSE',
  },
  {
    id: 'awesome-video-prompts',
    name: 'Awesome Video Prompts',
    url: 'https://github.com/ilkerzg/awesome-video-prompts',
    license: 'MIT',
    licenseUrl:
      'https://github.com/ilkerzg/awesome-video-prompts/tree/3cf36d4c8d532625faf6c1304b4e177c36f678c9#license',
  },
  {
    id: 'seedance-prompt-guide',
    name: 'seedance-prompt-guide',
    url: 'https://github.com/rich5000/seedance-prompt-guide',
    license: 'MIT',
    licenseUrl:
      'https://github.com/rich5000/seedance-prompt-guide/blob/master/LICENSE',
  },
  {
    id: 'seedance-prompt-generator',
    name: 'seedance-prompt-generator',
    url: 'https://github.com/maciejdzierzek/seedance-prompt-generator',
    license: 'MIT',
    licenseUrl:
      'https://github.com/maciejdzierzek/seedance-prompt-generator/blob/main/LICENSE',
  },
]

export const CURATED_PROMPTS: CuratedPrompt[] = [
  {
    id: 'image-amber-perfume',
    kind: 'image',
    categoryZh: '产品摄影',
    categoryEn: 'Product',
    titleZh: '午后香水产品摄影',
    titleEn: 'Afternoon perfume editorial',
    descriptionZh: '用材质、光线与悬浮物构建干净的商业主视觉。',
    descriptionEn:
      'Build a clean commercial key visual with material, light, and suspended details.',
    promptZh:
      '一瓶琥珀色香水置于午后暖阳中，天然石材底座，纸鹤与花瓣悬浮，杂志级产品摄影，柔和阴影，画面不含文字。',
    promptEn:
      'An amber perfume bottle in warm afternoon light, on a natural stone plinth, with paper cranes and petals suspended in the air. Editorial product photography, soft shadows, no text.',
    tagsZh: ['香水', '暖光', '商业摄影'],
    tagsEn: ['perfume', 'warm light', 'commercial'],
    sourceId: 'awesome-gpt-image-2',
    tone: 'amber',
  },
  {
    id: 'image-editorial-portrait',
    kind: 'image',
    categoryZh: '人物肖像',
    categoryEn: 'Portrait',
    titleZh: '杂志感人物肖像',
    titleEn: 'Editorial character portrait',
    descriptionZh: '强调人物神态、服装肌理与留白的杂志封面式构图。',
    descriptionEn:
      'An editorial composition focused on expression, garment texture, and negative space.',
    promptZh:
      '一位短发青年侧身站在浅灰背景前，柔和侧光勾勒面部与亚麻外套纹理，低饱和配色，人物自然注视镜头，杂志肖像摄影，大面积留白，无文字。',
    promptEn:
      'A short-haired young adult in three-quarter view against a pale gray background. Soft side light defines the face and linen jacket texture, muted colors, natural eye contact, editorial portrait photography, generous negative space, no text.',
    tagsZh: ['肖像', '杂志', '留白'],
    tagsEn: ['portrait', 'editorial', 'negative space'],
    sourceId: 'gpt-image2-skill',
    tone: 'blue',
  },
  {
    id: 'image-food-campaign',
    kind: 'image',
    categoryZh: '电商视觉',
    categoryEn: 'E-commerce',
    titleZh: '清爽食品主视觉',
    titleEn: 'Fresh food campaign visual',
    descriptionZh: '适合饮料、甜点与快消商品的清爽电商画面。',
    descriptionEn:
      'A crisp e-commerce visual for beverages, desserts, and consumer goods.',
    promptZh:
      '透明玻璃杯中的柚子气泡饮置于淡蓝色台面，柚子切片与细小水珠环绕，明亮高调布光，清爽夏日氛围，写实商业摄影，主体完整，无品牌标识，无文字。',
    promptEn:
      'A grapefruit sparkling drink in a clear glass on a pale blue surface, surrounded by grapefruit slices and tiny water droplets. Bright high-key lighting, fresh summer atmosphere, photoreal commercial photography, complete subject, no branding, no text.',
    tagsZh: ['饮料', '电商', '高调布光'],
    tagsEn: ['beverage', 'e-commerce', 'high key'],
    sourceId: 'awesome-gpt-image-2',
    tone: 'cyan',
  },
  {
    id: 'image-quiet-interior',
    kind: 'image',
    categoryZh: '空间设计',
    categoryEn: 'Space',
    titleZh: '静谧室内氛围',
    titleEn: 'Quiet interior atmosphere',
    descriptionZh: '通过空间秩序、自然材质与日光表达居住质感。',
    descriptionEn:
      'Express refined living through spatial order, natural material, and daylight.',
    promptZh:
      '极简客厅，弧形米白墙面，一把雕塑感木椅与低矮石桌，午后长影穿过落地窗，天然材质，建筑摄影，宁静克制，无人物，无文字。',
    promptEn:
      'A minimal living room with curved ivory walls, one sculptural wooden chair, and a low stone table. Long afternoon shadows enter through a floor-to-ceiling window, natural materials, architectural photography, quiet and restrained, no people, no text.',
    tagsZh: ['室内', '建筑', '极简'],
    tagsEn: ['interior', 'architecture', 'minimal'],
    sourceId: 'gpt-image2-skill',
    tone: 'coral',
  },
  {
    id: 'image-process-infographic',
    kind: 'image',
    categoryZh: '信息设计',
    categoryEn: 'Information',
    titleZh: '产品流程信息图',
    titleEn: 'Product process infographic',
    descriptionZh: '把复杂流程转成层级清楚、可编辑的结构草图。',
    descriptionEn:
      'Turn a complex flow into a clear, editable structural concept.',
    promptZh:
      '白色画布上的现代流程信息图，展示“输入、处理、输出”三阶段，深蓝主色与亮蓝强调色，圆角卡片、细线连接、统一线性图标，信息层级清楚，中文标题准确易读。',
    promptEn:
      'A modern process infographic on a white canvas showing three stages: Input, Process, and Output. Deep navy with bright blue accents, rounded cards, thin connectors, consistent line icons, clear information hierarchy, precise readable headings.',
    tagsZh: ['信息图', '流程', '界面'],
    tagsEn: ['infographic', 'process', 'interface'],
    sourceId: 'awesome-gpt-image-2',
    tone: 'blue',
  },
  {
    id: 'image-city-map',
    kind: 'image',
    categoryZh: '插画设计',
    categoryEn: 'Illustration',
    titleZh: '手绘城市漫游地图',
    titleEn: 'Hand-drawn city stroll map',
    descriptionZh: '以手账质感组织街区、地标与游览路线。',
    descriptionEn:
      'Organize neighborhoods, landmarks, and routes with a journal-like illustration.',
    promptZh:
      '俯视手绘城市漫游地图，米白纸张纹理，蓝色河流贯穿街区，地标建筑以温暖水彩小插画呈现，虚线连接步行路线，轻松友好，图例清楚，不出现真实品牌。',
    promptEn:
      'A top-down hand-drawn city stroll map on warm ivory paper. A blue river crosses the neighborhoods, landmark buildings appear as warm watercolor miniatures, dotted lines connect the walking route, friendly and relaxed, clear legend, no real brands.',
    tagsZh: ['地图', '水彩', '旅行'],
    tagsEn: ['map', 'watercolor', 'travel'],
    sourceId: 'gpt-image2-skill',
    tone: 'amber',
  },
  {
    id: 'image-app-icon',
    kind: 'image',
    categoryZh: '品牌设计',
    categoryEn: 'Brand',
    titleZh: '立体应用图标',
    titleEn: 'Dimensional app icon',
    descriptionZh: '用统一材质与光源生成精致、可识别的应用图标。',
    descriptionEn:
      'Create a polished, recognizable app icon with coherent material and lighting.',
    promptZh:
      '一个圆角方形应用图标，中心是由两条路径汇合形成的抽象字母 L，深海军蓝玻璃材质，边缘带细微电蓝光，高级产品渲染，正视图，纯浅灰背景，无文字，无水印。',
    promptEn:
      'A rounded-square app icon with an abstract letter L formed by two converging paths. Deep navy glass material with a subtle electric-blue rim light, premium product rendering, front view, plain light-gray background, no text, no watermark.',
    tagsZh: ['图标', '品牌', '3D'],
    tagsEn: ['icon', 'brand', '3D'],
    sourceId: 'awesome-gpt-image-2',
    tone: 'cyan',
  },
  {
    id: 'image-oriental-story',
    kind: 'image',
    categoryZh: '插画设计',
    categoryEn: 'Illustration',
    titleZh: '东方叙事插画',
    titleEn: 'Eastern narrative illustration',
    descriptionZh: '在传统画面秩序中加入现代光影与叙事焦点。',
    descriptionEn:
      'Combine traditional composition with modern light and a clear narrative focus.',
    promptZh:
      '雨后的江南石桥，一位撑青色纸伞的旅人停在桥中央，远处白墙黛瓦被薄雾遮掩，水面倒影微微晕开，工笔与电影光影结合，青灰色调，安静含蓄，无文字。',
    promptEn:
      'A stone bridge in Jiangnan after rain. A traveler holding a teal paper umbrella pauses at the center; distant white walls and dark tiled roofs fade into mist, reflections softly diffuse on the water. Meticulous Chinese illustration with cinematic light, blue-gray palette, quiet and understated, no text.',
    tagsZh: ['东方', '叙事', '雨景'],
    tagsEn: ['eastern', 'narrative', 'rain'],
    sourceId: 'gpt-image2-skill',
    tone: 'coral',
  },
  {
    id: 'video-coffee-atmosphere',
    kind: 'video',
    categoryZh: '氛围短片',
    categoryEn: 'Atmosphere',
    titleZh: '咖啡杯氛围短片',
    titleEn: 'Coffee cup atmosphere film',
    descriptionZh: '简单主体、缓慢变化与单一运镜，适合首个视频测试。',
    descriptionEn:
      'A simple subject, gradual change, and one camera move for a reliable first test.',
    promptZh:
      '固定机位中近景，一只深蓝陶瓷咖啡杯放在木桌上，热气缓慢上升，窗外晨光逐渐变亮，镜头轻柔前推，浅景深，安静温暖，无人物、无文字、无水印。',
    promptEn:
      'Locked medium close-up of a deep-blue ceramic coffee cup on a wooden table. Steam rises slowly as morning light outside the window gradually brightens. A gentle camera push, shallow depth of field, quiet and warm, no people, no text, no watermark.',
    tagsZh: ['咖啡', '晨光', '慢推'],
    tagsEn: ['coffee', 'morning', 'slow push'],
    sourceId: 'seedance-prompt-guide',
    tone: 'amber',
  },
  {
    id: 'video-perfume-orbit',
    kind: 'video',
    categoryZh: '产品广告',
    categoryEn: 'Product ad',
    titleZh: '香水环绕广告镜头',
    titleEn: 'Perfume orbit commercial',
    descriptionZh: '用连续环绕运镜突出玻璃、金属与流动光线。',
    descriptionEn:
      'Use a continuous orbit to emphasize glass, metal, and moving light.',
    promptZh:
      '天然石台上的琥珀色香水瓶，镜头从正面中景缓慢向右环绕半圈，暖光沿玻璃边缘流动，背景花瓣轻微飘落，瓶身比例与标签位置始终稳定，电影级产品广告，无突兀切镜。',
    promptEn:
      'An amber perfume bottle on a natural stone plinth. The camera slowly orbits half a circle to the right from a frontal medium shot. Warm light travels along the glass edge while petals drift gently in the background. Keep bottle proportions and label position stable, cinematic product commercial, no abrupt cuts.',
    tagsZh: ['香水', '环绕', '一致性'],
    tagsEn: ['perfume', 'orbit', 'consistency'],
    sourceId: 'seedance-prompt-generator',
    tone: 'blue',
  },
  {
    id: 'video-rainy-night',
    kind: 'video',
    categoryZh: '人物叙事',
    categoryEn: 'Narrative',
    titleZh: '雨夜人物叙事',
    titleEn: 'Rainy-night character story',
    descriptionZh: '把环境动作、人物反应和镜头节奏写进同一段叙事。',
    descriptionEn:
      'Bring environmental action, character reaction, and camera rhythm into one scene.',
    promptZh:
      '雨夜街角，一位穿深色风衣的年轻人停在便利店门口，霓虹倒映在湿地面，先低头看手机，再抬头望向驶来的出租车，镜头从远景缓慢推进至半身，雨声与城市环境音自然，人物外观保持一致。',
    promptEn:
      'At a street corner on a rainy night, a young adult in a dark trench coat waits outside a convenience store. Neon reflects on wet pavement. They look down at a phone, then up toward an approaching taxi. The camera slowly pushes from a wide shot to a medium shot; natural rain and city ambience; keep the character consistent.',
    tagsZh: ['雨夜', '人物', '推进'],
    tagsEn: ['rain', 'character', 'push-in'],
    sourceId: 'seedance-prompt-guide',
    tone: 'coral',
  },
  {
    id: 'video-city-transition',
    kind: 'video',
    categoryZh: '转场实验',
    categoryEn: 'Transition',
    titleZh: '城市昼夜延时转场',
    titleEn: 'City day-to-night transition',
    descriptionZh: '利用时间变化与固定构图完成自然的场景转场。',
    descriptionEn:
      'Use temporal change and fixed composition for a natural scene transition.',
    promptZh:
      '同一城市天际线的固定广角镜头，晴朗午后平滑过渡到蓝调时刻，再进入灯火亮起的夜晚，云层快速移动，建筑位置与镜头构图完全不变，曝光自然过渡，连续无闪烁。',
    promptEn:
      'A locked wide shot of the same city skyline transitions smoothly from a clear afternoon into blue hour and then a night of illuminated windows. Clouds move quickly while building positions and composition remain unchanged. Natural exposure transition, continuous and flicker-free.',
    tagsZh: ['城市', '延时', '昼夜'],
    tagsEn: ['city', 'timelapse', 'day to night'],
    sourceId: 'seedance-prompt-generator',
    tone: 'cyan',
  },
  {
    id: 'video-food-macro',
    kind: 'video',
    categoryZh: '产品广告',
    categoryEn: 'Product ad',
    titleZh: '甜点微距质感镜头',
    titleEn: 'Dessert macro texture shot',
    descriptionZh: '用微距、慢动作与声音细节表现食物质感。',
    descriptionEn:
      'Use macro framing, slow motion, and sound detail to reveal food texture.',
    promptZh:
      '微距特写，一把小勺缓慢切开焦糖布丁，薄脆焦糖层轻轻碎裂，奶油质地随勺子移动，侧后方暖光形成通透高光，轻微慢动作，收录清脆碎裂声，画面干净，无人物面部。',
    promptEn:
      'Macro close-up as a small spoon slowly cuts into crème brûlée. The thin caramel crust cracks delicately and the custard follows the spoon. Warm back-side light creates translucent highlights, subtle slow motion, crisp cracking sound, clean frame, no visible face.',
    tagsZh: ['甜点', '微距', '慢动作'],
    tagsEn: ['dessert', 'macro', 'slow motion'],
    sourceId: 'seedance-prompt-guide',
    tone: 'amber',
  },
  {
    id: 'video-interior-oner',
    kind: 'video',
    categoryZh: '空间镜头',
    categoryEn: 'Space',
    titleZh: '室内一镜到底漫游',
    titleEn: 'Interior single-take walkthrough',
    descriptionZh: '以明确路径约束长镜头，减少空间跳变。',
    descriptionEn:
      'Constrain a long take with a clear path to reduce spatial jumps.',
    promptZh:
      '一镜到底，从极简住宅玄关平稳向前移动，经过弧形走廊后向左转入明亮客厅，镜头高度始终保持在人眼水平，家具与门窗位置稳定，午后自然光，速度舒缓，无人物，无转场。',
    promptEn:
      'A continuous single take moves steadily forward from the entry of a minimal home, follows a curved hallway, then turns left into a bright living room. Keep the camera at eye level and all furniture, doors, and windows spatially stable. Afternoon daylight, relaxed speed, no people, no cuts.',
    tagsZh: ['室内', '长镜头', '空间一致'],
    tagsEn: ['interior', 'oner', 'spatial consistency'],
    sourceId: 'seedance-prompt-generator',
    tone: 'blue',
  },
  {
    id: 'video-fantasy-change',
    kind: 'video',
    categoryZh: '转场实验',
    categoryEn: 'Transition',
    titleZh: '纸上世界生长动画',
    titleEn: 'Paper world growth animation',
    descriptionZh: '用连续形变将平面插画转换为立体微缩世界。',
    descriptionEn:
      'Use continuous transformation to turn a flat illustration into a miniature world.',
    promptZh:
      '俯拍一本打开的素描本，纸上的蓝色河流线稿开始流动，树木与房屋从纸面缓慢立起，最终形成精致的微缩山谷，镜头轻轻下降靠近，形变连续自然，纸张边界始终可见，梦幻但材质真实。',
    promptEn:
      'Top-down view of an open sketchbook. A blue river drawing begins to flow as trees and houses slowly rise from the paper, forming a detailed miniature valley. The camera gently lowers closer; transformation is continuous and natural; paper edges remain visible; magical with believable materials.',
    tagsZh: ['纸艺', '形变', '微缩'],
    tagsEn: ['paper art', 'transformation', 'miniature'],
    sourceId: 'seedance-prompt-guide',
    tone: 'cyan',
  },
  {
    id: 'video-brand-intro',
    kind: 'video',
    categoryZh: '品牌动画',
    categoryEn: 'Brand',
    titleZh: '极简品牌片头',
    titleEn: 'Minimal brand ident',
    descriptionZh: '用材质、路径与节奏构建短而克制的品牌开场。',
    descriptionEn:
      'Build a short, restrained brand opening with material, path, and rhythm.',
    promptZh:
      '纯白空间中，两条细窄的深蓝玻璃路径从画面两侧滑入并汇合，形成抽象字母 L，边缘亮起一圈电蓝微光，镜头缓慢靠近后停住，整体 5 秒，动作干净克制，背景无其他元素，无附加文字。',
    promptEn:
      'In a pure white space, two narrow deep-navy glass paths slide in from opposite sides and merge into an abstract letter L. A subtle electric-blue rim light appears as the camera slowly moves closer and stops. Five seconds total, clean restrained motion, no other background elements, no extra text.',
    tagsZh: ['品牌', '片头', '极简'],
    tagsEn: ['brand', 'ident', 'minimal'],
    sourceId: 'seedance-prompt-generator',
    tone: 'coral',
  },
]

let imageCatalogPromise: Promise<ImagePromptCatalogItem[]> | undefined
let videoCatalogPromise: Promise<VideoPromptCatalogItem[]> | undefined

export function loadImagePromptCatalog(): Promise<ImagePromptCatalogItem[]> {
  imageCatalogPromise ??= import('./image-prompt-catalog.json').then(
    (module) => module.default as ImagePromptCatalogItem[]
  )
  return imageCatalogPromise
}

export function loadVideoPromptCatalog(): Promise<VideoPromptCatalogItem[]> {
  videoCatalogPromise ??= import('./video-prompt-catalog.json').then(
    (module) => module.default as VideoPromptCatalogItem[]
  )
  return videoCatalogPromise
}

export function getPromptSource(sourceId: string): PromptSource {
  const source = PROMPT_SOURCES.find((item) => item.id === sourceId)
  if (!source) throw new Error(`Unknown prompt source: ${sourceId}`)
  return source
}
