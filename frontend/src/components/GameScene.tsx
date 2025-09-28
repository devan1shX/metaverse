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

  constructor() {
    super({ key: "GameScene" });
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

    this.load.image("tiles1", "maps/Little_Bits_Office_Floors.png");
    this.load.image("tiles2", "maps/Little_Bits_office_objects.png");
    this.load.image("tiles3", "maps/Little_Bits_office_walls.png");
    this.load.tilemapTiledJSON("office-01", "maps/office-01.json");
  }

  create() {
    const avatarUrl =
      this.game.registry.get("avatarUrl") || "/avatars/avatar-2.png";
    if (avatarUrl.includes("avatar-4")) {
      this.selectedAvatarKey = "player-avatar-2";
    } else if (avatarUrl.includes("avatar-5")) {
      this.selectedAvatarKey = "player-avatar-3";
    }

    this.map = new GameMap(this);
    const { wallsLayer, objectsLayer, map } = this.map.create();

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const spawnPointObject = map.findObject(
      "Objects",
      (obj) => obj.name === "Spawn Point"
    );
    const spawnPoint = spawnPointObject
      ? { x: spawnPointObject.x, y: spawnPointObject.y }
      : { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };

    this.player = new Player(
      this,
      spawnPoint.x!,
      spawnPoint.y!,
      this.selectedAvatarKey
    );

    this.physics.add.collider(this.player, wallsLayer!);
    this.physics.add.collider(this.player, objectsLayer!);

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

  update() {
    this.player.handleMovement();
    if (this.playerName && this.player) {
      this.playerName.setPosition(this.player.x, this.player.y - 30);
    }
  }
}
