# 📱 SMS Safety Violation Notifications Setup Guide

This guide will help you set up SMS notifications for safety violations in your Nexxau Safety Monitoring System.

## 🚀 **Quick Setup**

### **1. Twilio Account Setup**

1. **Create Twilio Account**
   - Go to [https://www.twilio.com](https://www.twilio.com)
   - Sign up for a free account
   - Verify your phone number

2. **Get Twilio Credentials**
   - Navigate to Console Dashboard
   - Copy your Account SID and Auth Token
   - Purchase a phone number for sending SMS

3. **Configure Environment Variables**
   ```bash
   # Copy the template
   cp env.sms.template .env.local
   
   # Edit .env.local with your credentials
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_FROM_NUMBER=+1234567890
   ```

### **2. Database Migration**

```bash
# Run database migrations to add SMS tables
npx prisma migrate dev --name add_sms_notifications
npx prisma generate
```

### **3. Install Dependencies**

```bash
# Install Twilio SDK
npm install twilio
npm install @types/twilio --save-dev
```

## 🔧 **Configuration**

### **SMS Service Configuration**

The SMS service is automatically configured when you set the environment variables. The system includes:

- **Automatic SMS Sending**: Violations trigger SMS to managers
- **Delivery Tracking**: Real-time delivery status updates
- **Retry Logic**: Failed messages are automatically retried
- **Cooldown Periods**: Prevents SMS spam for repeated violations

### **Safety Violation Rules**

The system comes with pre-configured safety rules:

| Violation Type | Severity | Confidence Threshold | SMS Enabled | Cooldown |
|----------------|----------|---------------------|-------------|----------|
| Hard Hat Violation | High | 80% | ✅ | 15 min |
| Safety Equipment Missing | Medium | 75% | ✅ | 30 min |
| Unsafe Behavior | Critical | 85% | ✅ | 5 min |
| Restricted Area Access | Critical | 90% | ✅ | 0 min |

## 📱 **SMS Templates**

### **Critical Violation Template**
```
🚨 CRITICAL SAFETY VIOLATION ALERT 🔴

Type: {violationType}
Severity: CRITICAL
Location: {location}
Time: {timestamp}

Description: {description}

This is an automated safety alert from Nexxau Safety Monitoring System.

Reply STOP to unsubscribe from safety alerts.
```

### **High Priority Template**
```
⚠️ HIGH PRIORITY SAFETY VIOLATION 🟠

Type: {violationType}
Severity: HIGH
Location: {location}
Time: {timestamp}

Description: {description}

This is an automated safety alert from Nexxau Safety Monitoring System.

Reply STOP to unsubscribe from safety alerts.
```

## 👥 **Emergency Contacts Management**

### **Adding Emergency Contacts**

1. **Via Dashboard**
   - Navigate to `/dashboard/sms-notifications`
   - Click "Add Contact"
   - Fill in contact details
   - Set priority level (1 = highest)

2. **Via API**
   ```bash
   curl -X POST /api/emergency-contacts \
     -H "Content-Type: application/json" \
     -d '{
       "name": "John Doe",
       "phoneNumber": "+1234567890",
       "email": "john@example.com",
       "role": "manager",
       "priority": 1
     }'
   ```

### **Contact Roles**
- **Manager**: Site managers and supervisors
- **Supervisor**: Team supervisors
- **Emergency**: Emergency response contacts

## 🧪 **Testing SMS Notifications**

### **Test Safety Violation**

```bash
# Test a hard hat violation
curl -X POST /api/test/safety-violation \
  -H "Content-Type: application/json" \
  -d '{
    "violationType": "hard_hat_violation",
    "severity": "high",
    "confidence": 85,
    "location": "Construction Site A",
    "description": "Worker detected without hard hat"
  }'
```

### **Test Different Violation Types**

```bash
# Test safety equipment missing
curl -X POST /api/test/safety-violation \
  -H "Content-Type: application/json" \
  -d '{
    "violationType": "safety_equipment_missing",
    "severity": "medium",
    "confidence": 75,
    "location": "Workshop Area",
    "description": "Worker missing safety goggles"
  }'

# Test unsafe behavior
curl -X POST /api/test/safety-violation \
  -H "Content-Type: application/json" \
  -d '{
    "violationType": "unsafe_behavior",
    "severity": "critical",
    "confidence": 90,
    "location": "High Risk Zone",
    "description": "Worker climbing without safety harness"
  }'
```

## 📊 **Monitoring and Analytics**

### **SMS Dashboard Features**

1. **Real-time SMS Status**
   - Delivery confirmations
   - Failed message tracking
   - Retry attempts monitoring

2. **Analytics**
   - SMS delivery rates
   - Violation type trends
   - Response time metrics

3. **Contact Management**
   - Emergency contact list
   - Priority management
   - Role-based notifications

### **Key Metrics Tracked**

- **Total SMS Sent**: Overall SMS volume
- **Delivery Rate**: Success percentage
- **Average Delivery Time**: Response speed
- **Top Violation Types**: Most common triggers
- **Failed Messages**: Issues requiring attention

## 🔧 **Advanced Configuration**

### **Custom Safety Rules**

```typescript
// Add custom safety rule
await safetyViolationDetector.addCustomSafetyRule({
  name: 'Custom Safety Rule',
  violationType: 'custom_violation',
  severity: 'high',
  confidenceThreshold: 80,
  smsEnabled: true,
  smsRecipients: ['+1234567890'],
  isActive: true,
  worksiteId: 'worksite-id'
});
```

### **SMS Rate Limiting**

Configure rate limits to prevent SMS spam:

```env
SMS_RATE_LIMIT_PER_HOUR=100
SMS_RATE_LIMIT_PER_DAY=1000
```

### **Emergency Escalation**

Set up automatic escalation for critical violations:

```env
EMERGENCY_ESCALATION_ENABLED=true
EMERGENCY_ESCALATION_DELAY_MINUTES=10
EMERGENCY_ESCALATION_RECIPIENTS=+1234567890
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **SMS Not Sending**
   - Check Twilio credentials
   - Verify phone number format
   - Check rate limits

2. **Delivery Failures**
   - Verify phone numbers
   - Check Twilio account balance
   - Review error messages

3. **Missing Notifications**
   - Check safety rules configuration
   - Verify confidence thresholds
   - Review cooldown periods

### **Debug Mode**

Enable debug logging:

```env
SMS_DEBUG_MODE=true
SMS_TEST_MODE=true
```

### **Logs and Monitoring**

- **SMS Logs**: Check `/api/sms/notifications` endpoint
- **Violation Logs**: Check `/api/safety-violations` endpoint
- **Error Logs**: Check application logs for SMS errors

## 📈 **Performance Optimization**

### **SMS Delivery Optimization**

1. **Batch Processing**: Group similar violations
2. **Smart Retry**: Exponential backoff for failed messages
3. **Priority Queuing**: Critical violations first
4. **Cooldown Management**: Prevent spam

### **Cost Optimization**

1. **Message Templates**: Reuse common templates
2. **Rate Limiting**: Control SMS volume
3. **Smart Filtering**: Only send for significant violations
4. **Delivery Tracking**: Avoid duplicate messages

## 🔒 **Security Considerations**

### **Phone Number Privacy**

- Store phone numbers encrypted
- Implement access controls
- Regular security audits

### **SMS Content Security**

- Sanitize violation descriptions
- Avoid sensitive information in SMS
- Use secure message templates

### **Access Control**

- Role-based SMS permissions
- Audit trail for SMS actions
- Secure API endpoints

## 📞 **Support and Maintenance**

### **Regular Maintenance**

1. **Update Emergency Contacts**: Keep contact lists current
2. **Review SMS Templates**: Ensure clarity and accuracy
3. **Monitor Delivery Rates**: Track SMS performance
4. **Test Violation Scenarios**: Regular testing of SMS triggers

### **Backup and Recovery**

- **Contact Backup**: Regular export of emergency contacts
- **SMS History**: Archive important SMS records
- **Configuration Backup**: Save SMS settings

## 🎯 **Best Practices**

### **SMS Content**

1. **Keep Messages Concise**: Clear and actionable
2. **Include Essential Info**: Type, location, time
3. **Use Clear Language**: Avoid technical jargon
4. **Include Contact Info**: How to respond

### **Violation Management**

1. **Set Appropriate Thresholds**: Balance sensitivity and noise
2. **Use Cooldown Periods**: Prevent SMS spam
3. **Prioritize Critical Violations**: Immediate alerts for serious issues
4. **Regular Rule Review**: Update rules based on feedback

### **Contact Management**

1. **Keep Contacts Updated**: Regular verification
2. **Set Clear Priorities**: Who gets notified first
3. **Test Contact Information**: Regular SMS testing
4. **Document Contact Roles**: Clear responsibility matrix

---

## 🎉 **You're All Set!**

Your SMS safety violation notification system is now ready to keep managers informed of critical safety issues in real-time. The system will automatically:

- ✅ **Detect Safety Violations** using AI
- ✅ **Send SMS Alerts** to managers immediately
- ✅ **Track Delivery Status** for accountability
- ✅ **Retry Failed Messages** automatically
- ✅ **Prevent SMS Spam** with cooldown periods
- ✅ **Provide Analytics** for system optimization

**Safety is now just a text message away!** 📱🚨
