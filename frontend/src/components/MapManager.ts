import * as Phaser from "phaser";

export class GameMap {
  private scene: Phaser.Scene;
  public map: Phaser.Tilemaps.Tilemap;
  private mapKey: string;

  constructor(scene: Phaser.Scene, mapKey: string) {
    this.scene = scene;
    this.mapKey = mapKey;
    this.map = this.scene.make.tilemap({ key: this.mapKey });
  }

  public create() {
    if (this.mapKey === "office-01") {
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
      const floorTiles = this.map.addTilesetImage(
        "floor_tiles",
        "floor_tiles"
      );
      const Green = this.map.addTilesetImage("Green", "Green");
      const worker1 = this.map.addTilesetImage("worker1", "worker1");
      const Chair = this.map.addTilesetImage("Chair", "Chair");
      const Desktop = this.map.addTilesetImage("desk-with-pc", "desk-with-pc");
      const officepartitions1 = this.map.addTilesetImage(
        "office-partitions-1",
        "office-partitions-1"
      );
      const plant = this.map.addTilesetImage("plant", "plant");
      const officepartitions2 = this.map.addTilesetImage(
        "office-partitions-2",
        "office-partitions-2"
      );
      const interiorsDemo = this.map.addTilesetImage(
        "interiors_demo",
        "interiors_demo"
      );
      const Trash = this.map.addTilesetImage("Trash", "Trash");
      const boss = this.map.addTilesetImage("boss", "boss");
      const cabinet = this.map.addTilesetImage("cabinet", "cabinet");
      const JuliaCoffeeDrinking = this.map.addTilesetImage("Julia_Drinking_Coffee", "Julia_Drinking_Coffee");
      const coffee_maker = this.map.addTilesetImage("coffee-maker", "coffee-maker");
      const sink = this.map.addTilesetImage("sink", "sink");
      const furniturePack = this.map.addTilesetImage("furniture pack coloured outline", "furniture pack coloured outline");
      const watercooler = this.map.addTilesetImage(
        "water-cooler",
        "water-cooler"
      );
      const idlePink = this.map.addTilesetImage(
        "Idle (32x32)",
        "Idle (32x32)"
      );
      const runFrog = this.map.addTilesetImage(
        "Run (32x32)",
        "Run (32x32)"
      );

      const allTilesets = [
        floorsTileset,
        objectsTileset,
        wallsTileset,
        floorTiles,
        Green,
        worker1,
        Desktop,
        Chair,
        officepartitions1,
        plant,
        officepartitions2,
        Trash,
        JuliaCoffeeDrinking,
        interiorsDemo,
        boss,
        furniturePack,
        cabinet,
        coffee_maker,
        sink,
        watercooler,
        idlePink,
        runFrog,
      ].filter(
        (tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null
      );

      const groundLayer = this.map.createLayer("Ground", allTilesets, 0, 0);
      const partitionsLayer = this.map.createLayer(
        "Partitions",
        allTilesets,
        0,
        0
      );
      const objectsLayer = this.map.createLayer("Objects", allTilesets, 0, 0);
      const aboveObjectsLayer = this.map.createLayer(
        "Above Objects",
        allTilesets,
        0,
        0
      );
      const wallsLayer = this.map.createLayer("Walls", allTilesets, 0, 0);

      const chairs = this.scene.physics.add.staticGroup();
      const interactiveLayer = this.map.getObjectLayer("Interactive Objects");
      const chairObjects = interactiveLayer?.objects.filter(
        (obj) => obj.name === "Chair"
      );

      chairObjects?.forEach((chairObj) => {
        if (chairObj.x && chairObj.y && chairObj.width && chairObj.height) {
          const centerX = chairObj.x + chairObj.width / 2;
          const centerY = chairObj.y + chairObj.height / 2;
          const chairSprite = chairs.create(
            centerX,
            centerY,
            undefined
          ) as Phaser.Physics.Arcade.Sprite;
          chairSprite.setSize(chairObj.width, chairObj.height);
          chairSprite.setVisible(false);
        }
      });

      if (wallsLayer) {
        wallsLayer.setCollisionByProperty({ collides: true });
      }
      if (objectsLayer) {
        objectsLayer.setCollisionByProperty({ collides: true });
      }
      if (aboveObjectsLayer) {
        aboveObjectsLayer.setCollisionByProperty({ collides: true });
      }
      if (partitionsLayer) {
        partitionsLayer.setCollisionByProperty({ collides: true });
      }

      return {
        groundLayer,
        wallsLayer,
        objectsLayer,
        aboveObjectsLayer,
        map: this.map,
        partitionsLayer,
        chairs,
      };
    } else {
      const cabinet = this.map.addTilesetImage("cabinet", "cabinet");
      const Chair = this.map.addTilesetImage("Chair", "Chair");
      const coffeeMaker = this.map.addTilesetImage(
        "coffee-maker",
        "coffee-maker"
      );
      const Desktop = this.map.addTilesetImage("Desktop", "Desktop");
      const FloorTiles = this.map.addTilesetImage("Floor Tiles", "Floor Tiles");
      const Green = this.map.addTilesetImage("Green", "Green");
      const interiorsDemo = this.map.addTilesetImage(
        "interiors_demo",
        "interiors_demo"
      );
      const LittleBitsOfficeFloors = this.map.addTilesetImage(
        "Little_Bits_Office_Floors",
        "Little_Bits_Office_Floors"
      );
      const LittleBitsofficeobjects = this.map.addTilesetImage(
        "Little_Bits_office_objects",
        "Little_Bits_office_objects"
      );
      const LittleBitsofficewalls = this.map.addTilesetImage(
        "Little_Bits_office_walls",
        "Little_Bits_office_walls"
      );
      const officepartitions1 = this.map.addTilesetImage(
        "office-partitions-1",
        "office-partitions-1"
      );
      const officepartitions2 = this.map.addTilesetImage(
        "office-partitions-2",
        "office-partitions-2"
      );
      const plant = this.map.addTilesetImage("plant", "plant");
      const sink = this.map.addTilesetImage("sink", "sink");
      const stampingtable = this.map.addTilesetImage(
        "stamping-table",
        "stamping-table"
      );
      const Trash = this.map.addTilesetImage("Trash", "Trash");
      const watercooler = this.map.addTilesetImage(
        "water-cooler",
        "water-cooler"
      );
      const worker1 = this.map.addTilesetImage("worker1", "worker1");
      const Yellow = this.map.addTilesetImage("Yellow", "Yellow");

      const allTilesets = [
        cabinet,
        Chair,
        coffeeMaker,
        Desktop,
        FloorTiles,
        Green,
        interiorsDemo,
        LittleBitsOfficeFloors,
        LittleBitsofficeobjects,
        LittleBitsofficewalls,
        officepartitions1,
        officepartitions2,
        plant,
        sink,
        stampingtable,
        Trash,
        watercooler,
        worker1,
        Yellow,
      ].filter(
        (tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null
      );

      const groundLayer = this.map.createLayer("Ground", allTilesets, 0, 0);
      const partitionsLayer = this.map.createLayer(
        "Partitions",
        allTilesets,
        0,
        0
      );
      const objectsLayer = this.map.createLayer("Objects", allTilesets, 0, 0);
      const aboveObjectsLayer = this.map.createLayer(
        "Above Objects",
        allTilesets,
        0,
        0
      );
      const wallsLayer = this.map.createLayer("Walls", allTilesets, 0, 0);

      const chairs = this.scene.physics.add.staticGroup();
      const interactiveLayer = this.map.getObjectLayer("Interactive Objects");
      const chairObjects = interactiveLayer?.objects.filter(
        (obj) => obj.name === "Chair"
      );

      chairObjects?.forEach((chairObj) => {
        if (chairObj.x && chairObj.y && chairObj.width && chairObj.height) {
          const centerX = chairObj.x + chairObj.width / 2;
          const centerY = chairObj.y + chairObj.height / 2;
          const chairSprite = chairs.create(
            centerX,
            centerY,
            undefined
          ) as Phaser.Physics.Arcade.Sprite;
          chairSprite.setSize(chairObj.width, chairObj.height);
          chairSprite.setVisible(false);
        }
      });

      if (wallsLayer) {
        wallsLayer.setCollisionByProperty({ collides: true });
      }
      if (objectsLayer) {
        objectsLayer.setCollisionByProperty({ collides: true });
      }
      if (partitionsLayer) {
        partitionsLayer.setCollisionByProperty({ collides: true });
      }
      if (aboveObjectsLayer) {
        aboveObjectsLayer.setDepth(10);
      }

      return {
        groundLayer,
        wallsLayer,
        objectsLayer,
        aboveObjectsLayer,
        partitionsLayer,
        map: this.map,
        chairs,
      };
    }
  }
}
