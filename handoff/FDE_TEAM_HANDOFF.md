# FDE 团队网站交接规格

更新时间：2026-09-30  
项目目录：`D:\1pro\9-29`  
团队：**fde团队**，隶属 **华科未来（Huake Future）**

这份文件只记录已经确认的需求、当前代码状态和下一步开发顺序。`已完成`、`当前占位`、`待补素材`分开写，不能把占位内容当成最终内容。

## 2026-09-30 最新实现补充

下方原有组件计划是历史交接记录；本次按用户最新要求修复首页转场并拆分页面，当前代码如下：

- `src/App.jsx` 只组合全局导航和五页；页面分别位于 `src/pages/HomePage.jsx`、`ActivityPage.jsx`、`ProjectsPage.jsx`、`StudentCasesPage.jsx`、`AboutPage.jsx`。
- `src/components/SiteNavigation.jsx` 独立固定在顶部，五页持续可见，滚动时更新选中项和页码。
- 首页保留人手与机械手主视觉及现有滚动交互，底色为纯白。已于 2026-10-06 按用户要求彻底删除未引用的 `LetterGlitch` 字符背景源码及其专属旧截图、验证结果；不再保留或启用该效果。
- 首页初始只有文字。第一段向下滚动让双手从左右进入，留一段滚动距离保持相遇姿态；继续向下滚动，双手再向左右完全退出，随后文字上移，第二页按正常文档流进入。整个顺序由滚动进度控制，停止滚动就保持当前画面；取消整页旋转、缩放、半透明叠盖和导航退场。
- `HomePage.jsx` 的 ScrollTrigger 只驱动内部内容。CSS sticky 保持首页画面，不生成 pin spacer，不对页面容器做 transform。`prefers-reduced-motion` 使用普通静态页面。
- 滚轮和纵向触摸使用原生滚动，移除原来全局 touchend 强制跳页的处理，避免与画廊操作冲突。
- 第二页使用 `AccordionGallery` 和 `public/assets/activity/` 中的四张真实场地照片；标题在左上、说明在右上，直接放在白色页面上。移动端照片可点按展开。
- 第三页保留拆分前代码中已有的 `TiltedCard` 四项目和素材，第五页保留 `BounceCards`。
- 第四页已按用户随后提供的 `TearTicket` 源码重写：`StudentCasesPage.jsx` / `.css` 独立管理排版，`src/data/studentCases.js` 保存前五位学员及原文中的独立作品链接。桌面上三张、下两张居中，平板两列、手机单列。撕下票根展开作品亮点，也可直接点按钮展开；保留始终可用的查看作品链接与恢复票根操作。组件在 `src/components/TearTicket.jsx` / `.css`，依赖已安装的 `motion`。
- 第四页已检查真实鼠标拖拽、手机触摸、回车/空格、焦点转移、恢复票根、减少动画和 320/768/1440/2560 宽度；记录见 `.qa/tickets-results.json`。Superdesign 对应 draft：`f7de627b-6723-4551-93f8-daf2922e7947`，当前版本 2；可从 `.superdesign/resume.json` 继续。
- 首两页各有独立 CSS；导航样式位于 `SiteNavigation.css`。旧的整页透视和变形规则已移除。
- 浏览器回归脚本：`.qa/verify-transition.mjs`（通过 `PLAYWRIGHT_MODULE` 指定本机 Playwright 模块，`SITE_URL` 可覆盖默认预览地址）。

## 运行方式

```powershell
cd D:\1pro\9-29
npm install
npm run dev -- --host 0.0.0.0
```

浏览器预览：`http://localhost:5173/`  
生产构建：`npm run build`

当前依赖：React、GSAP、`@gsap/react`、`ogl`、`three`。最近一次 `npm run build` 已通过。

## 已确认的总交互

- 一共 5 个页面：`首页 → 活动场域 → 项目 → 学生案例 → 关于我们`。
- 鼠标滚轮向下必须能够依次进入下一页。
- 触摸/触控板的方向辅助：1→2 向下，2→3 向右，3→4 向左，4→5 向上。
- 首页手部动效由 GSAP ScrollTrigger 绑定滚轮进度。
- 手部只做从左右进入的位移动画，不做 JellyRadio 的果冻缩放、回弹或弹性变形。
- `prefers-reduced-motion` 时直接显示稳定画面。
- 首页白色背景；首页不放 logo；logo 只在最后“关于我们”页面出现。

## 五页最终规格

### 01｜首页 `#home`

**必须出现**

- 居中的大号 `F D E`，字母要分开、有字距、加粗，不能挡住两侧指尖。
- 文案：`Future · Design · Exploration`。
- 文案：`与华科未来一起，把想法带到真实世界。`
- “向下探索”和滚轮提示。
- 顶部胶囊导航：`首页 / 活动场域 / 项目 / 学生案例 / 关于`。
- 右上角小字：`HUAKE FUTURE · WUHAN`、`PAGE 01 / 05`。

**主视觉素材**

- `public/assets/fde-hand-robot-interaction.png`
- 这是一张透明的人手与机械手横向交互图。代码将同一张图裁成左右两层，从两侧进入，确保画面边缘不出现白色空洞。

**当前状态：已完成第一版**

- 文件：`src/App.jsx`、`src/styles.css`。
- 使用 `gsap`、`ScrollTrigger`、`useGSAP`。
- FDE 使用普通 DOM 文本，已移除 TechText Canvas，优先保证 Chrome/Edge 等浏览器一致显示。
- 导航只保留 JellyRadio 的胶囊视觉，未使用果冻动画。

**明确不启用**

- 首页背景目前是纯白。
- `MicroSlats`、`LightPillar` 只保留源码备查，不要自动重新加回首页。

### 02｜活动场域 `#activity`

**标题必须使用**

`华科未来.AI超级个体.WorkBuddy 实战营`

**页面内容**

- 活动场地和活动标题。
- 重点场地：`AI-OPC 枢纽中心`。
- 用户最初提供了 4 张场地/活动图：橙色夜间活动场、玻璃入口、白色活动空间、AI-OPC 走廊。

**React Bits 组件：当前已接入 3 个**

当前 `src/App.jsx` 的活动页从上到下是：

1. `CircularGallery`：主画廊，依赖 `ogl`，支持拖动、滚轮和左右方向键。
2. `FlexCarousel`：横向弹性卡片区，依赖 `ogl`。
3. `BounceCards`：叠放卡片和悬停展开，依赖 `gsap`。

对应源码：

- `src/components/CircularGallery.jsx` / `.css`
- `src/components/FlexCarousel.jsx` / `.css`
- `src/components/BounceCards.jsx` / `.css`

这三个组件已经通过本地图片数组渲染；它们是第二页当前的 React Bits 接入结果。后续出正式设计稿时，可以保留 `CircularGallery` 作为主组件，再删掉重复的 Flex/Bounce 区块，避免第二页信息过载。

**当前素材状态**

- 已有：`public/assets/activity-venue-ai-opc.jpg`（AI-OPC 场地照片）。
- 当前代码为了让组件可运行，暂时用 `public/assets/cases/` 中的截图填充其余画廊卡片；这些不是最终活动照片。
- 最终应替换为用户提供的另外 3 张活动场地图片。原始聊天临时路径已失效，见“待补素材”。

### 03｜团队项目 `#projects`

**四个项目必须保留**

1. 祈年殿网站：`https://facai0527.github.io/qiniandian/`
2. 茶叶网站：`https://facai0527.github.io/tea-shichagundong/`
3. 小红书自动发布网站：只有截图，不放在线链接。
4. 视频项目：使用 `handoff/videos/project-video.mp4`。

**设计与组件计划**

- 以 `FlexCarousel` 做项目横向浏览的主组件。
- 每张卡包含：项目编号、标题、简述、截图/视频和外链（只有前两个项目有外链）。
- 第 2 页到第 3 页支持向右滑，鼠标滚轮向下仍可进入。

**当前状态**

- `#projects` 已有四项目的基础卡片和两个网站链接。
- 视频卡已接入本地视频。
- 还没有接入最终项目截图，也还没有把项目区改成正式 `FlexCarousel` 版式。

### 04｜优秀学生案例 `#student-cases`

用户已确认使用学生案例原文中的**前五个**，不是后面的案例。

| 顺序 | 学员 | 作品 |
|---|---|---|
| 01 | 范艳芳 | 途途 Travel · 跟着心情去旅行 |
| 02 | 付总 | 电压，就是新的排量 · 比亚迪高端品牌矩阵 2026 新品发布会 |
| 03 | 李政诚 | 启程 · 学生求职工作台（通用公共模板版） |
| 04 | 刘元和 | AI 视频创作台 · 从选题到分镜的一站式工作流 |
| 05 | 朱莉 | 朱莉 · 留学规划顾问（深圳） |

完整原文：`handoff/prompts/student-cases.txt`。  
前五个案例的在线链接、作品优点和案例说明以该文件为准，不能自行改写成其他学员。

**设计与组件计划**

- 用 `BounceCards` 做五张案例封面叠放/展开。
- 展开后显示学员姓名、作品名称、作品简介和“查看案例”链接。
- 第 3 页到第 4 页支持向左滑，鼠标滚轮向下仍可进入。

**当前状态**

- `#student-cases` 已有五张基础案例卡和本地截图。
- 当前卡片是普通 CSS 网格，还没有改成最终 `BounceCards` 交互。

### 05｜关于我们 `#about`

**必须出现**

- 说明 `fde团队` 属于 `华科未来`。
- `public/assets/fde-logo.png`，logo 只放这里。
- 按钮链接到：`https://huakefuture.com/`。

**设计与组件计划**

- 可以使用 `ScrollExpand` 做最后一页的进入/展开媒体区。
- 第 4 页到第 5 页支持向上滑，鼠标滚轮向下仍可进入。

**当前状态**

- `#about` 已有 logo、团队说明和官网按钮。
- 还需要扩展为正式第五页设计，并补充 ScrollExpand 的最终内容和动效。

## 文件与素材清单

### 当前运行素材

- `public/assets/fde-hand-robot-interaction.png`：首页人手/机械手透明图。
- `public/assets/fde-logo.png`：关于页 logo。
- `public/assets/activity-venue-ai-opc.jpg`：活动页已确认场地照片。
- `public/assets/cases/case-travel.png`
- `public/assets/cases/case-byd.png`
- `public/assets/cases/case-job.png`
- `public/assets/cases/case-video.png`
- `public/assets/cases/case-consulting.png`
- `public/videos/project-video.mp4`：若存在则供项目视频使用；交接备份在 `handoff/videos/project-video.mp4`。

### 原始交接备份

- `handoff/references/`：用户上传的截图、logo、场地照片和首页参考图。
- `handoff/videos/project-video.mp4`：项目视频。
- `handoff/videos/hand-robot-reference.mp4`：手部交互参考视频。
- `handoff/prompts/`：所有 React Bits 提示词和学生案例原文。

### 待补素材

活动页仍缺用户最初说的另外 3 张场地/活动图。聊天中曾出现过的临时路径是：

- `ca28eaf0b69a2f2d549d74283ea2a81d.png`
- `0e9f83c16665deec4122e2eb0901de23.jpg`
- `3fbd5f5f989a65e4151276faf8faf80d.jpg`
- `9765b28404019d9957d89c9554467923.jpg`

这些路径在当前机器上已不可读。拿到新文件后，复制到 `public/assets/`，再替换 `activityImages` 数组，不能继续把学生案例截图当活动照片。

第三个项目的小红书自动发布截图也需要用户最终确认文件；现有 `codex-clipboard-697...` 等截图只是交接参考，不要凭文件名猜项目归属。

## React Bits 使用表

| 组件 | 当前状态 | 计划归属 |
|---|---|---|
| JellyRadio | 首页导航使用静态 CSS 视觉 | 保留胶囊，不启用果冻手部效果 |
| CircularGallery | 已接入活动页 | 第 2 页主画廊 |
| FlexCarousel | 已接入活动页试用 | 第 3 页项目横向浏览 |
| BounceCards | 已接入活动页试用 | 第 4 页五个学生案例 |
| ScrollExpand | 源码提示词已保存，未接入 | 第 5 页关于我们 |
| TechText | 不使用 | FDE 保持普通 DOM 文本，保证兼容性 |
| Shuffle | 不使用 | 其他文字恢复普通字体 |
| MicroSlats | 不使用 | 首页保持白底 |
| LightPillar | 不使用 | 除非用户重新指定首页背景 |

## GSAP 实现约定

- 入口：`src/App.jsx`。
- 已注册：`ScrollTrigger`。
- 首页 trigger id：`fde-hand-scroll-scene`。
- 动画只使用 transform/opacity 等不会引起大量布局重排的属性。
- 新增页间过渡时，先保证普通滚轮滚动，再增加触摸方向辅助，不能让画廊组件吞掉整页滚轮。

## Superdesign 记录

- projectId：`fe3b7f8d-7922-443b-a006-8c29b7a9cf1b`
- 首页 draftId：`dfe993ff-fe85-4047-8cfc-67007eeb8d6c`
- 预览：`https://p.superdesign.dev/draft/dfe993ff-fe85-4047-8cfc-67007eeb8d6c`
- 画布：`https://superdesign.dev/teams/df0a1bb7-460d-4d57-9f8e-df8d7a065f9d/projects/fe3b7f8d-7922-443b-a006-8c29b7a9cf1b`

## 下一位开发者按这个顺序做

1. 用新活动照片替换第二页的临时截图。
2. 决定第二页保留 `CircularGallery` 单组件，还是保留当前三个组件试验区；正式稿建议只留主画廊。
3. 将第三页改为项目专用 `FlexCarousel`，补第三项目截图。
4. 将第四页改为五案例专用 `BounceCards`，逐项核对学生原文和链接。
5. 将第五页改为正式 `ScrollExpand` 关于页，保留 logo 与官网按钮。
6. 最后检查桌面 Chrome/Edge、移动端、滚轮、触控板和 `prefers-reduced-motion`。

