import * as Phaser from "phaser";

export class GameMap {
  private scene: Phaser.Scene;
  public map: Phaser.Tilemaps.Tilemap;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.map = this.scene.make.tilemap({ key: "office-01" });
  }

  public create() {
    const floorsTileset = this.map.addTilesetImage(
      "Little_Bits_Office_Floors",
      "tiles1"
    );
    const objectsTileset = this.map.addTilesetImage(
      "Little_Bits_office_objects",
      "tiles2"
    );
    const wallsTileset = this.map.addTilesetImage(
      "Little_Bits_office_walls",
      "tiles3"
    );

    const allTilesets = [floorsTileset, objectsTileset, wallsTileset].filter(
      (tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null
    );

    const groundLayer = this.map.createLayer("Ground", allTilesets, 0, 0);
    const objectsLayer = this.map.createLayer("Objects", allTilesets, 0, 0);
    const aboveObjectsLayer = this.map.createLayer("Above Objects", allTilesets, 0, 0);
    const wallsLayer = this.map.createLayer("Walls", allTilesets, 0, 0);

    wallsLayer!.setCollisionByProperty({ collides: true });
    objectsLayer!.setCollisionByProperty({ collides: true });
    aboveObjectsLayer!.setCollisionByProperty({ collides: true });

    return { groundLayer, wallsLayer, objectsLayer, aboveObjectsLayer, map: this.map };
  }
}
