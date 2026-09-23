/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */

import type { ImagePromptCatalogItem } from './prompt-library-data'

const defaults = {
  kind: 'image' as const,
  sourceId: 'aiwind-imagegen',
  sourceCaseUrl: 'https://www.aiwind.org/',
  creatorName: 'AiWind public case · adapted',
  creatorUrl: 'https://www.aiwind.org/',
  models: ['GPT Image 2.5', 'GPT Image 2'] as ImagePromptCatalogItem['models'],
}

export const AIWIND_BATCH03_IMAGE_PROMPTS: ImagePromptCatalogItem[] = [
  {
    ...defaults,
    id: 'aiwind-imagegen-20260923-emerald-greenhouse',
    categoryZh: '时尚肖像',
    categoryEn: 'Fashion Portraits',
    titleZh: '翡翠温室 · 绿意时装人像',
    titleEn: 'Emerald Greenhouse · Botanical Fashion Portrait',
    descriptionZh:
      '把玻璃温室、湿润叶片与翡翠丝绸组合成一张完整的竖幅时装肖像。',
    descriptionEn:
      'A complete vertical fashion portrait merging a glasshouse, wet leaves, and emerald silk.',
    promptZh:
      '竖版 4:5 高级时装摄影：虚构成年女性身穿深翡翠绿丝绸长裙，站在阳光充足的玻璃温室中，周围是热带大叶、藤蔓和带雾气的拱形窗。人物神情自然，姿态松弛，真实皮肤纹理与丝绸光泽清晰可见。温暖的滤光、玻璃反射和叶片阴影营造安静高级的氛围。不要品牌、文字或水印。',
    promptEn:
      'Use case: photorealistic-natural. Create one standalone vertical 4:5 premium editorial portrait of a fictional adult woman in a deep emerald silk dress inside a lush glass conservatory. Tropical leaves, hanging vines, arched misted panes, and a sunlit stone path create depth. Natural relaxed pose, realistic skin texture, elegant silk sheen, filtered late-morning light, glass reflections and leaf shadows. Serene, sophisticated, original subject; no brand marks, text, or watermark.',
    tagsZh: ['温室', '时装肖像', '翡翠绿'],
    tagsEn: ['greenhouse', 'fashion portrait', 'emerald'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-emerald-greenhouse.png',
    imageAltZh: '玻璃温室中的翡翠绿丝绸人像',
    imageAltEn: 'Emerald silk portrait in a glass greenhouse',
    tone: 'cyan',
  },
  {
    ...defaults,
    id: 'aiwind-imagegen-20260923-amber-perfume',
    categoryZh: '产品电商',
    categoryEn: 'Products & E-commerce',
    titleZh: '琥珀香气 · 石材静物广告',
    titleEn: 'Amber Scent · Travertine Still Life',
    descriptionZh:
      '用玻璃折射、丝绸褶皱和干花细节完成一张克制的香氛产品主视觉。',
    descriptionEn:
      'A restrained fragrance key visual built from glass refraction, silk folds, and dried flowers.',
    promptZh:
      '竖版 4:5 高级产品静物摄影：无品牌琥珀色玻璃香水瓶置于浅色洞石台座上，旁边是折叠的奶油色丝绸和一枝干燥野花。瓶身透明折射、金色液体、石材孔洞、丝绸纤维和花瓣细节清晰。温暖窗光投下柔和阴影，画面干净、优雅、留白充足。不要可读标签、标志或水印。',
    promptEn:
      'Use case: product-mockup. One standalone vertical 4:5 luxury still life of an unbranded amber glass perfume bottle on a pale travertine plinth, beside folded cream silk and one dried wildflower. Show glass refraction, honey-colored liquid, porous stone, silk fibers, and delicate petals. Soft directional window light, quiet warm studio, generous breathing room, refined editorial product photography. No readable label, logo, or watermark.',
    tagsZh: ['香水静物', '玻璃质感', '高级广告'],
    tagsEn: ['fragrance still life', 'glass texture', 'luxury ad'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-amber-perfume.png',
    imageAltZh: '洞石台座上的琥珀香水瓶',
    imageAltEn: 'Amber perfume bottle on travertine',
    tone: 'amber',
  },
  {
    ...defaults,
    id: 'aiwind-imagegen-20260923-miniature-ramen-terrarium',
    categoryZh: '创意实验',
    categoryEn: 'Creative Experiments',
    titleZh: '玻璃罩拉面店 · 深夜微缩场景',
    titleEn: 'Ramen Terrarium · Midnight Miniature',
    descriptionZh: '把暖灯、蒸汽和城市夜色压缩进一座可阅读尺度的玻璃罩微缩店。',
    descriptionEn:
      'A readable miniature ramen shop compressing warm lanterns, steam, and city night into glass.',
    promptZh:
      '横版 3:2 电影感微缩摄影：透明玻璃罩内是一家深夜拉面小店，纸灯笼、木质吧台、陶瓷碗、蒸汽和一辆红色小自行车构成完整场景，外部是冷蓝城市散景。低机位透过带水汽的玻璃观察，暖橙灯光与蓝色夜景形成对比，手工作品细节真实。不要可读招牌、品牌或水印。',
    promptEn:
      'Use case: stylized-concept. Create one standalone landscape 3:2 cinematic macro photograph of a handcrafted miniature midnight ramen shop inside a clear glass terrarium. Paper lanterns, a wooden counter, ceramic bowls, rising steam, a tiny red bicycle, and a cool blue city bokeh outside establish scale. Low eye-level view through lightly condensed glass, warm orange interior against deep navy night, tactile diorama detail. No readable sign, branding, or watermark.',
    tagsZh: ['微缩模型', '拉面店', '夜景灯光'],
    tagsEn: ['miniature', 'ramen shop', 'night lighting'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-miniature-ramen-terrarium.png',
    imageAltZh: '玻璃罩里的深夜拉面微缩店',
    imageAltEn: 'Midnight ramen miniature in a terrarium',
    tone: 'blue',
  },
  {
    ...defaults,
    id: 'aiwind-imagegen-20260923-coastal-railway-gouache',
    categoryZh: '插画艺术',
    categoryEn: 'Illustration & Art',
    titleZh: '海岸列车 · 明亮的旅行海报',
    titleEn: 'Coastal Railway · Sunlit Travel Gouache',
    descriptionZh: '用手绘笔触、海岸层次和完整构图做一张无文字旅行海报。',
    descriptionEn:
      'A wordless travel-poster composition with painterly strokes, coastal layers, and a clear horizon.',
    promptZh:
      '横版 16:9 现代水粉旅行海报：银色列车沿湛蓝海岸的石拱桥弯行，右侧站台有一位拖着芥末黄色行李箱的旅人，远处是山城、海岛和帆船。明亮晚下午阳光，海风吹动前景草与粉色野花；纸张纹理、彩铅边线和手绘笔触清晰，构图完整，无任何文字或标志。',
    promptEn:
      'Use case: illustration-story. One standalone landscape 16:9 contemporary gouache and colored-pencil travel poster: a silver train curves across a stone viaduct above a turquoise coast, while one traveler with a mustard suitcase waits beneath a striped awning. Layered cliffs, a small hillside town, islands, sailboats, windblown grasses, and pink wildflowers fill the scene. Bright late-afternoon sun, tactile paper grain, visible brushwork and pencil edges. Original wordless artwork; no lettering, logo, or watermark.',
    tagsZh: ['海岸旅行', '水粉插画', '列车'],
    tagsEn: ['coastal travel', 'gouache', 'train'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-coastal-railway-gouache.png',
    imageAltZh: '沿海岸行驶的银色列车水粉画',
    imageAltEn: 'Silver train along a painted coast',
    tone: 'cyan',
  },
  {
    ...defaults,
    id: 'aiwind-imagegen-20260923-coral-radio',
    categoryZh: '产品电商',
    categoryEn: 'Products & E-commerce',
    titleZh: '珊瑚收音机 · 复古厨房静物',
    titleEn: 'Coral Radio · Retro Kitchen Still Life',
    descriptionZh: '用复古配色、柑橘切面和真实塑料质感完成一张轻快的产品图。',
    descriptionEn:
      'A playful product image with retro colors, citrus slices, and believable glossy plastic.',
    promptZh:
      '方形 1:1 复古产品摄影：珊瑚红便携收音机置于薄荷绿桌面，周围是柑橘切片、陶瓷杯和没有文字的线圈笔记本。橙色花纹瓷砖、柔和植物与明亮窗光形成 1970 年代厨房气氛。收音机旋钮、编织扬声器网和天线细节清晰，画面欢快但不杂乱。不要品牌、可读文字或水印。',
    promptEn:
      'Use case: ads-marketing. One standalone square 1:1 playful editorial product photograph of a coral-red portable radio on a mint-green table, surrounded by citrus slices, a ceramic mug, and a blank spiral notebook. Retro floral tiles, a soft houseplant, and sunny window shadows evoke a 1970s kitchen. Glossy plastic, woven speaker grille, knobs, and angled antenna are crisp; cheerful but controlled composition. No logo, readable text, or watermark.',
    tagsZh: ['复古产品', '收音机', '柑橘配色'],
    tagsEn: ['retro product', 'radio', 'citrus palette'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-coral-radio.png',
    imageAltZh: '薄荷绿桌面上的珊瑚色复古收音机',
    imageAltEn: 'Coral retro radio on a mint table',
    tone: 'coral',
  },
  {
    ...defaults,
    id: 'aiwind-imagegen-20260923-whale-teapot',
    categoryZh: '创意实验',
    categoryEn: 'Creative Experiments',
    titleZh: '鲸鱼茶壶 · 手作陶瓷物件',
    titleEn: 'Whale Teapot · Handcrafted Ceramic Object',
    descriptionZh:
      '把鲸鱼形态、手作釉面和海边厨房光线结合成一件可用的创意物件。',
    descriptionEn:
      'A usable whimsical object combining whale form, handmade glaze, and coastal kitchen light.',
    promptZh:
      '竖版 4:5 手作陶瓷产品渲染：一只钴蓝色鲸鱼形茶壶放在浅色陶桌上，尾巴成为壶把，背部有圆润壶盖，壶嘴自然从头部延伸；旁边放一只小茶杯与野花。手工釉面、细小指痕、哑光墙面和亚麻布质感真实，海边窗景提供柔和晨光。不要塑料感、文字、标志或水印。',
    promptEn:
      'Use case: stylized-concept. Create one standalone vertical 4:5 high-end ceramic object study: a cobalt-blue whale-shaped teapot on a pale clay table, tail forming the handle, rounded lid on its back, believable spout from the head, with a small cup and wildflowers beside it. Hand-applied glaze, subtle fingerprints, matte plaster, linen, and a softly sunlit coastal window. Whimsical but functional, tactile handcrafted ceramic. No plastic look, lettering, logos, or watermark.',
    tagsZh: ['陶瓷器物', '鲸鱼茶壶', '手作质感'],
    tagsEn: ['ceramic object', 'whale teapot', 'handcrafted'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-whale-teapot.png',
    imageAltZh: '钴蓝色鲸鱼形手作茶壶',
    imageAltEn: 'Cobalt whale-shaped ceramic teapot',
    tone: 'cyan',
  },
  {
    ...defaults,
    id: 'aiwind-imagegen-20260923-rainy-violinist',
    categoryZh: '场景叙事',
    categoryEn: 'Scenes & Stories',
    titleZh: '雨夜琴匣 · 霓虹下的音乐人',
    titleEn: 'Rainy Violinist · Musician Under Neon',
    descriptionZh: '让雨后路面、霓虹倒影与木质琴匣撑起一张完整的都市叙事人像。',
    descriptionEn:
      'An urban narrative portrait carried by wet pavement, neon reflections, and a wooden case.',
    promptZh:
      '竖版 2:3 电影感街拍：虚构成年小提琴手穿炭灰色长外套，手提棕色木质小提琴匣，站在雨后的城市高架桥下。路面被品红、青蓝和琥珀灯光染亮，远处车辆散景与轻雾增加深度。人物姿态自然、神情沉静而有希望，羊毛、旧木、雨滴纹理清楚。不要名人相貌、文字招牌、品牌或水印。',
    promptEn:
      'Use case: photorealistic-natural. Create one standalone vertical 2:3 cinematic 35mm street portrait of a fictional adult violinist beneath a rain-slick city overpass, holding a worn wooden violin case. Magenta, teal, and amber lights reflect across wet pavement; distant traffic bokeh and light mist create depth. Charcoal wool coat, old wood, rain droplets, realistic skin and relaxed thoughtful expression. Introspective but hopeful, original person; no celebrity likeness, readable signs, logos, or watermark.',
    tagsZh: ['雨夜街拍', '音乐人', '霓虹倒影'],
    tagsEn: ['rainy street', 'musician', 'neon reflections'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-rainy-violinist.png',
    imageAltZh: '雨夜高架桥下提琴匣音乐人',
    imageAltEn: 'Violinist with case under rainy neon',
    tone: 'blue',
  },
  {
    ...defaults,
    id: 'aiwind-imagegen-20260923-berry-breakfast',
    categoryZh: '产品电商',
    categoryEn: 'Products & E-commerce',
    titleZh: '莓果早餐 · 蓝桌上的清晨',
    titleEn: 'Berry Breakfast · Morning on Blue',
    descriptionZh: '用俯拍构图、莓果光泽和亚麻纹理做一张清爽的食物提示词示例。',
    descriptionEn:
      'A fresh food prompt example using a top-down composition, berry gloss, and linen texture.',
    promptZh:
      '横版 3:2 俯拍食品摄影：浅蓝木桌上摆放一碗红莓酸奶麦片、黄油烤面包、咖啡杯、蓝色陶瓷勺和条纹亚麻餐巾，左上角一小瓶白色野花。莓果切面、麦片颗粒、烤面包脆皮、陶器和亚麻纤维清晰，柔和晨光从侧面进入，构图留白自然。不要品牌、文字或水印。',
    promptEn:
      'Use case: photorealistic-natural. One standalone landscape 3:2 top-down editorial breakfast still life: a ceramic bowl of ruby berries, yogurt and granola, buttered toast, coffee cup, cobalt spoon, striped linen napkin, and a small vase of white flowers on a pale blue table. Show berry gloss, granola texture, crisp toast, matte ceramic, woven linen, soft morning side light and balanced negative space. No brand, lettering, or watermark.',
    tagsZh: ['早餐静物', '俯拍摄影', '莓果'],
    tagsEn: ['breakfast still life', 'top-down', 'berries'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-berry-breakfast.png',
    imageAltZh: '浅蓝桌面上的莓果早餐俯拍',
    imageAltEn: 'Top-down berry breakfast on pale blue',
    tone: 'cyan',
  },
  {
    ...defaults,
    id: 'aiwind-imagegen-20260923-red-desert-observatory',
    categoryZh: '场景叙事',
    categoryEn: 'Scenes & Stories',
    titleZh: '红色天文台 · 双月沙漠',
    titleEn: 'Red Desert Observatory · Twin Moons',
    descriptionZh:
      '用红色砂岩、通往穹顶的长阶梯和双月天空构建一幅原创异星风景。',
    descriptionEn:
      'An original alien landscape built from red sandstone, a long stairway, and twin moons.',
    promptZh:
      '横版 16:9 电影感概念画：红色沙漠峡谷的层叠砂岩悬崖上，一座小型白色圆顶天文台坐落在最高处，长长石阶从前景蜿蜒而上。远处是雾化台地、峡谷河流和落日，淡紫色尘埃天空中有一大一小两轮月亮。地质层理、风化金属和低角度金色光线真实，整个建筑与地貌完整展示。不要地球地标、文字、标志或水印。',
    promptEn:
      'Use case: stylized-concept. One standalone landscape 16:9 cinematic matte painting of an original red desert observatory: a small white dome perched on layered sandstone cliffs, reached by a long winding stone staircase from the foreground. Hazy mesas, canyon rivers, and a low sun recede into a dusty lavender sky with one large and one small moon. Detailed stratified geology, weathered metal, atmospheric depth, quiet contemplation, complete architecture and terrain readable. No Earth landmark, text, logo, or watermark.',
    tagsZh: ['异星沙漠', '天文台', '概念场景'],
    tagsEn: ['alien desert', 'observatory', 'concept scene'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-red-desert-observatory.png',
    imageAltZh: '双月红色沙漠中的白色天文台',
    imageAltEn: 'White observatory in a twin-moon red desert',
    tone: 'coral',
  },
  {
    ...defaults,
    id: 'aiwind-imagegen-20260923-coral-anemones',
    categoryZh: '插画艺术',
    categoryEn: 'Illustration & Art',
    titleZh: '珊瑚花瓶 · 光影植物静物',
    titleEn: 'Coral Anemones · Glass Vase Study',
    descriptionZh: '以透明花瓶、珊瑚色花瓣和洞石光影完成一张宁静的植物静物。',
    descriptionEn:
      'A quiet botanical still life built from clear glass, coral petals, and limestone light.',
    promptZh:
      '竖版 2:3 植物静物摄影：透明曲线玻璃花瓶中插着三朵浅珊瑚色银莲花和修长绿茎，花瓶置于浅色洞石台座上，右侧垂落一块亚麻布。背景是安静的米色画廊墙面，午后侧光投下花影，玻璃折射、水面、花瓣薄纹和洞石孔洞清晰。极简、温柔、完整入镜，不要文字、品牌或水印。',
    promptEn:
      'Use case: product-mockup. One standalone vertical 2:3 premium botanical still life of a clear sculptural glass vase holding three pale coral anemones with long green stems, on a pale limestone pedestal with a folded linen cloth. Quiet beige gallery wall, warm afternoon side light and delicate flower shadows. Show glass refraction, waterline, translucent petals, stems, limestone pores and linen weave. Minimal, tranquil, full arrangement visible. No text, brand, or watermark.',
    tagsZh: ['花艺静物', '玻璃花瓶', '珊瑚色'],
    tagsEn: ['botanical still life', 'glass vase', 'coral'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-coral-anemones.png',
    imageAltZh: '洞石台座上的珊瑚色银莲花',
    imageAltEn: 'Coral anemones in a glass vase',
    tone: 'amber',
  },
]
