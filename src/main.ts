import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { EvolutionOption, typeIcon, typeLabel } from "./data/evolutions";
import { EvolutionSystem } from "./systems/EvolutionSystem";
import { drawFinalForm, generateReport, PlayerSummary } from "./utils/report";

export let playerNickname = "";

let game: Phaser.Game | null = null;

function createGame(): void {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: "game-container",
    backgroundColor: "#2d2d2d",
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: [GameScene],
  };

  game = new Phaser.Game(config);
}

// ---------- 登录 ----------

const loginScreen = document.getElementById("login-screen")!;
const gameScreen = document.getElementById("game-screen")!;
const summaryScreen = document.getElementById("summary-screen")!;
const nicknameInput = document.getElementById("nickname") as HTMLInputElement;
const btnStart = document.getElementById("btn-start")!;

btnStart.addEventListener("click", () => {
  const name = nicknameInput.value.trim();
  if (!name) {
    nicknameInput.focus();
    nicknameInput.style.borderColor = "#f87171";
    setTimeout(() => { nicknameInput.style.borderColor = ""; }, 600);
    return;
  }
  playerNickname = name;
  loginScreen.style.display = "none";
  gameScreen.style.display = "flex";
  summaryScreen.classList.remove("show");
  createGame();
});

nicknameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnStart.click();
});

// ---------- 进化选择面板 ----------

const evoOverlay = document.getElementById("evolution-overlay")!;
const evoCardsContainer = document.getElementById("evo-cards")!;

/**
 * 显示进化面板
 */
window.addEventListener("show-evolution", (() => {
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
})());

/**
 * 隐藏进化面板
 */
window.addEventListener("hide-evolution", () => {
  evoOverlay.classList.remove("show");
  evoCardsContainer.innerHTML = "";
  if (game) {
    game.scene.scenes[0].scene.resume();
  }
});

/**
 * 全部通关 → 结算页
 */
window.addEventListener("game-complete", ((e: Event) => {
  const detail = (e as CustomEvent).detail as PlayerSummary;
  if (!detail) return;

  // 销毁 Phaser 游戏实例
  if (game) {
    game.destroy(true);
    game = null;
  }

  // 切到结算页
  gameScreen.style.display = "none";
  summaryScreen.classList.add("show");

  // 绘制最终形态
  const canvas = document.getElementById("final-canvas") as HTMLCanvasElement;
  drawFinalForm(canvas, detail.visualParts, detail.sizeMultiplier);

  // 进化路线
  const evoPathEl = document.getElementById("evo-path")!;
  const pathStr = detail.evolutionLog.length
    ? detail.evolutionLog.map((ev) => {
        const icon = ev.type === "food" ? "🍖" : ev.type === "drug" ? "💊" : "🧪";
        return `${icon} ${ev.name}`;
      }).join("  →  ")
    : "（未发生进化）";
  evoPathEl.textContent = pathStr;

  // 属性面板
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

  // 实验报告
  const reportEl = document.getElementById("report-text")!;
  reportEl.textContent = generateReport(
    playerNickname,
    detail.evolutionLog,
    detail.visualParts,
  );

  // 副标题
  document.getElementById("summary-subtitle")!.textContent =
    `实验员 ${playerNickname} · 本次实验完成`;

  // 再开一局
  const btnRestart = document.getElementById("btn-restart")!;
  const restartHandler = () => {
    btnRestart.removeEventListener("click", restartHandler);
    summaryScreen.classList.remove("show");
    loginScreen.style.display = "flex";
    nicknameInput.value = "";
    nicknameInput.focus();
  };
  btnRestart.addEventListener("click", restartHandler);
}) as EventListener);

