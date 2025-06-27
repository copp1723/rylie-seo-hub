# Rylie SEO Hub - Mobile Testing Checklist

## Device Testing Matrix

### Priority Devices
- [ ] iPhone 14/15 (iOS 17+)
- [ ] iPhone SE (small screen)
- [ ] Samsung Galaxy S23
- [ ] Google Pixel 7
- [ ] iPad (tablet view)

## Mobile-Specific Test Cases

### 1. Touch Interactions
- [ ] All buttons have adequate touch targets (min 44x44px)
- [ ] No hover-dependent functionality
- [ ] Swipe gestures work where expected
- [ ] Double-tap zoom is disabled on form inputs

### 2. Navigation
- [ ] Mobile menu opens/closes properly
- [ ] Menu items are easily tappable
- [ ] Back button behavior is correct
- [ ] Deep links work correctly

### 3. Chat Interface Mobile
- [ ] Keyboard doesn't cover input field
- [ ] Messages scroll properly
- [ ] Copy/paste functionality works
- [ ] Voice input works (if supported)
- [ ] Chat input auto-focuses appropriately

### 4. Forms on Mobile
- [ ] Form fields use appropriate input types
  - [ ] Email fields: type="email"
  - [ ] Phone fields: type="tel"
  - [ ] Number fields: type="number"
- [ ] Auto-capitalization is set correctly
- [ ] Form validation messages are visible
- [ ] Submit buttons remain accessible with keyboard open

### 5. Order Management Mobile
- [ ] Order cards are readable on small screens
- [ ] Filtering/sorting works via touch
- [ ] Order details page is properly formatted
- [ ] Status badges are clearly visible

### 6. Performance on Mobile
- [ ] Page load time < 3 seconds on 4G
- [ ] Smooth scrolling (60 fps)
- [ ] Images are optimized for mobile
- [ ] No horizontal scrolling
- [ ] Tap delays are minimized

### 7. Offline Behavior
- [ ] Appropriate error messages when offline
- [ ] Cached content displays when available
- [ ] Forms handle offline submission gracefully

### 8. Orientation Testing
- [ ] Portrait mode layout is correct
- [ ] Landscape mode layout is correct
- [ ] Orientation changes don't lose data
- [ ] Modal/popup positioning is correct

### 9. Accessibility on Mobile
- [ ] Text is readable without zooming
- [ ] Color contrast meets WCAG standards
- [ ] Screen reader compatibility
- [ ] Focus indicators are visible

### 10. Platform-Specific Issues

#### iOS Specific
- [ ] Safe area insets respected (notch/home indicator)
- [ ] Rubber band scrolling works naturally
- [ ] Status bar color matches app theme
- [ ] Back swipe gesture works

#### Android Specific
- [ ] Back button behavior is correct
- [ ] System navigation doesn't interfere
- [ ] Material Design patterns followed where appropriate

## Quick Mobile Testing Setup

### Chrome DevTools Device Mode
1. Open Chrome DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Select device preset or custom size
4. Test these viewports:
   - 375x667 (iPhone SE)
   - 390x844 (iPhone 14)
   - 360x800 (Android)
   - 768x1024 (iPad)

### Real Device Testing Tips
1. Clear browser cache before testing
2. Test on both WiFi and cellular
3. Test with low battery mode enabled
4. Test with accessibility features on
5. Test in both light and dark mode

## Common Mobile Issues to Watch For

1. **Text too small**: Ensure min font size 16px
2. **Buttons too close**: Min 8px spacing between tappable elements
3. **Fixed positioning issues**: Test with keyboard open
4. **Viewport issues**: Ensure viewport meta tag is set correctly
5. **Image sizing**: Use responsive images with srcset
6. **Z-index problems**: Modals/dropdowns behind other elements
7. **Input zoom**: Prevent zoom on input focus (font-size: 16px)

## Mobile Performance Budget

- First Contentful Paint: < 1.8s
- Time to Interactive: < 3.9s
- Total Page Weight: < 1MB
- JavaScript Bundle: < 300KB
- Image Weight: < 500KB

## Reporting Mobile Issues

When reporting mobile-specific bugs, include:
1. Device model and OS version
2. Browser and version
3. Network type (WiFi/4G/5G)
4. Screenshot with device frame
5. Screen recording if interaction issue
6. Touch target measurements if applicable