export interface IEventBus {
  emit(event: string, payload: unknown): void;
  on(event: string, handler: (payload: unknown) => void): void;
}
