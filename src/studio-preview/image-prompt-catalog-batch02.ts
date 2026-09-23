/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */

import type { ImagePromptCatalogItem } from './prompt-library-data'

const aiwindBatch02Defaults = {
  kind: 'image' as const,
  sourceId: 'aiwind-imagegen',
  sourceCaseUrl: 'https://www.aiwind.org/',
  creatorName: 'AiWind public case',
  creatorUrl: 'https://www.aiwind.org/',
  models: ['GPT Image 2.5', 'GPT Image 2'] as ImagePromptCatalogItem['models'],
}

export const AIWIND_BATCH02_IMAGE_PROMPTS: ImagePromptCatalogItem[] = [
  {
    ...aiwindBatch02Defaults,
    id: 'aiwind-imagegen-20260923-golden-hour-cat-flight',
    categoryZh: '场景叙事',
    categoryEn: 'Scenes & Stories',
    titleZh: '日落飞行 · 橘猫的城市冒险',
    titleEn: 'Sunset Flight · Ginger Cat Over the City',
    descriptionZh: '把奇幻故事、真实毛发与日落城市景深融合成一张完整竖幅画面。',
    descriptionEn:
      'A complete vertical fantasy scene blending believable fur, motion, and a glowing city at sunset.',
    promptZh:
      '竖版 4:5 电影感奇幻摄影：一只琥珀色眼睛的蓬松橘猫，系着窄红围巾，稳稳站在古旧飞天扫帚上飞过日落欧洲老城。镜头与猫眼齐平，四爪、尾巴和胡须自然清晰；铜色屋顶、烟囱、河流和亮起的小窗向金色薄雾深处延伸。真实毛发、金色轮廓光和童话气氛结合，只出现一只猫和一把扫帚，不要人物、文字、标志或水印。',
    promptEn:
      'Use case: stylized-concept. Create one standalone vertical 4:5 cinematic fantasy photograph of a fluffy ginger tabby with amber eyes and a narrow red scarf standing on a weathered flying broom above an old European city at sunset. Keep four paws, tail, whiskers, and individual fur clear. Copper rooftops, chimneys, a river, and tiny lit windows recede into amber haze. Eye-level tracking camera, joyful diagonal motion, photoreal textures blended with storybook magic. One cat and one broom only; no people, words, logos, or watermark.',
    tagsZh: ['橘猫', '城市奇幻', '日落摄影'],
    tagsEn: ['ginger cat', 'city fantasy', 'sunset photography'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-golden-hour-cat-flight.png',
    imageAltZh: '日落飞行中的橘猫与城市',
    imageAltEn: 'Ginger cat flying above a sunset city',
    tone: 'amber',
  },
  {
    ...aiwindBatch02Defaults,
    id: 'aiwind-imagegen-20260923-jade-medusa',
    categoryZh: '时尚肖像',
    categoryEn: 'Fashion Portraits',
    titleZh: '翡翠美杜莎 · 神话高定肖像',
    titleEn: 'Jade Medusa · Mythic Couture Portrait',
    descriptionZh: '以高级时装肖像的克制光线呈现沉静而有力量的神话人物。',
    descriptionEn:
      'A serene mythic portrait with couture styling, jewel tones, and restrained studio light.',
    promptZh:
      '竖版 4:5 高级时装摄影：虚构成年美杜莎的正面半身肖像，神情沉静有力量，橄榄色肌肤保留真实纹理，淡褐色眼睛清晰。翡翠绿小蛇与古金首饰交织成均衡冠冕，不遮住面孔；深绿高领丝绒礼服覆盖肩部与躯干。近黑深绿影棚，柔和伦勃朗光与微弱金色轮廓光，清晰蛇鳞、珠宝和织物质感。无伤害、无攻击动作、无文字、标志或水印。',
    promptEn:
      'Use case: photorealistic-natural. Create one standalone vertical 4:5 museum-quality fashion editorial portrait of a fictional adult Medusa, serene and commanding, facing the camera. Olive skin keeps natural texture and intelligent hazel eyes. Elegant emerald-green snakes interlace with antique-gold jewelry as a balanced crown without hiding her face. Structured dark-green velvet couture covers the shoulders. Near-black green studio backdrop, soft Rembrandt light, subtle gold rim, exquisite scales and fabric. Ancient myth as contemporary luxury editorial; no injuries, text, brand, or watermark.',
    tagsZh: ['美杜莎', '高定肖像', '翡翠绿'],
    tagsEn: ['Medusa', 'couture portrait', 'emerald green'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-jade-medusa.png',
    imageAltZh: '翡翠蛇发美杜莎高定肖像',
    imageAltEn: 'Jade snake-haired Medusa couture portrait',
    tone: 'coral',
  },
  {
    ...aiwindBatch02Defaults,
    id: 'aiwind-imagegen-20260923-jade-pagoda',
    categoryZh: '建筑空间',
    categoryEn: 'Architecture & Spaces',
    titleZh: '翡翠玲珑塔 · 微雕东方建筑',
    titleEn: 'Jade Pagoda · Miniature Eastern Architecture',
    descriptionZh: '完整展示半透明翡翠七层宝塔的雕刻、透光与博物馆藏品质感。',
    descriptionEn:
      'A complete miniature pagoda study emphasizing translucent jade, carving, and museum craft.',
    promptZh:
      '竖版 4:5 微距藏品摄影：一座半透明翡翠雕刻的七层中国宝塔，飞檐、栏杆、窗棂与台阶精细可信，完整立于抛光深色石座上。翡翠从浅青到浓绿自然过渡，薄檐透出柔光，保留天然内含物和手工抛光质感。三分之四建筑视角，塔身完整、四周留白，深炭色影棚背景，暖色展陈灯掠过塔体，冷色补光显示雕刻细节。不要人物、文字、标志或水印。',
    promptEn:
      'Use case: product-mockup. One standalone vertical 4:5 macro studio photograph of an exquisite miniature seven-story Chinese pagoda carved from translucent jade. Show precise upturned eaves, rails, lattice windows, stairs, and the complete tower on a polished dark stone plinth. Pale celadon to emerald gradients glow through thin roof edges; preserve natural inclusions and hand-polished surfaces. Three-quarter architectural view with breathing room, charcoal studio backdrop, warm gallery light and cool fill. No people, text, logos, or watermark.',
    tagsZh: ['翡翠', '宝塔', '微缩建筑'],
    tagsEn: ['jade', 'pagoda', 'miniature architecture'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-jade-pagoda.png',
    imageAltZh: '翡翠雕刻七层宝塔',
    imageAltEn: 'Translucent jade seven-story pagoda',
    tone: 'cyan',
  },
  {
    ...aiwindBatch02Defaults,
    id: 'aiwind-imagegen-20260923-vinyl-jazz-world',
    categoryZh: '创意实验',
    categoryEn: 'Creative Experiments',
    titleZh: '黑胶小宇宙 · 迷你爵士现场',
    titleEn: 'Vinyl Universe · Miniature Jazz Session',
    descriptionZh: '在黑胶唱片表面搭建有明确尺度感的手作微缩爵士现场。',
    descriptionEn:
      'A tactile miniature jazz session staged on a vinyl record with unmistakable scale.',
    promptZh:
      '横版 3:2 手作微缩摄影：胡桃木唱机的黑胶唱片上，四位微型成年乐手演奏萨克斯、低音提琴、钢琴和爵士鼓，围绕无文字唱片标签自然排列。巨大的唱臂从上方延伸，唱片沟槽反射琥珀灯光，微型铜色射灯和小椅子构成亲密爵士现场。低机位三分之四视角，圆形舞台完整清晰，背景唱片架虚化。不要品牌、文字、畸形肢体或水印。',
    promptEn:
      'Use case: stylized-concept. Generate one standalone landscape 3:2 image of a handcrafted miniature jazz concert staged on a black vinyl record on a walnut turntable. Four tiny adult musicians play saxophone, upright bass, piano, and brushed drums around an unprinted ivory center label. The giant tonearm establishes scale; fine grooves catch amber light and copper spotlights warm the intimate club. Record-level three-quarter camera, entire circular stage readable, shelves softly blurred. No brand names, lettering, malformed limbs, or watermark.',
    tagsZh: ['黑胶唱片', '爵士', '微缩模型'],
    tagsEn: ['vinyl record', 'jazz', 'miniature model'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-vinyl-jazz-world.png',
    imageAltZh: '黑胶唱片上的微缩爵士现场',
    imageAltEn: 'Miniature jazz concert on a vinyl record',
    tone: 'amber',
  },
  {
    ...aiwindBatch02Defaults,
    id: 'aiwind-imagegen-20260923-twilight-canal',
    categoryZh: '场景叙事',
    categoryEn: 'Scenes & Stories',
    titleZh: '暮色运河 · 掌心里的灯火',
    titleEn: 'Twilight Canal · Lanterns in Miniature',
    descriptionZh: '用等轴测微缩模型表现蓝调时刻的日式运河街区与窗灯倒影。',
    descriptionEn:
      'An isometric miniature canal neighborhood glowing with lanterns at blue hour.',
    promptZh:
      '方形 1:1 等轴测微缩模型：蓝调时刻的日式运河街区，一块矩形地块悬置在灰蓝影棚背景中。翡翠色运河斜穿模型，拱形步桥横跨水面，两岸木造町屋、瓦檐、纸灯笼与温暖窗光层次丰富。小红枫、自行车和磨旧石阶点缀街区，树脂水面泛起细波与金色倒影。约 35 度俯视，完整展示底座并留出边距。不要文字招牌、标志或水印。',
    promptEn:
      'Use case: stylized-concept. One standalone square 1:1 isometric handcrafted miniature of a peaceful Japanese canal neighborhood at blue hour. An emerald canal runs diagonally under an arched bridge; timber machiya houses, tiled eaves, paper lanterns, a red maple, bicycles, and worn stone steps line both banks. Warm window reflections shimmer on resin-like water. View from 35 degrees above, complete base and edges visible with comfortable padding. Premium physical diorama, realistic joinery and paper texture, soft dusk. No signage, text, logos, or watermark.',
    tagsZh: ['运河街区', '等轴测', '蓝调时刻'],
    tagsEn: ['canal neighborhood', 'isometric', 'blue hour'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-twilight-canal.png',
    imageAltZh: '蓝调时刻的日式运河微缩街区',
    imageAltEn: 'Japanese canal miniature at blue hour',
    tone: 'blue',
  },
  {
    ...aiwindBatch02Defaults,
    id: 'aiwind-imagegen-20260923-paper-city-book',
    categoryZh: '建筑空间',
    categoryEn: 'Architecture & Spaces',
    titleZh: '纸上金城 · 翻开的建筑诗',
    titleEn: 'Golden City in Paper · Pop-up Architecture',
    descriptionZh: '让真实折痕、卡纸层次与暖侧光共同构成一座翻书而起的城市。',
    descriptionEn:
      'A pop-up city built from visible paper folds, tabs, and warm editorial light.',
    promptZh:
      '横版 3:2 纸艺藏品摄影：深暖灰桌面上翻开一本象牙白精装书，奶油白与香槟金卡纸工程构成的幻想城市从书页中升起。拱廊、细塔、阶梯屋顶、桥梁和中央广场层次精细，建筑由真实折痕、卡榫和纸页相连，裁切边缘投下复杂阴影。三分之四低视角，整本书和天际线完整入镜。暖侧光、柔和光衰和克制金箔点缀，突出手工实体。不要知名地标复刻、文字、标志或水印。',
    promptEn:
      'Use case: stylized-concept. Create one standalone landscape 3:2 photograph of an open ivory hardback book on a warm-gray tabletop, from whose pages an original city rises as paper-engineered pop-up architecture. Layered cream and champagne-gold cardstock forms arcades, towers, stepped roofs, bridges, and a central square. Buildings visibly connect to folded tabs and creased pages; precise cut edges cast intricate shadows. Three-quarter low view, entire book and skyline visible, warm side light, restrained gold foil. No recognizable landmarks, typography, logos, or watermark.',
    tagsZh: ['纸艺', '建筑立体书', '金色光线'],
    tagsEn: ['paper art', 'pop-up architecture', 'golden light'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-paper-city-book.png',
    imageAltZh: '从精装书页中升起的纸艺城市',
    imageAltEn: 'Paper city rising from an open hardback book',
    tone: 'coral',
  },
  {
    ...aiwindBatch02Defaults,
    id: 'aiwind-imagegen-20260923-floating-sandwich',
    categoryZh: '产品电商',
    categoryEn: 'Products & E-commerce',
    titleZh: '悬浮午餐 · 三明治解构',
    titleEn: 'Floating Lunch · Exploded Sandwich',
    descriptionZh:
      '用精准对齐的悬浮分层展示面包、蔬菜、芝士与烤鸡肉的食物质感。',
    descriptionEn:
      'An appetizing exploded-view sandwich with aligned layers and crisp commercial detail.',
    promptZh:
      '竖版 4:5 高级食品商业摄影：手工三明治沿同一中轴拆成悬浮分层，自上而下为烤酸面包、绿生菜、番茄、金黄芝士、折叠烤鸡肉、牛油果扇片和抹香草酱的底部面包。层间保留小幅空气间隔，下面是哑光陶土盘。浅奶油无缝背景、柔和大窗侧光，面包气孔、番茄切面与叶脉自然诱人，完整入镜并留白。不要手、文字、包装、商标或水印。',
    promptEn:
      'Use case: product-mockup. Generate one standalone vertical 4:5 high-end food photograph of an artisan sandwich exploded into aligned floating layers: toasted sourdough, ruffled lettuce, ripe tomato, golden cheese, folded roasted chicken, avocado fan, and herb-spread bread. Keep small airy gaps on one central axis above a matte terracotta plate. Warm cream seamless backdrop, large soft window light, crisp crust bubbles, juicy cuts, natural leaf veins, complete arrangement with margins. No hands, text, packaging, brand, or watermark.',
    tagsZh: ['三明治', '食物摄影', '分层结构'],
    tagsEn: ['sandwich', 'food photography', 'exploded view'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-floating-sandwich.png',
    imageAltZh: '悬浮分层的手工三明治',
    imageAltEn: 'Exploded floating artisan sandwich',
    tone: 'amber',
  },
  {
    ...aiwindBatch02Defaults,
    id: 'aiwind-imagegen-20260923-citrus-energy',
    categoryZh: '产品电商',
    categoryEn: 'Products & E-commerce',
    titleZh: '青柠跃动 · 夏日饮品广告',
    titleEn: 'Lime in Motion · Summer Beverage Ad',
    descriptionZh: '以清晰罐体、青柠水花和高对比渐变完成一张可用的商业主视觉。',
    descriptionEn:
      'A clean summer beverage key visual with a sharp can silhouette, lime, and splash.',
    promptZh:
      '竖版 4:5 夏日饮品广告摄影：一只无品牌浅绿哑光细长铝罐略微倾斜，置于湿润绿石小台上；清澈气泡水形成弧形飞溅，青柠切片、薄荷和透明冰块悬浮环绕。背景从深翡翠绿渐变到明亮青柠绿，完整罐体与空白正面是绝对视觉中心，表面有细密凝结水珠。逆光照亮清晰水滴，构图清爽高级。不要文字、品牌、营养功效宣传、人物或水印。',
    promptEn:
      'Use case: ads-marketing. Generate one standalone vertical 4:5 premium summer beverage campaign photograph. An unbranded slim matte pale-green aluminum can stands at a dynamic angle on a wet green stone pedestal, surrounded by a crisp arc of sparkling water, lime slices, mint, and clear ice. Background transitions from deep emerald to luminous lime. Keep the full can silhouette and blank front as hero, with realistic condensation. Backlit droplets, fresh sophisticated composition, no text, logo, claims, people, or watermark.',
    tagsZh: ['饮品广告', '青柠', '水花摄影'],
    tagsEn: ['beverage ad', 'lime', 'splash photography'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-citrus-energy.png',
    imageAltZh: '青柠水花中的浅绿色饮品罐',
    imageAltEn: 'Pale green beverage can in a lime splash',
    tone: 'cyan',
  },
  {
    ...aiwindBatch02Defaults,
    id: 'aiwind-imagegen-20260923-camellia-botanical',
    categoryZh: '插画艺术',
    categoryEn: 'Illustration & Art',
    titleZh: '山茶物语 · 植物拆解图鉴',
    titleEn: 'Camellia Story · Botanical Exploded Plate',
    descriptionZh: '用植物水彩、彩铅叶脉和少量留白呈现无文字的山茶花拆解图。',
    descriptionEn:
      'A wordless botanical art plate combining watercolor, pencil veins, and an exploded camellia.',
    promptZh:
      '竖版 4:5 植物艺术图鉴：温暖象牙色纹理纸上，以优雅爆炸图展示一朵红山茶。下方为木质枝条和两片带锯齿的光亮绿叶，上方花朵沿清晰纵轴分成少量同心花瓣层，露出金黄色花蕊与绿色萼片。古典植物水彩结合彩铅叶脉，花瓣纹理精准，阴影自然，红绿米白配色平衡并保留充足留白。这是无文字植物艺术插画，不是带标签的科研图表。',
    promptEn:
      'Use case: infographic-diagram. Create one standalone vertical 4:5 botanical art plate on warm ivory textured paper. Show a red camellia in a delicate exploded-view arrangement: a woody twig and two glossy serrated leaves below, a few elegant concentric petal layers above, revealing golden stamens and green sepals on one vertical axis. Antique botanical watercolor, fine colored-pencil veins, gentle natural shadows, precise petal texture, balanced red-green-cream palette, generous negative space. Wordless botanical art, not a labeled scientific chart; no logos or watermark.',
    tagsZh: ['山茶花', '植物艺术', '爆炸图'],
    tagsEn: ['camellia', 'botanical art', 'exploded plate'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-camellia-botanical.png',
    imageAltZh: '红山茶花植物拆解艺术图',
    imageAltEn: 'Red camellia botanical exploded art plate',
    tone: 'coral',
  },
  {
    ...aiwindBatch02Defaults,
    id: 'aiwind-imagegen-20260923-felt-mountain-home',
    categoryZh: '插画艺术',
    categoryEn: 'Illustration & Art',
    titleZh: '羊毛山居 · 柔软的童话世界',
    titleEn: 'Felted Mountain Home · Soft Storybook World',
    descriptionZh: '让真实羊毛纤维、手缝边缘与微缩山居组成柔软的童话场景。',
    descriptionEn:
      'A tactile felted alpine diorama with visible fibers, stitching, and storybook warmth.',
    promptZh:
      '方形 1:1 定格动画质感手工羊毛毡山景摄影：暖米白小屋配铁锈红屋顶，坐落在圆润苔绿山丘与松树之间；浅蓝羊毛小溪穿过微型小桥，远处柔软雪山，草地上有两只小羊。所有表面可见真实细纤维、手缝线和不整齐毡边，不出现光滑塑料。窗户暖光与清晨冷光形成对比，紧凑立体景观完整置于浅蓝背景中并留白。不要文字、品牌或水印。',
    promptEn:
      'Use case: illustration-story. Generate one standalone square 1:1 stop-motion-style photograph of a handmade needle-felted alpine landscape. A warm cream cottage with rust-red wool roof nestles among moss-green hills and soft evergreens; a pale-blue felt stream passes a tiny bridge, snowy mountains sit behind, and two sheep graze in the meadow. Show real fibers, hand-stitched seams, imperfect felt edges, and fluffy clouds, never smooth plastic. Cozy window glow against cool morning light, compact full diorama on a pale-blue seamless backdrop with margins. No text, brands, or watermark.',
    tagsZh: ['羊毛毡', '山居', '童话微缩'],
    tagsEn: ['felted wool', 'mountain home', 'storybook miniature'],
    imageUrl:
      'https://studio.linoroute.com/studio-prompt-assets/prompt-library/images/aiwind-imagegen-20260923-felt-mountain-home.png',
    imageAltZh: '羊毛毡山居童话微缩景观',
    imageAltEn: 'Felted alpine storybook miniature',
    tone: 'blue',
  },
]
