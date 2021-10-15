整体描述：
--------
扩展现有HTML select 控件的功能，增加树型列表模式，以及多选数量上限。

请参考：[演示页面](https://windy2006.github.io/jquery.treeSelection/)

调用条件：
--------
下载并复制 jquery.treeSelection.js，jquery.treeSelection.css 到网站目录，同时也需要事先准备好 jQuery 和 bootstrap 框架。

```html
<link href="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/4.5.3/css/bootstrap.min.css" rel="stylesheet">
<link href="/path/to/jquery.treeSelection.css" rel="stylesheet">
<script type="text/javascript" src="https://cdn.bootcdn.net/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
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