---
title: "ShortCode - 网站页面引入 Echarts 图表"
date: 2021-07-03T16:36:59+08:00
categories: [江湖百晓生]
tags:
    - shortcode
    - 短代码
    - Echart
---



[获取echarts的option变量标准的JSON串_fei的专栏-CSDN博客](https://blog.csdn.net/yaosilani/article/details/81668283)

[Examples - Apache ECharts](https://echarts.apache.org/examples/zh/index.html)


{{<echarts charts_id="210703-01" width="426px" height="501px">}}

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

