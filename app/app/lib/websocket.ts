import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { prisma } from './prisma';

interface WebSocketMessage {
  type: 'alert' | 'detection' | 'status' | 'notification';
  data: any;
  timestamp: string;
}

interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  subscriptions: string[];
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      const clientId = this.generateClientId();
      const connection: ClientConnection = {
        ws,
        subscriptions: []
      };

      this.clients.set(clientId, connection);

      console.log(`WebSocket client connected: ${clientId}`);

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Send initial connection confirmation
      this.sendToClient(clientId, {
        type: 'status',
        data: { status: 'connected', clientId },
        timestamp: new Date().toISOString()
      });
    });
  }

  private handleMessage(clientId: string, message: any) {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message.data);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(clientId, message.data);
        break;
      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
        break;
      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  private handleSubscription(clientId: string, data: any) {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    const { topics, userId } = data;
    
    if (userId) {
      connection.userId = userId;
    }

    if (topics && Array.isArray(topics)) {
      connection.subscriptions.push(...topics);
      connection.subscriptions = [...new Set(connection.subscriptions)]; // Remove duplicates
    }

    this.sendToClient(clientId, {
      type: 'status',
      data: { 
        status: 'subscribed', 
        subscriptions: connection.subscriptions 
      },
      timestamp: new Date().toISOString()
    });
  }

  private handleUnsubscription(clientId: string, data: any) {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    const { topics } = data;
    if (topics && Array.isArray(topics)) {
      connection.subscriptions = connection.subscriptions.filter(
        sub => !topics.includes(sub)
      );
    }

    this.sendToClient(clientId, {
      type: 'status',
      data: { 
        status: 'unsubscribed', 
        subscriptions: connection.subscriptions 
      },
      timestamp: new Date().toISOString()
    });
  }

  private sendToClient(clientId: string, message: WebSocketMessage) {
    const connection = this.clients.get(clientId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      this.clients.delete(clientId);
      return;
    }

    try {
      connection.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      this.clients.delete(clientId);
    }
  }

  public broadcast(message: WebSocketMessage, filter?: (connection: ClientConnection) => boolean) {
    const clientsToNotify = filter 
      ? Array.from(this.clients.entries()).filter(([_, conn]) => filter(conn))
      : Array.from(this.clients.entries());

    clientsToNotify.forEach(([clientId, connection]) => {
      this.sendToClient(clientId, message);
    });
  }

  public broadcastToSubscribers(topic: string, message: WebSocketMessage) {
    const subscribers = Array.from(this.clients.entries()).filter(
      ([_, connection]) => connection.subscriptions.includes(topic)
    );

    subscribers.forEach(([clientId, connection]) => {
      this.sendToClient(clientId, message);
    });
  }

  public sendToUser(userId: string, message: WebSocketMessage) {
    const userConnections = Array.from(this.clients.entries()).filter(
      ([_, connection]) => connection.userId === userId
    );

    userConnections.forEach(([clientId, connection]) => {
      this.sendToClient(clientId, message);
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'status',
        data: { status: 'heartbeat' },
        timestamp: new Date().toISOString()
      });
    }, 30000); // Send heartbeat every 30 seconds
  }

  public stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }

  public getConnections(): Map<string, ClientConnection> {
    return this.clients;
  }
}

// Global WebSocket manager instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(server: any): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}

// Helper functions for sending specific types of messages
export async function broadcastAlert(alertData: any) {
  if (!wsManager) return;

  wsManager.broadcastToSubscribers('alerts', {
    type: 'alert',
    data: alertData,
    timestamp: new Date().toISOString()
  });
}

export async function broadcastDetection(detectionData: any) {
  if (!wsManager) return;

  wsManager.broadcastToSubscribers('detections', {
    type: 'detection',
    data: detectionData,
    timestamp: new Date().toISOString()
  });
}

export async function broadcastNotification(userId: string, notificationData: any) {
  if (!wsManager) return;

  wsManager.sendToUser(userId, {
    type: 'notification',
    data: notificationData,
    timestamp: new Date().toISOString()
  });
}

export async function broadcastSystemStatus(statusData: any) {
  if (!wsManager) return;

  wsManager.broadcast({
    type: 'status',
    data: statusData,
    timestamp: new Date().toISOString()
  });
}

export default WebSocketManager;
