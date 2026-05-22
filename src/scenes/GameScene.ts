import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { playerNickname } from "../main";
import { Player } from "../entities/Player";
import { Bullet } from "../entities/Bullet";
import { Enemy, EnemyType } from "../entities/Enemy";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private bullets: Bullet[] = [];
  private bulletGroup!: Phaser.GameObjects.Group;

  private enemies: Enemy[] = [];

  // 预定义刷怪区（避开玩家出生点中心）
  private spawnZones: { x: number; y: number }[] = [
    { x: 120, y: 100 },  { x: 680, y: 100 },
    { x: 120, y: 500 },  { x: 680, y: 500 },
    { x: 400, y: 80 },   { x: 400, y: 520 },
    { x: 80, y: 300 },   { x: 720, y: 300 },
  ];

  // UI
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private expBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private expBarFill!: Phaser.GameObjects.Graphics;
  private infoText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;

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

    // 剩余敌人计数
    this.enemyCountText = this.add
      .text(12, 34, "", {
        fontSize: "13px",
        color: "#e74c3c",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      });

    // 操作提示
    this.infoText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, "WASD 移动  |  鼠标点击 攻击", {
        fontSize: "12px",
        color: "#666666",
        align: "center",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      })
      .setOrigin(0.5);

    // ---- 测试：刷一波敌人 ----
    this.spawnWave();
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

    // 敌人更新
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.update(delta, this.player.x, this.player.y);

      // 敌人 vs 玩家 碰撞
      if (
        enemy.collidesWith(this.player.x, this.player.y, this.player.radius * this.player.sizeMultiplier) &&
        enemy.canAttack(this.time.now)
      ) {
        enemy.markAttacked(this.time.now);
        this.player.hp -= enemy.damage;
        if (this.player.hp <= 0) {
          this.player.hp = 0;
          this.onPlayerDeath();
        }
      }
    }

    // 子弹 vs 敌人 碰撞检测
    this.checkBulletEnemyCollisions();

    // 清理死亡敌人
    this.cleanupDeadEnemies();

    // 绘制 HUD
    this.drawHUD();
  }

  // -------------------------------------------------------
  // 刷怪
  // -------------------------------------------------------
  private spawnWave(): void {
    // 测试波次：5 只普通 + 2 只快速
    this.spawnEnemies("normal", 5);
    this.spawnEnemies("fast", 2);
  }

  private spawnEnemies(type: EnemyType, count: number): void {
    for (let i = 0; i < count; i++) {
      const zone = this.spawnZones[Math.floor(Math.random() * this.spawnZones.length)];
      const offX = (Math.random() - 0.5) * 60;
      const offY = (Math.random() - 0.5) * 60;
      this.enemies.push(new Enemy(this, zone.x + offX, zone.y + offY, type));
    }
  }

  // -------------------------------------------------------
  // 子弹 × 敌人 碰撞
  // -------------------------------------------------------
  private checkBulletEnemyCollisions(): void {
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const bullet = this.bullets[bi];
      let bulletHit = false;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (!bullet.sprite.active) continue;

        if (enemy.collidesWith(bullet.x, bullet.y, bullet.radius)) {
          const dead = enemy.takeDamage(this.player.damage);
          bullet.destroy();
          this.bullets.splice(bi, 1);
          bulletHit = true;

          if (dead) {
            this.player.gainExp(enemy.expReward);
          }
          break; // 一颗子弹只命中一个敌人
        }
      }

      if (bulletHit) continue;
    }
  }

  // -------------------------------------------------------
  // 清理死亡敌人
  // -------------------------------------------------------
  private cleanupDeadEnemies(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive) {
        this.enemies[i].destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  // -------------------------------------------------------
  // 玩家死亡
  // -------------------------------------------------------
  private onPlayerDeath(): void {
    // MVP 阶段：弹出提示文字，禁止操作
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "你被击败了！\n按 F5 重新挑战", {
        fontSize: "26px",
        color: "#e74c3c",
        align: "center",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 24, y: 16 },
      })
      .setOrigin(0.5);

    // 禁用输入
    this.input.off("pointerdown");
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

    // 剩余敌人
    const aliveCount = this.enemies.filter((e) => e.alive).length;
    this.enemyCountText.setText(`👾 剩余敌人：${aliveCount}`);

    // 底栏信息
    if (this.infoText) {
      this.infoText.setText(
        `WASD 移动  |  鼠标点击 攻击  |  Lv.${this.player.level}  HP:${this.player.hp}  EXP:${this.player.exp}/${this.player.expToNext}`,
      );
    }
  }
}
