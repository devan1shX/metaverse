import * as Phaser from "phaser";
import { Player } from "./Player";
import { GameMap } from "./MapManager";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private map!: GameMap;
  private playerName!: Phaser.GameObjects.Text;
  private otherPlayers!: Phaser.Physics.Arcade.Group;
  private otherPlayerNames!: Phaser.GameObjects.Group;
  private selectedAvatarKey: string = "player-avatar-1";
  private mapId!: string;
  private currentOverlappingChair: any = null;
  private remotePlayers: Map<string, { sprite: Phaser.Physics.Arcade.Sprite; nameText: Phaser.GameObjects.Text }> = new Map();
  private sendPositionUpdate!: ((x: number, y: number) => void) | null;
  private userId!: string | null;
  private lastPositionSent: { x: number; y: number } | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { mapId: string }) {
    this.mapId = data.mapId;
  }

  preload() {
    // FIX: Added a leading '/' to all asset paths to make them absolute
    this.load.spritesheet(
      "player-avatar-1",
      "/sprites/avatar-2-spritesheet.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "player-avatar-2",
      "/sprites/avatar-4-spritesheet.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "player-avatar-3",
      "/sprites/avatar-5-spritesheet.png",
      { frameWidth: 48, frameHeight: 48 }
    );

    // Map 1 Assets
    this.load.image("tiles1", "/maps/map1/assets/Little_Bits_Office_Floors.png");
    this.load.image("tiles2", "/maps/map1/assets/Little_Bits_office_objects.png");
    this.load.image("tiles3", "/maps/map1/assets/Little_Bits_office_walls.png");
    this.load.image("floor_tiles", "/maps/map1/assets/floor_tiles.png");
    this.load.image("Green", "/maps/map1/assets/Green.png");
    this.load.image("worker1", "/maps/map1/assets/worker1.png");
    this.load.image("Chair", "/maps/map1/assets/Chair.png");
    this.load.image("desk-with-pc", "/maps/map1/assets/desk-with-pc.png");
    this.load.image("office-partitions-1", "/maps/map1/assets/office-partitions-1.png");
    this.load.image("office-partitions-2", "/maps/map1/assets/office-partitions-2.png");
    this.load.image("plant", "/maps/map1/assets/plant.png");
    this.load.image("Trash", "/maps/map1/assets/Trash.png");
    this.load.image("interiors_demo", "/maps/map1/assets/interiors_demo.png");
    this.load.image("boss", "/maps/map1/assets/boss.png");
    this.load.image("Julia_Drinking_Coffee", "/maps/map1/assets/Julia_Drinking_Coffee.png");
    this.load.image("cabinet", "/maps/map1/assets/cabinet.png");
    this.load.image("furniture pack coloured outline", "/maps/map1/assets/furniture pack coloured outline.png");
    this.load.image("coffee-maker", "/maps/map1/assets/coffee-maker.png");
    this.load.image("sink", "/maps/map1/assets/sink.png");
    this.load.image("water-cooler", "/maps/map1/assets/water-cooler.png");
    this.load.image("Run (32x32)", "/maps/map1/assets/Run (32x32).png");
    this.load.image("Idle (32x32)", "/maps/map1/assets/Idle (32x32).png");
    this.load.tilemapTiledJSON("office-01", "/maps/map1/office-01.json");

    // Map 2 Assets
    this.load.image("cabinet", "/maps/map2/assets/cabinet.png");
    this.load.image("Chair", "/maps/map2/assets/Chair.png");
    this.load.image("coffee-maker", "/maps/map2/assets/coffee-maker.png");
    this.load.image("Desktop", "/maps/map2/assets/Desktop.png");
    this.load.image("Floor Tiles", "/maps/map2/assets/Floor Tiles.png");
    this.load.image("Green", "/maps/map2/assets/Green.png");
    this.load.image("interiors_demo", "/maps/map2/assets/interiors_demo.png");
    this.load.image("Little_Bits_Office_Floors", "/maps/map2/assets/Little_Bits_Office_Floors.png");
    this.load.image("Little_Bits_office_objects", "/maps/map2/assets/Little_Bits_office_objects.png");
    this.load.image("Little_Bits_office_walls", "/maps/map2/assets/Little_Bits_office_walls.png");
    this.load.image("office-partitions-1", "/maps/map2/assets/office-partitions-1.png");
    this.load.image("office-partitions-2", "/maps/map2/assets/office-partitions-2.png");
    this.load.image("plant", "/maps/map2/assets/plant.png");
    this.load.image("sink", "/maps/map2/assets/sink.png");
    this.load.image("stamping-table", "/maps/map2/assets/stamping-table.png");
    this.load.image("Trash_map2", "/maps/map2/assets/Trash.png");
    this.load.image("water-cooler", "/maps/map2/assets/water-cooler.png");
    this.load.image("worker1", "/maps/map2/assets/worker1.png");
    this.load.image("Yellow", "/maps/map2/assets/Yellow.png");
    this.load.tilemapTiledJSON("office-02", "/maps/map2/office-02.json");
  }

  create() {
    const avatarUrl =
      this.game.registry.get("avatarUrl") || "/avatars/avatar-2.png";
    const mapId = this.game.registry.get("mapId") || "office-01";
    this.userId = this.game.registry.get("userId") || null;
    this.sendPositionUpdate = this.game.registry.get("sendPositionUpdate") || null;

    if (avatarUrl.includes("avatar-4")) {
      this.selectedAvatarKey = "player-avatar-2";
    } else if (avatarUrl.includes("avatar-5")) {
      this.selectedAvatarKey = "player-avatar-3";
    }

    this.map = new GameMap(this, mapId);

    const { wallsLayer, objectsLayer, partitionsLayer, map, chairs } = this.map.create();

    if (!map) {
        console.error("Map could not be created. Check MapManager and Tiled JSON file.");
        return;
    }

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const spawnPointObject = map.findObject("Objects", (obj) => obj.name === "Spawn Point");
    const spawnPoint = spawnPointObject
      ? { x: spawnPointObject.x, y: spawnPointObject.y }
      : { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };

    this.player = new Player(
      this,
      spawnPoint.x!,
      spawnPoint.y!,
      this.selectedAvatarKey,
      {
        id: this.userId || "main-player",
        user_name: "You", // This prevents name tag from showing for main player
      }
    );

    if (wallsLayer) this.physics.add.collider(this.player, wallsLayer);
    if (objectsLayer) this.physics.add.collider(this.player, objectsLayer);
    if (partitionsLayer) this.physics.add.collider(this.player, partitionsLayer);

    if (chairs) {
      this.physics.add.overlap(
        this.player,
        chairs,
        (player, chair) => this.handleChairOverlap(player, chair),
        undefined,
        this
      );
    }

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(2.5);

    this.otherPlayers = this.physics.add.group();
    this.otherPlayerNames = this.add.group();

    this.playerName = this.add
      .text(0, -30, "You", {
        fontSize: "14px",
        color: "#00f5ff",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0.5)
      .setResolution(10);

    this.events.emit("ready");

    // Setup keyboard controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey("W"),
      A: this.input.keyboard!.addKey("A"),
      S: this.input.keyboard!.addKey("S"),
      D: this.input.keyboard!.addKey("D"),
    };

    const fKey = this.input.keyboard!.addKey("F");
    fKey.on("down", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }

  private handleChairOverlap(player: any, chair: any) {
    this.currentOverlappingChair = chair;
    this.player.setNearChair(true, chair);
  }

  update(time: number, delta: number) {
    if (this.player && this.cursors && this.wasd) {
      this.player.updateMovement(this.cursors, this.wasd);

      // Update sit timer
      this.player.updateSitTimer(delta);

      if (this.playerName) {
        this.playerName.setPosition(this.player.x, this.player.y - 30);
      }

      // Send position update via WebSocket
      if (this.sendPositionUpdate) {
        const currentX = Math.round(this.player.x);
        const currentY = Math.round(this.player.y);
        
        // Only send if position changed
        if (!this.lastPositionSent || 
            this.lastPositionSent.x !== currentX || 
            this.lastPositionSent.y !== currentY) {
          this.sendPositionUpdate(currentX, currentY);
          this.lastPositionSent = { x: currentX, y: currentY };
        }
      }

      // Check if player is still near the chair
      if (!this.player.getIsSitting() && this.currentOverlappingChair) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          this.currentOverlappingChair.x,
          this.currentOverlappingChair.y
        );

        if (distance > 50) {
          this.player.setNearChair(false);
          this.currentOverlappingChair = null;
        }
      }
    }

    // Update remote players with interpolation
    this.remotePlayers.forEach((remotePlayer, userId) => {
      // Smooth interpolation could be added here if needed
    });
  }

  // Handle remote position updates
  handleRemotePositionUpdate(update: { user_id: string; nx: number; ny: number }) {
    // Don't update our own position
    if (update.user_id === this.userId) {
      return;
    }

    let remotePlayer = this.remotePlayers.get(update.user_id);

    if (!remotePlayer) {
      // Create new remote player sprite
      const sprite = this.physics.add.sprite(update.nx, update.ny, this.selectedAvatarKey);
      sprite.setCollideWorldBounds(true);
      sprite.setFrame(0);
      sprite.setOrigin(0.5, 1);

      // Create name text
      const nameText = this.add
        .text(0, -30, `User ${update.user_id.substring(0, 8)}`, {
          fontSize: "14px",
          color: "#ffaa00",
          fontFamily: "Arial",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0.5)
        .setResolution(10);

      remotePlayer = { sprite, nameText };
      this.remotePlayers.set(update.user_id, remotePlayer);
    }

    // Update position with smooth interpolation
    this.tweens.add({
      targets: remotePlayer.sprite,
      x: update.nx,
      y: update.ny,
      duration: 100,
      ease: "Power2",
    });

    // Update name text position
    remotePlayer.nameText.setPosition(update.nx, update.ny - 30);
  }

  // Handle user joined event
  handleUserJoined(event: { user_id: string; x: number; y: number }) {
    // Don't create sprite for ourselves
    if (event.user_id === this.userId) {
      return;
    }

    // If player doesn't exist, create it
    if (!this.remotePlayers.has(event.user_id)) {
      this.handleRemotePositionUpdate({
        user_id: event.user_id,
        nx: event.x,
        ny: event.y,
      });
    }
  }

  // Handle user left event
  handleUserLeft(event: { user_id: string }) {
    const remotePlayer = this.remotePlayers.get(event.user_id);
    if (remotePlayer) {
      remotePlayer.sprite.destroy();
      remotePlayer.nameText.destroy();
      this.remotePlayers.delete(event.user_id);
    }
  }
}
