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
    const mapFolder = this.mapId === 'office-01' ? 'map1' : 'map2';
    const mapJsonPath = `/maps/${mapFolder}/${this.mapId}.json`;

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
      this.load.image('stamping-table', '/maps/map1/assets/stamp ing-table.png');
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

        if (layerName.toLowerCase().includes('wall') ||
          layerName.toLowerCase().includes('collision') ||
          layerName.toLowerCase().includes('object')) {
          layer.setCollisionByProperty({ collides: true });
        }
      } else {
        console.warn(`Failed to create layer: ${layerName}`);
      }
    });

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

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

    this.input.on('pointerdown', () => {
      const soundManager = this.sound as Phaser.Sound.WebAudioSoundManager;
      if (soundManager.context && soundManager.context.state === 'suspended') {
        soundManager.context.resume();
      }
    });

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
        if (userId !== this.mainPlayerId && !this.otherPlayers.has(userId)) {
          console.log(`Phaser: Adding other player ${userId}`);
          this.addOtherPlayer(state.users[userId], state.positions[userId] || { x: 0, y: 0 });
        }
      }
    });

    gameEventEmitter.on('user-joined', (event: UserJoinedEvent) => {
      console.log('Phaser: User joined event', event);
      console.log('Phaser: Is main player?', event.user_id === this.mainPlayerId);
      console.log('Phaser: Already exists?', this.otherPlayers.has(event.user_id));

      if (event.user_id !== this.mainPlayerId && !this.otherPlayers.has(event.user_id)) {
        console.log('Phaser: Adding new player from user-joined event');
        this.addOtherPlayer(event.user_data, { x: event.x, y: event.y });
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

    console.log('GameScene: Signaling scene is ready for events');
    gameEventEmitter.setSceneReady();
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

  update() {
    if (!this.mainPlayer || !this.cursors || !this.wasd) {
      return;
    }

    this.mainPlayer.updateMovement(this.cursors, this.wasd);
    this.mainPlayer.update();

    this.otherPlayers.forEach((player) => player.update());

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
