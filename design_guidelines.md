# Design Guidelines for Mindbody Data Analysis Platform

## Design Approach

**Selected Approach:** Modern SaaS Design System  
**Rationale:** Enterprise analytics platform requiring clarity, efficiency, and professional aesthetics. Drawing inspiration from Linear, Vercel, and modern dashboard systems for data-heavy applications.

**Core Principles:**
- Data clarity and hierarchy over decoration
- Efficiency in navigation and task completion
- Professional, trustworthy aesthetic
- Scalable component system
- Accessibility and readability first

---

## Color Palette

### Light Mode
**Primary Brand:** 217 91% 60% (Blue - trust, technology)  
**Primary Hover:** 217 91% 50%  
**Accent:** 142 76% 36% (Green - success, growth)  
**Background:** 0 0% 100% (Pure white)  
**Surface:** 210 20% 98% (Subtle gray)  
**Border:** 214 32% 91%  
**Text Primary:** 222 47% 11%  
**Text Secondary:** 215 16% 47%  

### Dark Mode  
**Primary Brand:** 217 91% 60%  
**Primary Hover:** 217 91% 70%  
**Accent:** 142 76% 46%  
**Background:** 222 47% 11%  
**Surface:** 217 33% 17%  
**Border:** 217 33% 24%  
**Text Primary:** 210 40% 98%  
**Text Secondary:** 215 20% 65%  

**Semantic Colors:**
- Success: 142 76% 36% / 46% (light/dark)
- Warning: 38 92% 50% / 60%
- Error: 0 84% 60% / 70%
- Info: 199 89% 48% / 58%

---

## Typography

**Font Families:**
- Primary: 'Inter', -apple-system, system-ui, sans-serif
- Monospace: 'JetBrains Mono', 'Courier New', monospace (for data tables, code)

**Scale:**
- Display: 36px/40px, bold (page titles)
- H1: 30px/36px, semibold (section headers)
- H2: 24px/32px, semibold (card titles)
- H3: 18px/28px, medium (subsections)
- Body: 14px/20px, regular (default text)
- Small: 12px/16px, regular (metadata, captions)

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24  
(e.g., p-4, gap-6, mb-8, space-y-12)

**Container Widths:**
- Dashboard content: max-w-screen-2xl mx-auto px-6
- Forms/Settings: max-w-2xl mx-auto
- Full-width data tables: w-full with px-6 container

**Grid System:**
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Sidebar layout: Main sidebar 240px fixed, content flex-1
- Data views: 12-column responsive grid

---

## Component Library

### Navigation
**Top Bar (60px height):**
- Logo + app name left-aligned
- Global search bar center (max-w-md)
- Notifications, user avatar right-aligned
- Background: surface color, border-b

**Sidebar (240px width):**
- Collapsible navigation menu
- Icon + label pattern
- Active state: primary background with subtle glow
- Hover: subtle surface lift
- Groups separated by thin dividers

### Data Display
**Dashboard Cards:**
- White/surface background with subtle border
- 16px padding, rounded-lg
- Header with title (H3) + action button
- Content area with appropriate spacing
- Optional footer for metadata

**Data Tables:**
- Zebra striping for rows (alternating subtle background)
- Sticky headers on scroll
- Sortable columns with arrow indicators
- Hover state: slight surface color change
- Pagination controls bottom-right
- Row actions accessible via icon menu

**Charts (Recharts):**
- Consistent color palette across all visualizations
- Grid lines: subtle, low opacity
- Tooltips: dark background, white text
- Legends: bottom-aligned, horizontal
- Responsive height based on container

### Forms & Inputs
**Input Fields:**
- Height: 40px (h-10)
- Border: 1px solid border color
- Rounded: rounded-md
- Focus: ring-2 ring-primary
- Dark mode: surface background with lighter border
- Labels: text-sm font-medium mb-2

**Buttons:**
- Primary: bg-primary text-white, hover lift effect
- Secondary: bg-surface border, hover subtle background
- Outline on images: backdrop-blur-md bg-white/10 border-white/20
- Height: 40px (h-10), padding px-6
- Rounded: rounded-md
- Font: 14px medium

**Select/Dropdowns:**
- Match input styling
- Dropdown menu: surface background, shadow-lg
- Options with hover states

### Overlays
**Modals:**
- Overlay: bg-black/50 backdrop-blur-sm
- Content: surface background, max-w-2xl, rounded-lg, shadow-2xl
- Header with title + close button
- Body with appropriate padding (p-6)
- Footer with action buttons (right-aligned)

**Toasts/Notifications:**
- Fixed top-right position
- Surface background with border-l-4 (semantic color)
- Icon + message + close button
- Auto-dismiss after 5 seconds
- Slide-in animation

---

## Page-Specific Guidelines

### Landing Page (Marketing)
**Hero Section (90vh):**
- Large hero image: Abstract data visualization or dashboard screenshot (blurred overlay)
- Centered headline (Display size): "Transform Your Mindbody Data Into Actionable Insights"
- Subheading (H2): Value proposition
- CTA buttons: Primary "Get Started Free" + Secondary "Watch Demo"
- Stats bar below: "10,000+ users | 5M+ data points analyzed"

**Features Section:**
- 3-column grid (lg:grid-cols-3 gap-8)
- Each card: Icon (primary color), Title (H3), Description
- Icons from Heroicons
- Hover: subtle lift effect

**Analytics Showcase:**
- Full-width screenshot of dashboard
- Side-by-side layout: Image + feature list

**Pricing/CTA:**
- Centered with gradient background (primary subtle)
- Clear tier comparison if applicable

**Footer:**
- 4-column grid: Product, Company, Resources, Legal
- Newsletter signup form
- Social icons
- Copyright and trust badges

### Application Dashboard
**Layout:**
- Fixed sidebar (240px) + top bar (60px)
- Main content area with breadcrumbs
- Key metrics cards (4-column grid)
- Recent activity table
- Chart visualizations (2-column grid)

### Analytics/Reports Pages
**Controls Bar:**
- Date range picker, filters, export button
- Sticky top position while scrolling

**Content:**
- Mixed layout: Charts + tables
- Print-friendly design considerations
- Download buttons for data export

---

## Images

**Hero Section:** Large dashboard screenshot or abstract data visualization (1920x1080). Should show colorful charts, clean interface, suggesting power and sophistication. Slight blur with dark overlay for text readability.

**Features Section:** Icon-based (no images), using Heroicons in primary color

**Analytics Showcase:** Clean screenshot of actual dashboard interface showing multiple chart types, demonstrating real product functionality (1200x800)

**Testimonials (if included):** Small circular headshots (80x80) for user testimonials

---

## Animations

**Use Sparingly:**
- Page transitions: Simple fade-in
- Card hover: Subtle scale (scale-[1.02]) and shadow increase
- Button hover: Slight background darkening
- Data loading: Skeleton screens (pulsing background)
- Chart animations: Recharts default entrance animations
- No excessive motion - prioritize accessibility

---

## Accessibility

- Maintain WCAG AA contrast ratios (4.5:1 minimum)
- Consistent dark mode across all components
- Focus indicators visible on all interactive elements
- Screen reader labels for icon-only buttons
- Keyboard navigation support throughout
- Form validation with clear error messages