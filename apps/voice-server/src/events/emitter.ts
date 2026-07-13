import { EventEmitter } from "events";
import type { IEventBus } from "./interface.js";

export class LocalEventBus implements IEventBus {
  private emitter = new EventEmitter();

  emit(event: string, payload: unknown): void {
    console.log(`[LocalEventBus] Event emitted: ${event}`, payload);
    this.emitter.emit(event, payload);
  }

  on(event: string, handler: (payload: unknown) => void): void {
    this.emitter.on(event, handler);
  }
}
