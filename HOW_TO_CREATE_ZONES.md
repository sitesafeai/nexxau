# 🎯 How to Create Restricted Zones - Quick Guide

## 📍 **WHAT ARE ZONES?**

Zones are **areas you draw on your camera feed** to trigger alerts when specific objects enter them.

**Examples:**
- 🔴 Lunch area → Alert if forklift enters
- 🔴 Crane zone → Alert if person enters
- 🔵 Loading dock → Monitor activity only

---

## 🚀 **STEP-BY-STEP: CREATE YOUR FIRST ZONE**

### **Step 1: Go to Alert Builder**

```
1. Open dashboard: http://localhost:3000/dashboard
2. Click purple "Custom Rules" button (Quick Actions section)
3. Click "Create New Rule" button
```

Or go directly:
```
http://localhost:3000/dashboard/alert-builder
```

---

### **Step 2: Fill Basic Info**

```
Alert Name: "Lunch Area Forklift Alert"
Description: "Prevent forklifts from entering employee lunch area"
Camera: [Select the camera that views your lunch area]
              ↑ IMPORTANT! Must select a specific camera

[Next: Detection Type →]
```

⚠️ **Important**: You MUST select a specific camera (not "All Cameras") to draw zones!

---

### **Step 3: Choose "Zone Violation"**

```
What should trigger this alert?

( ) Object Missing
( ) Object Present
(•) Zone Violation  ← SELECT THIS!
( ) Person Count
( ) Proximity Violation
( ) Behavior Violation

[Next: Draw Zone →]
```

---

### **Step 4: Configure Zone**

```
Zone Name: "Employee Lunch Area"
Zone Type: [🔴 Restricted (No Entry) ▼]

What objects should trigger alerts in this zone?

Select all objects that should NOT be in this zone:

☐ person_standing          ← Unchecked (people OK)
☐ person_without_hardhat   ← Unchecked
☑ forklift                 ← CHECKED! (alert on this)
☑ van                      ← CHECKED! (alert on this)
☑ truck                    ← CHECKED! (alert on this)
☐ excavator
☐ car
```

**Key Point**: Only check objects you want to TRIGGER alerts. Unchecked = allowed in zone.

---

### **Step 5: Draw Zone on Video**

**You'll see your live camera feed below.**

**Instructions:**

```
┌────────────────────────────────────┐
│  Live Camera Feed                  │
│  (Your lunch area camera)          │
│                                    │
│  👆 Click to draw zone             │
│                                    │
│  [Start Drawing] ← Click this      │
└────────────────────────────────────┘
```

**After clicking "Start Drawing":**

**A) Click Point 1** (Top-left corner of lunch area)
```
┌────────────────────────────────────┐
│  Live Camera Feed                  │
│                                    │
│   ①  ← You just clicked here      │
│                                    │
│                                    │
└────────────────────────────────────┘
```

**B) Click Point 2** (Top-right corner)
```
┌────────────────────────────────────┐
│  Live Camera Feed                  │
│                                    │
│   ①──────② ← Click here            │
│                                    │
│                                    │
└────────────────────────────────────┘
```

**C) Click Point 3** (Bottom-right corner)
```
┌────────────────────────────────────┐
│  Live Camera Feed                  │
│                                    │
│   ①──────②                         │
│         │                          │
│         ③ ← Click here             │
└────────────────────────────────────┘
```

**D) Click Point 4** (Bottom-left corner)
```
┌────────────────────────────────────┐
│  Live Camera Feed                  │
│                                    │
│   ①──────②                         │
│   │      │                         │
│   ④──────③ ← Click here            │
└────────────────────────────────────┘
```

**E) Click "Complete Zone"**
```
Zone is now highlighted in RED on the video!

┌────────────────────────────────────┐
│  Live Camera Feed                  │
│                                    │
│   ┏━━━━━━┓  ← RED highlighted area │
│   ┃LUNCH ┃                         │
│   ┃AREA  ┃                         │
│   ┗━━━━━━┛                         │
│                                    │
│  [Tables] [Chairs] [Workers]       │
└────────────────────────────────────┘

[Next: Actions →]
```

---

### **Step 6: Configure Actions**

```
What should happen when this alert triggers?

☑ Create Alert
☑ Send SMS
☑ Send Email
☑ Sound Alarm
☐ Capture Video

↓ SMS Recipients (appears because you checked "Send SMS"):

Phone 1: +15551234567
Phone 2: +15559876543

[+ Add Phone Number]

↓ Email Recipients (appears because you checked "Send Email"):

Email 1: supervisor@company.com
Email 2: safety@company.com

[+ Add Email Address]

Severity: [High ▼]

[Next: Review →]
```

---

### **Step 7: Review & Create**

```
Review all your settings:

Alert: "Lunch Area Forklift Alert"
Zone: "Employee Lunch Area" (Restricted)
Triggers on: Forklift, Van, Truck
Actions: Create Alert, Send SMS, Send Email, Sound Alarm
SMS Recipients: +15551234567, +15559876543
Email Recipients: supervisor@company.com, safety@company.com
Severity: HIGH

[✓ Create Alert]
```

---

### **Step 8: Rule Active!**

```
Success! ✅

You'll be redirected to Custom Rules page.

Your rule is now:
✅ Saved to database
✅ Synced with AI service
✅ Monitoring in real-time (30 FPS)
✅ Ready to trigger alerts!
```

---

## 🎬 **WHAT HAPPENS IN REAL-TIME:**

### **Scenario 1: Worker Walks Through** ✅ **ALLOWED**

```
┌────────────────────────────────────┐
│                                    │
│   ┏━━━━━━┓                         │
│   ┃ 👷   ┃ ← Person in zone        │
│   ┃LUNCH ┃                         │
│   ┗━━━━━━┛                         │
│                                    │
└────────────────────────────────────┘

AI Checks:
- Object: person_standing
- In trigger list? NO ✗
- Result: ✅ No alert (workers allowed!)
```

---

### **Scenario 2: Forklift Enters** 🚨 **VIOLATION!**

```
┌────────────────────────────────────┐
│                                    │
│   ┏━━━━━━━━┓                       │
│   ┃ 🚜     ┃ ← Forklift in zone!  │
│   ┃ LUNCH  ┃                       │
│   ┗━━━━━━━━┛                       │
│                                    │
└────────────────────────────────────┘

AI Checks:
- Object: forklift
- In trigger list? YES ✓
- In zone? YES ✓
- Result: 🚨 ALERT TRIGGERED!

Actions Taken:
✅ Alert created: "Lunch Area Forklift Alert"
✅ SMS sent to: +15551234567, +15559876543
✅ Email sent to: supervisor@company.com, safety@company.com
✅ Alarm sounds on-site
✅ Screenshot saved: lunch_area_20251023_143052.jpg
```

---

## 🎯 **QUICK REFERENCE: Zone Types**

### **🔴 Restricted Zone (Red)**
**Use for**: No-entry areas (crane zones, machine areas, hazard zones)
**Alert when**: ANY selected object enters
**Example**: Crane exclusion zone → Alert on any person

### **🔵 Monitored Zone (Blue)**
**Use for**: Areas to watch (loading docks, exits, storage)
**Alert when**: Selected objects enter
**Example**: Loading dock → Alert on unauthorized vehicles

### **🟢 Safe Zone (Green)**
**Use for**: Approved areas (break rooms, tool storage)
**Alert when**: Prohibited objects enter
**Example**: Tool room → Alert on power tools

---

## 💡 **PRO TIPS:**

### **Tip 1: Draw Larger Than Needed**
```
❌ Don't:  Draw tight around equipment
✅ Do:     Add 5-10 foot buffer zone

Why: People might clip the edge, causing false alerts
```

### **Tip 2: Use Simple Shapes**
```
✅ Rectangle: 4 clicks (easy, fast)
✅ Pentagon: 5 clicks (good for angled areas)
❌ Complex: 15+ clicks (hard to maintain)

Keep it simple for best results!
```

### **Tip 3: Test Before Enforcing**
```
1. Create zone
2. Set severity: LOW
3. Set actions: LOG_EVENT only
4. Monitor for 1 day
5. Check for false alarms
6. Adjust zone if needed
7. Then increase severity and add SMS/email
```

### **Tip 4: Multiple Zones Per Camera**
```
You can create multiple zones on ONE camera:

┌────────────────────────────────────┐
│  ┏━━━┓              ┏━━━┓         │
│  ┃ 1 ┃ Crane        ┃ 2 ┃ Fork    │
│  ┗━━━┛              ┗━━━┛         │
│                                    │
│         ┏━━━━━━━┓                  │
│         ┃   3   ┃ Scaffolding     │
│         ┗━━━━━━━┛                  │
└────────────────────────────────────┘

Zone 1: Crane exclusion
Zone 2: Forklift path  
Zone 3: Scaffolding below (fall zone)
```

---

## 🧪 **COMPLETE EXAMPLE: Lunch Area Protection**

**Goal**: Prevent ALL vehicles from entering lunch area, but allow people.

**Setup:**
```
1. Go to: http://localhost:3000/dashboard/alert-builder

2. Step 1:
   Name: "Lunch Area Vehicle Protection"
   Camera: [Warehouse Camera #3]

3. Step 2:
   Type: Zone Violation

4. Step 2.5:
   Zone Name: "Employee Lunch Area"
   Zone Type: Restricted
   
   Trigger Objects:
   ☑ forklift
   ☑ van
   ☑ truck
   ☑ excavator
   ☐ person_standing (unchecked!)
   
   Draw Zone:
   - Click 4 corners around lunch tables
   - Click "Complete Zone"

5. Step 3:
   Actions:
   ☑ Create Alert
   ☑ Send SMS
   ☑ Sound Alarm
   
   SMS: +15551234567
   Severity: HIGH

6. Step 4:
   Review and click "Create Alert"
```

**Result:**
- ✅ People can enter lunch area freely
- 🚨 ANY vehicle triggers alert + SMS + alarm
- 🎯 Zone monitored 24/7 at 30 FPS

---

## ❓ **TROUBLESHOOTING**

### **Q: I don't see "Draw Zone" step**
**A**: You must select **"Zone Violation"** as detection type in Step 2

### **Q: "Please select a camera" warning**
**A**: Go back to Step 1 and select a SPECIFIC camera (not "All Cameras")

### **Q: Can't click on video**
**A**: Click "Start Drawing" button first to enable drawing mode

### **Q: Zone doesn't save**
**A**: You need at least 3 points. Click "Complete Zone" when done.

### **Q: How do I delete a point?**
**A**: Click the "Undo" (↻) button to remove the last point

### **Q: Can I draw complex shapes?**
**A**: Yes! Click as many points as you want (minimum 3)

---

## ✅ **SUMMARY:**

**To create a zone:**
1. Go to Alert Builder
2. Select a specific camera
3. Choose "Zone Violation" 
4. Draw zone on video
5. Select trigger objects
6. Configure actions
7. Create!

**Your zone will:**
- ✅ Show as red/blue/green overlay on video
- ✅ Be saved to database
- ✅ Sync with AI service immediately
- ✅ Monitor 24/7 in real-time
- ✅ Trigger alerts when violations occur

---

**🎊 Now try creating a zone yourself!** 

The video feed in Step 2.5 is fully interactive - just click and draw! 🎨

