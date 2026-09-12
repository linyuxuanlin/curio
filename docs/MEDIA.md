# 首批图片授权与核查

本项目不把真实事件替换成 AI 伪造现场。首批未生成任何图片。

| 文件 | 来源、署名与用途 |
| --- | --- |
| `public/media/spider-tailed-viper.webp` | Field Museum 官方新闻对照图。左：© 2018 Omid Mozaffari；右：Sara Ruane / Stephanie Smith 提供的 XCT 扫描。仅随该研究报道使用。 |
| `public/media/blue-octopus.webp` | Field Museum 官方蓝色章鱼新闻材料；Ocean Exploration Trust / Nautilus Live 影像。仅随该物种报道使用。 |

[Field Museum 新闻室](https://www.fieldmuseum.org/landing/press-room)的 Press materials 段允许材料伴随文章及新闻提及使用，要求正确署名并遵守版权。这里不把材料称为公有领域，也不宣称取得了无限制授权。使用的官方链接和署名写在每张卡片内；图片保持原始事实内容，仅通过 CDN 缩小尺寸，未做 AI 重绘。

[蛛尾角蝰原始报道](https://www.fieldmuseum.org/about/press/fake-spider-at-the-tip-of-this-snakes-tail-helps-it-lure-birds) · [蓝色章鱼原始报道](https://www.fieldmuseum.org/about/press/this-newly-discovered-blue-octopus-from-the-galapagos-islands-could-curl-up)

建站时已人工视觉检查两张图片。蛇尾图包含实物与扫描的左右对照；应完整展示，避免裁掉署名或误导两侧结构。章鱼图是深海真实影像，颜色和结构不修改。其它三张卡片没有取得明确合适的图片复用依据，因此为文字卡。

未来生成图仅在无法使用真实原图或事件需要抽象表达时允许，且必须实际使用 GPT Image 2.5。无法确认当前工具所用模型时不可假称使用了该模型，直接 `image: null`。禁止用 Python/Pillow、SVG、HTML 等方式生成新闻图片。界面 CSS 与站点 favicon 属于界面设计，不是事件配图。
