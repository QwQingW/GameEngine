import Phaser from "phaser";
import {
  PLAYER_SPEED,
  PLAYER_HP,
  PLAYER_DAMAGE,
  PLAYER_ATTACK_COOLDOWN,
  PLAYER_RADIUS,
  EXP_TO_LEVEL,
} from "../config";
import { Bullet } from "./Bullet";

export class Player {
  public x: number;
  public y: number;
  public radius: number = PLAYER_RADIUS;

  public hp: number = PLAYER_HP;
  public maxHp: number = PLAYER_HP;
  public exp: number = 0;
  public expToNext: number = EXP_TO_LEVEL;
  public level: number = 1;

  public damage: number = PLAYER_DAMAGE;
  public speed: number = PLAYER_SPEED;
  public attackCooldown: number = PLAYER_ATTACK_COOLDOWN;
  public sizeMultiplier: number = 1;

  /** 用于绘制身体的 graphics */
  private bodyGfx: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;

  private lastAttackTime = 0;

  // 键盘输入
  private cursors!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private bulletGroup: Phaser.GameObjects.Group;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    bulletGroup: Phaser.GameObjects.Group,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.bulletGroup = bulletGroup;

    // 身体
    this.bodyGfx = scene.add.graphics();
    this.drawBody();

    // 键盘
    if (scene.input.keyboard) {
      this.cursors = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  // -------------------------------------------------------
  // 移动
  // -------------------------------------------------------
  update(delta: number): void {
    let dx = 0;
    let dy = 0;
    if (this.cursors.W.isDown) dy -= 1;
    if (this.cursors.S.isDown) dy += 1;
    if (this.cursors.A.isDown) dx -= 1;
    if (this.cursors.D.isDown) dx += 1;

    // 归一化
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    const dt = delta / 1000;
    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * dt;

    // 边界限制
    const r = this.radius * this.sizeMultiplier;
    this.x = Phaser.Math.Clamp(this.x, r, 800 - r);
    this.y = Phaser.Math.Clamp(this.y, r, 600 - r);

    this.drawBody();
  }

  // -------------------------------------------------------
  // 攻击
  // -------------------------------------------------------
  tryAttack(targetX: number, targetY: number, time: number): Bullet | null {
    if (time - this.lastAttackTime < this.attackCooldown * 1000) {
      return null;
    }
    this.lastAttackTime = time;

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const bullet = new Bullet(this.scene, this.x, this.y, angle);
    this.bulletGroup.add(bullet.sprite);
    return bullet;
  }

  // -------------------------------------------------------
  // 经验
  // -------------------------------------------------------
  gainExp(amount: number): boolean {
    this.exp += amount;
    if (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.expToNext = Math.floor(this.expToNext * 1.5);
      this.level++;
      return true; // 触发了升级
    }
    return false;
  }

  // -------------------------------------------------------
  // 绘制身体（火柴人 + 可变部件）
  // -------------------------------------------------------
  private drawBody(): void {
    const gfx = this.bodyGfx;
    gfx.clear();

    const r = this.radius * this.sizeMultiplier;
    const x = this.x;
    const y = this.y;

    // -- 身体（蓝色圆） --
    gfx.fillStyle(0x4488ff, 1);
    gfx.fillCircle(x, y, r);

    // 白色高光
    gfx.fillStyle(0xffffff, 0.3);
    gfx.fillCircle(x - r * 0.3, y - r * 0.35, r * 0.3);

    // -- 眼睛 --
    const eyeOffX = r * 0.35;
    const eyeOffY = r * 0.1;
    const eyeR = r * 0.22;
    // 白色眼白
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(x - eyeOffX, y - eyeOffY, eyeR);
    gfx.fillCircle(x + eyeOffX, y - eyeOffY, eyeR);
    // 黑色瞳孔
    gfx.fillStyle(0x111111, 1);
    gfx.fillCircle(x - eyeOffX, y - eyeOffY, eyeR * 0.55);
    gfx.fillCircle(x + eyeOffX, y - eyeOffY, eyeR * 0.55);

    // -- 手臂 --
    gfx.lineStyle(3, 0x333333);
    const armLen = r * 0.9;
    gfx.lineBetween(x - r * 0.7, y, x - r * 0.7 - armLen * 0.6, y + armLen * 0.7);
    gfx.lineBetween(x + r * 0.7, y, x + r * 0.7 + armLen * 0.6, y + armLen * 0.7);

    // -- 腿 --
    gfx.lineStyle(3.5, 0x333333);
    const legLen = r * 1.05;
    gfx.lineBetween(x - r * 0.35, y + r, x - r * 0.35, y + r + legLen);
    gfx.lineBetween(x + r * 0.35, y + r, x + r * 0.35, y + r + legLen);
  }

  destroy(): void {
    this.bodyGfx.destroy();
  }
}
