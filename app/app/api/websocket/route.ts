import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketManager } from '@/app/lib/websocket';

export async function GET(request: NextRequest) {
  try {
    const wsManager = getWebSocketManager();
    
    if (!wsManager) {
      return NextResponse.json({ 
        error: 'WebSocket server not initialized' 
      }, { status: 503 });
    }

    const connections = wsManager.getConnections();
    const connectionCount = wsManager.getConnectionCount();

    return NextResponse.json({
      status: 'active',
      connectionCount,
      connections: Array.from(connections.entries()).map(([clientId, connection]) => ({
        clientId,
        userId: connection.userId,
        subscriptions: connection.subscriptions,
        readyState: connection.ws.readyState
      }))
    });

  } catch (error) {
    console.error('WebSocket status error:', error);
    return NextResponse.json({ 
      error: 'Failed to get WebSocket status' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, userId, topic } = body;

    const wsManager = getWebSocketManager();
    
    if (!wsManager) {
      return NextResponse.json({ 
        error: 'WebSocket server not initialized' 
      }, { status: 503 });
    }

    const message = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    switch (type) {
      case 'broadcast':
        wsManager.broadcast(message);
        break;
      case 'broadcastToTopic':
        if (topic) {
          wsManager.broadcastToSubscribers(topic, message);
        } else {
          return NextResponse.json({ 
            error: 'Topic required for broadcastToTopic' 
          }, { status: 400 });
        }
        break;
      case 'sendToUser':
        if (userId) {
          wsManager.sendToUser(userId, message);
        } else {
          return NextResponse.json({ 
            error: 'UserId required for sendToUser' 
          }, { status: 400 });
        }
        break;
      default:
        return NextResponse.json({ 
          error: 'Invalid message type' 
        }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully' 
    });

  } catch (error) {
    console.error('WebSocket message error:', error);
    return NextResponse.json({ 
      error: 'Failed to send message' 
    }, { status: 500 });
  }
}
