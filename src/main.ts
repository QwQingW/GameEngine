import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { EvolutionOption, typeIcon, typeLabel } from "./data/evolutions";
import { EvolutionSystem } from "./systems/EvolutionSystem";

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
 * 由 GameScene 通过 CustomEvent 触发
 */
window.addEventListener("show-evolution", (() => {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as { options: EvolutionOption[] };
    if (!game) return;

    // 暂停 Phaser
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
 * 全部通关 → 过渡到结算页（第 7 步实现完整 DOM）
 */
window.addEventListener("game-complete", () => {
  // 销毁 Phaser 游戏实例
  if (game) {
    game.destroy(true);
    game = null;
  }

  // 在 game-container 内显示通关提示
  const container = document.getElementById("game-container")!;
  container.innerHTML = `
    <div style="
      width:800px; height:600px;
      display:flex; flex-direction:column;
      justify-content:center; align-items:center;
      background:#1a1a2e; color:#e2e8f0;
    ">
      <h2 style="color:#4ade80; font-size:28px; margin-bottom:12px;">🧬 实验完成！</h2>
      <p style="color:#94a3b8; font-size:14px; margin-bottom:20px;">实验员 ${playerNickname}：三关全部通过</p>
      <p style="color:#64748b; font-size:12px;">结算页将在下一步实现</p>
    </div>
  `;
});
