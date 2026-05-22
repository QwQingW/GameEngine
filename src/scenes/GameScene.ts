import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    // 灰色背景（已在 main.ts 中通过 backgroundColor 设置，这里做额外确认）

    // 画几根边框线来确认场景是活的
    const gfx = this.add.graphics();
    // 边框
    gfx.lineStyle(2, 0x666666);
    gfx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 中央提示文字
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "变异进化肉鸽 · 最小原型\nPhase 1 项目骨架已就绪", {
        fontSize: "22px",
        color: "#cccccc",
        align: "center",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, "下一步：实现玩家移动与攻击", {
        fontSize: "14px",
        color: "#888888",
        align: "center",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      })
      .setOrigin(0.5);
  }
}
