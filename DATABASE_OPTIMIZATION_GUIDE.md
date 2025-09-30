# Database Optimization & Monitoring Guide

## 🚀 **Overview**

This guide covers the comprehensive database optimization and monitoring system implemented for the Nexxau AI Detection platform. The system now includes:

- **Connection Pool Management**: Optimized database connections with retry logic
- **Real-time Monitoring**: Live database health and performance metrics
- **Analytics Dashboard**: Comprehensive system analytics and reporting
- **Error Handling**: Robust error handling with automatic retries

## 🔧 **Database Optimizations**

### **1. Connection Pool Management**

**File**: `app/lib/database-pool.ts`

- **Connection Pool**: Manages up to 20 concurrent database connections
- **Retry Logic**: Automatic retry with exponential backoff for failed operations
- **Health Monitoring**: Continuous health checks every 30 seconds
- **Graceful Shutdown**: Proper connection cleanup on application termination

**Key Features**:
```typescript
// Automatic retry with exponential backoff
await dbPool.executeWithRetry(
  () => prisma.detection.create({ data: detectionData }),
  3, // max retries
  1000 // initial delay
);
```

### **2. Database Monitoring**

**File**: `app/lib/database-monitor.ts`

- **Real-time Metrics**: Tracks query performance, success rates, and connection health
- **Performance Analytics**: Monitors detection performance and system load
- **Health Checks**: Continuous database connectivity monitoring
- **Statistics Collection**: Database usage statistics and trends

**Metrics Tracked**:
- Total queries executed
- Failed query count
- Average query time
- Connection pool status
- System uptime
- Detection performance

### **3. Optimized API Endpoints**

**Files**: 
- `app/api/yolo/detections/route.ts` - Enhanced with retry logic
- `app/api/analytics/database/route.ts` - Database analytics API
- `app/api/analytics/detections/route.ts` - Detection analytics API
- `app/api/analytics/alerts/route.ts` - Alert analytics API

**Improvements**:
- All database operations use retry logic
- In-memory caching for frequently accessed data
- Asynchronous processing for non-critical operations
- Comprehensive error handling

## 📊 **Analytics Dashboard**

### **1. System Monitor Component**

**File**: `app/components/SystemMonitor.tsx`

**Features**:
- Real-time database health status
- Connection pool metrics
- Query performance statistics
- System uptime tracking
- Automatic refresh every 30 seconds

### **2. Analytics Dashboard**

**File**: `app/dashboard/analytics/page.tsx`

**Sections**:
- **System Overview**: Database health, connection status, performance metrics
- **Detection Analytics**: Detection counts, confidence levels, class distribution
- **Alert Analytics**: Alert trends, severity distribution, recent alerts
- **Performance Metrics**: 24-hour performance trends, peak usage times

## 🚀 **Getting Started**

### **1. Start Optimized System**

```bash
# Use the new optimized startup script
./start_optimized.sh
```

This script will:
- Check all prerequisites
- Install dependencies
- Test database connectivity
- Start all services with proper monitoring
- Display comprehensive status information

### **2. Access Analytics**

- **Main Dashboard**: http://localhost:3000/dashboard
- **Analytics Dashboard**: http://localhost:3000/dashboard/analytics
- **System Monitor**: Integrated into the analytics dashboard

### **3. Monitor System Health**

**API Endpoints**:
- `GET /api/analytics/database?type=overview` - System overview
- `GET /api/analytics/database?type=health` - Health check
- `GET /api/analytics/database?type=stats` - Database statistics
- `GET /api/analytics/database?type=performance` - Performance metrics

## 🔍 **Monitoring & Troubleshooting**

### **1. Database Connection Issues**

**Symptoms**:
- Connection pool timeouts
- "Can't reach database server" errors
- High failed query counts

**Solutions**:
1. Check database URL in `.env.local`
2. Verify connection limits are set correctly
3. Monitor connection pool health via analytics API
4. Check network connectivity to database

### **2. Performance Issues**

**Symptoms**:
- Slow query responses
- High average query times
- System lag

**Solutions**:
1. Monitor query performance via analytics dashboard
2. Check for database connection pool exhaustion
3. Review retry logic effectiveness
4. Consider increasing connection limits

### **3. Real-time Monitoring**

**Log Files**:
- `rtsp-server.log` - RTSP server logs
- `ai-detection.log` - AI detection service logs
- `nextjs.log` - Next.js application logs

**Monitoring Commands**:
```bash
# Monitor AI detection
tail -f ai-detection.log

# Monitor Next.js
tail -f nextjs.log

# Monitor RTSP server
tail -f rtsp-server.log

# Check system status
curl http://localhost:3000/api/analytics/database?type=health
```

## 📈 **Performance Metrics**

### **Expected Performance**:
- **Database Queries**: < 100ms average response time
- **Connection Pool**: 20 concurrent connections
- **Retry Logic**: 3 attempts with exponential backoff
- **Health Checks**: Every 30 seconds
- **Analytics Refresh**: Every 30 seconds (UI), every 60 seconds (metrics)

### **Optimization Results**:
- **Connection Pool**: Increased from 1 to 20 connections
- **Query Timeout**: Increased from 10s to 30s
- **Retry Logic**: Automatic retry for failed operations
- **Caching**: In-memory cache for recent detections
- **Monitoring**: Real-time health and performance tracking

## 🛠️ **Configuration**

### **Environment Variables**

**Database Configuration** (`.env.local`):
```env
DATABASE_URL="postgresql://user:pass@host:port/db?connection_limit=20&pool_timeout=20"
DIRECT_URL="postgresql://user:pass@host:port/db"
```

**Performance Settings**:
```env
DATABASE_CONNECTION_LIMIT=20
DATABASE_POOL_TIMEOUT=20
DATABASE_IDLE_TIMEOUT=30000
DATABASE_QUERY_TIMEOUT=30000
```

### **Prisma Configuration**

**File**: `app/lib/prisma.ts`
- Optimized connection settings
- Proper logging configuration
- Graceful shutdown handling

## 🔮 **Future Enhancements**

### **Planned Improvements**:
1. **Database Indexing**: Add indexes for frequently queried fields
2. **Query Optimization**: Implement query caching and optimization
3. **Load Balancing**: Add database load balancing for high availability
4. **Backup & Recovery**: Implement automated backup and recovery
5. **Advanced Analytics**: Add machine learning for performance prediction

### **Monitoring Enhancements**:
1. **Alerting**: Email/SMS alerts for system issues
2. **Dashboards**: More detailed performance dashboards
3. **Logging**: Structured logging with log aggregation
4. **Metrics**: Prometheus/Grafana integration

## 📚 **API Reference**

### **Database Analytics API**

**Base URL**: `/api/analytics/database`

**Endpoints**:
- `GET ?type=overview` - System overview metrics
- `GET ?type=health` - Health check status
- `GET ?type=stats` - Database statistics
- `GET ?type=performance` - Performance metrics

**Response Format**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalQueries": 1234,
      "failedQueries": 5,
      "averageQueryTime": 45.2,
      "successRate": "99.6%"
    },
    "health": true,
    "connectionCount": 8
  }
}
```

### **Detection Analytics API**

**Base URL**: `/api/analytics/detections`

**Parameters**:
- `timeRange`: 1h, 24h, 7d, 30d (default: 24h)
- `cameraId`: Filter by specific camera

**Response Format**:
```json
{
  "success": true,
  "data": {
    "totalDetections": 5678,
    "detectionsByClass": {
      "person": 1234,
      "car": 567
    },
    "averageConfidence": 0.85
  }
}
```

## 🎯 **Best Practices**

### **1. Database Operations**
- Always use `dbPool.executeWithRetry()` for database operations
- Implement proper error handling
- Use transactions for related operations
- Monitor query performance regularly

### **2. Monitoring**
- Check system health regularly via analytics dashboard
- Monitor log files for errors
- Set up alerts for critical issues
- Review performance metrics weekly

### **3. Maintenance**
- Regular database connection pool health checks
- Monitor connection usage patterns
- Review and optimize slow queries
- Update connection limits based on usage

---

## 🚀 **Quick Start Checklist**

- [ ] Run `./start_optimized.sh` to start all services
- [ ] Verify database connectivity at http://localhost:3000/api/analytics/database?type=health
- [ ] Check analytics dashboard at http://localhost:3000/dashboard/analytics
- [ ] Monitor system logs for any issues
- [ ] Test AI detection functionality
- [ ] Verify real-time monitoring is working

**System is now optimized for production use with comprehensive monitoring and analytics!** 🎉
