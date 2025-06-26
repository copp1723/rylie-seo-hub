# Rylie SEO Hub - Bug Report Template

## Bug Report #[NUMBER]

**Date**: [YYYY-MM-DD]  
**Reporter**: [Your Name]  
**Environment**: Production (https://rylie-seo-hub.onrender.com)

### Bug Summary
[One-line description of the issue]

### Feature Area
- [ ] Authentication
- [ ] Chat Interface
- [ ] Order Management
- [ ] Webhook Integration
- [ ] User Management
- [ ] Theme Customization
- [ ] API
- [ ] Mobile Experience
- [ ] Performance
- [ ] Other: ___________

### Severity
- [ ] 🔴 Critical (Blocks core functionality)
- [ ] 🟠 High (Major feature broken)
- [ ] 🟡 Medium (Feature partially working)
- [ ] 🟢 Low (Minor issue/cosmetic)

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [Continue numbering...]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots/Evidence
[Paste screenshots or error messages here]

### Browser/Device Information
- **Browser**: [Chrome/Firefox/Safari/Edge] [Version]
- **OS**: [Windows/Mac/Linux/iOS/Android]
- **Screen Size**: [Desktop/Tablet/Mobile]
- **Device**: [If mobile, specify model]

### Console Errors
```
[Paste any JavaScript console errors here]
```

### Network Errors
```
[Paste any failed network requests here]
```

### Additional Context
[Any other relevant information]

### Suggested Fix
[If you have ideas about the solution]

---

## Example Bug Report

### Bug Report #001

**Date**: 2025-06-26  
**Reporter**: QA Tester  
**Environment**: Production (https://rylie-seo-hub.onrender.com)

### Bug Summary
Health check API endpoint returns 404 instead of health status

### Feature Area
- [x] API

### Severity
- [x] 🟡 Medium (Feature partially working)

### Steps to Reproduce
1. Send GET request to https://rylie-seo-hub.onrender.com/api/health
2. Observe response

### Expected Behavior
Should return JSON response with health status, e.g.:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-26T13:30:00Z"
}
```

### Actual Behavior
Returns 404 HTML page

### Screenshots/Evidence
```
HTTP/2 404
Content-Type: text/html
[HTML content of 404 page]
```

### Browser/Device Information
- **Browser**: N/A (API test)
- **OS**: macOS
- **Testing Tool**: curl

### Console Errors
N/A

### Network Errors
404 Not Found

### Additional Context
This endpoint is typically used for monitoring and health checks. Its absence may affect uptime monitoring.

### Suggested Fix
Implement a basic health check endpoint at `/api/health` that returns system status.