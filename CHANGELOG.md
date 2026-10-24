# 核心 JS 优化记录

## 2026-10-24

- 保留 `.treeSelection(options)`、多级列表、选择上限与原 CSS 类；支持对多个 select 独立初始化。
- 使用文本节点和属性创建选项，避免把动态 name/value 当 HTML；不再改写调用方的数据数组。
- 保留原生 select 作为表单数据源，同步初始 selected、外部 `.val(...).trigger('change')`、reset、disabled 和标签删除；多选字段维持 `name[]` 约定。
- 重复初始化会清理旧实例；新增 `.treeSelection('destroy')`，清理监听、观察器、控件并还原名称、multiple 和样式。
- 触发按钮支持 Enter/空格与 Escape；没有改变原有列表 CSS。自定义数据中的名称统一按普通文本显示，已有依赖选项富文本的调用需改为单独受控渲染。
