---
title: "R 包 | sysfonts & showtext：绘图字体自由定制"
date: 2022-03-31T19:46:30+08:00
categories: [数据流水线]
series: [R 包历险记]
tags:
  - 技术
  - sysfonts
  - showtext
  - 可视化
  - 字体
---

> 使用 sysfonts 包将所需字体加载，再通过 showtext 包在绘图系统中进行字体渲染，完美满足 R 绘图时的字体个性化定制需求

![showtext](https://image-host-1255524710.cos.ap-beijing.myqcloud.com/img/20220403131606.png)

<!--more-->

```r
library(showtext)
## Loading Google fonts (https://fonts.google.com/)
font_add_google("Gochi Hand", "gochi")
font_add_google("Schoolbell", "bell")
font_add_google("Covered By Your Grace", "grace")
font_add_google("Rock Salt", "rock")

## Automatically use showtext to render text for future devices
showtext_auto()

## Tell showtext the resolution of the device,
## only needed for bitmap graphics. Default is 96
showtext_opts(dpi = 96)

set.seed(123)
x = rnorm(10)
y = 1 + x + rnorm(10, sd = 0.2)
y[1] = 5
mod = lm(y ~ x)

op = par(cex.lab = 2, cex.axis = 1.5, cex.main = 2)
plot(x, y, pch = 16, col = "steelblue",
     xlab = "X variable", ylab = "Y variable", family = "gochi")
grid()
title("Draw Plots Before You Fit A Regression", family = "bell")
text(-0.5, 4.5, "This is the outlier", cex = 2, col = "steelblue",
     family = "grace")
abline(coef(mod))
abline(1, 1, col = "red")
par(family = "rock")
text(1, 1, expression(paste("True model: ", y == x + 1)),
     cex = 1.5, col = "red", srt = 20)
text(0, 2, expression(paste("OLS: ", hat(y) == 0.79 * x + 1.49)),
     cex = 1.5, srt = 15)
legend("topright", legend = c("Truth", "OLS"), col = c("red", "black"), lty = 1)

par(op)
```

## 基本使用

### 使用步骤

1. 利用 sysfonts 加载字体
2. 打开图形设备
3. 开启 showtext 渲染字体
4. 绘图命令
5. 关闭图形设备

### 举个栗子

```r
library(showtext);  #

# 1. 利用 sysfonts 加载字体 - 楷体
font.add("kaishu", "simkai.ttf");

# 2. 打开图形设备
library(Cairo);
CairoPNG("chinese-char.png", 600, 600);

# 3.1 开始使用showtext
showtext.begin();
# 4. 一系列绘图命令
set.seed(123);
plot(1, xlim = c(-3, 3), ylim = c(-3, 3), type = "n");
text(runif(100, -3, 3), runif(100, -3, 3),
    intToUtf8(round(runif(100, 19968, 40869)), multiple = TRUE),
    col = rgb(runif(100), runif(100), runif(100), 0.5 + runif(100)/2),
    cex = 2, family = "kaishu");    # 指定kaishu字体
title("随机汉字", family = "wqy");   # 指定wqy字体
# 3.2 停止使用showtext
showtext.end();

# 5. 关闭图形设备
dev.off();
```

![showtext-hanzi](https://image-host-1255524710.cos.ap-beijing.myqcloud.com/img/20220403143007.png)

## 详细解读

### sysfonts

[sysfonts](https://cran.r-project.org/web/packages/sysfonts/index.html) 包可以将 **系统字体** 或 [谷歌字体](https://fonts.google.com/) 加载到 R 中，为 showtext 等字体渲染包提供了前置支持。

```r
font_add[_google](
    family,  # 字符串，用来命名指定加载字体的名称，可以为任意字符串
    regular,  # "常规"字体的字体文件路径，必须为字符串且不能省略
    bold = NULL, # "粗体"字体的字体文件路径。为 NULL，函数将使用"常规"参数的值
    italic = NULL, # 同上
    bolditalic = NULL, # 同上
    symbol = NULL # 同上
)
```

### showtext

[showtext](https://github.com/yixuan/showtext) 包可以方便地在 R 绘图设备中使用各种类型的已载入的字体。使用也很方便，一般直接输入 `showtext_auto()` 即可，亦可后接 `showtext_opts()` 命令设置图片 dpi 等。

1. 适用于大多数图形设备，包括 `pdf()`，`png()`，`postscript()` 和屏幕设备，如 `windows()` 和 `x11()`；
2. `showtext_begin()` 和 `showtext_end()` 可以控制在哪一段代码间使用字体，而 `showtext_auto()` 是全局都使用。

## 好玩的字体与图形

懂得这一套操作之后，我们基本上可以实现使用任意字体来进行展示了。这时候我们可以做一些有意思的事情：有些字体中包含的并不是字母和数字，而是一些符号或图标。

![图形字体](https://image-host-1255524710.cos.ap-beijing.myqcloud.com/img/20220403152019.png)

像上图中那些小人儿背后代表的其实就是一个个英文字母，只是在这种字体下那些枯燥的 ABC 变成了有趣的各种形式！

像 [fontspace](https://www.fontspace.com/category/people)、[dafont](https://www.dafont.com/search.php?q=people) 等网站，有提供超级多有意思的字体，还等什么，快快行动，让你的图表活起来吧！🤗

---

> **参考文章**
>
> - [R-CRAN: sysfonts](https://cran.r-project.org/web/packages/sysfonts/index.html)
> - [GitHub-Repo: showtext](https://github.com/yixuan/showtext)
> - [统计之都 | showtext：字体，好玩的字体和好玩的图形](https://cosx.org/2014/01/showtext-interesting-fonts-and-graphs/)
