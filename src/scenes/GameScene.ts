import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { playerNickname } from "../main";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0x666666);
    gfx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 左上角显示实验员信息
    this.add
      .text(12, 10, `🔬 实验员：${playerNickname}`, {
        fontSize: "14px",
        color: "#7dd3fc",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      });

    // 中央提示
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, "变异进化肉鸽 · 最小原型", {
        fontSize: "24px",
        color: "#cccccc",
        align: "center",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 24, "下一步：实现玩家移动与攻击", {
        fontSize: "14px",
        color: "#888888",
        align: "center",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      })
      .setOrigin(0.5);
  }
}
