# 🎯 Custom Rules Engine - Complete Implementation

## 🚀 **Overview**

The Custom Rules Engine is a powerful AI-powered system that allows you to create, configure, and manage custom detection rules for your computer vision system. It can detect specific objects, behaviors, area violations, and time-based events, then automatically trigger alerts and notifications.

## 🏗️ **Architecture**

### **Core Components:**

1. **Custom Rule Engine** (`custom-rule-engine.ts`)
   - Rule evaluation and processing
   - Trigger detection and management
   - Violation tracking and notifications

2. **AI Detection Integration** (`ai-detection-integration.ts`)
   - Processes detection data from AI services
   - Transforms data formats
   - Manages processing queues

3. **Database Models** (Prisma Schema)
   - `CustomRule` - Rule definitions and configuration
   - `CustomRuleTrigger` - Individual rule triggers
   - `CustomRuleViolation` - Violation records

4. **API Endpoints**
   - `/api/custom-rules` - CRUD operations for rules
   - `/api/custom-rules/[id]` - Individual rule management
   - `/api/custom-rules/[id]/test` - Rule testing
   - `/api/ai-detection` - AI service integration

5. **Dashboard Interface** (`/dashboard/custom-rules`)
   - Visual rule management
   - Real-time monitoring
   - Testing and configuration

## 🎯 **Rule Types**

### **1. Object Detection Rules**
Detect specific objects or combinations of objects.

**Examples:**
- Hard hat violations (person without hardhat)
- Safety equipment detection
- Vehicle presence in restricted areas
- Object counting (e.g., too many people in area)

**Configuration:**
```json
{
  "ruleType": "object_detection",
  "detectionCriteria": {
    "requiredObjects": ["person", "hardhat"],
    "restrictedAreas": [
      { "name": "Construction Zone", "bbox": [100, 100, 400, 300] }
    ]
  },
  "triggerConditions": {
    "type": "object_missing",
    "requiredObject": "hardhat"
  }
}
```

### **2. Behavior Analysis Rules**
Detect specific behaviors or patterns.

**Examples:**
- Running in work areas
- Climbing on equipment
- Fighting or aggressive behavior
- Unusual movement patterns

**Configuration:**
```json
{
  "ruleType": "behavior_analysis",
  "detectionCriteria": {
    "behaviorPatterns": ["running", "climbing", "fighting"]
  },
  "triggerConditions": {
    "type": "behavior_detected",
    "behaviors": ["running"]
  }
}
```

### **3. Area Monitoring Rules**
Monitor specific areas for unauthorized access.

**Examples:**
- Restricted area access
- Equipment storage monitoring
- Safety zone violations
- Perimeter breaches

**Configuration:**
```json
{
  "ruleType": "area_monitoring",
  "detectionCriteria": {
    "restrictedAreas": [
      { "name": "Equipment Storage", "bbox": [200, 200, 300, 400] },
      { "name": "Electrical Room", "bbox": [500, 100, 600, 200] }
    ]
  },
  "triggerConditions": {
    "type": "object_in_area",
    "restrictedArea": { "name": "Equipment Storage", "bbox": [200, 200, 300, 400] }
  }
}
```

### **4. Time-Based Rules**
Trigger based on specific times or schedules.

**Examples:**
- After-hours access detection
- Break time violations
- Shift change monitoring
- Scheduled maintenance alerts

**Configuration:**
```json
{
  "ruleType": "time_based",
  "timeConstraints": {
    "allowedHours": [6, 18],
    "allowedDays": [1, 2, 3, 4, 5]
  },
  "triggerConditions": {
    "type": "time_violation",
    "timeConditions": [
      { "type": "after_hours", "startHour": 18, "endHour": 6 }
    ]
  }
}
```

## ⚙️ **Rule Configuration**

### **Basic Settings:**
- **Name**: Descriptive name for the rule
- **Description**: Detailed explanation
- **Rule Type**: object_detection, behavior_analysis, area_monitoring, time_based
- **Category**: safety, security, compliance, operational
- **Severity**: low, medium, high, critical
- **Priority**: 1 (highest) to 10 (lowest)

### **AI Model Settings:**
- **AI Model Type**: yolo, custom, behavior_analysis
- **Confidence Threshold**: 0.0 to 1.0
- **Custom Model Path**: Path to custom AI model

### **Notification Settings:**
- **SMS Enabled**: Send SMS alerts
- **Email Enabled**: Send email alerts
- **Dashboard Enabled**: Show in dashboard
- **SMS Recipients**: Array of phone numbers
- **Email Recipients**: Array of email addresses

### **Rate Limiting:**
- **Cooldown Minutes**: Prevent spam notifications
- **Max Alerts Per Hour**: Rate limiting

### **Constraints:**
- **Time Constraints**: Allowed hours and days
- **Location Constraints**: GPS coordinates or area names

## 🔧 **Integration with AI Detection Service**

### **Data Flow:**
1. **AI Service** detects objects in video stream
2. **Detection Data** sent to `/api/ai-detection`
3. **AI Detection Integration** processes and transforms data
4. **Custom Rule Engine** evaluates against active rules
5. **Triggers** created for matching rules
6. **Violations** recorded in database
7. **Notifications** sent via SMS/email/dashboard

### **Detection Data Format:**
```json
{
  "camera_id": "camera-1",
  "timestamp": "2025-01-07T23:30:00Z",
  "detections": [
    {
      "class": "person",
      "confidence": 0.95,
      "bbox": [100, 100, 200, 300],
      "id": "person-1"
    }
  ],
  "metadata": {
    "location": "Construction Site A",
    "stream_quality": 95,
    "frame_rate": 30
  }
}
```

## 📱 **SMS Integration**

The Custom Rules Engine integrates with the multi-provider SMS system:

- **Primary**: Twilio (with MessagingServiceSid)
- **Backup**: AWS SNS
- **Automatic failover** if one provider fails
- **Rate limiting** and cooldown management
- **Delivery tracking** and status monitoring

## 🎛️ **Dashboard Features**

### **Rule Management:**
- Create, edit, delete rules
- Enable/disable rules
- Test rules with sample data
- View rule statistics

### **Monitoring:**
- Real-time rule triggers
- Violation tracking
- Processing statistics
- Alert history

### **Configuration:**
- Rule templates
- Bulk operations
- Import/export rules
- Rule validation

## 🧪 **Testing**

### **Test Script:**
```bash
cd /Users/luizcarneiro/nexxau/app
node test-custom-rules.js
```

### **Test Features:**
- Rule creation and configuration
- Detection data processing
- Rule triggering and violations
- SMS notification testing
- Processing statistics

## 🚀 **Production Deployment**

### **Environment Variables:**
```bash
# Database
DATABASE_URL="postgresql://..."

# SMS Configuration
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_MESSAGING_SERVICE_SID="MG..."

# AI Detection
AI_DETECTION_ENABLED=true
AI_DETECTION_ENDPOINT="http://localhost:8000"

# Rule Engine
CUSTOM_RULES_ENABLED=true
RULE_PROCESSING_INTERVAL=100
```

### **Database Migration:**
```bash
npx prisma migrate dev --name add-custom-rules
npx prisma generate
```

### **Monitoring:**
- Rule processing statistics
- Error logging and tracking
- Performance metrics
- Alert delivery rates

## 📊 **Performance Considerations**

### **Optimization:**
- Rule evaluation caching
- Processing queue management
- Database indexing
- Rate limiting

### **Scaling:**
- Horizontal scaling support
- Load balancing
- Database sharding
- Microservice architecture

## 🔒 **Security Features**

### **Access Control:**
- Role-based permissions
- Rule ownership
- Audit logging
- API authentication

### **Data Protection:**
- Encrypted storage
- Secure transmission
- Privacy compliance
- Data retention policies

## 🎯 **Use Cases**

### **Construction Sites:**
- Hard hat violations
- Safety equipment detection
- Restricted area access
- After-hours monitoring

### **Manufacturing:**
- PPE compliance
- Machine safety zones
- Quality control
- Process monitoring

### **Retail:**
- Theft prevention
- Customer behavior analysis
- Inventory monitoring
- Security breaches

### **Healthcare:**
- Patient safety
- Equipment monitoring
- Access control
- Compliance tracking

## 🚀 **Next Steps**

1. **Deploy to Production**
   - Set up database
   - Configure SMS providers
   - Deploy AI detection service
   - Test with real cameras

2. **Create Rule Templates**
   - Industry-specific templates
   - Common use cases
   - Best practices
   - Documentation

3. **Advanced Features**
   - Machine learning integration
   - Predictive analytics
   - Custom AI models
   - Advanced behavior analysis

4. **Integration**
   - Third-party systems
   - Mobile applications
   - IoT devices
   - External APIs

## 🎉 **Conclusion**

The Custom Rules Engine provides a powerful, flexible, and scalable solution for AI-powered safety and security monitoring. It can be easily configured for any industry or use case, with comprehensive notification systems and real-time monitoring capabilities.

**Your system is now ready for production deployment with advanced AI-powered custom rule detection!** 🚀
