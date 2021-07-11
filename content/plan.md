+++
title = "⏳ 规划"
date = "2014-04-09"
menu = "main"
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