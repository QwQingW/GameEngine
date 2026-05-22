import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";

/** 当前登录的昵称，供 GameScene 读取 */
export let playerNickname = "";

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

  new Phaser.Game(config);
}

// ---------- DOM 交互 ----------

const loginScreen = document.getElementById("login-screen")!;
const gameScreen = document.getElementById("game-screen")!;
const nicknameInput = document.getElementById("nickname") as HTMLInputElement;
const btnStart = document.getElementById("btn-start")!;

btnStart.addEventListener("click", () => {
  const name = nicknameInput.value.trim();
  if (!name) {
    nicknameInput.focus();
    nicknameInput.style.borderColor = "#f87171";
    setTimeout(() => {
      nicknameInput.style.borderColor = "";
    }, 600);
    return;
  }

  playerNickname = name;
  loginScreen.style.display = "none";
  gameScreen.style.display = "flex";
  createGame();
});

// 支持回车键触发登录
nicknameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    btnStart.click();
  }
});
