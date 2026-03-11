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
    } else if (this.mapKey === "office-02") {
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
    } else if (this.mapKey === "interview-room") {
      // ── Map 3 — Interview Room tilesets ──────────────────────────────────
      const victorianWall = this.map.addTilesetImage("VictorianWallConsolidationGreytop", "m3_VictorianWallConsolidationGreytop");
      const littleBitsFloors = this.map.addTilesetImage("Little_Bits_Office_Floors", "m3_Little_Bits_Office_Floors");
      const tableFancy = this.map.addTilesetImage("table_fancy_3x3_mediumwood", "m3_table_fancy_3x3_mediumwood");
      const eamesChair = this.map.addTilesetImage("EamesChair", "m3_EamesChair");
      const chairSet = this.map.addTilesetImage("Chair_set", "m3_Chair_set");
      const chairNeonoir = this.map.addTilesetImage("chair_neonoir", "m3_chair_neonoir");
      const laptop = this.map.addTilesetImage("laptop", "m3_laptop");
      const papers = this.map.addTilesetImage("papers", "m3_papers");
      const waterBottle = this.map.addTilesetImage("water_bottle", "m3_water_bottle");
      const soloCup = this.map.addTilesetImage("solo cup", "m3_solo_cup");
      const officeFilecabinets = this.map.addTilesetImage("office_filecabinets", "m3_office_filecabinets");
      const catTailWillow = this.map.addTilesetImage("cat-tail_willow_red", "m3_cat-tail_willow_red");
      const tableCoffee = this.map.addTilesetImage("table_coffee", "m3_table_coffee");
      const booksStack = this.map.addTilesetImage("books stack [1x2]", "m3_books_stack");
      const book = this.map.addTilesetImage("book [1x1]", "m3_book");
      const documentSepia = this.map.addTilesetImage("document sepia [1x1]", "m3_document_sepia");
      const succulentBlue = this.map.addTilesetImage("succulent_blue [1x1]", "m3_succulent_blue");
      const waterCooler = this.map.addTilesetImage("water_cooler", "m3_water_cooler");
      const trashcanLid = this.map.addTilesetImage("trashcan_w_lid", "m3_trashcan_w_lid");
      const wallclock = this.map.addTilesetImage("wallclock_white", "m3_wallclock_white");
      const globe = this.map.addTilesetImage("globe_blue_0", "m3_globe_blue_0");
      const poster = this.map.addTilesetImage("poster_7 [3x2]", "m3_poster_7");
      const dresserWoodLeft = this.map.addTilesetImage("dresser_wood_left [1x2]", "m3_dresser_wood_left");
      const plantSpiky = this.map.addTilesetImage("plant_spiky [1x2]", "m3_plant_spiky");
      const filePdf = this.map.addTilesetImage("file pdf [1x1]", "m3_file_pdf");
      const quill = this.map.addTilesetImage("quill", "m3_quill");
      const shelfIkea = this.map.addTilesetImage("shelf_ikea_v2", "m3_shelf_ikea_v2");
      const cabinetCorner = this.map.addTilesetImage("cabinet_corner_darkwood_left", "m3_cabinet_corner_darkwood_left");
      const whiteboard = this.map.addTilesetImage("whiteboard", "m3_whiteboard");
      const dresser2x2 = this.map.addTilesetImage("dresser_2x2_black_right", "m3_dresser_2x2_black_right");
      const cyberpunk = this.map.addTilesetImage("cyberpunk", "m3_cyberpunk");
      const welcomeMat = this.map.addTilesetImage("welcome mat [4ishx2]", "m3_welcome_mat");
      const rugs = this.map.addTilesetImage("Rugs[5x5]", "m3_Rugs");
      const bannerOx = this.map.addTilesetImage("banner_ox [1x2]", "m3_banner_ox");

      const allTilesets = [
        victorianWall, littleBitsFloors, tableFancy, eamesChair, chairSet,
        chairNeonoir, laptop, papers, waterBottle, soloCup, officeFilecabinets,
        catTailWillow, tableCoffee, booksStack, book, documentSepia,
        succulentBlue, waterCooler, trashcanLid, wallclock, globe, poster,
        dresserWoodLeft, plantSpiky, filePdf, quill, shelfIkea, cabinetCorner,
        whiteboard, dresser2x2, cyberpunk, welcomeMat, rugs, bannerOx,
      ].filter((t): t is Phaser.Tilemaps.Tileset => t !== null);

      const groundLayer = this.map.createLayer("Ground", allTilesets, 0, 0);
      const wallsLayer = this.map.createLayer("Walls", allTilesets, 0, 0);
      const objectsLayer = this.map.createLayer("Objects", allTilesets, 0, 0);
      const aboveObjectsLayer = this.map.createLayer("Above Objects", allTilesets, 0, 0);

      if (wallsLayer) wallsLayer.setCollisionByProperty({ collides: true });
      if (objectsLayer) objectsLayer.setCollisionByProperty({ collides: true });
      if (aboveObjectsLayer) aboveObjectsLayer.setDepth(10);

      // No chairs / interactive objects in the interview room for now
      const chairs = this.scene.physics.add.staticGroup();

      return {
        groundLayer,
        wallsLayer,
        objectsLayer,
        aboveObjectsLayer,
        partitionsLayer: null,
        map: this.map,
        chairs,
      };
    } else {
      // Fallback — return empty map to avoid crash on unknown mapKey
      const chairs = this.scene.physics.add.staticGroup();
      return {
        groundLayer: null,
        wallsLayer: null,
        objectsLayer: null,
        aboveObjectsLayer: null,
        partitionsLayer: null,
        map: this.map,
        chairs,
      };
    }
  }
}
