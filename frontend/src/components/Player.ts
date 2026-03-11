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

  // Custom Avatar Support
  public isCustom: boolean = false;
  private customBase: number = 0;
  private customHair: number = 0;
  private customOutfit: number = 1;

  private hairSprite?: Phaser.GameObjects.Sprite;
  private outfitSprite?: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string, // This is the clean key (e.g., 'avatar-key-123')
    playerData: PlayerData,
  ) {
    const isCustom = playerData.user_avatar_url?.includes('custom') || false;
    super(scene, x, y, isCustom ? 'metro-base' : texture);

    this.playerId = playerData.id;
    this.playerData = playerData;
    this.cleanTextureKey = texture; // FIX: Store the clean key
    this.isCustom = isCustom;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setOrigin(0.5, 1);

    if (this.isCustom && playerData.user_avatar_url) {
      try {
        const params = new URLSearchParams(playerData.user_avatar_url.split('?')[1]);
        this.customBase = parseInt(params.get('base') || '0');
        this.customHair = parseInt(params.get('hair') || '0');
        this.customOutfit = parseInt(params.get('outfit') || '1');
      } catch(e) {}

      this.hairSprite = scene.add.sprite(x, y, 'metro-hair');
      this.outfitSprite = scene.add.sprite(x, y, `metro-outfit-${this.customOutfit}`);
      this.hairSprite.setOrigin(0.5, 1);
      this.outfitSprite.setOrigin(0.5, 1);

      this.setFrame(this.customBase * 24);
      this.hairSprite.setFrame(this.customHair * 24);
      this.outfitSprite.setFrame(0);
    } else {
      this.setFrame(0);
    }

    if (this.body && this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.setSize(12, 12);
      this.body.setOffset(18, 34);
    }

    // Only create name label if it's NOT the main player ("You")
    if (this.playerData.user_name !== 'You') {
      this.createNameLabel(scene, x, y);
    }

    this.createAnimations();

    // Register post-update hook for perfect sync with Arcade Physics 
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncLayers, this);
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

  private syncLayers = () => {
    if (!this.active) return; // Prevent crashes if destroyed
    
    // Sync container position with player
    if (this.nameContainer) {
      // Keep position locked above head
      this.nameContainer.setPosition(this.x, this.y - this.height - 5);
      this.nameContainer.setDepth(this.depth + 10);
    }

    // Sync layered sprites perfectly
    if (this.isCustom) {
      if (this.hairSprite) {
        this.hairSprite.setPosition(this.x, this.y);
        this.hairSprite.setDepth(this.depth + 0.1);
      }
      if (this.outfitSprite) {
        this.outfitSprite.setPosition(this.x, this.y);
        this.outfitSprite.setDepth(this.depth + 0.2); // outfit above hair if overlaps, or vice versa
      }
    }
  };

  update() {
    // This method is called manually in GameScene.ts
    // For exact synchronization with physics step, we rely on postupdate.
    // Calling it here as a fallback in case postupdate isn't registered correctly.
    this.syncLayers();
  }

  // Override destroy to clean up container
  destroy(fromScene?: boolean) {
    if (this.scene) {
      this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncLayers, this);
    }
    if (this.nameContainer) {
      this.nameContainer.destroy();
    }
    if (this.hairSprite) this.hairSprite.destroy();
    if (this.outfitSprite) this.outfitSprite.destroy();
    super.destroy(fromScene);
  }

  private createAnimations() {
    const animKeyPrefix = `anim-${this.cleanTextureKey}`;

    if (this.isCustom) {
      if (!this.anims.exists(`${animKeyPrefix}-base-idle`)) {
        const d_f = [0, 1, 2, 3, 4, 5];
        const r_f = [6, 7, 8, 9, 10, 11];
        const u_f = [12, 13, 14, 15, 16, 17];
        const l_f = [18, 19, 20, 21, 22, 23];

        // Base
        this.anims.create({ key: `${animKeyPrefix}-base-idle`, frames: [{ key: 'metro-base', frame: d_f[0] + this.customBase * 24 }], frameRate: 1, repeat: 0 });
        this.anims.create({ key: `${animKeyPrefix}-base-down`, frames: d_f.map(f => ({ key: 'metro-base', frame: f + this.customBase * 24 })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-base-right`, frames: r_f.map(f => ({ key: 'metro-base', frame: f + this.customBase * 24 })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-base-up`, frames: u_f.map(f => ({ key: 'metro-base', frame: f + this.customBase * 24 })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-base-left`, frames: l_f.map(f => ({ key: 'metro-base', frame: f + this.customBase * 24 })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-base-sitting`, frames: [{ key: 'metro-base', frame: d_f[0] + this.customBase * 24 }], frameRate: 1, repeat: 0 });

        // Hair
        this.anims.create({ key: `${animKeyPrefix}-hair-idle`, frames: [{ key: 'metro-hair', frame: d_f[0] + this.customHair * 24 }], frameRate: 1, repeat: 0 });
        this.anims.create({ key: `${animKeyPrefix}-hair-down`, frames: d_f.map(f => ({ key: 'metro-hair', frame: f + this.customHair * 24 })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-hair-right`, frames: r_f.map(f => ({ key: 'metro-hair', frame: f + this.customHair * 24 })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-hair-up`, frames: u_f.map(f => ({ key: 'metro-hair', frame: f + this.customHair * 24 })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-hair-left`, frames: l_f.map(f => ({ key: 'metro-hair', frame: f + this.customHair * 24 })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-hair-sitting`, frames: [{ key: 'metro-hair', frame: d_f[0] + this.customHair * 24 }], frameRate: 1, repeat: 0 });

        // Outfit
        this.anims.create({ key: `${animKeyPrefix}-outfit-idle`, frames: [{ key: `metro-outfit-${this.customOutfit}`, frame: d_f[0] }], frameRate: 1, repeat: 0 });
        this.anims.create({ key: `${animKeyPrefix}-outfit-down`, frames: d_f.map(f => ({ key: `metro-outfit-${this.customOutfit}`, frame: f })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-outfit-right`, frames: r_f.map(f => ({ key: `metro-outfit-${this.customOutfit}`, frame: f })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-outfit-up`, frames: u_f.map(f => ({ key: `metro-outfit-${this.customOutfit}`, frame: f })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-outfit-left`, frames: l_f.map(f => ({ key: `metro-outfit-${this.customOutfit}`, frame: f })), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${animKeyPrefix}-outfit-sitting`, frames: [{ key: `metro-outfit-${this.customOutfit}`, frame: d_f[0] }], frameRate: 1, repeat: 0 });
      }
      return; 
    }

    // Only create anims if they don't already exist for this texture
    if (!this.anims.exists(`${animKeyPrefix}-idle`)) {
      let leftFrames: number[], rightFrames: number[], upFrames: number[], downFrames: number[];

      // Check if this is avatar-4 (horizontal strips)
      if (this.cleanTextureKey.includes('avatar-4')) {
        downFrames = [0, 1, 2, 3];
        upFrames = [4, 5, 6, 7];
        leftFrames = [8, 9, 10, 11];
        rightFrames = [12, 13, 14, 15];
      } else {
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

    const suffix = this.isCustom ? "-base-sitting" : "-sitting";
    this.anims.play(`anim-${this.cleanTextureKey}${suffix}`, true);
    
    if (this.isCustom) {
        if (this.hairSprite) this.hairSprite.anims.play(`anim-${this.cleanTextureKey}-hair-sitting`, true);
        if (this.outfitSprite) this.outfitSprite.anims.play(`anim-${this.cleanTextureKey}-outfit-sitting`, true);
    }

    this.setScale(0.85);
    if (this.hairSprite) this.hairSprite.setScale(0.85);
    if (this.outfitSprite) this.outfitSprite.setScale(0.85);
  }

  public standUp() {
    this.isSitting = false;
    this.sittingChair = null;
    this.sitTimer = 0;
    this.setScale(1);
    if (this.hairSprite) this.hairSprite.setScale(1);
    if (this.outfitSprite) this.outfitSprite.setScale(1);

    const suffix = this.isCustom ? "-base-idle" : "-idle";
    this.anims.play(`anim-${this.cleanTextureKey}${suffix}`, true);
    if (this.isCustom) {
        if (this.hairSprite) this.hairSprite.anims.play(`anim-${this.cleanTextureKey}-hair-idle`, true);
        if (this.outfitSprite) this.outfitSprite.anims.play(`anim-${this.cleanTextureKey}-outfit-idle`, true);
    }
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

    const animKeyPrefix = `anim-${this.cleanTextureKey}`;
    const leftAnim = this.isCustom ? `${animKeyPrefix}-base-left` : `${animKeyPrefix}-left`;
    const rightAnim = this.isCustom ? `${animKeyPrefix}-base-right` : `${animKeyPrefix}-right`;
    const upAnim = this.isCustom ? `${animKeyPrefix}-base-up` : `${animKeyPrefix}-up`;
    const downAnim = this.isCustom ? `${animKeyPrefix}-base-down` : `${animKeyPrefix}-down`;

    let isMoving = false;

    if (cursors.left.isDown || wasd.A.isDown) {
      this.setVelocityX(-speed);
      this.anims.play(leftAnim, true);
      if (this.isCustom) {
          if (this.hairSprite) this.hairSprite.anims.play(`${animKeyPrefix}-hair-left`, true);
          if (this.outfitSprite) this.outfitSprite.anims.play(`${animKeyPrefix}-outfit-left`, true);
      }
      this.lastDirection = "left";
      isMoving = true;
    } else if (cursors.right.isDown || wasd.D.isDown) {
      this.setVelocityX(speed);
      this.anims.play(rightAnim, true);
      if (this.isCustom) {
          if (this.hairSprite) this.hairSprite.anims.play(`${animKeyPrefix}-hair-right`, true);
          if (this.outfitSprite) this.outfitSprite.anims.play(`${animKeyPrefix}-outfit-right`, true);
      }
      this.lastDirection = "right";
      isMoving = true;
    }

    if (cursors.up.isDown || wasd.W.isDown) {
      this.setVelocityY(-speed);
      this.anims.play(upAnim, true);
      if (this.isCustom) {
          if (this.hairSprite) this.hairSprite.anims.play(`${animKeyPrefix}-hair-up`, true);
          if (this.outfitSprite) this.outfitSprite.anims.play(`${animKeyPrefix}-outfit-up`, true);
      }
      this.lastDirection = "up";
      isMoving = true;
    } else if (cursors.down.isDown || wasd.S.isDown) {
      this.setVelocityY(speed);
      this.anims.play(downAnim, true);
      if (this.isCustom) {
          if (this.hairSprite) this.hairSprite.anims.play(`${animKeyPrefix}-hair-down`, true);
          if (this.outfitSprite) this.outfitSprite.anims.play(`${animKeyPrefix}-outfit-down`, true);
      }
      this.lastDirection = "down";
      isMoving = true;
    }

    if (!isMoving) {
      this.anims.stop();

      if (this.isCustom) {
        if (this.hairSprite) this.hairSprite.anims.stop();
        if (this.outfitSprite) this.outfitSprite.anims.stop();
        
        const dirFrames = { down: 0, right: 6, up: 12, left: 18 };
        const baseF = dirFrames[this.lastDirection as keyof typeof dirFrames] || 0;
        this.setFrame(baseF + this.customBase * 24);
        if (this.hairSprite) this.hairSprite.setFrame(baseF + this.customHair * 24);
        if (this.outfitSprite) this.outfitSprite.setFrame(baseF);
      } else {
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
      const suffix = this.isCustom ? `-base-${direction}` : `-${direction}`;
      const animKey = `${animKeyPrefix}${suffix}`;
      if (this.anims.exists(animKey)) {
        this.anims.play(animKey, true);
        if (this.isCustom) {
            if (this.hairSprite) this.hairSprite.anims.play(`${animKeyPrefix}-hair-${direction}`, true);
            if (this.outfitSprite) this.outfitSprite.anims.play(`${animKeyPrefix}-outfit-${direction}`, true);
        }
      }
    } else {
      // Stop animation and show idle frame
      this.anims.stop();
      if (this.isCustom) {
          if (this.hairSprite) this.hairSprite.anims.stop();
          if (this.outfitSprite) this.outfitSprite.anims.stop();
          
          const dirFrames = { down: 0, right: 6, up: 12, left: 18 };
          const baseF = dirFrames[direction as keyof typeof dirFrames] || 0;
          this.setFrame(baseF + this.customBase * 24);
          if (this.hairSprite) this.hairSprite.setFrame(baseF + this.customHair * 24);
          if (this.outfitSprite) this.outfitSprite.setFrame(baseF);
          return;
      }

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