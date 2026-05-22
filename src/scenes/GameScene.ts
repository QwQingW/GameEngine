import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config";
import { playerNickname } from "../main";
import { Player } from "../entities/Player";
import { Bullet } from "../entities/Bullet";
import { Enemy, EnemyType } from "../entities/Enemy";
import { EvolutionSystem } from "../systems/EvolutionSystem";
import { EvolutionOption, ALL_EVOLUTIONS } from "../data/evolutions";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private bullets: Bullet[] = [];
  private bulletGroup!: Phaser.GameObjects.Group;

  private enemies: Enemy[] = [];

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
  private levelText!: Phaser.GameObjects.Text;

  private isGameFrozen = false;
  private bulletVanishChance = 0;
  private levelUpQueue = 0;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    const gfx = this.add.graphics();
    gfx.lineStyle(2, 0x666666);
    gfx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(12, 10, `🔬 实验员：${playerNickname}`, {
        fontSize: "13px", color: "#7dd3fc",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      });

    this.bulletGroup = this.add.group();
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.bulletGroup);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isGameFrozen) return;
      const bullet = this.player.tryAttack(pointer.x, pointer.y, this.time.now);
      if (bullet) {
        bullet.tryVanish(this.bulletVanishChance);
        this.bullets.push(bullet);
      }
    });

    this.hpBarBg = this.add.graphics();
    this.expBarBg = this.add.graphics();
    this.hpBarFill = this.add.graphics();
    this.expBarFill = this.add.graphics();

    this.levelText = this.add
      .text(12, 50, "", {
        fontSize: "13px", color: "#f1c40f",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      });

    this.enemyCountText = this.add
      .text(12, 34, "", {
        fontSize: "13px", color: "#e74c3c",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      });

    this.infoText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, "WASD 移动  |  鼠标点击 攻击", {
        fontSize: "12px", color: "#666666", align: "center",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      })
      .setOrigin(0.5);

    // 监听进化选择
    window.addEventListener("choose-evolution", this.onEvolutionChosen);

    this.spawnWave();
  }

  update(_time: number, delta: number): void {
    if (this.isGameFrozen) return;

    // 玩家
    this.player.update(delta, this.time.now);

    // 自动走火
    const autoBullet = this.player.tryAutoFire(this.time.now);
    if (autoBullet) {
      autoBullet.tryVanish(this.bulletVanishChance);
      this.bullets.push(autoBullet);
    }

    // 子弹更新 + 越界 / 消失
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(delta);
      if (b.isOutOfBounds() || b.vanished) {
        b.destroy();
        this.bullets.splice(i, 1);
      }
    }

    // 敌人更新 + 碰撞
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.update(delta, this.player.x, this.player.y);

      if (
        enemy.collidesWith(this.player.x, this.player.y, this.player.radius * this.player.sizeMultiplier) &&
        enemy.canAttack(this.time.now)
      ) {
        enemy.markAttacked(this.time.now);
        const dodged = this.player.takeDamage(enemy.damage);
        // dodged 时不扣血（takeDamage 内部处理）
        if (!dodged && this.player.hp <= 0) {
          this.onPlayerDeath();
        }
      }
    }

    this.checkBulletEnemyCollisions();
    this.cleanupDeadEnemies();
    this.drawHUD();

    // 升级触发
    if (this.levelUpQueue > 0) {
      this.levelUpQueue--;
      this.triggerEvolutionPanel();
    }
  }

  // -------------------------------------------------------
  // 刷怪
  // -------------------------------------------------------
  private spawnWave(): void {
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
  // 子弹 × 敌人
  // -------------------------------------------------------
  private checkBulletEnemyCollisions(): void {
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const bullet = this.bullets[bi];
      if (!bullet.sprite.active) continue;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;

        if (enemy.collidesWith(bullet.x, bullet.y, bullet.radius)) {
          const dmg = this.player.rollCrit();
          const dead = enemy.takeDamage(dmg);
          bullet.destroy();
          this.bullets.splice(bi, 1);

          if (dead) {
            const leveledUp = this.player.gainExp(enemy.expReward);
            if (leveledUp) {
              this.levelUpQueue++;
            }
          }
          break;
        }
      }
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
  // 进化面板
  // -------------------------------------------------------
  private triggerEvolutionPanel(): void {
    this.isGameFrozen = true;
    const options = EvolutionSystem.pickThree();

    window.dispatchEvent(
      new CustomEvent("show-evolution", { detail: { options } }),
    );
  }

  private onEvolutionChosen = ((e: Event) => {
    const detail = (e as CustomEvent).detail as { id: string };
    const option = ALL_EVOLUTIONS.find((o) => o.id === detail.id);
    if (!option) return;

    // 特殊处理记忆罐头 & 混沌培养液
    let resolvedOption = { ...option };
    if (option.id === "memory" && this.player.evolutionLog.length > 0) {
      const prev = this.player.evolutionLog[this.player.evolutionLog.length - 1];
      resolvedOption = {
        ...option,
        buff: { ...prev.buff },
        debuff: {
          ...prev.debuff,
          // 副作用翻倍（简化处理：再叠加一次）
        },
        visualParts: [...option.visualParts],
      };
      // 副作用翻倍：再应用一次 debuff
    }
    if (option.id === "chaos") {
      const pool = ALL_EVOLUTIONS.filter(
        (o) => o.id !== "chaos" && o.id !== "memory",
      );
      const rnd = pool[Math.floor(Math.random() * pool.length)];
      resolvedOption = {
        ...option,
        buff: { ...rnd.buff },
        debuff: { ...rnd.debuff },
        visualParts: [...option.visualParts, ...rnd.visualParts],
      };
    }

    this.player.applyEvolution(resolvedOption);

    // 更新 bulletVanishChance
    if (resolvedOption.debuff.bulletVanish) {
      this.bulletVanishChance += resolvedOption.debuff.bulletVanish;
    }
    // memory 副作用翻倍
    if (option.id === "memory" && this.player.evolutionLog.length >= 2) {
      const prev = this.player.evolutionLog[this.player.evolutionLog.length - 2];
      this.player.applyEvolution({
        id: "memory_extra",
        name: "记忆罐头（翻倍）",
        type: "experiment",
        buff: {},
        debuff: { ...prev.debuff },
        visualParts: [],
      });
    }

    window.dispatchEvent(new CustomEvent("hide-evolution"));
    this.isGameFrozen = false;
  }).bind(this);

  // -------------------------------------------------------
  // 玩家死亡
  // -------------------------------------------------------
  private onPlayerDeath(): void {
    this.isGameFrozen = true;
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "你被击败了！\n按 F5 重新挑战", {
        fontSize: "26px", color: "#e74c3c", align: "center",
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 24, y: 16 },
      })
      .setOrigin(0.5);
    this.input.off("pointerdown");
  }

  // -------------------------------------------------------
  // HUD
  // -------------------------------------------------------
  private drawHUD(): void {
    const barX = GAME_WIDTH - 220;
    const barW = 160;
    const barH = 14;

    this.hpBarBg.clear();
    this.hpBarBg.fillStyle(0x333333);
    this.hpBarBg.fillRect(barX, 14, barW, barH);

    this.hpBarFill.clear();
    const hpRatio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    this.hpBarFill.fillStyle(0xe74c3c);
    this.hpBarFill.fillRect(barX, 14, barW * hpRatio, barH);

    this.expBarBg.clear();
    this.expBarBg.fillStyle(0x333333);
    this.expBarBg.fillRect(barX, 34, barW, barH);

    this.expBarFill.clear();
    const expRatio = Phaser.Math.Clamp(this.player.exp / this.player.expToNext, 0, 1);
    this.expBarFill.fillStyle(0xf1c40f);
    this.expBarFill.fillRect(barX, 34, barW * expRatio, barH);

    const aliveCount = this.enemies.filter((e) => e.alive).length;
    this.enemyCountText.setText(`👾 剩余敌人：${aliveCount}`);

    // 已获得部件
    const partNames = this.player.visualParts.length
      ? this.player.visualParts.slice(-3).join(" ")
      : "";
    this.levelText.setText(`Lv.${this.player.level}  ${partNames}`);

    if (this.infoText) {
      this.infoText.setText(
        `WASD 移动  |  鼠标点击 攻击  |  HP:${this.player.hp}  EXP:${this.player.exp}/${this.player.expToNext}`,
      );
    }
  }
}
