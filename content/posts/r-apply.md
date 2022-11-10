---
title: "R 包 | apply 函数族：向量化操作数据框"
date: 2018-03-15T12:19:00+08:00
categories: [数据流水线]
series: [R 包武器库]
tags:
  - R
  - apply
  - 数据操作
---

R 作为一种向量化的编程语言，一大特征便是以向量计算替代了循环计算，使效率大大提升。

`apply` 函数族正是为解决数据循环处理问题而生的 —— 面向不同数据类型，生成不同返回值的包含 8 个相关函数的函数族。

<br>![apply函数.PNG](https://blog-1255524710.cos.ap-beijing.myqcloud.com/cover/apply函数.PNG)

<!--more-->

## 为何要用 apply？

在使用 R 时，要尽量用 array 的方式思考，避免 for 循环，写过多的 for 循环代码，最后把 R 代码写的跟 C 似得说明你没有进入 R 的思考方式，是一种费力不讨好的行为。那么不用循环怎么实现迭代呢？apply 函数族是一把利器，它不是一个函数，而是一族功能类似的函数。

<br>

---

## 语法详解

### apply

```r apply-函数定义：在 X 上，沿 margin 方向，依次调用 FUN
apply(X, margin, FUN, ...)
```

> **参数列表：**
> X：数组、矩阵、数据框
> margin：按维度运算，1 表示按行，2 表示按列，c(1,3)表示第 1、3 维
> FUN：要使用的函数

{% label info@<b>举例阐释</b> %}

```r eg1-矩阵按列求和
> mat <- matrix(1:12, 3, 4)
> mat
     [,1] [,2] [,3] [,4]
[1,]    1    4    7   10
[2,]    2    5    8   11
[3,]    3    6    9   12

> apply(mat, 2, sum)
[1]  6 15 24 33
```

```r eg2-数组第1、3维度组合求和
> ary <- array(1:12, c(2,3,2))
> ary
, , 1
     [,1] [,2] [,3]
[1,]    1    3    5
[2,]    2    4    6
, , 2
     [,1] [,2] [,3]
[1,]    7    9   11
[2,]    8   10   12

> apply(ary, c(1,3), sum)
     [,1] [,2]
[1,]    9   27
[2,]   12   30
```

```r eg3-数据框按列求均值
> data <- data.frame(x1=1:5, x2=6:10)
> data
  x1 x2
1  1  6
2  2  7
3  3  8
4  4  9
5  5 10

> apply(data, 2, mean)
x1 x2
 3  8
```

---

### tapply

```r tapply-函数定义：按 INDEX 值分组，相同值对应下标的 X 中的元素形成一个集合，应用到 FUN
tapply(X, INDEX, FUN = NULL, ..., simplify = TRUE)
```

> **参数列表：**
> X：向量、数组
> INDEX：用于分组的索引
> FUN：要使用的函数
> simplify : 是否数组化，当值 TRUE 时，输出结果按数组进行分组输出

{% label info@<b>举例阐释</b> %}

```r eg1-当FUN为NULL，返回分组的结果，返回值中相等的元素所对应的下标属于同一组
> x <- 1:6
> INDEX <- c('a','a','b','c','c','c')
> tapply(x, INDEX)
[1] 1 1 2 3 3 3
```

```r eg2-向量按 INDEX 分组求和
> tapply(x, INDEX, sum)
 a  b  c
 3  3 15
```

```r eg3-矩阵按 INDEX 分组求均值
> mat <- matrix(1:10, 2)
> mat
     [,1] [,2] [,3] [,4] [,5]
[1,]    1    3    5    7    9
[2,]    2    4    6    8   10
> INDEX <- matrix(c(rep(1,5), rep(2,5)), nrow=2)
> INDEX
     [,1] [,2] [,3] [,4] [,5]
[1,]    1    1    1    2    2
[2,]    1    1    2    2    2
> tapply(mat, INDEX)
 [1] 1 1 1 1 1 2 2 2 2 2
> tapply(mat, INDEX, mean)
1 2
3 8
```

---

### lapply

```r lapply-函数定义：在 X 上逐个元素调用 FUN, 返回和 X 等长的 list 作为结果集
lapply(X, FUN, ...)
```

> **参数列表：**
> X：列表、向量、数据框
> FUN：要使用的函数

{% label info@<b>举例阐释</b> %}

```r eg1-计算 list 中的每个 KEY 对应数据的均值
> lst <- list(a=1:10, b=seq(0,7,2), c=c(2,5,8))
> lst
$a
 [1]  1  2  3  4  5  6  7  8  9 10
$b
[1] 0 2 4 6
$c
[1] 2 5 8

> lapply(lst, mean)
$a
[1] 5.5
$b
[1] 3
$c
[1] 5
```

```r eg2-对数据框的列求和
> data <- data.frame(x1=1:5, x2=6:10)
> data
  x1 x2
1  1  6
2  2  7
3  3  8
4  4  9
5  5 10
> lapply(data, sum)
$x1
[1] 15
$x2
[1] 40
```

```r eg3-找出闰年：对向量内各元素依次调用函数
> isLeapYear <- function(a){
+   if( (a%%4==0 & a%/%100!=0) | a%%400==0 )
+     a
+ }
> a <- 1900:1910
> unlist(lapply(a, isLeapYear))
[1] 1900 1904 1908
```

---

### rapply

```r rapply-函数定义：递归版lapply，对list遍历直至无list，最终非list元素若类型是classes参数指定的类型，则调用FUN
rapply(list, f, classes = "ANY", deflt = NULL,how = c("unlist", "replace", "list"), ...)
```

> **参数列表：**
> list：列表
> f：要使用的函数
> classes： 匹配类型, ANY 为所有类型
> deflt: 非匹配类型的默认值
> how: 3 种操作方式，
>
> - replace：则用调用 f 后的结果替换原 list 中原来的元素；
> - list：新建一个 list，类型匹配调用 f 函数，不匹配赋值为 deflt；
> - unlist：执行一次 unlist(recursive = TRUE)操作

{% label info@<b>举例阐释</b> %}

```r eg1-遍历 list 分组求和
> lst <- list(a=list(aa=c(1:5), ab=c(6:10)), b=list(ba=c(1:10)))
> lst
$a
$a$aa
[1] 1 2 3 4 5
$a$ab
[1]  6  7  8  9 10
$b
$b$ba
 [1]  1  2  3  4  5  6  7  8  9 10

> rapply(lst, sum, how="replace")  # 输出结果为list
$a
$a$aa
[1] 15
$a$ab
[1] 40
$b
$b$ba
[1] 55

> rapply(lst, sum, how="unlist")   # 输出结果为vector
a.aa a.ab b.ba
  15   40   55
```

---

### sapply

```r sapply-函数定义：简化版lapply，增加参数simplify和USE.NAMES，可设定输出类型
sapply(X, FUN, ..., simplify = TRUE, USE.NAMES = TRUE)
```

> **参数列表：**
> X：列表、向量、数据框
> FUN：要使用的函数
> simplify: 若 FALSE，等价于 lapply。否则，将 lapply 输出的 list 简化为 vector 或 matrix
> USE.NAMES: 如果 X 为字符串，TRUE 设置字符串为数据名，FALSE 不设置

{% label info@<b>举例阐释</b> %}

```r eg1-simplify参数设定输出类型
> lst <- list(a=c(1:5), b=c(6:10))
> sapply(lst, sum, simplify = F)    # 输出list
$a
[1] 15
$b
[1] 40

> sapply(lst, sum)                  # 输出vector
 a  b
15 40

> sapply(lst, fivenum)              # 输出matrix
     a  b
[1,] 1  6
[2,] 2  7
[3,] 3  8
[4,] 4  9
[5,] 5 10
```

```r eg2-USE.NAMES参数作用
> val <- head(letters)
> val
[1] "a" "b" "c" "d" "e" "f"
> sapply(val, paste)
  a   b   c   d   e   f
"a" "b" "c" "d" "e" "f"
> sapply(val, paste, USE.NAMES = F)
[1] "a" "b" "c" "d" "e" "f"
```

---

### vapply

```r vapply-函数定义：类似sapply，但提供参数FUN.VALUE用以设定返回值的行名
vapply(X, FUN, FUN.VALUE, ..., USE.NAMES = TRUE)
```

> **参数列表：**
> X：列表、数据框
> FUN：要使用的函数
> FUN.VALUE：定义返回值的行名 row.names
> USE.NAMES: 如果 X 为字符串，TRUE 设置字符串为数据名，FALSE 不设置

{% label info@<b>举例阐释</b> %}

```r eg1-FUN.VALUE参数设置返回值行名
> lst <- list(a=c(1:5), b=c(6:10))
> res <- vapply(lst, function(x) c(min(x), max(x)), c(min.=0, max.=0))
> res
     a  b
min. 1  6
max. 5 10
```

```r eg2-对数据框的数据累计求和，并对每一行设置行名row.names
> data <- data.frame(cbind(x1=3, x2=c(2:1,4:5)))
> data
  x1 x2
1  3  2
2  3  1
3  3  4
4  3  5

> vapply(data, cumsum, FUN.VALUE=c('a'=0,'b'=0,'c'=0,'d'=0))
  x1 x2
a  3  2
b  6  3
c  9  7
d 12 12
```

---

### mapply

```r mapply-函数定义：多变量版sapply，将FUN应用于多个同结构数据第一个元素组成的数组，然后是第二个元素组成的数组，依此类推
mapply(FUN, ..., MoreArgs=NULL, SIMPLIFY=TRUE, USE.NAMES=TRUE)
```

> **参数列表：**
> FUN：要使用的函数
> …: 接收多个数据(list、vector)
> MoreArgs: FUN 的参数列表
> simplify: 若 FALSE，输出 list。否则，将输出的 list 简化为 vector 或 matrix
> USE.NAMES: 如果 X 为字符串，TRUE 设置字符串为数据名，FALSE 不设置

{% label info@<b>举例阐释</b> %}

```r eg1-输入两个list并分组求和
> mapply(sum, list(a=1,b=2,c=3), list(a=10,b=20,d=30))
 a  b  c
11 22 33
```

```r eg2-比较两个向量大小，按索引顺序取较大的值
> a <- 1:10
> b <- 5:-4
> a
 [1]  1  2  3  4  5  6  7  8  9 10
> b
 [1]  5  4  3  2  1  0 -1 -2 -3 -4
> mapply(max, a, b)
 [1]  5  4  3  4  5  6  7  8  9 10
```

```r eg3-输入向量，返回值多个时返回matrix
> mapply(function(x,y) c(x+y, x^y, x-y), c(1:5), c(1:5))
     [,1] [,2] [,3] [,4] [,5]
[1,]    2    4    6    8   10
[2,]    1    4   27  256 3125
[3,]    0    0    0    0    0
```

---

### eapply

```r eapply-函数定义：对一个环境空间中的所有变量进行遍历
eapply(env, FUN, ..., all.names = FALSE, USE.NAMES = TRUE)
```

> **参数列表：**
> env: 环境空间
> FUN：要使用的函数
> all.names: 匹配类型, ANY 为所有类型
> USE.NAMES: 如果 X 为字符串，TRUE 设置字符串为数据名，FALSE 不设置

{% label info@<b>举例阐释</b> %}

```r eg-eapply操作示例
> # 定义一个环境空间
> env <- new.env()
> # 向这个环境空间中存入3个变量
> env$a <- 1:10
> env$b <- exp(-3:3)
> env$logic <- c(TRUE, FALSE, FALSE, TRUE)

> ls(env)      # 查看env空间中的变量
[1] "a"     "b"     "logic"
> ls.str(env)  # 查看env空间中的变量字符串结构
a :  int [1:10] 1 2 3 4 5 6 7 8 9 10
b :  num [1:7] 0.0498 0.1353 0.3679 1 2.7183 ...
logic :  logi [1:4] TRUE FALSE FALSE TRUE

> eapply(env, mean)   # 计算env环境空间中所有变量的均值
$a
[1] 5.5
$b
[1] 4.535125
$logic
[1] 0.5
```

<br>

---

## 应用及拓展

### 应用展示

原始数据为按年份 year、地区 loc 和商品类别 type 进行统计的销售量。我们要制作两个销售总量的 crosstable，一个以年份为行、地区为列，一个以年份为行，类别为列。

```r 应用1-tapply实现crosstable功能
> df <- data.frame(year=kronecker(2001:2003, rep(1,4)),
                 loc=c('beijing','beijing','shanghai','shanghai'),
                 type=rep(c('A','B'),6), sale=rep(1:12))
> df
   year      loc type sale
1  2001  beijing    A    1
2  2001  beijing    B    2
3  2001 shanghai    A    3
4  2001 shanghai    B    4
5  2002  beijing    A    5
6  2002  beijing    B    6
7  2002 shanghai    A    7
8  2002 shanghai    B    8
9  2003  beijing    A    9
10 2003  beijing    B   10
11 2003 shanghai    A   11
12 2003 shanghai    B   12

> tapply(df$sale, df[,c('year','loc')], sum)
      loc
year   beijing shanghai
  2001       3        7
  2002      11       15
  2003      19       23

> tapply(df$sale, df[,c('year','type')], sum)
      type
year    A  B
  2001  4  6
  2002 12 14
  2003 20 22
```

```r 应用2-mapply使两个嵌套列表对应项相加
> list1 <- list(a=1:5, b=list(c=1:4, d=5:9))
> list1
$a
[1] 1 2 3 4 5
$b
$b$c
[1] 1 2 3 4
$b$d
[1] 5 6 7 8 9

> list2 <- list(a=1:5, b=list(c=5:8, d=1:5))
> list2
$a
[1] 1 2 3 4 5
$b
$b$c
[1] 5 6 7 8
$b$d
[1] 1 2 3 4 5

> "%+%" <- function(x,y) mapply("+", x, y)
> mapply("%+%", list1, list2)
$a
[1]  2  4  6  8 10
$b
$b$c
[1]  6  8 10 12
$b$d
[1]  6  8 10 12 14
```

---

### 相关函数

#### by

```r by-函数定义：by可以当成data.frame上的tapply，在数据框行上施用索引分组运算
by(data, INDICES, FUN, ..., simplify = TRUE)
```

> **参数列表：**
> data: 数据框
> INDICES：与数据框行数等长的用于分组的索引
> FUN：要使用的函数

{% label info@<b>举例阐释</b> %}

```r eg-by对数据框进行按行索引分组计算
> data <- data.frame(a=c(1:5), b=c(6:10))
> data
  a  b
1 1  6
2 2  7
3 3  8
4 4  9
5 5 10
> INDICES <- c(1,1,2,2,2)

> by(data, INDICES, colMeans)
INDICES: 1
  a   b
1.5 6.5
-------------------------------------------------------------------------------
INDICES: 2
a b
4 9
> by(data, INDICES, rowMeans)
INDICES: 1
  1   2
3.5 4.5
-------------------------------------------------------------------------------
INDICES: 2
  3   4   5
5.5 6.5 7.5
```

#### outer

```r outer-函数定义：作用于数组的类似于矩阵外积运算方式的运算函数
outer(X, Y, FUN = "*", ...)
```

> **参数列表：**
> X、Y: 向量、数组
> FUN：当为空时即为外积运算，否则为将 FUN 代替外积运算符进行类似外积的运算操作

{% label info@<b>举例阐释</b> %}

```r eg-outer的使用
> x <- 1:4; y <- 2:4
> x; y
[1] 1 2 3 4
[1] 2 3 4
> outer(x, y)
     [,1] [,2] [,3]
[1,]    2    3    4
[2,]    4    6    8
[3,]    6    9   12
[4,]    8   12   16

> month.abb
 [1] "Jan" "Feb" "Mar" "Apr" "May" "Jun" "Jul" "Aug" "Sep" "Oct" "Nov" "Dec"
> outer(month.abb, 1999:2003, FUN = "paste")
      [,1]       [,2]       [,3]       [,4]       [,5]
 [1,] "Jan 1999" "Jan 2000" "Jan 2001" "Jan 2002" "Jan 2003"
 [2,] "Feb 1999" "Feb 2000" "Feb 2001" "Feb 2002" "Feb 2003"
 [3,] "Mar 1999" "Mar 2000" "Mar 2001" "Mar 2002" "Mar 2003"
 [4,] "Apr 1999" "Apr 2000" "Apr 2001" "Apr 2002" "Apr 2003"
 [5,] "May 1999" "May 2000" "May 2001" "May 2002" "May 2003"
 [6,] "Jun 1999" "Jun 2000" "Jun 2001" "Jun 2002" "Jun 2003"
 [7,] "Jul 1999" "Jul 2000" "Jul 2001" "Jul 2002" "Jul 2003"
 [8,] "Aug 1999" "Aug 2000" "Aug 2001" "Aug 2002" "Aug 2003"
 [9,] "Sep 1999" "Sep 2000" "Sep 2001" "Sep 2002" "Sep 2003"
[10,] "Oct 1999" "Oct 2000" "Oct 2001" "Oct 2002" "Oct 2003"
[11,] "Nov 1999" "Nov 2000" "Nov 2001" "Nov 2002" "Nov 2003"
[12,] "Dec 1999" "Dec 2000" "Dec 2001" "Dec 2002" "Dec 2003"
```

---

#### sweep

```r sweep-函数定义：对数组、矩阵按维度进行运算
sweep(x, MARGIN, STATS, FUN = "-", check.margin = TRUE, ...)
```

> **参数列表：**
> x: 数组、矩阵
> MARGIN：运算维度，1 表示行，2 表示列，3 即第三维度，以此类推
> STATS：运算参数，类似于减法中的减数，除法中的除数
> FUN：要使用的函数

{% label info@<b>举例阐释</b> %}

```r eg1-对数组按行运算
> mat <- matrix(1:9, 3)
> mat
     [,1] [,2] [,3]
[1,]    1    4    7
[2,]    2    5    8
[3,]    3    6    9

> sweep(mat, 1, c(1,4,7), "+")  # 第一行都加1，第二行都加4，第三行都加7
     [,1] [,2] [,3]
[1,]    2    5    8
[2,]    6    9   12
[3,]   10   13   16
```

```r eg2-STATS可为其他格式，但注意与取MARGIN后的X结构相符
> A <- array(1:24, dim = 4:2)
> median <- apply(A, 1:2, median)
> A
, , 1
     [,1] [,2] [,3]
[1,]    1    5    9
[2,]    2    6   10
[3,]    3    7   11
[4,]    4    8   12
, , 2
     [,1] [,2] [,3]
[1,]   13   17   21
[2,]   14   18   22
[3,]   15   19   23
[4,]   16   20   24
> median
     [,1] [,2] [,3]
[1,]    7   11   15
[2,]    8   12   16
[3,]    9   13   17
[4,]   10   14   18

> sweep(A, 1:2, median)
, , 1
     [,1] [,2] [,3]
[1,]   -6   -6   -6
[2,]   -6   -6   -6
[3,]   -6   -6   -6
[4,]   -6   -6   -6
, , 2
     [,1] [,2] [,3]
[1,]    6    6    6
[2,]    6    6    6
[3,]    6    6    6
[4,]    6    6    6
```

---

#### replicate

```r replicate-函数定义：rep能把输入参数重复数次，replicate则能调用表达式数次
replicate(n, expr, simplify = "array")
```

> **参数列表：**
> n: 调用的次数
> expr：调用的表达式

{% label info@<b>举例阐释</b> %}

```r eg-建立一个函数，模拟扔两个骰子的点数之和，然后重复运行10次
> game <- function() {
+   n <- sample(1:6,2,replace=T)
+   return(sum(n))
+ }
> replicate(n=10, game())
 [1]  6  6  6  7  7  7 11  8  7  9
```

---

#### aggregate

```r aggregate-函数定义：可按要求把数据分组，然后对分组后的数据进行各种操作
aggregate(x, by, FUN, ...)
```

> **参数列表：**
> x: 一种 R 数据结构，通常为数据框
> by：分组索引，必须为 list 格式
> FUN：要使用的函数

{% label info@<b>举例阐释</b> %}

```r eg-按性别分组查看年龄和身高的均值
> data <- data.frame(name=c("张三","李四","王五","赵六"),
+              sex=c("M","M","F","F"), age=c(20,40,22,30),
+              height=c(166,170,150,155))
> data
  name sex age height
1 张三   M  20    166
2 李四   M  40    170
3 王五   F  22    150
4 赵六   F  30    155

> aggregate(data[,3:4], by=list(data$sex), mean)
  Group.1 age height
1       F  26  152.5
2       M  30  168.0
```

<br>

---

## 致谢

> ### 参考文章
>
> - [R 语言 apply 函数族笔记](https://www.cnblogs.com/aquastone/p/r-apply.html)
> - [掌握 R 语言中的 apply 函数族](http://blog.fens.me/r-apply/)
> - [Dr. Feng Li-Personal Site](https://feng.li/)
