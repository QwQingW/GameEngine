# 🧬 变异吧！人类！—— 开始界面设计文档

## 1. 当前状态分析

### 现状
当前游戏直接从 `#auth-screen`（登录/注册页）开始，这是一个单层面板：
- 标题 "🧬 变异吧！人类！"
- 登录/注册 Tab 切换
- 用户名输入框
- 登录/注册按钮

整体风格为深色渐变背景 + 半透明毛玻璃面板，视觉上**偏向工具页面而非游戏开场**，缺乏：
- 游戏品牌感
- 视觉冲击力
- 氛围铺垫
- 世界观代入

### 改造目标
将单层界面改造为**双层结构**：
- **第一层**：游戏封面/开场页（品牌展示 + 视觉氛围 + 二选一入口）
- **第二层**：登录/注册面板（引导注册或直接登录）

同时，通过 AI 生成视觉素材，提升整体美术品质。

---

## 2. 双层结构设计

### 页面流转

```
打开页面
  │
  ▼
┌─────────────────────────────────────┐
│         第一层：封面页               │
│   · 游戏 Logo / 标题                │
│   · AI 生成的氛围背景图              │
│   · 动态粒子/光效（CSS/Canvas）      │
│   · 世界观 slogan                   │
│   · 两个入口按钮：                  │
│     [🔬 开始实验] → 直接到注册面板   │
│     [🔑 已有账户] → 直接到登录面板   │
│   · 如果 localStorage 有记忆，      │
│     自动跳过 → 直接进入存档槽位页    │
└──────────┬──────────────────────────┘
           │ 点击按钮
           ▼
┌─────────────────────────────────────┐
│       第二层：登录/注册面板           │
│   · 继承第一层背景（降低透明度）      │
│   · 面板浮在背景之上                 │
│   · 根据入口默认激活对应 Tab         │
│   · [开始实验] → 默认「注册」Tab     │
│   · [已有账户] → 默认「登录」Tab     │
│   · 注册/登录成功 → 存档槽位页       │
│   · [返回] → 回到封面页              │
└─────────────────────────────────────┘
```

### 与现有流程的兼容

```
Phase 2 现有流程:
  auth-screen → slots-screen → variant-create-screen → game

新流程:
  cover-screen → auth-screen → slots-screen → variant-create-screen → game
       ↑                                              │
       └──────────── 返回按钮 ────────────────────────┘
```

**改动要点**：
- 新增 `#cover-screen` DOM 层
- 现有 `#auth-screen` 保持原有逻辑，仅新增「返回」按钮和入口参数传递
- `localStorage` 自动登录逻辑移到 `#cover-screen` 检查，有记录则直接跳到 `#slots-screen`

---

## 3. 第一层：封面页详细设计

### 3.1 布局结构

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              [AI 生成的全屏背景图]                     │
│         深色实验室/培养皿/基因工厂氛围                   │
│                                                      │
│              ╔══════════════════╗                    │
│              ║  🧬 变异吧！     ║                    │
│              ║    人类！        ║  ← 游戏 Logo        │
│              ╚══════════════════╝                    │
│                                                      │
│         「每一场实验，都是独一无二的进化」              │
│                    ← 世界观 slogan                    │
│                                                      │
│          ┌─────────────┐  ┌─────────────┐           │
│          │  🔬 开始实验  │  │  🔑 已有账户  │          │
│          │  (注册新身份) │  │  (直接登录)  │          │
│          └─────────────┘  └─────────────┘           │
│                                                      │
│              [版本号 / 极简底部信息]                    │
└──────────────────────────────────────────────────────┘
```

### 3.2 视觉氛围设计

#### 背景：AI 生成静态图 + CSS 粒子叠加

**主背景图**（AI 生成，建议 1920×1080，PNG）：
- 主题：阴暗的基因实验室/培养皿房间
- 元素：破裂的培养罐、发光液体、基因螺旋投影、生物荧光
- 色调：深蓝紫底 + 荧光绿/青色点缀（与现有 `#1a1a2e` 调性一致）
- 风格：像素风或暗色调厚涂风格，保持"可爱怪诞"的调性

**Prompt 建议**：

```
英文（Midjourney / Leonardo）:
dark bio-laboratory interior, broken incubation tanks with glowing green liquid, 
DNA helix hologram projection on the wall, bioluminescent particles floating, 
moody atmosphere, deep blue purple color scheme with neon green accents, 
16-bit pixel art, top-down perspective, game background, cinematic lighting, 
no text, empty center area for UI overlay --ar 16:9 --style pixel

中文（可灵 / 通义万相）:
阴暗的基因实验室内部场景，破裂的培养罐里发着绿色荧光的液体，
墙上有DNA螺旋全息投影，空气中漂浮着生物荧光粒子，
深蓝紫色调，绿色霓虹点缀，像素风游戏背景图，
画面中央留空用于叠加UI文字，16:9比例，不要文字
```

#### 前景动态效果（纯 CSS/Canvas 实现，不依赖 AI 视频）

| 效果 | 实现方式 | 说明 |
|------|---------|------|
| 浮游生物粒子 | CSS `@keyframes` + 多个半透明圆点 | 模拟培养液中漂浮的微生物，缓慢上升 |
| 基因螺旋光效 | CSS 或 Canvas 2D 绘制旋转的双螺旋 | 背景中央或角落有缓慢旋转的 DNA 光带 |
| 容器气泡 | CSS 或 Canvas 粒子系统 | 从画面底部冒出的发光气泡 |
| 文字呼吸光效 | CSS `text-shadow` 动画 | Logo 文字有明暗呼吸般的发光效果 |
| 按钮悬停光晕 | CSS `box-shadow` + `transition` | 按钮 hover 时边框发光增强 |

#### 调色板（继承现有深色科幻调性）

| 用途 | 颜色 |
|------|------|
| 背景底色 | `#0a0a1a` → `#16213e` 径向渐变 |
| 主色调 | `#38bdf8`（天蓝） |
| 强调色 | `#818cf8`（蓝紫） |
| 荧光绿 | `#4ade80` |
| 文字白 | `#e2e8f0` |
| 暗文字 | `#64748b` |
| 危险红 | `#ef4444` |

### 3.3 按钮设计

两个主按钮采用不同的视觉权重：

```css
/* 主按钮 - "开始实验" */
.btn-primary {
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  padding: 14px 48px;
  border-radius: 12px;
  /* 微光动画 */
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
}

/* 次按钮 - "已有账户" */
.btn-secondary {
  background: rgba(255,255,255,0.08);
  color: #94a3b8;
  border: 1px solid rgba(255,255,255,0.15);
  font-size: 15px;
  padding: 12px 32px;
  border-radius: 10px;
}
```

### 3.4 Logo / 标题设计

标题 "🧬 变异吧！人类！" 建议增强为三层结构：

```
┌──────────────────────────┐
│    [AI 生成的小怪物剪影]   │  ← 可选：用 AI 生成一个可爱的变异体剪影
│                          │     放在标题上方或旁边
│   🧬  变 异 吧 ！        │
│       人 类 ！           │  ← 大字号，发光效果
│                          │
│  ── AI 变异进化肉鸽 ──    │  ← 副标题，小字号
└──────────────────────────┘
```

**标题 AI 素材方案**：
可以额外生成一个"吉祥物"角色图——一个可爱又有点怪的小变异体，放在标题上方。Prompt：

```
cute weird mutant creature, small round body with one extra tiny arm, 
glowing belly, single horn on head, big innocent eyes, 
soft cartoon style, pixel art, game mascot, transparent background, 
front view, no text --style pixel
```

---

## 4. 第二层：登录/注册面板优化

### 4.1 设计原则

第二层基于现有 `#auth-screen` 改造，核心改动：
- **不要完全重写**，保留现有 Tab + 输入框 + 按钮逻辑
- **叠加在第一层背景之上**：第一层不消失，`#auth-screen` 以半透明遮罩 + 居中面板的形式覆盖
- **根据入口自动切换 Tab**：从"开始实验"进来默认注册，从"已有账户"进来默认登录
- **新增「返回」按钮**：左上角或面板底部

### 4.2 视觉效果

```
┌──────────────────────────────────────────────────────┐
│  [第一层背景继续显示，但被半透明深色遮罩覆盖]           │
│                                                      │
│           ┌──────────────────────┐                   │
│           │  ← 返回              │                   │
│           │                      │                   │
│           │  [登录] [注册]  ← Tab │                   │
│           │                      │                   │
│           │  玩家用户名           │                   │
│           │  [_______________]   │                   │
│           │                      │                   │
│           │  [  登 录 / 注 册  ] │                   │
│           │                      │                   │
│           │  提示文字...          │                   │
│           └──────────────────────┘                   │
│                                                      │
│  半透明遮罩层 (rgba(0,0,0,0.6))                       │
└──────────────────────────────────────────────────────┘
```

### 4.3 现有代码兼容

现有 `#auth-screen` 的核心 DOM 结构和 JS 逻辑**全部保留**，仅需：
1. CSS 增加 `position: fixed` + `z-index` 使其覆盖在封面之上
2. 增加半透明遮罩背景
3. 新增 `← 返回` 按钮
4. 暴露一个 `showAuthScreen(mode: 'login' | 'register')` 方法接收入口参数

---

## 5. AI 可生成的视觉素材清单

按照优先级排列：

### 优先级 A（必须有）

| 素材 | 用途 | 推荐工具 | 尺寸 | 格式 |
|------|------|---------|------|------|
| **封面背景图** | `#cover-screen` 全屏背景 | Midjourney / Leonardo | 1920×1080 | PNG |
| **封面背景图（移动端裁剪版）** | 响应式适配 | 从原图裁剪 | 750×1334 | PNG |

### 优先级 B（强烈推荐）

| 素材 | 用途 | 推荐工具 | 尺寸 | 格式 |
|------|------|---------|------|------|
| **吉祥物/变异体角色** | 标题上方装饰 | Midjourney / Leonardo | 256×256 | PNG（透明背景） |
| **培养罐图标** | 按钮装饰、loading 动画 | Leonardo Pixel Art | 64×64 | PNG |
| **DNA 螺旋装饰** | 背景角落装饰 | Leonardo Pixel Art | 128×128 | PNG（透明背景） |
| **生物荧光粒子 spritesheet** | CSS 粒子动画的粒子图 | Leonardo | 16×16 或 32×32 | PNG |

### 优先级 C（锦上添花）

| 素材 | 用途 | 推荐工具 | 尺寸 | 格式 |
|------|------|---------|------|------|
| **登录面板装饰边框** | `#auth-screen` 面板边框花纹 | Leonardo | 可平铺 tile | PNG |
| **按钮纹理** | 替代纯色渐变按钮 | Leonardo | 200×60 | PNG |
| **实验器材图标组** | 烧杯、试管、显微镜等点缀 | Leonardo Pixel Art | 32×32 | PNG spritesheet |

---

## 6. AI 生图 Prompt 汇总

### 6.1 封面背景图

```
Midjourney / Leonardo (英文):
dark bio-laboratory interior, broken cylindrical incubation tanks filled with 
glowing green bioluminescent liquid, DNA double helix hologram projection on 
concrete wall, floating bioluminescent particles, moody atmosphere, 
deep navy blue and dark purple color scheme with cyan and neon green accents, 
16-bit pixel art, top-down perspective, game background, 
cinematic volumetric lighting, center area kept dark and empty for UI overlay, 
no text, no humans --ar 16:9 --style pixel

可灵 / 海螺AI (中文):
黑暗的基因实验室内部，破裂的圆柱形培养罐装着发绿色荧光的液体，
混凝土墙上有DNA双螺旋全息投影，空气中漂浮发光粒子，
深蓝紫暗色调，青色和霓虹绿点缀，
16位像素风格，俯视视角游戏背景图，
画面中央保持暗色留空用于放UI，不要文字，不要人物
```

### 6.2 吉祥物角色

```
cute weird mutant creature mascot, small round blob body with one extra tiny arm, 
glowing green belly, single small horn on head, big innocent round eyes, 
soft cartoon pixel art style, 16-bit, chunky pixels, 
transparent background, front view, centered, game character, 
no text, no background --style pixel
```

### 6.3 粒子素材

```
single bioluminescent floating particle, tiny glowing orb, 
soft neon green and cyan glow, pixel art, 32x32, 
transparent background, game particle asset, no text --style pixel
```

### 6.4 DNA 装饰元素

```
glowing DNA double helix icon, neon cyan and purple, 
pixel art, game UI decoration, transparent background, 
128x128, no text --style pixel
```

---

## 7. CSS 动画效果建议

### 7.1 浮游粒子动画

```css
/* 多个不同大小、不同速度、不同位置的粒子 */
.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56,189,248,0.6), transparent);
  animation: float-up linear infinite;
}
@keyframes float-up {
  0%   { transform: translateY(100vh) scale(0); opacity: 0; }
  10%  { opacity: 0.8; }
  90%  { opacity: 0.3; }
  100% { transform: translateY(-10vh) scale(1); opacity: 0; }
}
```

### 7.2 标题发光呼吸

```css
.title-glow {
  text-shadow:
    0 0 10px rgba(56, 189, 248, 0.5),
    0 0 40px rgba(56, 189, 248, 0.3),
    0 0 80px rgba(129, 140, 248, 0.2);
  animation: breathe 3s ease-in-out infinite;
}
@keyframes breathe {
  0%, 100% { text-shadow: 0 0 10px rgba(56,189,248,0.5), 0 0 40px rgba(56,189,248,0.3); }
  50%      { text-shadow: 0 0 20px rgba(56,189,248,0.7), 0 0 60px rgba(56,189,248,0.5), 0 0 100px rgba(129,140,248,0.3); }
}
```

### 7.3 按钮脉冲

```css
.btn-primary {
  animation: pulse-glow 2.5s ease-in-out infinite;
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 15px rgba(56, 189, 248, 0.3); }
  50%      { box-shadow: 0 0 30px rgba(56, 189, 248, 0.6), 0 0 60px rgba(129, 140, 248, 0.2); }
}
```

---

## 8. 实施计划

### 阶段 1：纯 CSS 改造（不依赖 AI 素材）—— 0.5 小时

在 AI 素材生成之前，先用纯 CSS 实现双层结构：
- 新增 `#cover-screen`，使用 CSS 渐变 + 粒子动画模拟背景氛围
- 将现有 `#auth-screen` 改为叠加层
- 实现「返回」按钮和入口参数传递
- 保持现有登录/注册逻辑不变

### 阶段 2：AI 素材生成与替换 —— 取决于 AI 工具速度

按优先级逐步替换：
1. 封面背景图替换 CSS 渐变
2. 吉祥物角色添加到标题上方
3. DNA 装饰元素添加到背景角落
4. 粒子素材替换纯 CSS 粒子

### 阶段 3：动画打磨 —— 0.5 小时

- 调优 CSS 动画参数（速度、透明度、数量）
- 添加过渡动画（封面 → 登录面板的切换动画）
- 响应式适配（移动端布局）

---

## 9. HTML 结构草案

```html
<!-- ====== 新增：封面页 ====== -->
<div id="cover-screen">
  <!-- AI 生成的背景图（或 CSS 渐变兜底） -->
  <div class="cover-bg">
    <!-- 动态粒子容器 -->
    <div class="particles-container" id="cover-particles"></div>
  </div>

  <!-- 前景内容 -->
  <div class="cover-content">
    <!-- 可选：吉祥物 -->
    <div class="cover-mascot">
      <img src="assets/ui/mascot.png" alt="变异体吉祥物" />
    </div>

    <!-- 标题 -->
    <h1 class="cover-title">🧬 变异吧！人类！</h1>
    <p class="cover-subtitle">AI 变异进化肉鸽</p>

    <!-- Slogan -->
    <p class="cover-slogan">每一场实验，都是独一无二的进化</p>

    <!-- 按钮组 -->
    <div class="cover-buttons">
      <button class="btn-cover-primary" id="btn-new-experiment">
        🔬 开始实验
      </button>
      <button class="btn-cover-secondary" id="btn-existing-account">
        🔑 已有账户
      </button>
    </div>

    <!-- 底部信息 -->
    <p class="cover-footer">v0.2.0 · 实验室原型</p>
  </div>
</div>

<!-- ====== 现有：登录/注册页（改为叠加层） ====== -->
<div id="auth-screen">
  <div class="auth-backdrop"></div>  <!-- 半透明遮罩 -->
  <div class="auth-panel">
    <!-- 返回按钮 -->
    <button class="auth-back-btn" id="btn-auth-back">← 返回</button>

    <!-- 原有内容保持不变 -->
    <h1>🧬 变异吧！人类！</h1>
    <p class="subtitle" id="auth-subtitle">登录或注册一个账户</p>
    <!-- ... Tab / 输入框 / 按钮 ... -->
  </div>
</div>
```

---

## 10. 不做的事情

- ❌ 不引入第三方 UI 框架（保持零依赖）
- ❌ 不做复杂的入场动画（淡入淡出即可）
- ❌ 不修改现有的登录/注册/存档业务逻辑
- ❌ 不生成 AI 视频背景（体积太大，首屏加载慢）
- ❌ 不做音效（Phase 1 已明确不做）
- ❌ 不重新设计存档槽位页和变异体创建页（这些页面目前已经足够好）

---

## 11. 验收标准

- [ ] 打开页面看到封面页（不是直接到登录页）
- [ ] 封面页有视觉吸引力（背景图或 CSS 渐变 + 粒子动画）
- [ ] 点击「开始实验」→ 进入登录/注册面板，默认「注册」Tab
- [ ] 点击「已有账户」→ 进入登录/注册面板，默认「登录」Tab
- [ ] 登录/注册面板有「返回」按钮，点击回到封面页
- [ ] 如果 localStorage 有记录 → 自动跳过封面页，直接进入存档槽位页
- [ ] 登录/注册成功后流程与现有完全一致
- [ ] 移动端基本可看（不要求完美适配）
