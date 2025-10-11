# Pinterest Image Batch Saver

一个强大的油猴脚本，用于批量下载Pinterest图片（包含缩略图和原图）。

## ✨ 功能特性

- 🖼️ **批量下载**：一键下载所有或选定的图片
- 📦 **双质量保存**：同时保存缩略图和原始高清图片
- 🎯 **选择模式**：可视化选择要下载的图片
- 📊 **实时进度**：显示下载和打包进度
- 🔄 **去重功能**：自动识别并跳过重复图片
- 🎨 **深色主题**：跟随Pinterest风格的界面设计

## 📦 安装步骤

### 1. 安装Tampermonkey

首先需要安装Tampermonkey浏览器扩展：
- [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 2. 配置Tampermonkey权限（重要！）

为了确保脚本正常工作，需要配置以下权限：

#### Chrome用户：
1. 打开 `chrome://extensions`
2. 找到Tampermonkey扩展
3. 点击"详细信息"
4. **启用以下选项**：
   - ✅ "允许访问文件URL"（如果需要）
   - ✅ "在无痕模式下启用"（可选）

#### Tampermonkey设置：
1. 点击Tampermonkey图标 → 管理面板
2. 点击"设置"标签
3. 在"下载"部分：
   - 下载模式：选择"浏览器 API"
   - ✅ 启用"总是要求保存位置"（推荐）

### 3. 安装脚本

1. 打开Tampermonkey管理面板
2. 点击"➕"图标创建新脚本
3. 复制 `pinterest-image-saver.user.js` 的完整内容
4. 粘贴到编辑器中
5. 按 `Ctrl+S` (或 `Cmd+S`) 保存
6. 刷新Pinterest页面

## 🚀 使用方法

### 基本使用

1. **访问Pinterest**
   - 打开任意Pinterest页面
   - 右上角会出现一个摄像机图标

2. **打开控制面板**
   - 点击摄像机图标
   - 面板会展开显示功能按钮

3. **刷新图片列表**
   - 滚动页面加载更多图片
   - 点击"🔄 Refresh Images"更新数量

4. **下载所有图片**
   - 点击"⬇️ Download All"按钮
   - 等待下载

### 选择性下载

1. **进入选择模式**
   - 点击"✓ Download Selected"按钮
   - 图片上会显示圆形勾选框

2. **选择图片**
   - 点击图片上的勾选框
   - 选中的图片会显示红色遮罩和✓标记
   - 按钮会显示已选数量

3. **下载选中图片**
   - 再次点击"⬇️ Download Selected X images"
   - 等待打包和下载完成

4. **取消选择**
   - 点击"✕ Cancel Selection"退出选择模式



## 📄 许可证

MIT License

## 👨‍💻 作者

karminski-牙医
