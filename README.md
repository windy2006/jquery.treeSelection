整体描述：
--------
扩展现有HTML select 控件的功能，增加树型列表模式，以及多选数量上限。

请参考：[演示页面](https://windy2006.github.io/jquery.treeSelection/)

调用条件：
--------
下载并复制 jquery.treeSelection.js，jquery.treeSelection.css 到网站目录，同时也需要事先准备好 jQuery 和 bootstrap 框架。

```html
<link href="vendor/bootstrap-5.3.8.min.css" rel="stylesheet">
<link href="vendor/original-theme.css" rel="stylesheet">
<link href="/path/to/jquery.treeSelection.css" rel="stylesheet">
<script type="text/javascript" src="vendor/jquery-4.0.0.min.js"></script>
<script type="text/javascript" src="/path/to/jquery.treeSelection.js"></script>
```

调用方式：
--------
调用非常简单，只需向 select 元素执行 treeSelection 方法即可，如下：
```javascript
$(selectObj).treeSelection(options);
```
其中 options 为可选的设置项，默认为：
```javascript
{
    data: []                // 自定义数据
    multiple: false,        // 是否可以多选
    max: 999,               // 最多可以选几项
    style: '',              // 选单样式
    class: ''               // 选单样式名
}
```

其中自定义数据 data 的格式为一个多级数组，每个元素包含 name 和 value 两个项目，对应select的显示文字和值，如value不设定则默认与name一致。
同时，还可以包含 items 项目作为当前项目的子项，其格式也是一个数组，每个元素包含 name 和 value 两个项目，也可以仅为选项文本，样例如下：

```javascript
[{
    name: '北京',
    items: [{
        name: '东城区',
        items: [{
            name: '天坛',
            value: 'tt'
        }, {
            name: '王府井',
            value: 'wfj'
        }]
    },{
        name: '西城区',
        items: ['西单','天安门']
    }]
}, {
    name: '河北',
    items: ['石家庄','唐山','秦皇岛']
}]
```

本插件调用比较简单，更多可参考 [演示页面](https://windy2006.github.io/jquery.treeSelection/)
## 2026-10-24 更新

保留原 jQuery 插件接口与样例主体，示例使用本地 jQuery 4.0.0、Bootstrap 5.3.8。`vendor/original-theme.css` 维持原示例的布局外观；上游许可证随依赖保留。

本地预览：在仓库目录运行 `python3 -m http.server 8765`，打开 http://localhost:8765/。
