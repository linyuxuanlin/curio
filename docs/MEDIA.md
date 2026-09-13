# 图片授权与核查

卡片必须有图。真实事件优先使用来源明确、允许引用的原图；没有合适真实原图时使用 GPT Image 2.5 生成的示意图，并在卡片中明确标注生成属性。生成图只用于帮助读者理解场景，不代表事件现场照片。

| 文件 | 来源、署名与用途 |
| --- | --- |
| `public/media/spider-tailed-viper.webp` | Field Museum 官方新闻对照图。左：© 2018 Omid Mozaffari；右：Sara Ruane / Stephanie Smith 提供的 XCT 扫描。仅随该研究报道使用。 |
| `public/media/blue-octopus.webp` | Field Museum 官方蓝色章鱼新闻材料；Ocean Exploration Trust / Nautilus Live 影像。仅随该物种报道使用。 |
| `public/media/berlin-modern.webp` | GPT Image 2.5 生成的未完工博物馆临时展览示意图；不代表现场照片。 |
| `public/media/paris-design-walks.webp` | GPT Image 2.5 生成的巴黎城市设计漫步示意图；不代表现场照片。 |
| `public/media/wild-neural-logger.webp` | GPT Image 2.5 生成的野外小鼠神经记录设备示意图；不代表现场照片。 |
| `public/media/keikyu-temporary-track.webp` | GPT Image 2.5 生成的临时铁路切换施工示意图；不代表现场照片。 |

[Field Museum 新闻室](https://www.fieldmuseum.org/landing/press-room)的 Press materials 段允许材料伴随文章及新闻提及使用，要求正确署名并遵守版权。这里不把材料称为公有领域，也不宣称取得了无限制授权。使用的官方链接和署名写在每张卡片内；图片保持原始事实内容，仅通过 CDN 缩小尺寸，未做 AI 重绘。

[蛛尾角蝰原始报道](https://www.fieldmuseum.org/about/press/fake-spider-at-the-tip-of-this-snakes-tail-helps-it-lure-birds) · [蓝色章鱼原始报道](https://www.fieldmuseum.org/about/press/this-newly-discovered-blue-octopus-from-the-galapagos-islands-could-curl-up)

建站时已人工视觉检查两张真实图片。蛇尾图包含实物与扫描的左右对照；应完整展示，避免裁掉署名或误导两侧结构。章鱼图是深海真实影像，颜色和结构不修改。其它四张卡片没有取得明确合适的图片复用依据，因此使用已标注的 GPT Image 2.5 生成示意图。

生成图必须在 JSON 的 `image` 中设置 `kind: "generated"`、`model: "GPT Image 2.5"`、`visualChecked: true`，并提供事件来源链接和“示意图”说明。无法确认当前工具所用模型时不可假称使用了该模型；应先取得合格的 GPT Image 2.5 图片。禁止用 Python/Pillow、SVG、HTML 等方式生成新闻图片。界面 CSS 与站点 favicon 属于界面设计，不是事件配图。
