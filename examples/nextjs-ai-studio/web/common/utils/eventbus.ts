type Handler = (payload: any) => void;

export enum EventNameEnum {
  sendQuestion = "sendQuestion"
}

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on(name: string, handler: Handler) {
    if (!this.listeners.has(name)) {
      this.listeners.set(name, new Set());
    }
    this.listeners.get(name)!.add(handler);
  }

  off(name: string, handler: Handler) {
    this.listeners.get(name)?.delete(handler);
  }

  emit(name: string, payload?: any) {
    this.listeners.get(name)?.forEach((handler) => handler(payload));
  }
}

export const eventBus = new EventBus();
