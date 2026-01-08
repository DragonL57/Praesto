# Settings Components - AGENTS.md

Modern, minimalistic, and modular settings UI with proper mobile responsiveness.

## Architecture

### Component Structure
```
settings/
├── settings-nav.tsx           # Navigation components (sidebar & tabs)
├── settings-section.tsx       # Reusable section containers
├── appearance-settings.tsx    # Theme configuration
├── speech-settings.tsx        # Speech recognition config
├── data-settings.tsx          # Data management & deletion
└── account-settings.tsx       # Profile & account info
```

## Components

### SettingsNav (`settings-nav.tsx`)
Navigation components for both desktop sidebar and mobile tabs.

**Exports:**
- `SettingsNav` - Navigation container with items
- `SettingsNavItem` - Individual navigation item
- `SettingTab` - Type for tab names ('appearance' | 'speech' | 'data' | 'account')

**Usage:**
```tsx
<SettingsNav
  currentTab={currentTab}
  onTabChange={setCurrentTab}
  items={[
    { icon: Palette, label: 'Appearance', tab: 'appearance' },
    { icon: Mic, label: 'Speech', tab: 'speech' },
  ]}
/>
```

### SettingsSection (`settings-section.tsx`)
Reusable section containers for consistent layouts.

**Exports:**
- `SettingsSection` - Section wrapper with title/description
- `SettingsItem` - Individual setting row with label/action

**Usage:**
```tsx
<SettingsSection
  title="Appearance"
  description="Customize the visual appearance"
>
  <SettingsItem
    label="Theme"
    description="Choose how the interface looks"
    action={<Button>Update</Button>}
  >
    <Select>...</Select>
  </SettingsItem>
</SettingsSection>
```

### AppearanceSettings (`appearance-settings.tsx`)
Theme configuration (light/dark/system).

**Dependencies:**
- `next-themes` - useTheme hook
- `ui/select` - Theme selector

### SpeechSettings (`speech-settings.tsx`)
Speech recognition configuration with language selection and on-device model management.

**Features:**
- Language selection (12+ languages)
- Recognition mode (on-device/cloud/preferred)
- On-device model availability checking
- Download language models

**Dependencies:**
- `usehooks-ts` - useLocalStorage
- Web Speech API types

### DataSettings (`data-settings.tsx`)
Data management with destructive actions (delete all chats).

**Features:**
- Delete all chats with confirmation dialog
- Loading states during deletion
- Toast notifications

**API Integration:**
- `DELETE /api/chat/delete-all`

### AccountSettings (`account-settings.tsx`)
Profile and account information display.

**Features:**
- Profile picture with session data
- Username display
- Email addresses with primary badge
- Connected accounts (Google OAuth)

**Dependencies:**
- `next-auth` - useSession hook

## Design System

### Layout Pattern
```tsx
<SettingsSection title="..." description="...">
  <SettingsItem
    label="Setting Name"
    description="Brief explanation"
    action={<Button>Action</Button>}
  >
    {/* Control component (Select, Button, etc.) */}
  </SettingsItem>
</SettingsSection>
```

### Responsive Behavior
- **Desktop** (lg+): Fixed sidebar navigation, centered content
- **Mobile**: Fixed header, horizontal tab scroll, full-width content

### Styling Conventions
- **Colors**: zinc scale for neutrals, semantic colors for states
- **Spacing**: Consistent 6-unit gap hierarchy (space-y-6, gap-3, py-2.5)
- **Typography**: 
  - Section title: text-xl font-semibold
  - Item label: text-sm font-medium
  - Description: text-xs text-zinc-500
- **Borders**: border-zinc-200/800 (light/dark)
- **Backgrounds**: bg-white/zinc-900 with rounded-xl

## Mobile Optimizations

### Touch Targets
- Minimum 44px height for all interactive elements
- Adequate spacing between buttons (gap-2/gap-3)

### Navigation
```tsx
{/* Desktop - Sidebar */}
<aside className="hidden lg:flex">
  <SettingsNav {...} />
</aside>

{/* Mobile - Horizontal scroll tabs */}
<nav className="lg:hidden overflow-x-auto">
  {NAV_ITEMS.map(...)}
</nav>
```

### Layout Adjustments
- `sm:flex-row` for horizontal layouts on small screens
- `sm:w-48` for constrained widths
- `w-full sm:w-auto` for buttons
- Fixed header on mobile (`fixed top-0`)

## State Management

### Local Storage
- `speech-recognition-language` - Selected language
- `speech-recognition-mode` - Recognition mode preference

### Session State
- User profile from `next-auth`
- Real-time theme from `next-themes`

### Component State
- Tab selection (`currentTab`)
- Loading states (`isDeleting`, `isCheckingDeviceSupport`)
- Speech API availability (`speechSupported`, `deviceLanguageStatus`)

## API Integration

### Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat/delete-all` | DELETE | Delete all user chats |

### Error Handling
- Try-catch blocks with toast notifications
- Loading states prevent double-submission
- Disabled states during async operations

## Accessibility

### Keyboard Navigation
- All interactive elements keyboard-accessible
- Proper button types (`type="button"`)
- Focus states via Tailwind defaults

### Semantic HTML
- `<nav>` for navigation
- `<aside>` for sidebar
- `<main>` for content
- Proper heading hierarchy (h2, h3, h4)

### ARIA
- `aria-label` where text isn't visible
- Semantic button/link usage
- Alert dialogs for destructive actions

## Conventions

### Imports Order
```tsx
'use client';

// React/Next
import { useState } from 'react';

// Third-party icons
import { Palette } from 'lucide-react';

// UI components
import { Button } from '@/components/ui/button';

// Local components
import { SettingsSection } from './settings-section';
```

### Component Pattern
```tsx
export function ComponentName() {
  // 1. State hooks
  // 2. Effect hooks
  // 3. Handlers
  // 4. Early returns (loading, errors)
  // 5. Main render
  return (...);
}
```

### Props Interfaces
```tsx
interface SettingsItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}
```

## Future Enhancements

### Potential Additions
- [ ] Notification preferences
- [ ] Privacy settings
- [ ] Keyboard shortcuts configuration
- [ ] Export/import data
- [ ] Two-factor authentication
- [ ] Session management

### Performance
- Consider `React.memo` for nav items
- Lazy load heavy settings sections
- Debounce save operations

## Testing Notes

### User Flows
1. Theme switching (light/dark/system)
2. Speech language selection → on-device check
3. Delete all chats → confirmation → success
4. Mobile navigation between tabs
5. Desktop sidebar navigation

### Edge Cases
- Speech API not supported
- No session data (logged out)
- On-device model download failure
- Delete chats API error
