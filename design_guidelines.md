# Design Guidelines - Roleta do Tigre (BRPIX)

## Design Approach
**Reference-Based Approach**: Following casino gaming platforms with specific inspiration from the provided examples, emphasizing trust, excitement, and clear financial transactions in a green tiger theme.

## Core Design Principles
1. **High Contrast & Readability**: Gambling requires instant comprehension of odds, balances, and betting options
2. **Trust & Security**: Financial transactions demand professional, secure visual treatment
3. **Excitement & Energy**: Casino aesthetics with controlled visual stimulation
4. **Mobile-First Gaming**: Primary interaction on mobile devices

## Color Palette

### Dark Mode (Primary Interface)
- **Background Base**: 147 25% 12% (deep forest green)
- **Surface**: 147 20% 18% (elevated green panels)
- **Surface Elevated**: 147 18% 22% (cards, modals)
- **Primary Action**: 147 70% 35% (vibrant green for CTAs)
- **Primary Hover**: 147 70% 30%
- **Success/Win**: 142 76% 36% (bright emerald for wins)
- **Gold Accent**: 45 90% 55% (tiger gold for highlights, premium features)
- **Danger/Loss**: 0 72% 51% (red for losses, warnings)
- **Text Primary**: 0 0% 98%
- **Text Secondary**: 0 0% 70%
- **Border**: 147 15% 28%

### Admin Dashboard
- **Info Blue**: 210 80% 52% (metrics, informational)
- **Warning Orange**: 30 80% 55% (pending actions)
- **Chart Colors**: Use green spectrum (147 60% 40%, 147 50% 50%, 147 40% 60%)

## Typography
**Google Fonts via CDN**
- **Primary**: Inter (400, 500, 600, 700) - UI, body text, metrics
- **Display/Headers**: Poppins (600, 700, 800) - Game titles, CTAs, big numbers

**Scale**:
- Hero/Game Title: text-4xl md:text-5xl font-bold
- Section Headers: text-2xl md:text-3xl font-semibold
- Balance/Numbers: text-3xl md:text-4xl font-bold (tabular-nums)
- Body: text-base
- Small/Meta: text-sm
- Micro: text-xs

## Layout System
**Spacing Units**: Consistent use of 4, 6, 8, 12, 16, 24 (p-4, p-6, p-8, m-12, gap-16, py-24)

**Container Strategy**:
- Game Area: max-w-2xl mx-auto (focused gameplay)
- Dashboard: max-w-7xl mx-auto (data visibility)
- Admin Tables: w-full with horizontal scroll on mobile

## Component Library

### Buttons
- **Primary Bet/Spin**: Large rounded-xl bg-primary with shadow-lg, ring on focus, scale transform on hover
- **Deposit**: bg-success with PIX icon, prominent placement
- **Secondary**: bg-surface-elevated with border
- **Danger**: bg-danger for withdrawals/cancellations

### Cards
- **Game Card**: rounded-2xl bg-surface p-6 shadow-xl border border-border
- **Stats Card**: rounded-lg p-4 with icon, value (large), and label
- **Transaction Item**: bg-surface-elevated rounded-lg p-4 with status indicator

### Roulette Wheel
- **Circular Design**: 280px diameter on mobile, 400px on desktop
- **Segments**: 8 segments with alternating green shades
- **Multipliers**: 0x, 2x, 5x, 10x, 15x, 30x, 50x, 100x
- **Center**: Tiger logo/icon
- **Pointer**: Gold arrow at top
- **Glow Effect**: Shadow-2xl with green glow on spin

### Forms
- **Input Fields**: rounded-lg bg-surface border-2 border-border focus:border-primary p-3
- **Labels**: text-sm font-medium text-secondary mb-2
- **PIX Input**: Larger font for amount selection with suggested values as chips/buttons

### Admin Dashboard
- **Metric Cards**: Grid layout (grid-cols-2 lg:grid-cols-4) with large numbers, trend indicators
- **Data Tables**: Striped rows, sticky headers, sort indicators, action dropdowns
- **Probability Sliders**: Custom styled range inputs with percentage display
- **Chart Containers**: rounded-xl bg-surface p-6 with legend

### Modals/Popups
- **Welcome Popup**: Full-screen overlay with tiger banner image, gradient backdrop blur, centered content
- **Deposit Modal**: QR Code center, amount chips below, copy PIX key button
- **Confirmation Dialogs**: Centered, medium size, clear action buttons

## Navigation
- **Top Bar**: Sticky, logo left, balance center (desktop), user menu right
- **Mobile**: Bottom tab bar with icons for Game, Wallet, History, Profile
- **Admin Sidebar**: Fixed left sidebar with collapsible sections

## Game Interface Specifics
- **Bet Selection**: Horizontal scrollable chips (R$ 1, 5, 10, 20, 50, 100) below wheel
- **Balance Display**: Prominent top center with R$ prefix, large font
- **Spin Button**: Massive circular button below wheel, disabled state during spin
- **History Strip**: Last 10 results as small circles with multipliers at bottom
- **Win Animation**: Confetti particles, scale pulse on win amount, sound cue placeholder

## Admin Sections Layout
1. **Dashboard**: 4-column metrics, 2 charts (line + bar), recent transactions table
2. **Users**: Search bar, filters, paginated table, user detail modal
3. **Deposits/Withdrawals**: Status tabs, approval actions, BRPIX transaction IDs
4. **Probability Config**: Visual wheel preview, sliders for each segment, save button
5. **Split Settings**: Display 10.5% split, transaction log, balance tracking

## Animations
**Minimal & Purposeful**:
- Roulette spin: 3-second CSS transform rotation with easing
- Win celebration: Scale pulse (1.0 → 1.1 → 1.0) over 0.5s
- Button hovers: Subtle scale (1.0 → 1.02)
- Page transitions: Simple fade
- Balance updates: Number count-up animation

## Images
**Required Images**:
- **Tiger Logo**: SVG/PNG, 80x80px, used in wheel center and branding
- **Welcome Banner**: 1200x600px hero image with tiger theme for registration popup
- **PIX Icon**: SVG, 24x24px for payment buttons
- **Success/Error Icons**: Heroicons (check-circle, x-circle)

No large hero sections needed - app is utility-focused with immediate game access.

## Mobile Optimizations
- Touch-friendly targets (min 44x44px)
- Larger bet chips on mobile
- Simplified admin tables with horizontal scroll
- Bottom sheet modals for deposits
- Reduced wheel size to fit viewport

## Accessibility
- High contrast ratios (WCAG AA minimum)
- Focus visible on all interactive elements
- Screen reader labels for game status
- Keyboard navigation for admin
- Responsible gaming warnings in footer