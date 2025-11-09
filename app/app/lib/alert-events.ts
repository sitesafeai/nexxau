'use server';

import { EventEmitter } from 'events';

interface AlertEventPayload {
  id: string;
  title: string;
  description: string;
  severity: string;
  source: string;
  location: string | null;
  worksiteId: string;
  status: string;
  metadata: Record<string, any>;
  createdAt?: string;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export function emitAlertCreated(event: AlertEventPayload) {
  emitter.emit('alert-created', event);
}

export function onAlertCreated(callback: (event: AlertEventPayload) => void) {
  emitter.on('alert-created', callback);
  return () => emitter.off('alert-created', callback);
}

