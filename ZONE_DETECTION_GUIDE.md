# 🎯 Zone Detection - Visual Guide

## 📍 **WHAT ARE ZONE POLYGONS?**

Zone polygons let you **draw shapes directly on your camera feed** to mark:
- 🔴 **Restricted areas** (no entry zones)
- 🟢 **Safe zones** (approved work areas)  
- 🔵 **Monitored zones** (watch only, no alerts)

---

## 🎨 **HOW IT WORKS - VISUAL WALKTHROUGH**

### **Step 1: View Your Camera Feed**

```
┌────────────────────────────────────────────────┐
│  Construction Site Camera Feed                 │
│                                                │
│   [Crane]        [Workers]      [Equipment]    │
│                                                │
│                                                │
│      [Stacked Materials]                       │
│                                                │
└────────────────────────────────────────────────┘
```

---

### **Step 2: Click "Draw Zone" Button**

```
┌────────────────────────────────────────────────┐
│  🎯 Drawing Mode Active                        │
│  Click on video to place points                │
│                                                │
│   [Crane] ← Click here (Point 1)               │
│       ↓                                        │
│   Click here (Point 2) →                       │
│       ↓                                        │
│   ← Click here (Point 3)                       │
│                                                │
└────────────────────────────────────────────────┘
```

---

### **Step 3: Place Points Around Danger Zone**

```
┌────────────────────────────────────────────────┐
│  Construction Site Camera Feed                 │
│                                                │
│   ①────────②                                   │
│   │  CRANE  │                                  │
│   │  ZONE   │                                  │
│   ④────────③                                   │
│                                                │
│  4 points placed! Click "Complete Zone"        │
└────────────────────────────────────────────────┘
```

---

### **Step 4: Zone is Created**

```
┌────────────────────────────────────────────────┐
│  Construction Site Camera Feed                 │
│                                                │
│   ┏━━━━━━━━┓                                   │
│   ┃ DANGER ┃ ← Red highlighted area            │
│   ┃  ZONE  ┃                                   │
│   ┗━━━━━━━━┛                                   │
│                                                │
│  [Workers walking safely outside zone]         │
└────────────────────────────────────────────────┘
```

---

### **Step 5: AI Monitors the Zone**

```
┌────────────────────────────────────────────────┐
│  Real-Time Monitoring                          │
│                                                │
│   ┏━━━━━━━━┓                                   │
│   ┃ DANGER ┃                                   │
│   ┃ [🧑]   ┃ ← Person detected INSIDE!         │
│   ┗━━━━━━━━┛                                   │
│                                                │
│  🚨 ALERT TRIGGERED!                           │
│  "Person in Crane Danger Zone"                 │
└────────────────────────────────────────────────┘
```

---

## 🖱️ **USER INTERACTION**

### **Creating a Zone (Click-by-Click):**

1. **Enter zone name**: "Crane Danger Zone"
2. **Choose type**: Restricted (Red)
3. **Click "Start Drawing"**
4. **Click point 1** on video (top-left of danger area)
5. **Click point 2** (top-right)
6. **Click point 3** (bottom-right)
7. **Click point 4** (bottom-left)
8. **Click "Complete Zone"**

**Result**: Zone saved as:
```json
{
  "name": "Crane Danger Zone",
  "type": "restricted",
  "points": [
    {"x": 120, "y": 150},
    {"x": 450, "y": 150},
    {"x": 450, "y": 380},
    {"x": 120, "y": 380}
  ]
}
```

---

## 🎯 **REAL-WORLD EXAMPLES**

### **Example 1: Crane Exclusion Zone**

```
Problem: Workers getting too close to crane
Solution: Draw red zone around crane base

┌────────────────────────────────┐
│                                │
│        ┏━━━━━━━┓              │
│        ┃ CRANE ┃               │
│        ┃[禁止] ┃ ← 10-foot     │
│        ┗━━━━━━━┛    exclusion  │
│                     zone       │
│  [Workers]                     │
└────────────────────────────────┘

Alert: "Person in Crane Danger Zone"
Action: Sound alarm + Create alert + Send SMS
```

---

### **Example 2: Forklift Traffic Lane**

```
Problem: Workers walking in forklift path
Solution: Draw red zone for forklift lane

┌────────────────────────────────┐
│  ╔═══════════════════╗         │
│  ║ FORKLIFT LANE    ║          │
│  ║ PEDESTRIANS      ║          │
│  ║ PROHIBITED       ║          │
│  ╚═══════════════════╝         │
│                                │
│  [Safe walking area]           │
└────────────────────────────────┘

Alert: "Pedestrian in Forklift Lane"
Action: Sound alarm + Log event
```

---

### **Example 3: Scaffolding Fall Zone**

```
Problem: Workers below scaffolding (falling object risk)
Solution: Draw red zone under scaffolding

┌────────────────────────────────┐
│     [Scaffolding Structure]    │
│            │││││               │
│            │││││               │
│      ┏━━━━━━━━━━━┓             │
│      ┃ FALL ZONE ┃             │
│      ┃ KEEP OUT  ┃             │
│      ┗━━━━━━━━━━━┛             │
│                                │
└────────────────────────────────┘

Alert: "Person in Fall Zone"
Action: Create alert + Send email
```

---

### **Example 4: Equipment Storage (Safe Zone)**

```
Problem: Need to monitor equipment area but not restrict
Solution: Draw blue monitored zone

┌────────────────────────────────┐
│                                │
│  ┌─────────────────┐           │
│  │ TOOL STORAGE    │           │
│  │ [Monitored]     │           │
│  │ 🔧 🔨 ⚒️        │           │
│  └─────────────────┘           │
│                                │
└────────────────────────────────┘

Alert: "Activity in Tool Storage"
Action: Log event only (no alarm)
```

---

## 💻 **HOW THE CODE WORKS**

### **1. User Draws Zone (Frontend)**

```typescript
// User clicks on video
handleCanvasClick(event) {
  const point = { x: event.offsetX, y: event.offsetY };
  points.push(point);
}

// User completes zone
completeZone() {
  const zone = {
    name: "Crane Danger Zone",
    points: [
      {x: 120, y: 150},
      {x: 450, y: 150},
      {x: 450, y: 380},
      {x: 120, y: 380}
    ],
    type: "restricted"
  };
  
  // Save to alert rule
  saveRule({
    ...alertData,
    zoneCoordinates: zone.points
  });
}
```

---

### **2. Saved to Database**

```sql
-- In CustomRule table
{
  "id": "rule-123",
  "name": "Crane Zone Alert",
  "detectionType": "zone_violation",
  "zoneCoordinates": [
    {"x": 120, "y": 150},
    {"x": 450, "y": 150},
    {"x": 450, "y": 380},
    {"x": 120, "y": 380}
  ],
  "severity": "high"
}
```

---

### **3. AI Service Checks Every Frame (Python)**

```python
def check_zone_violation(detection, zone_coords):
    """Check if person is inside restricted zone"""
    
    # Get person's bounding box
    x1, y1, x2, y2 = detection.bbox
    
    # Calculate center point
    center_x = (x1 + x2) / 2
    center_y = (y1 + y2) / 2
    
    # Check if center is inside polygon
    if is_point_in_polygon(center_x, center_y, zone_coords):
        return True  # VIOLATION!
    
    return False

def is_point_in_polygon(x, y, polygon):
    """Ray casting algorithm for point-in-polygon test"""
    n = len(polygon)
    inside = False
    
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]['x'], polygon[i]['y']
        xj, yj = polygon[j]['x'], polygon[j]['y']
        
        if ((yi > y) != (yj > y)) and \
           (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        
        j = i
    
    return inside
```

---

### **4. Alert Triggered**

```
Frame 1234: Person detected at (300, 250)
Zone check: Point (300, 250) is INSIDE polygon
Result: 🚨 TRIGGER ALERT!

Action: Create alert in database
        Send SMS to supervisor
        Save screenshot as evidence
```

---

## 🎨 **ZONE TYPES & USE CASES**

### **🔴 Restricted Zones (Red)**

**Use for:**
- Crane exclusion zones
- Heavy machinery areas
- Confined spaces
- Fall hazard zones
- Chemical storage areas
- Electrical hazard areas

**Alert when**: Person enters zone
**Severity**: High or Critical
**Actions**: Sound alarm, Send SMS, Create alert

---

### **🟢 Safe Zones (Green)**

**Use for:**
- Break areas
- Tool storage (approved)
- Assembly areas
- Safety stations

**Alert when**: Person leaves zone (optional)
**Severity**: Low
**Actions**: Log event only

---

### **🔵 Monitored Zones (Blue)**

**Use for:**
- Loading docks
- Material storage
- Parking areas
- Entry/exit points

**Alert when**: Activity detected
**Severity**: Low to Medium
**Actions**: Log event, Dashboard notification

---

## 🧪 **TESTING ZONE DETECTION**

### **Test 1: Draw a Simple Zone**

```bash
# 1. Go to alert builder
http://localhost:3000/dashboard/alert-builder

# 2. Fill out:
- Name: "Test Crane Zone"
- Camera: Select any camera
- Detection Type: "Zone Violation"

# 3. Draw zone:
- Click 4 corners around crane area
- Click "Complete Zone"

# 4. Create alert

# 5. Test with simulated detection:
curl -X POST http://localhost:5000/api/detect \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "cam-123",
    "detections": [
      {
        "class_name": "person_standing",
        "confidence": 0.9,
        "bbox": [300, 250, 350, 400]
      }
    ]
  }'

# If person is in zone → Alert triggered!
```

---

## 📐 **COORDINATE SYSTEM**

### **Video Dimensions:**
- **Width**: 1920 pixels (Full HD)
- **Height**: 1080 pixels (Full HD)

### **Coordinate Format:**
```json
{
  "x": 0-1920,    // Left to right
  "y": 0-1080     // Top to bottom
}
```

### **Example Polygon (Rectangle):**
```
Top-left: (100, 100)
Top-right: (500, 100)
Bottom-right: (500, 400)
Bottom-left: (100, 400)
```

### **Example Polygon (Complex Shape):**
```
     ①
    / \
   ⑥   ②
   |   |
   ⑤   ③
    \ /
     ④

Points: [(300, 100), (400, 150), (400, 300), (300, 350), (200, 300), (200, 150)]
```

---

## 🔧 **ADVANCED FEATURES**

### **Multiple Zones Per Camera**

You can draw multiple zones on one camera:
```
┌────────────────────────────────┐
│  ┏━━━┓        ┏━━━┓            │
│  ┃ 1 ┃        ┃ 2 ┃            │
│  ┗━━━┛        ┗━━━┛            │
│                                │
│          ┏━━━━━┓               │
│          ┃  3  ┃               │
│          ┗━━━━━┛               │
└────────────────────────────────┘

Zone 1: Crane exclusion
Zone 2: Forklift path
Zone 3: Fall hazard area
```

---

### **Time-Based Zones**

Add schedule to zones:
```javascript
{
  "zone": "Loading Dock",
  "schedule": {
    "workHoursOnly": true,
    "startTime": "08:00",
    "endTime": "18:00",
    "days": [1, 2, 3, 4, 5]  // Monday-Friday
  }
}
```

**Result**: Zone only enforced during work hours!

---

### **Nested Zones (Future Enhancement)**

```
Large monitored zone (blue)
  └─ Small restricted zone inside (red)

Example: Loading dock (blue) with forklift path (red)
```

---

## 🎯 **REAL-WORLD USE CASES**

### **Construction Site:**
1. ✅ **Crane swing radius** (10-foot exclusion)
2. ✅ **Scaffolding below** (fall object zone)
3. ✅ **Excavation pit** (fall hazard)
4. ✅ **Material hoisting area** (overhead hazard)
5. ✅ **Electrical panel room** (authorized only)

### **Warehouse:**
1. ✅ **Forklift traffic lanes**
2. ✅ **Loading dock edges**
3. ✅ **Chemical storage areas**
4. ✅ **Restricted inventory zones**

### **Manufacturing:**
1. ✅ **Machine exclusion zones**
2. ✅ **Robot work cells**
3. ✅ **Hot work areas**
4. ✅ **Conveyor danger zones**

---

## 💡 **BEST PRACTICES**

### **✅ DO:**
- Draw zones slightly larger than needed (safety buffer)
- Use high-contrast colors (red for danger)
- Label zones clearly ("Crane Zone", not "Zone 1")
- Test with workers before enforcement
- Adjust based on false alarms

### **❌ DON'T:**
- Make zones too small (people might clip edge)
- Use complex shapes (simple rectangles work best)
- Block entire walkways (leave safe paths)
- Set zones without worker notification

---

## 🧮 **TECHNICAL DETAILS**

### **Point-in-Polygon Algorithm**

The AI uses "ray casting" to check if a person is inside:

```python
def is_point_in_polygon(x, y, polygon):
    """
    Ray casting algorithm:
    - Cast ray from point to infinity
    - Count how many polygon edges it crosses
    - Odd number = inside, Even number = outside
    """
    n = len(polygon)
    inside = False
    
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]['x'], polygon[i]['y']
        xj, yj = polygon[j]['x'], polygon[j]['y']
        
        # Check if ray crosses this edge
        if ((yi > y) != (yj > y)) and \
           (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        
        j = i
    
    return inside
```

### **Bounding Box Center Calculation**

```python
# Person detected at bounding box [100, 200, 300, 400]
# Calculate center:
center_x = (100 + 300) / 2 = 200
center_y = (200 + 400) / 2 = 300

# Check if (200, 300) is inside restricted zone
result = is_point_in_polygon(200, 300, zone_points)
```

---

## 🎨 **UI DESIGN (What I Built)**

### **Zone Drawing Tool Features:**

✅ **Canvas overlay** - Transparent layer over video
✅ **Click to place points** - Intuitive point placement
✅ **Visual feedback** - See zone as you draw
✅ **Point numbering** - Shows drawing order
✅ **Undo last point** - Fix mistakes easily
✅ **Multiple zones** - Draw many zones per camera
✅ **Zone list** - See all defined zones
✅ **Delete zones** - Remove unwanted zones
✅ **Color coding** - Red (restricted), Blue (monitored), Green (safe)
✅ **Zone labels** - Name displayed on zone
✅ **Coordinate display** - See exact points

---

## 🧪 **TESTING ZONES**

### **Test 1: Draw Rectangle**

```
1. Go to camera feed
2. Click "Draw Zone"
3. Click 4 corners of a rectangle
4. Click "Complete Zone"
5. Zone appears highlighted
```

### **Test 2: Simulate Violation**

```bash
# Person detected inside zone at (300, 250)
curl -X POST http://localhost:5000/api/detect \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "cam-123",
    "detections": [{
      "class_name": "person_standing",
      "confidence": 0.9,
      "bbox": [280, 200, 320, 400]
    }]
  }'

# Center point: (300, 300)
# If inside zone → Alert triggered!
```

### **Test 3: Person Outside Zone**

```bash
# Person detected outside zone at (800, 500)
# Center: (825, 600)
# If outside zone → No alert
```

---

## 🎯 **INTEGRATION WITH CUSTOM ALERTS**

### **Full Flow:**

```
1. User creates alert:
   - Name: "Crane Exclusion Alert"
   - Type: Zone Violation
   - Draw zone on video
   - Set severity: Critical
   - Actions: Sound alarm + SMS

2. Saved to database:
   {
     "detectionType": "zone_violation",
     "zoneCoordinates": [[120,150], [450,150], [450,380], [120,380]]
   }

3. AI service receives rule via webhook

4. Every frame (30 FPS):
   - Detect people
   - Check if any person in zone
   - If yes → Trigger alert

5. Alert sent to backend

6. Dashboard updates in real-time

7. SMS sent to supervisor

8. Evidence screenshot saved
```

---

## 📊 **ZONE STATISTICS (Future Feature)**

Track zone violations over time:
```
Crane Zone Statistics (Last 7 Days):
- Total Violations: 23
- Average per day: 3.3
- Peak time: 2:00 PM - 4:00 PM
- Most common: "Person without hardhat"

Recommendation: Add physical barriers
```

---

## 🎉 **SUMMARY**

**Zone Polygons:**
- ✅ Visual, intuitive drawing interface
- ✅ Draw directly on camera feed
- ✅ Multiple zones per camera
- ✅ Real-time violation detection
- ✅ Saved to database
- ✅ Synced with AI service
- ✅ Works with your YOLO model

**You draw it, the AI enforces it!** 🎯

---

## 🚀 **NEXT STEPS**

1. **Test the Zone Drawing Tool** (coming in next update)
2. **Draw a test zone** on your camera feed
3. **Simulate a detection** inside the zone
4. **Verify alert is triggered**

**Want me to integrate the Zone Drawing Tool into your Alert Builder now?** 

I can add it as Step 2.5 in the wizard:
- Step 1: Basic Info
- Step 2: Detection Type
- **Step 2.5: Draw Zone** (if zone_violation selected) ← NEW!
- Step 3: Actions
- Step 4: Review

Let me know if you want this added! 🎨

