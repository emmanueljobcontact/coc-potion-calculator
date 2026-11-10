# 🏰 Clash of Clans Potion & Boost Calculator

A modern, responsive, accurate web application to calculate exact upgrade completion dates, real-world wait times, and time savings for Clash of Clans potions and speed boosters.

---

## ⚡ Features & Capabilities

### 1. 🔨 Builder Potion (10x Speed, 1 Hour Duration)
- In 1 real-world hour, builders complete **10 hours of work** (saving 9 hours per builder).
- Affects **all active builders** in your village simultaneously!
- If your upgrade is **4 hours and 20 minutes**:
  - Real-world time required: **26 minutes**!
  - Time saved: **3 hours and 54 minutes**.
  - Leftover boost: **34 minutes** of 10x boost remains active for your next upgrade.

### 2. 🧪 Research Potion (24x Speed, 1 Hour Duration)
- In 1 real-world hour, your Laboratory finishes **24 hours (1 full day)** of research (saving 23 hours).
- If your lab upgrade is **4 hours and 20 minutes**:
  - Real-world time required: **10 minutes and 50 seconds**!
  - Time saved: **4 hours, 9 minutes, and 10 seconds**.
  - Leftover boost: **49 minutes and 10 seconds** remains active for your next troop or spell.

### 3. 🐾 Pet Potion & ⏰ Clock Tower Boost & ⚙️ Custom Booster
- **Pet Potion**: 24x speed for 1 hour in the Pet House.
- **Clock Tower Boost**: 10x speed for 30 minutes in Builder Base.
- **Custom Booster**: Configure any speed multiplier (e.g. 5x, 15x, 30x) and custom duration.

### 4. 🎯 "How Many Potions Do I Need?" (Reverse Goal Finder)
- Enter any upgrade duration (e.g., 2 days, 14 hours).
- See an instant breakdown table of 1 potion, 2 potions, 3 potions, etc., with real-world completion time, time saved, and leftover boosts.
- Recommends the exact number of potions required to complete the upgrade inside the boosted window.

### 5. 🏰 Multi-Builder Village Dashboard
- Track up to 6 village builders, Laboratory, and Pet House simultaneously.
- Enter remaining times for each slot and apply potions to see updated finish times for the entire village at once.
- Shows total combined village time saved (e.g., 6 builders × 9h = **54 hours of builder time saved** with just 1 potion!).

### 6. ⏱️ Live Real-Time Countdown & Sound Effects
- Live ticking countdown timer with completion chime.
- Synthesized Web Audio API sound effects with mute toggle.
- One-click copy calculation summary to clipboard for Discord, Clan Chat, or WhatsApp.

---

## 🚀 How to Run the Website

### Method 1: Direct Double-Click
Simply open `index.html` in any web browser (Chrome, Edge, Firefox, Safari).

### Method 2: Python Web Server
Run:
```bash
python server.py
```
This opens `http://localhost:8000/index.html` automatically in your default browser.

### Method 3: Node / npx
```bash
npx serve .
```

---

## 🧪 Testing the Math Engine
To run the automated mathematical tests:
```bash
node test_calculator.js
```
All unit tests verify the mathematical formulas for Builder Potion (10x), Research Potion (24x), multi-potion stacking, and partial boost leftovers.
