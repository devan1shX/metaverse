import * as Phaser from "phaser";

export interface PlayerData {
  id: string;
  user_name: string;
  user_avatar_url?: string;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  public playerId: string;
  public playerData: PlayerData;
  private nameContainer: Phaser.GameObjects.Container | null = null;

  // FIX: This will store the clean texture key like 'avatar-key-123'
  private cleanTextureKey: string;

  private isSitting: boolean = false;
  private sittingChair: any = null;
  private lastDirection: string = "down";
  private sitTimer: number = 0;
  private sitDelay: number = 300;
  private nearChair: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string, // This is the clean key (e.g., 'avatar-key-123')
    playerData: PlayerData,
  ) {
    super(scene, x, y, texture);

    this.playerId = playerData.id;
    this.playerData = playerData;
    this.cleanTextureKey = texture; // FIX: Store the clean key

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setFrame(0);
    this.setOrigin(0.5, 1);

    if (this.body && this.body instanceof Phaser.Physics.Arcade.Body) {
      // Match map-editor/test settings
      // this.player.body.setSize(12, 12);
      // this.player.body.setOffset(18, 34);
      this.body.setSize(12, 12);
      this.body.setOffset(18, 34);
    }

    // Only create name label if it's NOT the main player ("You")
    if (this.playerData.user_name !== 'You') {
      this.createNameLabel(scene, x, y);
    }

    this.createAnimations();
  }

  private createNameLabel(scene: Phaser.Scene, x: number, y: number) {
    // Position slightly above the sprite's head
    // Using a fixed offset from the feet (y) minus height looks consistent
    this.nameContainer = scene.add.container(x, y - this.height - 10);

    // High-resolution text strategy:
    // 1. Create text large (24px)
    // 2. Scale it down (0.3)
    // This prevents blurriness when the game camera is zoomed in
    const text = scene.add.text(0, 0, this.playerData.user_name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px', // Large source size for crispness
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4, // Thicker stroke to survive scaling down
    });

    text.setOrigin(0.5, 0.5);
    text.setScale(0.3); // Scale down to be minimal (~7px visual height in world space)
    text.setResolution(2); // Double internal resolution for extra sharpness

    this.nameContainer.add(text);
    this.nameContainer.setDepth(1000); // Ensure it's above everything
  }

  update() {
    // Sync container position with player
    if (this.nameContainer) {
      // Keep position locked above head
      this.nameContainer.setPosition(this.x, this.y - this.height - 5);
    }
  }

  // Override destroy to clean up container
  destroy(fromScene?: boolean) {
    if (this.nameContainer) {
      this.nameContainer.destroy();
    }
    super.destroy(fromScene);
  }

  private createAnimations() {
    const animKeyPrefix = `anim-${this.cleanTextureKey}`;

    // Only create anims if they don't already exist for this texture
    if (!this.anims.exists(`${animKeyPrefix}-idle`)) {
      let leftFrames: number[], rightFrames: number[], upFrames: number[], downFrames: number[];

      // Check if this is avatar-4 (horizontal strips)
      if (this.cleanTextureKey.includes('avatar-4')) {
        // Horizontal strips: 
        // Row 1 (0-3): Down
        // Row 2 (4-7): Up
        // Row 3 (8-11): Left
        // Row 4 (12-15): Right
        downFrames = [0, 1, 2, 3];
        upFrames = [4, 5, 6, 7];
        leftFrames = [8, 9, 10, 11];
        rightFrames = [12, 13, 14, 15];
      } else {
        // Vertical strips (Default for avatar-1, 2, 3, 5)
        // Col 1 (0, 4, 8, 12): Down
        // Col 2 (1, 5, 9, 13): Left
        // Col 3 (2, 6, 10, 14): Up
        // Col 4 (3, 7, 11, 15): Right
        downFrames = [0, 4, 8, 12];
        leftFrames = [1, 5, 9, 13];
        upFrames = [2, 6, 10, 14];
        rightFrames = [3, 7, 11, 15];
      }

      this.anims.create({
        key: `${animKeyPrefix}-idle`,
        frames: [{ key: this.cleanTextureKey, frame: downFrames[0] }],
        frameRate: 1,
        repeat: 0,
      });
      this.anims.create({
        key: `${animKeyPrefix}-left`,
        frames: leftFrames.map(f => ({ key: this.cleanTextureKey, frame: f })),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `${animKeyPrefix}-right`,
        frames: rightFrames.map(f => ({ key: this.cleanTextureKey, frame: f })),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `${animKeyPrefix}-up`,
        frames: upFrames.map(f => ({ key: this.cleanTextureKey, frame: f })),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `${animKeyPrefix}-down`,
        frames: downFrames.map(f => ({ key: this.cleanTextureKey, frame: f })),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `${animKeyPrefix}-sitting`,
        frames: [{ key: this.cleanTextureKey, frame: downFrames[0] }],
        frameRate: 1,
        repeat: 0,
      });
    }
  }

  public sitOnChair(chair: any) {
    this.isSitting = true;
    this.sittingChair = chair;
    this.setVelocity(0);
    this.setPosition(chair.x, chair.y + 10);

    // FIX: Use the unique animation key
    const sittingAnim = `anim-${this.cleanTextureKey}-sitting`;
    this.anims.play(sittingAnim, true);

    this.setScale(0.85);
  }

  public standUp() {
    this.isSitting = false;
    this.sittingChair = null;
    this.sitTimer = 0;
    this.setScale(1);

    // FIX: Use the unique animation key
    const idleAnim = `anim-${this.cleanTextureKey}-idle`;
    this.anims.play(idleAnim, true);
  }

  public getIsSitting(): boolean {
    return this.isSitting;
  }

  public setNearChair(isNear: boolean, chair: any = null) {
    this.nearChair = isNear;
    if (!isNear) {
      this.sitTimer = 0;
      this.sittingChair = null;
    } else if (isNear && !this.isSitting) {
      this.sittingChair = chair;
    }
  }

  public updateSitTimer(delta: number) {
    if (this.nearChair && !this.isSitting && this.sittingChair) {
      const isIdle =
        this.body &&
        this.body.velocity.x === 0 &&
        this.body.velocity.y === 0;

      if (isIdle) {
        this.sitTimer += delta;
        if (this.sitTimer >= this.sitDelay) {
          this.sitOnChair(this.sittingChair);
          this.sitTimer = 0;
        }
      } else {
        this.sitTimer = 0;
      }
    }
  }

  public updateMovement(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: any,
  ) {
    if (this.isSitting) {
      const tryingToMove =
        cursors.left.isDown ||
        cursors.right.isDown ||
        cursors.up.isDown ||
        cursors.down.isDown ||
        wasd.A.isDown ||
        wasd.D.isDown ||
        wasd.W.isDown ||
        wasd.S.isDown;

      if (tryingToMove) {
        this.standUp();
      } else {
        return;
      }
    }

    if (!this.body) {
      return;
    }

    const speed = 200;
    this.setVelocity(0);

    //FIX: Use the unique animation keys
    const animKeyPrefix = `anim-${this.cleanTextureKey}`;
    const leftAnim = `${animKeyPrefix}-left`;
    const rightAnim = `${animKeyPrefix}-right`;
    const upAnim = `${animKeyPrefix}-up`;
    const downAnim = `${animKeyPrefix}-down`;

    let isMoving = false;

    if (cursors.left.isDown || wasd.A.isDown) {
      this.setVelocityX(-speed);
      this.anims.play(leftAnim, true);
      this.lastDirection = "left";
      isMoving = true;
    } else if (cursors.right.isDown || wasd.D.isDown) {
      this.setVelocityX(speed);
      this.anims.play(rightAnim, true);
      this.lastDirection = "right";
      isMoving = true;
    }

    if (cursors.up.isDown || wasd.W.isDown) {
      this.setVelocityY(-speed);
      this.anims.play(upAnim, true);
      this.lastDirection = "up";
      isMoving = true;
    } else if (cursors.down.isDown || wasd.S.isDown) {
      this.setVelocityY(speed);
      this.anims.play(downAnim, true);
      this.lastDirection = "down";
      isMoving = true;
    }

    if (!isMoving) {
      this.anims.stop();

      // Detect avatar type from texture key
      let avatarType = 'avatar-1'; // default
      if (this.cleanTextureKey.includes('avatar-2')) {
        avatarType = 'avatar-2';
      } else if (this.cleanTextureKey.includes('avatar-3')) {
        avatarType = 'avatar-3';
      } else if (this.cleanTextureKey.includes('avatar-4')) {
        avatarType = 'avatar-4';
      } else if (this.cleanTextureKey.includes('avatar-5')) {
        avatarType = 'avatar-5';
      }

      // Frame mappings for different avatar types
      const directionFrames: { [key: string]: { [direction: string]: number } } = {
        'avatar-1': { down: 0, left: 1, up: 2, right: 3 },
        'avatar-2': { down: 0, left: 8, up: 4, right: 12 },
        'avatar-3': { down: 0, left: 1, up: 2, right: 3 },
        'avatar-4': { down: 0, left: 8, up: 4, right: 12 }, // Updated for horizontal strips
        'avatar-5': { down: 0, left: 1, up: 2, right: 3 },
      };

      const frames = directionFrames[avatarType] || directionFrames['avatar-1'];
      this.setFrame(frames[this.lastDirection] || frames['down']);
    }

    this.body.velocity.normalize().scale(speed);
  }

  public getLastDirection(): string {
    return this.lastDirection;
  }

  public updateFromNetwork(x: number, y: number, direction: string, isMoving: boolean) {
    // Update position
    this.setPosition(x, y);

    // Update animation based on movement state
    const animKeyPrefix = `anim-${this.cleanTextureKey}`;

    if (isMoving) {
      // Play walking animation in the correct direction
      const animKey = `${animKeyPrefix}-${direction}`;
      if (this.anims.exists(animKey)) {
        this.anims.play(animKey, true);
      }
    } else {
      // Stop animation and show idle frame
      this.anims.stop();

      // Set idle frame based on direction
      let avatarType = 'avatar-1';
      if (this.cleanTextureKey.includes('avatar-2')) avatarType = 'avatar-2';
      else if (this.cleanTextureKey.includes('avatar-3')) avatarType = 'avatar-3';
      else if (this.cleanTextureKey.includes('avatar-4')) avatarType = 'avatar-4';
      else if (this.cleanTextureKey.includes('avatar-5')) avatarType = 'avatar-5';

      const directionFrames: { [key: string]: { [direction: string]: number } } = {
        'avatar-1': { down: 0, left: 1, up: 2, right: 3 },
        'avatar-2': { down: 0, left: 8, up: 4, right: 12 },
        'avatar-3': { down: 0, left: 1, up: 2, right: 3 },
        'avatar-4': { down: 0, left: 8, up: 4, right: 12 }, // Updated for horizontal strips
        'avatar-5': { down: 0, left: 1, up: 2, right: 3 },
      };

      const frames = directionFrames[avatarType] || directionFrames['avatar-1'];
      this.setFrame(frames[direction] || frames['down']);
    }
  }
}