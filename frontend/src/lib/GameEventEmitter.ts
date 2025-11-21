// Events that should be buffered until GameScene is ready
const BUFFERED_EVENTS = ['space-state', 'user-joined', 'user-left'];

type EventHandler = (...args: any[]) => void;

class GameEventEmitter {
  private events: Map<string, EventHandler[]> = new Map();
  private eventBuffer: Array<{ event: string; data: any }> = [];
  private isSceneReady: boolean = false;

  constructor() { }

  on(event: string, fn: EventHandler) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(fn);
    return this;
  }

  off(event: string, fn: EventHandler) {
    if (!this.events.has(event)) return this;

    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(fn);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    // If scene isn't ready and this is a buffered event, store it
    if (!this.isSceneReady && BUFFERED_EVENTS.includes(event)) {
      console.log(`GameEventEmitter: Buffering event '${event}' (scene not ready yet)`);
      this.eventBuffer.push({ event, data: args[0] });
      return true;
    }

    if (!this.events.has(event)) return false;

    const listeners = this.events.get(event);
    listeners?.forEach(fn => fn(...args));
    return true;
  }

  // GameScene calls this when it's ready to receive events
  setSceneReady() {
    console.log(`GameEventEmitter: Scene is ready. Replaying ${this.eventBuffer.length} buffered events`);
    this.isSceneReady = true;

    // Replay all buffered events
    const bufferedEvents = [...this.eventBuffer];
    this.eventBuffer = [];

    bufferedEvents.forEach(({ event, data }) => {
      console.log(`GameEventEmitter: Replaying buffered event '${event}'`);
      this.emit(event, data);
    });
  }

  // Reset when scene is destroyed/restarted
  resetScene() {
    console.log('GameEventEmitter: Resetting scene state');
    this.isSceneReady = false;
    this.eventBuffer = [];
  }
}

// Create a single, shared instance
export const gameEventEmitter = new GameEventEmitter();