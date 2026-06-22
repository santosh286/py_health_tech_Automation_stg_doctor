# Test Helpers

## stealth.js

Applies 8 anti-detection patches via `page.addInitScript()` to pass Cloudflare bot checks.

### Usage

```js
import { applyStealthScripts } from '../helpers/stealth.js';

test.beforeEach(async ({ page }) => {
  await applyStealthScripts(page);
});
```

### Patches Applied

| # | Patch | Why |
|---|-------|-----|
| 1 | Delete `navigator.webdriver` | Primary automation detection flag Cloudflare checks first |
| 2 | Full `chrome.runtime` object | Bare `{ runtime: {} }` is a well-known bot fingerprint |
| 3 | `navigator.plugins` — 5 real PDF reader entries | Empty array = headless signal |
| 4 | `navigator.languages = ['en-US', 'en']` | Automation often has empty languages |
| 5 | `navigator.permissions.query` patch | Notifications API leaks automation context |
| 6 | WebGL vendor → `'Intel Inc.'` / `'Intel Iris OpenGL Engine'` | Headless returns `'Google SwiftShader'` — known bot signal |
| 7 | `window.outerWidth/outerHeight` fix | Headless Chrome returns 0; real Chrome returns viewport + chrome UI height |
| 8 | `navigator.vendor = 'Google Inc.'` | Missing or wrong vendor string is a fingerprint signal |

### When Cloudflare Still Blocks

These patches cover **JavaScript-visible** signals only. If Cloudflare still blocks:

1. **IP allowlist** — ask DevOps to allowlist the test runner IP in the Cloudflare firewall rule for the staging domain. This is the most reliable fix.
2. **Turnstile CAPTCHA** — if the site shows a "I'm human" checkbox, no JS patch can bypass it. Requires human interaction or IP allowlist.
3. **JS challenge auto-resolves** — `waitForCloudflare()` in `mobile_concern.spec.js` polls for up to 20s for the challenge to auto-resolve before failing the test.
