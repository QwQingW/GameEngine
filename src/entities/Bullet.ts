import Phaser from "phaser";
import { BULLET_SPEED, BULLET_RADIUS } from "../config";

export class Bullet {
  public x: number;
  public y: number;
  public radius: number = BULLET_RADIUS;
  public sprite: Phaser.GameObjects.Arc;

  private angle: number;
  private speed: number = BULLET_SPEED;

  constructor(scene: Phaser.Scene, x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;

    this.sprite = scene.add.circle(x, y, BULLET_RADIUS, 0xffdd44);
  }

  update(delta: number): void {
    const dt = delta / 1000;
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.sprite.setPosition(this.x, this.y);
  }

  /** 是否已经飞出地图 */
  isOutOfBounds(): boolean {
    const margin = 50;
    return (
      this.x < -margin ||
      this.x > 800 + margin ||
      this.y < -margin ||
      this.y > 600 + margin
    );
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
