+++
title = "🎡 导航"
date = "2014-04-09"
menu = "main"
comment = false
+++

{{<echarts charts_id="210703-02" width="100%" height="26rem">}}

  {"series":[{

    "type":"gauge","anchor":{"show":true,"showAbove":true,"size":18,"itemStyle":{"color":"#FAC858"}},
      
    "pointer":{"icon":"path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z","width":8,"length":"80%","offsetCenter":[0,"8%"]},
      
    "progress":{"show":true,"overlap":true,"roundCap":true},
    "axisLine":{"roundCap":true},
    "data":[
      {
        "value":29,"name":"🏃","title":{"offsetCenter":["-40%","80%"]},"detail":{"offsetCenter":["-40%","95%"]}
      },{
        "value":26,"name":"📖","title":{"offsetCenter":["0%","80%"]},"detail":{"offsetCenter":["0%","95%"]}
      },{
        "value":20,"name":"👁️","title":{"offsetCenter":["40%","80%"]},"detail":{"offsetCenter":["40%","95%"]}
      }],
      "title":{"fontSize":14},
      "detail":{
        "width":40,"height":14,"fontSize":12,"color":"#fff","backgroundColor":"auto","borderRadius":3,"formatter":"{value}%"
      }
    }]
  }

{{</echarts>}}


## 网站导航

本站目前采用 Hugo 作为后台系统，我希望这是我的最后一站。此前我曾走过很多地方：2004 年我开始在博客中国（后来改名为 bokee）写博客，后来改到 blog.com.cn，再后来到 MSN Space 写英文，再后来自己用 Bo-blog 建站，两年后再次换系统为如今流行的 WordPress，三年后我到了码农的乐土，Jekyll，一个以纯文本文件形式写博客的系统，五年后我越来越不能忍受 Jekyll 之慢（本地预览动不动要花 30 秒），于是投奔了以速度见长的 Hugo，并写了一个 R 包装 blogdown。

博客模板是我从一个小巧的静态网站编译工具 Ivy 那里抄来的；为了表达对原作者使用 “无许可证”（Unlicense）的敬意，我仔细着把它的样式整理成了一个 Hugo 模板 hugo-ivy，并且同样使用无许可证；这个许可证的意思是你特么想拿这个软件干什么就干什么，是删是改是烹煮蒸炸，敬请随意，都与我无关。所有页面都基于 Markdown 创建，源文件可以在 Github 上找到；如果你发现任何页面有任何错误，可以点击菜单栏上的编辑链接编辑该文的源文件，并在 Github 上向我提交一个合并请求。对了，本站的日志文章可以用键盘上的左右箭头导航，如果你要从盘古开天辟地看起，就到第一篇文章开始一步步按右箭头吧。因为搬过几次家，所以偶尔可能会遇到格式乱糟糟的文字或图片缺失，若有此类情况，请帮忙给我留言提醒一下。本站在苹果系统下浏览体验最佳（有漂亮的宋体和楷体）；建议不要用 IE 浏览器；为了最赏心悦目的阅读体验，我强烈建议安装思源宋体。

## 一些须知

本列表根据下面的历史留言整理，供新来者参考。本站采用了两套留言系统：一套是 Disqus，在国内需要翻墙才能使用；另一套是 Utterances，需要用 Github 账号登录。

---

数据科学笔记： https://divinerhjf.github.io/



- R【全部用 Rmarkdown 实现】

- 数据处理系列（tidyverse）

    - 数据读取

        - **data.table**：最高支持100G数据，fread和fwrite快的你不敢想，还支持数据类型判断
            - **readr**：RStudio出品，完美替代原生数据IO函数
            - **readxl，openxlsx**：读写excel文件

        - 数据操作

        - **dplyr**：操作数据矿的神器，谁用谁知道
            - **plyr**：list，array，dataframe三者的神奇变化包
            - **data.table**：数据IO和操作神器
            - **tidyr**：处理脏数据
            - **tidytext**：分词以及词频提取
            - **stringr**：处理字符串的神包
            - **jiebaR，tm**：中文分词利器，NLP专用
            - **purrr**：apply函数的绝佳替代
            - **lubridate**：时间处理最好的包，没有之一
            - **broom**：将各种统计学模型结果数据框化
            - **tidyverse**：RStudio出品的集成包，数据科学一揽子解决方案
            - **magrittr**：管道符

        - 缺失值处理

        - **VIM**：可视化缺失情况
            - **Hmisc**：处理缺失值
            - **mice**：利用各种算法补全缺失值的包

    - 文本分析系列（jiebaR、text2vec）

    - 数据可视化系列

    - 系统：graphics（基础）、lattice（网格）、ggplot2（图层）

        - 修饰：

        - customLayout（拼图）
            - ggthemr（ggplot2 主题美化）
            - ggrepel（ggplot2 注释）
            - ggforce（放大指定区域图像）
            - treemapify（ggplot2 补充包-树状图）
            - ggridges（ggplot2 补充包-脊线图）
            - cowplot（ggplot2 期刊主题）

        - 专业：

        - ggfortify（时间序列图+聚类模型结果）
            - corrplot（相关矩阵图）

        - 交互： http://gallery.htmlwidgets.org/

        - dygraphs（时间序列图 http://rstudio.github.io/dygraphs/）
            - Leaflet（交互式地图 http://rstudio.github.io/leaflet/）
            - rChartCalendar（日历热图 https://github.com/ramnathv/rChartsCalendar）
            - wordcloud2（词云图）
            - 茫茫多

    - 成果展示系列

    - rmarkdown
        - rbookdown
        - rblogdown
        - rpagedown

---

- Python【全部用 jupyter notebook 实现】

- 数据处理系列

    - numpy、scipy、pandas

    - 数据可视化系列

    - matplotlib、seaborn

    - 网络爬虫系列

    - urlib、request、beautifulsoup ·····

    - 机器学习系列

    - statsmodels
        - sklearn
        - ModelSelect
        - Grid
        - tensorflow2