# IBI: Image Bug Fixer with Inpainting

一个自用的基于浏览器的 AI 图像修复工具，通过绘图大模型（如 Nano Banana、Gemini）智能消除图片中的 bug、瑕疵或不需要的内容。使用Codex和Claude Code编写。

## 写在前面
因为这个项目真的是纯自用，为了替代部分PS插件而写的（因为某些PS插件不支持更换endpoint，导致我没办法用我买到的便宜的中转API，恼），所以没考虑过多复杂的功能和一个“真正的inpainter”应有的能力，只做了遮盖和修复的功能，比直接使用现成的插件肯定是要复杂一些的，但是便宜，要啥自行车（不是）。

## 功能特性

### 🎨 手工绘制蒙版

支持多种选区工具，精准框选需要修复的区域：

- **矩形选框**：适合规则区域的快速选取
- **套索工具**：自由绘制任意形状的选区
- **喷绘提示**：在选区内涂抹颜色，为 AI 提供修复方向的视觉提示

<!-- 截图占位：蒙版绘制演示 -->
<!-- ![蒙版绘制演示](docs/images/mask-demo.png) -->

### 📝 预设提示词

内置常用的修复场景预设，一键选择，无需重复输入：

- 移除水印
- 移除文字
- 去除背景干扰
- 修复瑕疵
- 自定义预设（通过 `prompts.json` 配置）

<!-- 截图占位：预设提示词界面 -->
<!-- ![预设提示词](docs/images/presets-demo.png) -->

### ⚡ 其他特性

- 🔄 撤销/重做喷绘操作
- 🔍 缩放和平移画布
- 🌓 深色/浅色主题切换
- 💾 导出完整图片或局部裁剪
- 🔔 浏览器通知提醒处理完成

## 推荐工作流程
建议结合Photoshop使用。

截图示意尚未就绪...

### 选择图片

### Crop裁剪图片到合适大小
为了让Gemini生成的内容更加的高清，不建议直接对原始的图片直接修复，所以建议先裁剪图片的关键区域。

### 划选并使用喷墨/填充工具



<!-- 截图占位：使用前后对比 -->
<!--
### 修复前
![修复前](docs/images/before.png)

### 修复后
![修复后](docs/images/after.png)
-->

## 快速开始

### 环境要求

- Node.js 16+
- 支持的 AI 模型 API Key（如 Gemini、Nano Banana 等）

### 安装依赖

```bash
npm install
```

### 配置 API

复制示例配置文件并填写你的 API 信息：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
GEMINI_API_KEY="your_api_key_here"
GEMINI_API_ENDPOINT="https://your-api-endpoint.com/v1beta/models"
GEMINI_MODELS=gemini-3-pro-image,gemini-2.5-flash-image-preview
```

**配置说明：**

- `GEMINI_API_KEY`：你的 API 密钥（必填，也可在网页端输入）
- `GEMINI_API_ENDPOINT`：API 端点地址（选填，可在网页端修改）
- `GEMINI_MODELS`：可用模型列表，逗号分隔（选填）

### 启动服务

```bash
npm run dev
```

服务将运行在 `http://localhost:4000`

## 使用步骤

1. **上传图片**：点击「选择图片」按钮，上传需要修复的图片
2. **选择区域**：使用矩形或套索工具框选需要修复的区域
3. **（可选）喷绘提示**：在选区内涂抹颜色，引导 AI 修复方向
4. **输入提示词**：描述你想要的效果，或选择预设提示词
5. **开始修复**：点击「Inpaint」按钮，等待 AI 处理
6. **下载结果**：满意后下载修复完成的图片

## 自定义预设提示词

编辑根目录下的 `prompts.json` 文件，添加你常用的提示词：

```json
{
  "presets": [
    {
      "label": "移除水印",
      "prompt": "Remove watermark and restore natural background"
    },
    {
      "label": "自定义场景",
      "prompt": "你的提示词"
    }
  ]
}
```

重启服务后生效。
