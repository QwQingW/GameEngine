import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { playerNickname } from "../main";
import { Player } from "../entities/Player";
import { Bullet } from "../entities/Bullet";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private bullets: Bullet[] = [];
  private bulletGroup!: Phaser.GameObjects.Group;

  // UI
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private expBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private expBarFill!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    // 边框
    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0x666666);
    gfx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 左上角实验员信息
    this.add
      .text(12, 10, `🔬 实验员：${playerNickname}`, {
        fontSize: "13px",
        color: "#7dd3fc",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      });

    // 子弹组
    this.bulletGroup = this.add.group();

    // 玩家
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.bulletGroup);

    // 鼠标点击 → 攻击
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const bullet = this.player.tryAttack(pointer.x, pointer.y, this.time.now);
      if (bullet) {
        this.bullets.push(bullet);
      }
    });

    // HP / EXP 条背景
    this.hpBarBg = this.add.graphics();
    this.expBarBg = this.add.graphics();
    this.hpBarFill = this.add.graphics();
    this.expBarFill = this.add.graphics();

    // 操作提示
    this.infoText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, "WASD 移动  |  鼠标点击 攻击", {
        fontSize: "12px",
        color: "#666666",
        align: "center",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      })
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    // 玩家移动
    this.player.update(delta);

    // 子弹更新 + 越界销毁
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(delta);
      if (b.isOutOfBounds()) {
        b.destroy();
        this.bullets.splice(i, 1);
      }
    }

    // 绘制 HUD
    this.drawHUD();
  }

  // -------------------------------------------------------
  // HUD
  // -------------------------------------------------------
  private drawHUD(): void {
    const barX = GAME_WIDTH - 220;
    const barW = 160;
    const barH = 14;

    // HP 背景
    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x333333);
    this.hpBarBg.fillRect(barX, 14, barW, barH);

    // HP 填充
    this.hpBarFill.clear();
    const hpRatio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    this.hpBarFill.fillStyle(0xe74c3c);
    this.hpBarFill.fillRect(barX, 14, barW * hpRatio, barH);

    // EXP 背景
    this.expBarBg.clear();
    this.expBarBg.fillStyle(0x333333);
    this.expBarBg.fillRect(barX, 34, barW, barH);

    // EXP 填充
    this.expBarFill.clear();
    const expRatio = Phaser.Math.Clamp(this.player.exp / this.player.expToNext, 0, 1);
    this.expBarFill.fillStyle(0xf1c40f);
    this.expBarFill.fillRect(barX, 34, barW * expRatio, barH);

    // HP / EXP 文字（每帧更新可优化，但 MVP 阶段够用）
    if (this.infoText) {
      this.infoText.setText(
        `WASD 移动  |  鼠标点击 攻击  |  Lv.${this.player.level}  HP:${this.player.hp}  EXP:${this.player.exp}/${this.player.expToNext}`,
      );
    }
  }
}
