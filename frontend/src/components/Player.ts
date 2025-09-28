import * as Phaser from "phaser";

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1500;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: any;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
    this.setDrag(300, 300);
    this.setMaxVelocity(250, 250);
    this.setFrame(0); // Default to idle frame

    this.setOrigin(0.5, 1);
    
    if (this.body && this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setSize(this.width * 0.6, this.height * 0.4);
      this.body.setOffset(this.width * 0.2, this.height * 0.6);
    }

    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    this.wasd = this.scene.input.keyboard!.addKeys("W,S,A,D");



    this.createAnimations();
  }

  private createAnimations() {
    const avatars = ["player-avatar-1", "player-avatar-2", "player-avatar-3"];

    avatars.forEach((avatarKey) => {
      if (this.scene.textures.exists(avatarKey)) {
        if (avatarKey === "player-avatar-1") {
          // Avatar-1 animations
          this.anims.create({
            key: `idle-${avatarKey}`,
            frames: [{ key: avatarKey, frame: 0 }],
            frameRate: 1,
            repeat: 0,
          });
          this.anims.create({
            key: `left-${avatarKey}`,
            frames: [
              { key: avatarKey, frame: 1 },
              { key: avatarKey, frame: 5 },
              { key: avatarKey, frame: 9 },
              { key: avatarKey, frame: 13 },
            ],
            frameRate: 8,
            repeat: -1,
          });
          this.anims.create({
            key: `up-${avatarKey}`,
            frames: [
              { key: avatarKey, frame: 2 },
              { key: avatarKey, frame: 6 },
              { key: avatarKey, frame: 10 },
              { key: avatarKey, frame: 14 },
            ],
            frameRate: 8,
            repeat: -1,
          });
          this.anims.create({
            key: `right-${avatarKey}`,
            frames: [
              { key: avatarKey, frame: 3 },
              { key: avatarKey, frame: 7 },
              { key: avatarKey, frame: 11 },
              { key: avatarKey, frame: 15 },
            ],
            frameRate: 8,
            repeat: -1,
          });
          this.anims.create({
            key: `down-${avatarKey}`,
            frames: [
              { key: avatarKey, frame: 0 },
              { key: avatarKey, frame: 4 },
              { key: avatarKey, frame: 8 },
              { key: avatarKey, frame: 12 },
            ],
            frameRate: 8,
            repeat: -1,
          });
        } else if (avatarKey === "player-avatar-2") {
          // Avatar-2 animations
          this.anims.create({
            key: `idle-${avatarKey}`,
            frames: [{ key: avatarKey, frame: 0 }],
            frameRate: 1,
            repeat: 0,
          });
          this.anims.create({
            key: `up-${avatarKey}`,
            frames: this.anims.generateFrameNumbers(avatarKey, {
              start: 4,
              end: 7,
            }),
            frameRate: 8,
            repeat: -1,
          });
          this.anims.create({
            key: `down-${avatarKey}`,
            frames: this.anims.generateFrameNumbers(avatarKey, {
              start: 0,
              end: 3,
            }),
            frameRate: 8,
            repeat: -1,
          });
          this.anims.create({
            key: `left-${avatarKey}`,
            frames: this.anims.generateFrameNumbers(avatarKey, {
              start: 8,
              end: 11,
            }),
            frameRate: 8,
            repeat: -1,
          });
          this.anims.create({
            key: `right-${avatarKey}`,
            frames: this.anims.generateFrameNumbers(avatarKey, {
              start: 12,
              end: 15,
            }),
            frameRate: 8,
            repeat: -1,
          });
        } else if (avatarKey === "player-avatar-3") {
          // Avatar-3 animations
          this.anims.create({
            key: `idle-${avatarKey}`,
            frames: [{ key: avatarKey, frame: 0 }],
            frameRate: 1,
            repeat: 0,
          });
          this.anims.create({
            key: `left-${avatarKey}`,
            frames: [
              { key: avatarKey, frame: 1 },
              { key: avatarKey, frame: 5 },
              { key: avatarKey, frame: 9 },
              { key: avatarKey, frame: 13 },
            ],
            frameRate: 8,
            repeat: -1,
          });
          this.anims.create({
            key: `up-${avatarKey}`,
            frames: [
              { key: avatarKey, frame: 2 },
              { key: avatarKey, frame: 6 },
              { key: avatarKey, frame: 10 },
              { key: avatarKey, frame: 14 },
            ],
            frameRate: 8,
            repeat: -1,
          });
          this.anims.create({
            key: `right-${avatarKey}`,
            frames: [
              { key: avatarKey, frame: 3 },
              { key: avatarKey, frame: 7 },
              { key: avatarKey, frame: 11 },
              { key: avatarKey, frame: 15 },
            ],
            frameRate: 8,
            repeat: -1,
          });
          this.anims.create({
            key: `down-${avatarKey}`,
            frames: [
              { key: avatarKey, frame: 0 },
              { key: avatarKey, frame: 4 },
              { key: avatarKey, frame: 8 },
              { key: avatarKey, frame: 12 },
            ],
            frameRate: 8,
            repeat: -1,
          });
        }
      }
    });
  }

  public handleMovement() {
    if (!this.body) {
      return;
    }

    const speed = 200;
    this.setVelocity(0);

    const leftAnim = `left-${this.texture.key}`;
    const rightAnim = `right-${this.texture.key}`;
    const upAnim = `up-${this.texture.key}`;
    const downAnim = `down-${this.texture.key}`;
    const idleAnim = `idle-${this.texture.key}`;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.setVelocityX(-speed);
      this.anims.play(leftAnim, true);
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.setVelocityX(speed);
      this.anims.play(rightAnim, true);
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.setVelocityY(-speed);
      this.anims.play(upAnim, true);
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.setVelocityY(speed);
      this.anims.play(downAnim, true);
    }

    if (this.body.velocity.x === 0 && this.body.velocity.y === 0) {
      this.anims.play(idleAnim, true);
    }

    this.body.velocity.normalize().scale(speed);
  }

  public destroy() {
    super.destroy();
  }
}
