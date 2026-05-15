# WBL SmartPrep - Implementation Plan

## Project Overview
Building a premium AI-powered interview preparation platform with:
- Professional dark theme with neon accents
- Persistent sidebar navigation
- Dynamic dashboard with recommendations
- Interview preparation hub
- Fullscreen AI Interview Room
- Intelligent right-side copilot panel

## Phase 1: Foundation & Layout (Critical First Pass)

### 1.1 Design System & Theme
- Update `global.css` with premium dark theme colors:
  - Background: `#0f172a` (slate-950)
  - Cards: `#111827` (gray-900)
  - Primary: `#3b82f6` (blue-500)
  - Secondary: `#8b5cf6` (violet-500)
  - Accents with glow effects
- Configure `tailwind.config.ts` with:
  - Custom color palette
  - Glow shadow utilities
  - Gradient utilities
  - Animation keyframes (glassmorphism, glow)

### 1.2 Persistent Layout Structure
**Components:**
- `components/layout/Sidebar.tsx` - Collapsible left navigation with:
  - Dashboard
  - Preparation Hub
  - Interview Practice
  - Study Guides
  - Documents
  - Progress
  - Reports
  - Settings
- `components/layout/TopNav.tsx` - Top bar with:
  - WBL SmartPrep logo/branding
  - User profile dropdown
  - Notifications
  - Progress indicator
  - AI status
- `components/layout/MainLayout.tsx` - Wrapper component

### 1.3 Routing Structure
- Create pages directory:
  - `client/pages/Dashboard.tsx` - Main dashboard
  - `client/pages/PreparationHub.tsx` - Preparation workspace
  - `client/pages/InterviewSelect.tsx` - Interview type selection
  - `client/pages/InterviewRoom.tsx` - Fullscreen interview experience
  - `client/pages/StudyGuides.tsx` - Study materials
  - `client/pages/Documents.tsx` - Document library
  - `client/pages/Progress.tsx` - Progress tracking
  - `client/pages/Reports.tsx` - Analytics/reports
  - `client/pages/Settings.tsx` - User settings

## Phase 2: Dashboard (First Priority Page)

### 2.1 Dashboard Components
- `components/dashboard/ContinueCard.tsx` - Resume preparation card
- `components/dashboard/RecommendationCard.tsx` - AI recommendations
- `components/dashboard/ProgressWidget.tsx` - Interview readiness gauge
- `components/dashboard/RecentSessions.tsx` - Interview history
- `components/dashboard/InsightsPanel.tsx` - Resume insights

### 2.2 Dashboard Features
- Continue Where You Left Off section
- Recommended For You section
- Interview Readiness progress (percentage-based)
- Resume Insights with skill assessment
- Recent Interview Sessions
- Quick action buttons

## Phase 3: Interview Practice Flow

### 3.1 Interview Type Selection
- Premium modern cards for interview types
- Level selection (Junior, Senior, Staff, etc.)
- "Join Interview Room" CTA

### 3.2 AI Interview Room (Core Experience)
**Layout:**
- Left side: Candidate video panel
- Right side: AI Interviewer video panel
- Bottom: Floating control bar
- Right overlay: Collapsible AI Copilot panel

**Components:**
- `components/interview/VideoPanel.tsx` - Video display with controls
- `components/interview/ControlBar.tsx` - Mic, camera, screen share, etc.
- `components/interview/CopilotPanel.tsx` - AI assistance sidebar
- `components/interview/TranscriptDisplay.tsx` - Real-time transcript

**Features:**
- Video streaming UI (simulated)
- Control buttons (mic, camera, share, captions, notes)
- Interview timer
- Progress indicator
- Live transcript section
- AI speaking state animations
- Glow effects on active controls

## Phase 4: Preparation Hub

### 4.1 Intro Preparation Section
- Preparation cards for:
  - Tell me about yourself
  - Challenges faced
  - Proudest achievement
  - Leadership/ownership
  - Strengths & weaknesses
  - Career journey
  - Project explanations

### 4.2 Project Preparation Section
- Dynamic project cards with:
  - Business problem
  - Solutions explored
  - Metrics
  - Technologies
  - Challenges
  - Results

### 4.3 UI Elements
- Tab/segment navigation between sections
- Editable text cards
- AI suggestion overlays
- Save/continue CTAs

## Phase 5: Study Guides & Documents

### 5.1 Study Guides Section
- Generated guide cards with:
  - Title, description, tags
  - Status badges
  - Last opened timestamp
  - Open/improve CTAs

### 5.2 Documents Section
- File library view
- Filter/search capabilities
- GitHub link support

## Technical Implementation Strategy

### Component Architecture
```
components/
├── ui/                    # Basic UI elements
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Progress.tsx
│   └── ...
├── layout/
│   ├── Sidebar.tsx
│   ├── TopNav.tsx
│   └── MainLayout.tsx
├── dashboard/
│   ├── ContinueCard.tsx
│   ├── RecommendationCard.tsx
│   └── ...
├── interview/
│   ├── VideoPanel.tsx
│   ├── ControlBar.tsx
│   ├── CopilotPanel.tsx
│   └── ...
└── cards/
    └── PrepCard.tsx       # Reusable preparation card

client/
├── pages/
│   ├── Dashboard.tsx
│   ├── PreparationHub.tsx
│   ├── InterviewRoom.tsx
│   └── ...
└── App.tsx               # Main router setup
```

### Styling Approach
- Tailwind CSS for all utilities
- CSS custom properties for theme colors
- Framer Motion for smooth animations
- Gradient & glow effects using Tailwind shadows
- Responsive design (mobile-first approach)

### State Management
- React Context for user state
- Simple localStorage for session persistence
- Mock data for demonstration

## Implementation Order

1. **Foundation** (Day 1)
   - Update theme colors in global.css & tailwind.config.ts
   - Build Sidebar, TopNav, MainLayout
   - Set up routing structure

2. **Dashboard** (Day 1-2)
   - Create Dashboard page
   - Build dashboard cards
   - Add mock data/recommendations

3. **Interview Room** (Day 2-3)
   - Build interview type selection
   - Create fullscreen AI Interview Room
   - Build control bar & copilot panel

4. **Preparation Hub** (Day 3-4)
   - Create preparation workspace
   - Build preparation cards
   - Add project/intro sections

5. **Additional Pages** (Day 4-5)
   - Study Guides, Documents, Progress, Reports
   - Settings page
   - Polish & animations

## Design System Details

### Colors
- Background: `#0f172a`
- Card BG: `#111827`
- Primary Blue: `#3b82f6`
- Violet Accent: `#8b5cf6`
- Success Green: `#10b981`
- Warning Amber: `#f59e0b`
- Error Red: `#ef4444`

### Spacing
- Base unit: 4px
- Gap between sections: 24px
- Card padding: 16-24px
- Sidebar width: 280px (expandable to 80px collapsed)

### Typography
- Headings: Inter 600-800 weight
- Body: Inter 400-600 weight
- Code: Monospace (for technical content)

### Animations
- Smooth transitions: 200-300ms
- Glow effects on hover
- Sidebar collapse animation
- Panel slide-in/out
- Smooth number transitions (counters)

### Shadows & Glow
- Card elevation: soft box-shadow
- Glow on active states: blur + color shadow
- Focus states: neon outline

## Responsive Breakpoints
- Mobile: < 640px (sidebar collapses, single column)
- Tablet: 640px - 1024px
- Desktop: > 1024px (full layout)

## Mock Data Structure
- User profile (name, role, progress %)
- Recent sessions (interview history)
- Preparation items (status, completion %)
- Recommended courses/guides
- Skills assessment

## Deliverables
✅ Complete responsive layout
✅ Premium dark theme with glow effects
✅ Persistent sidebar navigation
✅ Dynamic dashboard with recommendations
✅ Interview type selection flow
✅ Fullscreen AI Interview Room
✅ AI Copilot assistant panel
✅ Preparation Hub with tabs
✅ Study Guides library
✅ Professional animations & interactions
✅ Production-ready React components
✅ Scalable folder structure

---

## Notes
- All features will be fully functional with mock data
- Interview room will simulate video/audio (no actual WebRTC in this phase)
- Sidebar will have working collapse/expand animation
- All pages will be implemented and navigable
- Responsive design will work on all screen sizes
