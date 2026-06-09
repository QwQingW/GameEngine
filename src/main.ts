import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { EvolutionOption, typeIcon, typeLabel } from "./data/evolutions";
import { EvolutionSystem } from "./systems/EvolutionSystem";
import { drawFinalForm, generateReport, PlayerSummary } from "./utils/report";
import { GAME_WIDTH, GAME_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT } from "./config";
import {
  PlayerInfo,
  SaveSlot,
  registerPlayer,
  loginPlayer,
  getSaveSlots,
  createSaveSlot,
  loadSave,
  deleteSlot,
} from "./api/supabase";

// ----------------------------------------------------------------
// 全局身份状态
// ----------------------------------------------------------------
export let playerNickname = "";       // Phase 1 兼容，存 variantName
export let currentPlayer: PlayerInfo | null = null;
export let currentSlot: SaveSlot | null = null;

const LS_KEY = "current_player";

// ----------------------------------------------------------------
// DOM 引用
// ----------------------------------------------------------------
const coverScreen = document.getElementById("cover-screen")!;
const authScreen = document.getElementById("auth-screen")!;
const slotsScreen = document.getElementById("slots-screen")!;
const variantCreateScreen = document.getElementById("variant-create-screen")!;
const gameScreen = document.getElementById("game-screen")!;
const summaryScreen = document.getElementById("summary-screen")!;

// 封面页
const btnNewExperiment = document.getElementById("btn-new-experiment")!;
const btnExistingAccount = document.getElementById("btn-existing-account")!;

// 登录/注册页
const authSubtitle = document.getElementById("auth-subtitle")!;
const authTabs = document.querySelectorAll(".auth-tab");
const authUsername = document.getElementById("auth-username") as HTMLInputElement;
const btnAuth = document.getElementById("btn-auth")!;
const authError = document.getElementById("auth-error")!;
const btnAuthBack = document.getElementById("btn-auth-back")!;

// 存档页
const slotsUsername = document.getElementById("slots-username")!;
const slotsRow = document.getElementById("slots-row")!;
const btnSlotsLogout = document.getElementById("btn-slots-logout")!;

// 变异体创建页
const createPreviewCanvas = document.getElementById("create-preview-canvas") as HTMLCanvasElement;
const createVariantName = document.getElementById("create-variant-name") as HTMLInputElement;
const btnCreateConfirm = document.getElementById("btn-create-confirm")!;
const btnCreateCancel = document.getElementById("btn-create-cancel")!;
const createError = document.getElementById("create-error")!;

// 结算页
const btnRestart = document.getElementById("btn-restart")!;

// ----------------------------------------------------------------
// 状态: "login" | "register"
// ----------------------------------------------------------------
let currentAuthMode: "login" | "register" = "login";

/** 记录当前正在创建的槽位索引 (1/2/3) */
let creatingSlotIndex = 0;

// ----------------------------------------------------------------
// Phaser 实例管理
// ----------------------------------------------------------------
let game: Phaser.Game | null = null;

function createGame(): void {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "game-container",
    backgroundColor: "#2d2d2d",
    render: {
      pixelArt: true,        // 像素风：禁用纹理平滑
      antialias: false,
      roundPixels: true,     // 避免像素抖动
    },
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    scene: [GameScene],
  };
  game = new Phaser.Game(config);
}

function destroyGame(): void {
  if (game) {
    game.destroy(true);
    game = null;
  }
}

// ----------------------------------------------------------------
// 页面切换
// ----------------------------------------------------------------
function hideAll(): void {
  coverScreen.classList.remove("show");
  authScreen.classList.remove("show");
  slotsScreen.classList.remove("show");
  variantCreateScreen.classList.remove("show");
  gameScreen.style.display = "none";
  summaryScreen.classList.remove("show");
}

function showCoverScreen(): void {
  hideAll();
  coverScreen.classList.add("show");
}

function showAuthScreen(mode: "login" | "register" = "login"): void {
  hideAll();
  // 封面保留在底层
  coverScreen.classList.add("show");
  // 登录面板叠加显示
  authScreen.classList.add("show");
  authUsername.value = "";
  authError.classList.remove("show");
  switchAuthMode(mode);
  authUsername.focus();
}

function switchAuthMode(mode: "login" | "register"): void {
  currentAuthMode = mode;
  authTabs.forEach((t) => {
    const tabMode = t.getAttribute("data-tab");
    t.classList.toggle("active", tabMode === mode);
  });
  if (mode === "register") {
    btnAuth.textContent = "注 册";
    authSubtitle.textContent = "创建新账户";
  } else {
    btnAuth.textContent = "登 录";
    authSubtitle.textContent = "登录已有账户";
  }
}

function showSlotsScreen(): void {
  hideAll();
  slotsScreen.classList.add("show");
  if (currentPlayer) {
    slotsUsername.textContent = currentPlayer.username;
  }
  renderSaveSlots();
}

function showGame(): void {
  hideAll();
  // 确保暂停覆盖层不残留
  document.getElementById("pause-screen")?.classList.remove("show");
  gameScreen.style.display = "flex";
}

function showSummary(detail: PlayerSummary): void {
  hideAll();
  summaryScreen.classList.add("show");

  const canvas = document.getElementById("final-canvas") as HTMLCanvasElement;
  drawFinalForm(canvas, detail.visualParts, detail.sizeMultiplier);

  const evoPathEl = document.getElementById("evo-path")!;
  const pathStr = detail.evolutionLog.length
    ? detail.evolutionLog
        .map((ev) => {
          const icon = ev.type === "food" ? "🍖" : ev.type === "drug" ? "💊" : "🧪";
          return `${icon} ${ev.name}`;
        })
        .join("  →  ")
    : "（未发生进化）";
  evoPathEl.textContent = pathStr;

  const statsGrid = document.getElementById("stats-grid")!;
  const dodgePct = Math.round(detail.dodgeChance * 100);
  const critPct = Math.round(detail.critChance * 100);
  statsGrid.innerHTML = `
    <span>❤️ HP</span><span class="stat-val">${detail.hp} / ${detail.maxHp}</span>
    <span>⚔️ 攻击力</span><span class="stat-val">${detail.damage}</span>
    <span>🏃 速度</span><span class="stat-val">${detail.speed}</span>
    <span>🛡️ 闪避率</span><span class="stat-val">${dodgePct}%</span>
    <span>💥 暴击率</span><span class="stat-val">${critPct}%</span>
    <span>📏 体型</span><span class="stat-val">${Math.round((1 + detail.sizeMultiplier) * 100)}%</span>
    <span>⬆️ 等级</span><span class="stat-val">Lv.${detail.level}</span>
    <span>🧬 变异数</span><span class="stat-val">${detail.evolutionLog.length} 次</span>
  `;

  const reportEl = document.getElementById("report-text")!;
  reportEl.textContent = generateReport(
    playerNickname,
    detail.evolutionLog,
    detail.visualParts,
  );

  document.getElementById("summary-subtitle")!.textContent =
    `实验体 ${playerNickname} · 本次实验完成`;
}

// ----------------------------------------------------------------
// 登录/注册逻辑
// ----------------------------------------------------------------
async function handleAuth(): Promise<void> {
  const name = authUsername.value.trim();

  if (!name) {
    authUsername.focus();
    authUsername.style.borderColor = "#f87171";
    setTimeout(() => {
      authUsername.style.borderColor = "";
    }, 600);
    return;
  }

  (btnAuth as HTMLButtonElement).disabled = true;
  authError.classList.remove("show");

  if (currentAuthMode === "register") {
    const result = await registerPlayer(name);
    if (result.ok && result.player) {
      setPlayer(result.player);
      showSlotsScreen();
    } else if (result.reason === "taken") {
      authError.textContent = "⚠️ 该用户名已被注册，请换一个";
      authError.classList.add("show");
      authUsername.value = "";
      authUsername.focus();
    } else {
      authError.textContent = "⚠️ 网络开小差了，稍后重试";
      authError.classList.add("show");
    }
  } else {
    const result = await loginPlayer(name);
    if (result.ok && result.player) {
      setPlayer(result.player);
      showSlotsScreen();
    } else if (result.reason === "not_found") {
      authError.textContent = "⚠️ 用户不存在，请先注册";
      authError.classList.add("show");
      authUsername.value = "";
      authUsername.focus();
    } else {
      authError.textContent = "⚠️ 网络开小差了，稍后重试";
      authError.classList.add("show");
    }
  }

  (btnAuth as HTMLButtonElement).disabled = false;
}

function setPlayer(player: PlayerInfo): void {
  currentPlayer = player;
  localStorage.setItem(LS_KEY, JSON.stringify(player));
}

function logout(): void {
  localStorage.removeItem(LS_KEY);
  currentPlayer = null;
  currentSlot = null;
  playerNickname = "";
  destroyGame();
  showCoverScreen();
}

// ----------------------------------------------------------------
// 存档槽位 UI
// ----------------------------------------------------------------
async function renderSaveSlots(): Promise<void> {
  if (!currentPlayer) return;

  const slots = await getSaveSlots(currentPlayer.id);
  slotsRow.innerHTML = "";

  for (let i = 0; i < 3; i++) {
    const idx = i + 1;
    const slot = slots[i];
    const card = document.createElement("div");
    card.className = "slot-card";

    if (!slot) {
      // 空槽位 → 新建
      card.innerHTML = `
        <div class="slot-empty-icon">➕</div>
        <div class="slot-add-text">新建实验</div>
      `;
      card.addEventListener("click", () => openCreateSlotDialog(idx));
    } else {
      // 已有存档 → 继续 / 删除
      card.innerHTML = `
        <div class="slot-variant-name">🧬 ${slot.variant_name}</div>
        <div class="slot-level">第 ${slot.level + 1} 关</div>
        <button class="slot-delete" data-slot-id="${slot.id}">删除</button>
      `;
      // 点击卡片 → 继续游戏
      card.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains("slot-delete")) return; // 不触发卡片点击
        startFromSlot(slot);
      });
      // 删除按钮 → 弹出游戏内确认弹窗
      const delBtn = card.querySelector(".slot-delete") as HTMLButtonElement;
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showDeleteConfirm(slot.id, slot.variant_name);
      });
    }

    slotsRow.appendChild(card);
  }
}

/** 打开变异体创建页 */
function openCreateSlotDialog(slotIndex: number): void {
  creatingSlotIndex = slotIndex;
  createError.classList.remove("show");
  createVariantName.value = "";
  drawInitialPreview();
  hideAll();
  variantCreateScreen.classList.add("show");
  createVariantName.focus();
}

/** 在 HTML Canvas 上绘制初始人类形态预览 */
function drawInitialPreview(): void {
  const canvas = createPreviewCanvas;
  const ctx = canvas.getContext("2d")!;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 画一个基础人类外形
  // 头
  ctx.beginPath();
  ctx.arc(cx, cy - 50, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#f5c6a0";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 眼睛
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath(); ctx.arc(cx - 6, cy - 54, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 6, cy - 54, 3, 0, Math.PI * 2); ctx.fill();

  // 嘴
  ctx.beginPath();
  ctx.arc(cx, cy - 42, 5, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = "#c0392b";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 身体
  ctx.beginPath();
  ctx.moveTo(cx, cy - 32);
  ctx.lineTo(cx, cy + 20);
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 左臂
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.lineTo(cx - 22, cy + 10);
  ctx.stroke();

  // 右臂
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.lineTo(cx + 22, cy + 10);
  ctx.stroke();

  // 左腿
  ctx.beginPath();
  ctx.moveTo(cx, cy + 20);
  ctx.lineTo(cx - 14, cy + 60);
  ctx.stroke();

  // 右腿
  ctx.beginPath();
  ctx.moveTo(cx, cy + 20);
  ctx.lineTo(cx + 14, cy + 60);
  ctx.stroke();

  // 标签
  ctx.font = "11px 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.fillText("初始人类形态", cx, cy + 78);
}

async function handleCreateConfirm(): Promise<void> {
  const name = createVariantName.value.trim();
  if (!name) {
    createVariantName.focus();
    createError.textContent = "请输入变异体名字";
    createError.classList.add("show");
    return;
  }

  (btnCreateConfirm as HTMLButtonElement).disabled = true;
  createError.classList.remove("show");

  await createSlotAndStart(creatingSlotIndex, name);

  (btnCreateConfirm as HTMLButtonElement).disabled = false;
}

function handleCreateCancel(): void {
  showSlotsScreen();
}

async function createSlotAndStart(slotIndex: number, variantName: string): Promise<void> {
  if (!currentPlayer) return;

  const result = await createSaveSlot(currentPlayer.id, slotIndex, variantName);

  if (!result.ok) {
    if (result.reason === "occupied") {
      createError.textContent = "该槽位已被占用";
    } else {
      createError.textContent = "创建失败，请稍后重试";
    }
    createError.classList.add("show");
    return;
  }

  currentSlot = result.slot!;
  playerNickname = variantName;
  destroyGame();
  showGame();
  createGame();
}

async function startFromSlot(slot: SaveSlot): Promise<void> {
  currentSlot = slot;
  playerNickname = slot.variant_name;

  destroyGame();

  if (slot.player_data && Object.keys(slot.player_data).length > 0) {
    // 有存档数据 → 恢复
    const data = await loadSave(slot.id);
    if (data) {
      // 将存档数据挂到 window 上，GameScene 读取
      (window as any).__saveData = data;
    }
  }

  showGame();
  createGame();
}

// ----------------------------------------------------------------
// 初始检测
// ----------------------------------------------------------------
function init(): void {
  // 封面页始终先显示（即使有 localStorage 也先渲染封面，后续自动跳转）
  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    try {
      const player: PlayerInfo = JSON.parse(saved);
      currentPlayer = player;
      // 有登录记录 → 直接跳槽位页（跳过封面）
      showSlotsScreen();
      return;
    } catch {
      localStorage.removeItem(LS_KEY);
    }
  }
  // 无记录 → 显示封面
  showCoverScreen();
  // 初始化封面页视觉效果
  initCoverEffects();
}

// ----------------------------------------------------------------
// 事件绑定
// ----------------------------------------------------------------

// Tab 切换
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const mode = tab.getAttribute("data-tab") as "login" | "register";
    switchAuthMode(mode);
    authError.classList.remove("show");
    authUsername.focus();
  });
});

// 登录/注册按钮
btnAuth.addEventListener("click", handleAuth);
authUsername.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleAuth();
});

// 退出登录
btnSlotsLogout.addEventListener("click", logout);

// 变异体创建页
btnCreateConfirm.addEventListener("click", handleCreateConfirm);
btnCreateCancel.addEventListener("click", handleCreateCancel);
createVariantName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleCreateConfirm();
});

// 结算页「回到档案」
btnRestart.addEventListener("click", () => {
  destroyGame();
  showSlotsScreen();
});

// ----------------------------------------------------------------
// 删除确认弹窗
// ----------------------------------------------------------------
let pendingDeleteSlotId: string | null = null;
const deleteConfirmOverlay = document.getElementById("delete-confirm-overlay")!;
const deleteConfirmMsg = document.getElementById("delete-confirm-msg")!;
const btnConfirmNo = document.getElementById("btn-confirm-no")!;
const btnConfirmYes = document.getElementById("btn-confirm-yes")!;

function showDeleteConfirm(slotId: string, variantName: string): void {
  pendingDeleteSlotId = slotId;
  deleteConfirmMsg.textContent = `确定要删除实验体「${variantName}」的存档吗？此操作不可撤销。`;
  deleteConfirmOverlay.classList.add("show");
}

function hideDeleteConfirm(): void {
  pendingDeleteSlotId = null;
  deleteConfirmOverlay.classList.remove("show");
}

btnConfirmNo.addEventListener("click", hideDeleteConfirm);

btnConfirmYes.addEventListener("click", async () => {
  if (pendingDeleteSlotId === null) return;
  const slotId = pendingDeleteSlotId;
  hideDeleteConfirm();
  await deleteSlot(slotId);
  renderSaveSlots();
});

// 点击遮罩关闭
deleteConfirmOverlay.addEventListener("click", (e) => {
  if (e.target === deleteConfirmOverlay) {
    hideDeleteConfirm();
  }
});

// 暂停页面「保存并退出」事件
window.addEventListener("save-and-quit", () => {
  document.getElementById("pause-screen")?.classList.remove("show");
  destroyGame();
  showSlotsScreen();
});

// ----------------------------------------------------------------
// 进化选择面板（不变）
// ----------------------------------------------------------------
const evoOverlay = document.getElementById("evolution-overlay")!;
const evoCardsContainer = document.getElementById("evo-cards")!;

window.addEventListener(
  "show-evolution",
  (() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { options: EvolutionOption[] };
      if (!game) return;

      game.scene.scenes[0].scene.pause();
      evoCardsContainer.innerHTML = "";

      for (const opt of detail.options) {
        const card = document.createElement("div");
        card.className = "evo-card";

        const buffDesc = EvolutionSystem.describeBuff(opt.buff);
        const debuffDesc = EvolutionSystem.describeDebuff(opt.debuff);

        card.innerHTML = `
          <div class="type-badge ${opt.type}">${typeIcon(opt.type)} ${typeLabel(opt.type)}</div>
          <div class="evo-name">${opt.name}</div>
          <div class="evo-buff">+ ${buffDesc}</div>
          <div class="evo-debuff">- ${debuffDesc}</div>
          <div class="evo-hint">点击选择</div>
        `;

        card.addEventListener("click", () => {
          window.dispatchEvent(
            new CustomEvent("choose-evolution", { detail: { id: opt.id } }),
          );
        });

        evoCardsContainer.appendChild(card);
      }

      evoOverlay.classList.add("show");
    };
    return handler;
  })(),
);

window.addEventListener("hide-evolution", () => {
  evoOverlay.classList.remove("show");
  evoCardsContainer.innerHTML = "";
  if (game) {
    game.scene.scenes[0].scene.resume();
  }
});

// ----------------------------------------------------------------
// 游戏完成 → 结算页
// ----------------------------------------------------------------
window.addEventListener("game-complete", ((e: Event) => {
  const detail = (e as CustomEvent).detail as PlayerSummary;
  if (!detail) return;

  destroyGame();
  showSummary(detail);
}) as EventListener);

// ----------------------------------------------------------------
// 封面页事件
// ----------------------------------------------------------------
btnNewExperiment.addEventListener("click", () => {
  showAuthScreen("register");
});

btnExistingAccount.addEventListener("click", () => {
  showAuthScreen("login");
});

// 登录面板「返回」按钮
btnAuthBack.addEventListener("click", () => {
  showCoverScreen();
});

// ----------------------------------------------------------------
// 封面页视觉效果（纯 CSS 粒子，零 WebGL 开销）
// ----------------------------------------------------------------

function initCoverEffects(): void {
  // 0. 静态背景图（不动）
  const bgImage = document.getElementById("cover-bg-image")!;
  bgImage.style.backgroundImage = `url(Materials/beginning_background.png)`;

  // 1. 生成气泡粒子 + 细胞质微粒
  const particlesContainer = document.getElementById("cover-particles")!;

  // 气泡粒子（圆环+高光效果）
  for (let i = 0; i < 10; i++) {
    const b = document.createElement("div");
    b.className = "cover-bubble";
    const size = 6 + Math.random() * 14;
    const left = Math.random() * 100;
    const duration = 10 + Math.random() * 12;
    const delay = Math.random() * duration;
    const drift = (Math.random() - 0.5) * 60; // 水平漂移距离

    b.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${left}%;
      bottom: -20px;
      --drift: ${drift}px;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
    `;
    particlesContainer.appendChild(b);
  }

  // 细胞质微粒（实心小光点）
  const moteColors = [
    "rgba(56,189,248,0.85)",   // 天蓝
    "rgba(129,140,248,0.75)",  // 蓝紫
    "rgba(74,222,128,0.75)",   // 荧光绿
    "rgba(192,132,252,0.6)",   // 淡紫
    "rgba(34,211,238,0.8)",    // 青
  ];
  for (let i = 0; i < 15; i++) {
    const m = document.createElement("div");
    m.className = "cover-mote";
    const size = 2 + Math.random() * 3.5;
    const left = Math.random() * 100;
    const duration = 7 + Math.random() * 9;
    const delay = Math.random() * duration;
    const drift = (Math.random() - 0.5) * 80;
    const color = moteColors[Math.floor(Math.random() * moteColors.length)];

    m.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${left}%;
      bottom: -15px;
      background: ${color};
      box-shadow: 0 0 ${size * 3}px ${color};
      --drift: ${drift}px;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
    `;
    particlesContainer.appendChild(m);
  }

  // 3. 绘制 DNA 双螺旋装饰
  drawDNAHelix("cover-dna-left");
  drawDNAHelix("cover-dna-right");

  // 4. 绘制吉祥物（Canvas）
  drawMascot("cover-mascot-canvas");
}

function drawDNAHelix(canvasId: string): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width = canvas.offsetWidth;
  const h = canvas.height = canvas.offsetHeight;

  const cx = w / 2;
  const strands = 18; // 多少个"阶梯"
  const stepH = h / strands;

  ctx.strokeStyle = "rgba(56,189,248,0.15)";
  ctx.lineWidth = 2;

  for (let i = 0; i < strands; i++) {
    const y = i * stepH + stepH / 2;
    const phase = (i / strands) * Math.PI * 2;
    const offsetX = Math.sin(phase) * 20;

    // 左边链
    ctx.beginPath();
    ctx.arc(cx - offsetX, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56,189,248,0.3)";
    ctx.fill();

    // 右边链
    ctx.beginPath();
    ctx.arc(cx + offsetX, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(129,140,248,0.3)";
    ctx.fill();

    // 连接线
    ctx.beginPath();
    ctx.moveTo(cx - offsetX, y);
    ctx.lineTo(cx + offsetX, y);
    ctx.strokeStyle = "rgba(100,200,255,0.1)";
    ctx.stroke();
  }
}

function drawMascot(canvasId: string): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  ctx.clearRect(0, 0, w, h);

  // 身体（圆润的主体）
  ctx.beginPath();
  ctx.arc(cx, cy + 5, 30, 0, Math.PI * 2);
  ctx.fillStyle = "#7dd3fc";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 发光的肚子
  ctx.beginPath();
  ctx.arc(cx, cy + 10, 18, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(74,222,128,0.6)";
  ctx.fill();
  // 肚子发光
  const bellyGlow = ctx.createRadialGradient(cx, cy + 10, 5, cx, cy + 10, 22);
  bellyGlow.addColorStop(0, "rgba(74,222,128,0.7)");
  bellyGlow.addColorStop(1, "rgba(74,222,128,0)");
  ctx.beginPath();
  ctx.arc(cx, cy + 10, 22, 0, Math.PI * 2);
  ctx.fillStyle = bellyGlow;
  ctx.fill();

  // 大眼睛（两只无辜的大眼）
  // 左眼白
  ctx.beginPath();
  ctx.ellipse(cx - 10, cy - 8, 10, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  // 右眼白
  ctx.beginPath();
  ctx.ellipse(cx + 10, cy - 8, 10, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  // 左瞳孔
  ctx.beginPath();
  ctx.arc(cx - 10, cy - 6, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a2e";
  ctx.fill();
  // 右瞳孔
  ctx.beginPath();
  ctx.arc(cx + 10, cy - 6, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a2e";
  ctx.fill();
  // 高光
  ctx.beginPath();
  ctx.arc(cx - 8, cy - 9, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 12, cy - 9, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  // 小角
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 30);
  ctx.lineTo(cx - 8, cy - 48);
  ctx.lineTo(cx + 2, cy - 32);
  ctx.fillStyle = "#f472b6";
  ctx.fill();

  // 额外的第三只小手
  ctx.beginPath();
  ctx.arc(cx + 30, cy - 2, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#7dd3fc";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 微笑
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 8, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ----------------------------------------------------------------
// 入口
// ----------------------------------------------------------------
init();
