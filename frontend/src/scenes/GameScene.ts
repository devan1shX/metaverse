import * as Phaser from 'phaser';
import { Player, PlayerData } from '@/components/Player';
import { gameEventEmitter } from '@/lib/GameEventEmitter';
import {
  PositionUpdate,
  UserJoinedEvent,
  UserLeftEvent,
  SpaceState,
} from '@/hooks/useSpaceWebSocket';

export class GameScene extends Phaser.Scene {
  private mainPlayer: Player | null = null;
  private otherPlayers: Map<string, Player> = new Map();
  private otherPlayersGroup!: Phaser.Physics.Arcade.Group;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: any;
  private mainPlayerId: string | null = null;
  private mainPlayerAvatarKey: string = 'avatar-default';
  private mainPlayerAvatarUrl: string | undefined;
  private mapId: string = 'office-01';
  private chairs: Phaser.Physics.Arcade.StaticGroup | null = null;
  private currentOverlappingChair: any = null;
  private playerVideos: Map<string, Phaser.GameObjects.DOMElement> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { userId: string; avatarUrl?: string; mapId?: string }) {
    this.mainPlayerId = data.userId;
    this.mapId = data.mapId || 'office-01';

    this.mainPlayerAvatarUrl = data.avatarUrl;
    const baseAvatarUrl = data.avatarUrl || '/avatars/avatar-2.png';
    let spritesheetUrl = '/sprites/avatar-2-spritesheet.png';
    let avatarType = 'avatar-2';

    if (baseAvatarUrl.includes('avatar-1')) {
      spritesheetUrl = '/sprites/avatar-1-spritesheet.png';
      avatarType = 'avatar-1';
    } else if (baseAvatarUrl.includes('avatar-2')) {
      spritesheetUrl = '/sprites/avatar-2-spritesheet.png';
      avatarType = 'avatar-2';
    } else if (baseAvatarUrl.includes('avatar-3')) {
      spritesheetUrl = '/sprites/avatar-3-spritesheet.png';
      avatarType = 'avatar-3';
    } else if (baseAvatarUrl.includes('avatar-4')) {
      spritesheetUrl = '/sprites/avatar-4-spritesheet.png';
      avatarType = 'avatar-4';
    } else if (baseAvatarUrl.includes('avatar-5')) {
      spritesheetUrl = '/sprites/avatar-5-spritesheet.png';
      avatarType = 'avatar-5';
    }

    this.mainPlayerAvatarKey = `avatar-key-${data.userId}-${avatarType}`;
    this.mainPlayerAvatarUrl = spritesheetUrl;
  }

  preload() {
    // Check if this is a custom map
    const isCustomMap = this.mapId.startsWith('custom-');

    let mapJsonPath: string;

    if (isCustomMap) {
      // Custom maps are stored in /maps/custom/ directory
      mapJsonPath = `/maps/custom/${this.mapId}.json`;
      console.log(`Loading custom map: ${mapJsonPath}`);

      // Load custom map JSON
      this.load.tilemapTiledJSON('map', mapJsonPath);

      // Load tilesets - keys MUST match what the map editor exports
      this.load.image('Floor Tiles', '/map-editor/tilesets/floor_tiles.png');
      this.load.image('Wall Tiles', '/map-editor/tilesets/wall_tiles.png');
      this.load.image('Object Tiles', '/map-editor/tilesets/object_tiles.png');

    } else {
      // Original map loading logic
      const mapFolder = this.mapId === 'office-01' ? 'map1' : 'map2';
      mapJsonPath = `/maps/${mapFolder}/${this.mapId}.json`;

      console.log(`Loading map: ${mapJsonPath}`);

      this.load.tilemapTiledJSON('map', mapJsonPath);

      if (this.mapId === 'office-01') {
        this.load.image('Little_Bits_Office_Floors', '/maps/map1/assets/Little_Bits_Office_Floors.png');
        this.load.image('Little_Bits_office_objects', '/maps/map1/assets/Little_Bits_office_objects.png');
        this.load.image('Little_Bits_office_walls', '/maps/map1/assets/Little_Bits_office_walls.png');
        this.load.image('floor_tiles', '/maps/map1/assets/floor_tiles.png');
        this.load.image('Green', '/maps/map1/assets/Green.png');
        this.load.image('worker1', '/maps/map1/assets/worker1.png');
        this.load.image('Chair', '/maps/map1/assets/Chair.png');
        this.load.image('desk-with-pc', '/maps/map1/assets/desk-with-pc.png');
        this.load.image('office-partitions-1', '/maps/map1/assets/office-partitions-1.png');
        this.load.image('office-partitions-2', '/maps/map1/assets/office-partitions-2.png');
        this.load.image('plant', '/maps/map1/assets/plant.png');
        this.load.image('Trash', '/maps/map1/assets/Trash.png');
        this.load.image('interiors_demo', '/maps/map1/assets/interiors_demo.png');
        this.load.image('boss', '/maps/map1/assets/boss.png');
        this.load.image('Julia_Drinking_Coffee', '/maps/map1/assets/Julia_Drinking_Coffee.png');
        this.load.image('cabinet', '/maps/map1/assets/cabinet.png');
        this.load.image('furniture pack coloured outline', '/maps/map1/assets/furniture pack coloured outline.png');
        this.load.image('coffee-maker', '/maps/map1/assets/coffee-maker.png');
        this.load.image('sink', '/maps/map1/assets/sink.png');
        this.load.image('water-cooler', '/maps/map1/assets/water-cooler.png');
        this.load.image('stamping-table', '/maps/map1/assets/stamping-table.png');
        this.load.image('Idle (32x32)', '/maps/map1/assets/Idle (32x32).png');
        this.load.image('Run (32x32)', '/maps/map1/assets/Run (32x32).png');
      } else {
        this.load.image('cabinet', '/maps/map2/assets/cabinet.png');
        this.load.image('Chair', '/maps/map2/assets/Chair.png');
        this.load.image('coffee-maker', '/maps/map2/assets/coffee-maker.png');
        this.load.image('Desktop', '/maps/map2/assets/Desktop.png');
        this.load.image('Floor Tiles', '/maps/map2/assets/Floor Tiles.png');
        this.load.image('Green', '/maps/map2/assets/Green.png');
        this.load.image('interiors_demo', '/maps/map2/assets/interiors_demo.png');
        this.load.image('Little_Bits_Office_Floors', '/maps/map2/assets/Little_Bits_Office_Floors.png');
        this.load.image('Little_Bits_office_objects', '/maps/map2/assets/Little_Bits_office_objects.png');
        this.load.image('Little_Bits_office_walls', '/maps/map2/assets/Little_Bits_office_walls.png');
        this.load.image('office-partitions-1', '/maps/map2/assets/office-partitions-1.png');
        this.load.image('office-partitions-2', '/maps/map2/assets/office-partitions-2.png');
        this.load.image('plant', '/maps/map2/assets/plant.png');
        this.load.image('sink', '/maps/map2/assets/sink.png');
        this.load.image('stamping-table', '/maps/map2/assets/stamping-table.png');
        this.load.image('Trash', '/maps/map2/assets/Trash.png');
        this.load.image('water-cooler', '/maps/map2/assets/water-cooler.png');
        this.load.image('worker1', '/maps/map2/assets/worker1.png');
        this.load.image('Yellow', '/maps/map2/assets/Yellow.png');
      }
    }

    // Load avatar spritesheets
    this.load.spritesheet('avatar-default', '/sprites/avatar-2-spritesheet.png', {
      frameWidth: 48,
      frameHeight: 48,
    });

    if (this.mainPlayerAvatarKey !== 'avatar-default' && this.mainPlayerAvatarUrl) {
      if (!this.textures.exists(this.mainPlayerAvatarKey)) {
        let frameWidth = 48;
        let frameHeight = 48;

        if (this.mainPlayerAvatarUrl.includes('avatar-4')) {
          frameWidth = 32;
          frameHeight = 32;
        } else if (this.mainPlayerAvatarUrl.includes('avatar-5')) {
          frameWidth = 48;
          frameHeight = 48;
        }

        this.load.spritesheet(this.mainPlayerAvatarKey, this.mainPlayerAvatarUrl, {
          frameWidth,
          frameHeight,
        });
      }
    }
  }

  create() {
    // Initialize the group for other players
    this.otherPlayersGroup = this.physics.add.group({
      immovable: true,
      allowGravity: false,
    });

    const map = this.make.tilemap({ key: 'map' });

    if (!map) {
      console.error('No map data found for key "map"');
      return;
    }

    console.log('Map loaded successfully');
    console.log('Available tilesets in Tiled:', map.tilesets.map(ts => ts.name));
    console.log('Available layers:', map.layers.map(l => l.name));

    const tilesets: Phaser.Tilemaps.Tileset[] = [];

    map.tilesets.forEach((tilesetData) => {
      const tilesetName = tilesetData.name;
      const tileset = map.addTilesetImage(tilesetName, tilesetName);

      if (tileset) {
        console.log(`Successfully loaded tileset: ${tilesetName}`);
        tilesets.push(tileset);
      } else {
        console.warn(`Failed to load tileset: ${tilesetName}`);
      }
    });

    if (tilesets.length === 0) {
      console.error('No tilesets could be loaded. Check tileset names match between Tiled and preload.');
      return;
    }

    const layers: { [key: string]: Phaser.Tilemaps.TilemapLayer | null } = {};

    map.layers.forEach((layerData) => {
      const layerName = layerData.name;
      const layer = map.createLayer(layerName, tilesets, 0, 0);

      if (layer) {
        console.log(`Created layer: ${layerName}`);
        layers[layerName] = layer;

        // Set collision for layers that should have collision
        // Ground layer = no collision, all other layers = collision
        if (layerName.toLowerCase() !== 'ground') {
          // For custom maps: Set collision on ALL tiles in non-ground layers
          layer.setCollisionByExclusion([-1]); // Exclude empty tiles (ID -1 or 0)
          console.log(`✅ Collision enabled for layer: ${layerName}`);
        } else {
          console.log(`⚪ No collision for ground layer: ${layerName}`);
        }

        // Also check tile properties for collision (legacy support)
        layer.setCollisionByProperty({ collides: true });
      } else {
        console.warn(`Failed to create layer: ${layerName}`);
      }
    });

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    // Allow camera to see the outside environment (1000px padding)
    this.cameras.main.setBounds(-1000, -1000, map.widthInPixels + 2000, map.heightInPixels + 2000);

    let spawnPointObject = null;
    const objectLayerNames = ['Objects', 'objects', 'Spawn', 'spawn', 'SpawnPoints'];

    for (const layerName of objectLayerNames) {
      if (map.getObjectLayer(layerName)) {
        spawnPointObject = map.findObject(layerName, (obj) =>
          obj.name === 'Spawn Point' || obj.name === 'SpawnPoint' || obj.type === 'spawn'
        );
        if (spawnPointObject) break;
      }
    }

    const spawnPoint = spawnPointObject && spawnPointObject.x && spawnPointObject.y
      ? { x: spawnPointObject.x, y: spawnPointObject.y }
      : { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };

    console.log('Spawn point:', spawnPoint);

    // --- ENVIRONMENT GENERATION ---
    // Create a pleasant background outside the map boundaries
    const borderSize = 1000; // Size of the extra environment around the map
    const bgWidth = map.widthInPixels + (borderSize * 2);
    const bgHeight = map.heightInPixels + (borderSize * 2);

    // 1. Grass Background
    // Uses the 'Green' tile texture to create a seamless grass field
    const background = this.add.tileSprite(
      map.widthInPixels / 2,
      map.heightInPixels / 2,
      bgWidth,
      bgHeight,
      'Green'
    );
    background.setDepth(-100); // Ensure it's behind everything

    // 2. Procedural Plant Generation - DISABLED
    // Commented out to remove plants outside map boundaries
    /*
    if (this.textures.exists('plant')) {
      const plantGroup = this.add.group();
      const density = 0.6; // Chance to spawn a plant in each grid cell
      const gridSize = 60; // Spacing between potential plant spots
 
      // Helper to spawn plant
      const spawnPlant = (x: number, y: number) => {
        if (Math.random() < density) {
          const plant = this.add.image(
            x + Phaser.Math.Between(-20, 20),
            y + Phaser.Math.Between(-20, 20),
            'plant'
          );
          // Randomize scale slightly for variety
          const scale = 0.8 + Math.random() * 0.4;
          plant.setScale(scale);
          // Random rotation
          plant.setAngle(Phaser.Math.Between(-10, 10));
          plant.setDepth(-50); // Behind map objects but above grass
          plantGroup.add(plant);
        }
      };
 
      // Top Border
      for (let x = -borderSize; x < map.widthInPixels + borderSize; x += gridSize) {
        for (let y = -borderSize; y < 0; y += gridSize) spawnPlant(x, y);
      }
 
      // Bottom Border
      for (let x = -borderSize; x < map.widthInPixels + borderSize; x += gridSize) {
        for (let y = map.heightInPixels; y < map.heightInPixels + borderSize; y += gridSize) spawnPlant(x, y);
      }
 
      // Left Border
      for (let y = 0; y < map.heightInPixels; y += gridSize) {
        for (let x = -borderSize; x < 0; x += gridSize) spawnPlant(x, y);
      }
 
      // Right Border
      for (let y = 0; y < map.heightInPixels; y += gridSize) {
        for (let x = map.widthInPixels; x < map.widthInPixels + borderSize; x += gridSize) spawnPlant(x, y);
      }
    }
    */
    // ---------------------------

    this.input.on('pointerdown', () => {
      const soundManager = this.sound as Phaser.Sound.WebAudioSoundManager;
      if (soundManager.context && soundManager.context.state === 'suspended') {
        soundManager.context.resume();
      }
    });

    // Create chairs from Interactive Objects layer
    this.chairs = this.physics.add.staticGroup();

    // Try to find the Interactive Objects layer
    const interactiveLayer = map.getObjectLayer('Interactive Objects');

    if (interactiveLayer) {
      const chairObjects = interactiveLayer.objects.filter(
        (obj) => obj.name === 'Chair'
      );

      chairObjects.forEach((chairObj) => {
        if (chairObj.x && chairObj.y && chairObj.width && chairObj.height) {
          const centerX = chairObj.x + chairObj.width / 2;
          const centerY = chairObj.y + chairObj.height / 2;
          const chairSprite = this.chairs!.create(
            centerX,
            centerY,
            undefined
          ) as Phaser.Physics.Arcade.Sprite;
          chairSprite.setSize(chairObj.width, chairObj.height);
          chairSprite.setVisible(false); // Invisible hitbox
          console.log(`Chair created at (${centerX}, ${centerY})`);
        }
      });

      console.log(`Total chairs created: ${chairObjects.length}`);
    } else {
      console.warn('No Interactive Objects layer found in map');
    }

    if (this.mainPlayerId) {
      const mainPlayerData: PlayerData = {
        id: this.mainPlayerId,
        user_name: 'You',
        user_avatar_url: this.mainPlayerAvatarUrl,
      };

      this.mainPlayer = new Player(
        this,
        spawnPoint.x,
        spawnPoint.y,
        this.mainPlayerAvatarKey,
        mainPlayerData
      );

      // Add collision between main player and other players
      this.physics.add.collider(this.mainPlayer, this.otherPlayersGroup);

      this.cameras.main.startFollow(this.mainPlayer, true, 0.08, 0.08);
      this.cameras.main.setZoom(2.5);

      Object.values(layers).forEach((layer) => {
        if (layer && this.mainPlayer) {
          this.physics.add.collider(this.mainPlayer, layer);
        }
      });

      // Add chair overlap detection
      if (this.chairs && this.mainPlayer) {
        this.physics.add.overlap(
          this.mainPlayer,
          this.chairs,
          this.handleChairOverlap,
          undefined,
          this
        );
      }
    }

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,S,A,D');

      const fKey = this.input.keyboard.addKey('F');
      fKey.on('down', () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen();
        } else {
          this.scale.startFullscreen();
        }
      });
    }

    gameEventEmitter.on('space-state', (state: SpaceState) => {
      console.log('Phaser: Received space-state', state);
      console.log('Phaser: Main player ID:', this.mainPlayerId);
      console.log('Phaser: Space map_id:', state.map_id, '| Current map loaded:', this.mapId);
      console.log('Phaser: Users in state:', Object.keys(state.users));
      console.log('Phaser: Current other players:', Array.from(this.otherPlayers.keys()));

      if (state.map_id && state.map_id !== this.mapId) {
        console.warn(`⚠️  MAP MISMATCH! Space uses map '${state.map_id}' but you loaded '${this.mapId}'. You may be on different maps!`);
      }

      for (const userId in state.users) {
        console.log(`Phaser: Processing user ${userId}, isMainPlayer: ${userId === this.mainPlayerId}`);

        if (userId !== this.mainPlayerId) {
          const existingPlayer = this.otherPlayers.get(userId);

          if (existingPlayer) {
            // Check if avatar has changed
            const oldAvatarUrl = existingPlayer.playerData.user_avatar_url;
            const newAvatarUrl = state.users[userId].user_avatar_url;

            if (oldAvatarUrl !== newAvatarUrl) {
              console.log(`Phaser: User ${userId} has different avatar in space state, updating...`);
              this.removeOtherPlayer(userId);
              this.addOtherPlayer(state.users[userId], state.positions[userId] || { x: 0, y: 0 });
            }
          } else {
            console.log(`Phaser: Adding other player ${userId}`);
            this.addOtherPlayer(state.users[userId], state.positions[userId] || { x: 0, y: 0 });
          }
        }
      }
    });

    gameEventEmitter.on('user-joined', (event: UserJoinedEvent) => {
      console.log('Phaser: User joined event', event);
      console.log('Phaser: Is main player?', event.user_id === this.mainPlayerId);
      console.log('Phaser: Already exists?', this.otherPlayers.has(event.user_id));

      if (event.user_id !== this.mainPlayerId) {
        // Check if player already exists (rejoin scenario)
        const existingPlayer = this.otherPlayers.get(event.user_id);

        if (existingPlayer) {
          // Check if avatar has changed by comparing avatar URLs
          const oldAvatarUrl = existingPlayer.playerData.user_avatar_url;
          const newAvatarUrl = event.user_data.user_avatar_url;

          if (oldAvatarUrl !== newAvatarUrl) {
            console.log(`Phaser: User ${event.user_id} rejoined with different avatar, updating...`);
            // Remove old player and add with new avatar
            this.removeOtherPlayer(event.user_id);
            this.addOtherPlayer(event.user_data, { x: event.x, y: event.y });
          } else {
            console.log('Phaser: User rejoined with same avatar, skipping');
          }
        } else {
          console.log('Phaser: Adding new player from user-joined event');
          this.addOtherPlayer(event.user_data, { x: event.x, y: event.y });
        }
      } else if (event.user_id === this.mainPlayerId) {
        console.log('Phaser: Ignoring user-joined for self');
      }
    });

    gameEventEmitter.on('user-left', (event: UserLeftEvent) => {
      console.log('Phaser: User left', event);
      this.removeOtherPlayer(event.user_id);
    });

    gameEventEmitter.on('position-update', (update: PositionUpdate) => {
      if (update.user_id !== this.mainPlayerId) {
        this.updateOtherPlayerPosition(update);
      }
    });

    // Listen for stream updates from React
    this.game.events.on('update-streams', (streams: Map<string, MediaStream>) => {
      this.handleStreamsUpdate(streams);
    });

    console.log('GameScene: Signaling scene is ready for events');
    gameEventEmitter.setSceneReady();
  }

  handleStreamsUpdate(streams: Map<string, MediaStream>) {
    console.log(`🎥 GameScene: Received streams update. Count: ${streams.size}`);

    // 1. Add new videos
    streams.forEach((stream, userId) => {
      console.log(`🎥 Processing stream for user ${userId}. Has video: ${!this.playerVideos.has(userId)}`);
      if (!this.playerVideos.has(userId)) {
        // Only add if we know where the player is
        const player = this.otherPlayers.get(userId);
        if (player) {
          console.log(`✅ Player found for ${userId}, adding video`);
          this.addVideoForUser(userId, stream);
        } else {
          console.log(`⚠️ No player found for ${userId} in otherPlayers map`);
          console.log(`   Available players: ${Array.from(this.otherPlayers.keys()).join(', ')}`);
        }
      }
    });

    // 2. Remove old videos
    this.playerVideos.forEach((_, userId) => {
      if (!streams.has(userId)) {
        console.log(`🗑️ Removing video for user ${userId}`);
        this.removeVideoForUser(userId);
      }
    });
  }

  addVideoForUser(userId: string, stream: MediaStream) {
    console.log(`🎬 Adding video element for user ${userId}`);
    console.log(`   Stream tracks: ${stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', ')}`);

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true; // Mute to allow autoplay
    video.style.width = '80px';
    video.style.height = '60px';
    video.style.borderRadius = '8px';
    video.style.border = '2px solid #10b981';
    video.style.objectFit = 'cover';
    video.style.backgroundColor = '#000';
    video.style.pointerEvents = 'none'; // Don't block clicks

    // Force play
    video.play().catch(err => {
      console.warn(`⚠️ Video autoplay failed for ${userId}:`, err);
    });

    const player = this.otherPlayers.get(userId);
    const startX = player ? player.x : 0;
    const startY = player ? player.y - 60 : 0;

    const domElement = this.add.dom(startX, startY, video);
    domElement.setDepth(100); // Ensure video is above everything
    this.playerVideos.set(userId, domElement);

    console.log(`✅ Video element created for ${userId} at (${startX}, ${startY})`);
  }

  removeVideoForUser(userId: string) {
    const video = this.playerVideos.get(userId);
    if (video) {
      video.destroy();
      this.playerVideos.delete(userId);
    }
  }

  addOtherPlayer(playerData: PlayerData, position: { x: number; y: number }) {
    console.log(`Adding other player: ${playerData.user_name}`);

    const baseAvatarUrl = playerData.user_avatar_url || '/avatars/avatar-2.png';
    let spritesheetUrl = '/sprites/avatar-2-spritesheet.png';
    let avatarType = 'avatar-2';

    if (baseAvatarUrl.includes('avatar-1')) {
      spritesheetUrl = '/sprites/avatar-1-spritesheet.png';
      avatarType = 'avatar-1';
    } else if (baseAvatarUrl.includes('avatar-2')) {
      spritesheetUrl = '/sprites/avatar-2-spritesheet.png';
      avatarType = 'avatar-2';
    } else if (baseAvatarUrl.includes('avatar-3')) {
      spritesheetUrl = '/sprites/avatar-3-spritesheet.png';
      avatarType = 'avatar-3';
    } else if (baseAvatarUrl.includes('avatar-4')) {
      spritesheetUrl = '/sprites/avatar-4-spritesheet.png';
      avatarType = 'avatar-4';
    } else if (baseAvatarUrl.includes('avatar-5')) {
      spritesheetUrl = '/sprites/avatar-5-spritesheet.png';
      avatarType = 'avatar-5';
    }

    // FIX: Include avatar type in the key to force reload if avatar changes
    const playerAvatarKey = `avatar-key-${playerData.id}-${avatarType}`;
    const playerAvatarUrl = spritesheetUrl;

    const onAvatarLoadComplete = () => {
      const otherPlayer = new Player(
        this,
        position.x,
        position.y,
        playerAvatarKey,
        playerData
      );
      this.otherPlayers.set(playerData.id, otherPlayer);
      this.otherPlayersGroup.add(otherPlayer);
      otherPlayer.setImmovable(true);
    };

    if (this.textures.exists(playerAvatarKey)) {
      onAvatarLoadComplete();
    } else {
      let frameWidth = 48;
      let frameHeight = 48;

      if (playerAvatarUrl.includes('avatar-4')) {
        frameWidth = 32;
        frameHeight = 32;
      } else if (playerAvatarUrl.includes('avatar-5')) {
        frameWidth = 48;
        frameHeight = 48;
      }

      this.load.spritesheet(playerAvatarKey, playerAvatarUrl, {
        frameWidth,
        frameHeight,
      });
      this.load.once('complete', onAvatarLoadComplete);
      this.load.start();
    }
  }

  removeOtherPlayer(userId: string) {
    const player = this.otherPlayers.get(userId);
    if (player) {
      console.log(`Removing other player: ${player.playerData.user_name}`);
      this.otherPlayersGroup.remove(player);
      player.destroy();
      this.otherPlayers.delete(userId);
      this.removeVideoForUser(userId); // Cleanup video if player leaves
    }
  }

  updateOtherPlayerPosition(update: PositionUpdate) {
    const player = this.otherPlayers.get(update.user_id);
    if (player) {
      player.updateFromNetwork(
        update.nx,
        update.ny,
        update.direction || 'down',
        update.isMoving || false
      );
    }
  }

  private handleChairOverlap(player: any, chair: any) {
    this.currentOverlappingChair = chair;
    if (this.mainPlayer) {
      this.mainPlayer.setNearChair(true, chair);
    }
  }

  update(time: number, delta: number) {
    if (!this.mainPlayer || !this.cursors || !this.wasd) {
      return;
    }

    this.mainPlayer.updateMovement(this.cursors, this.wasd);

    // Update sit timer
    this.mainPlayer.updateSitTimer(delta);

    this.mainPlayer.update();

    this.otherPlayers.forEach((player) => player.update());

    // Update video positions
    this.playerVideos.forEach((video, userId) => {
      const player = this.otherPlayers.get(userId);
      if (player) {
        video.x = player.x;
        video.y = player.y - 60; // Position above head
      }
    });

    // Check if player is still near the chair
    if (!this.mainPlayer.getIsSitting() && this.currentOverlappingChair) {
      const distance = Phaser.Math.Distance.Between(
        this.mainPlayer.x,
        this.mainPlayer.y,
        this.currentOverlappingChair.x,
        this.currentOverlappingChair.y
      );

      if (distance > 50) {
        this.mainPlayer.setNearChair(false);
        this.currentOverlappingChair = null;
      }
    }

    // Always broadcast position and animation state
    if (this.mainPlayer && this.mainPlayer.body) {
      const { x, y } = this.mainPlayer;
      const direction = this.mainPlayer.getLastDirection();
      const isMoving =
        this.mainPlayer.body.velocity.x !== 0 ||
        this.mainPlayer.body.velocity.y !== 0;
      gameEventEmitter.emit('player-moved', {
        x,
        y,
        direction,
        isMoving
      });
    }
  }
}
