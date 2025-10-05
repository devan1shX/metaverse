// GameScene.tsx
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
  private chairOverlapTriggered: boolean = false;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { mapId: string }) {
    this.mapId = data.mapId;
  }

  preload() {
    this.load.spritesheet(
      "player-avatar-1",
      "sprites/avatar-2-spritesheet.png",
      { frameWidth: 48, frameHeight: 48 }
    );
    this.load.spritesheet(
      "player-avatar-2",
      "sprites/avatar-4-spritesheet.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "player-avatar-3",
      "sprites/avatar-5-spritesheet.png",
      { frameWidth: 48, frameHeight: 48 }
    );

    // --- OFFICE-01 ASSETS ---
    this.load.image("tiles1", "maps/map1/Little_Bits_Office_Floors.png");
    this.load.image("tiles2", "maps/map1/Little_Bits_office_objects.png");
    this.load.image("tiles3", "maps/map1/Little_Bits_office_walls.png");
    this.load.tilemapTiledJSON("office-01", "maps/map1/office-01.json");

    // --- OFFICE-02 ASSETS ---
    this.load.image("cabinet", "maps/map2/assets/cabinet.png");
    this.load.image("Chair", "maps/map2/assets/Chair.png");
    this.load.image("coffee-maker", "maps/map2/assets/coffee-maker.png");
    this.load.image("Desktop", "maps/map2/assets/Desktop.png");
    this.load.image("Floor Tiles", "maps/map2/assets/Floor Tiles.png");
    this.load.image("Green", "maps/map2/assets/Green.png");
    this.load.image("interiors_demo", "maps/map2/assets/interiors_demo.png");
    this.load.image("Little_Bits_Office_Floors", "maps/map2/assets/Little_Bits_Office_Floors.png");
    this.load.image("Little_Bits_office_objects", "maps/map2/assets/Little_Bits_office_objects.png");
    this.load.image("Little_Bits_office_walls", "maps/map2/assets/Little_Bits_office_walls.png");
    this.load.image("office-partitions-1", "maps/map2/assets/office-partitions-1.png");
    this.load.image("office-partitions-2", "maps/map2/assets/office-partitions-2.png");
    this.load.image("plant", "maps/map2/assets/plant.png");
    this.load.image("sink", "maps/map2/assets/sink.png");
    this.load.image("stamping-table", "maps/map2/assets/stamping-table.png");
    this.load.image("Trash", "maps/map2/assets/Trash.png");
    this.load.image("water-cooler", "maps/map2/assets/water-cooler.png");
    this.load.image("worker1", "maps/map2/assets/worker1.png");
    this.load.image("Yellow", "maps/map2/assets/Yellow.png");
    this.load.tilemapTiledJSON("office-02", "maps/map2/office-02.json");
  }

  create() {
    const avatarUrl =
      this.game.registry.get("avatarUrl") || "/avatars/avatar-2.png";
    const mapId = this.game.registry.get("mapId") || "office-01"; 

    if (avatarUrl.includes("avatar-4")) {
      this.selectedAvatarKey = "player-avatar-2";
    } else if (avatarUrl.includes("avatar-5")) {
      this.selectedAvatarKey = "player-avatar-3";
    }

    this.map = new GameMap(this, mapId);

    const { wallsLayer, objectsLayer, partitionsLayer, map, chairs } = this.map.create();

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
      this.selectedAvatarKey
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
    if (!this.chairOverlapTriggered) {
      alert("It's a chair");
      this.chairOverlapTriggered = true;
    }
  }

  update() {
    if (this.player) {
      this.player.handleMovement();
      if (this.playerName) {
        this.playerName.setPosition(this.player.x, this.player.y - 30);
      }

      // Reset the flag when player is no longer overlapping
      if (this.player.body && !(this.player.body as Phaser.Physics.Arcade.Body).embedded) {
        this.chairOverlapTriggered = false;
      }
    }
  }
}