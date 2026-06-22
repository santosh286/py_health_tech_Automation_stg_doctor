/**
 * Applies comprehensive anti-detection patches via addInitScript.
 * Covers every signal Cloudflare's bot scoring checks in-browser.
 * Call this in beforeEach: await applyStealthScripts(page)
 */
export async function applyStealthScripts(page) {
  // 1 — navigator.webdriver
  await page.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
  });

  // 2 — chrome.runtime (full mock — bare object is a known bot signal)
  await page.addInitScript(() => {
    if (!window.chrome) {
      Object.defineProperty(window, 'chrome', {
        writable: true, enumerable: true, configurable: false, value: {},
      });
    }
    if (!window.chrome.runtime) {
      window.chrome.runtime = {
        get id() { return undefined; },
        connect: null,
        sendMessage: null,
        OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
        OnRestartRequiredReason: { APP_UPDATE: 'app_update', GC: 'gc', OS_UPDATE: 'os_update' },
        PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
        PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
        RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
      };
    }
    if (!window.chrome.app) {
      window.chrome.app = {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        getDetails: function getDetails() {},
        getIsInstalled: function getIsInstalled() {},
        installState: function installState() {},
        runningState: function runningState() {},
      };
    }
  });

  // 3 — navigator.plugins (real Chrome always has 3 built-in plugins)
  await page.addInitScript(() => {
    const makeMimeType = (type, desc, ext, plugin) => {
      const mt = Object.create(MimeType.prototype);
      Object.defineProperties(mt, {
        type:        { value: type,   enumerable: true },
        description: { value: desc,   enumerable: true },
        suffixes:    { value: ext,    enumerable: true },
        enabledPlugin: { value: plugin, enumerable: true },
      });
      return mt;
    };

    const makePlugin = (name, desc, filename, mimeTypes) => {
      const p = Object.create(Plugin.prototype);
      Object.defineProperties(p, {
        name:        { value: name,     enumerable: true },
        description: { value: desc,     enumerable: true },
        filename:    { value: filename, enumerable: true },
        length:      { value: mimeTypes.length },
      });
      mimeTypes.forEach((mt, i) => {
        Object.defineProperty(p, i, { value: mt, enumerable: true });
        Object.defineProperty(p, mt.type, { value: mt, enumerable: false });
      });
      p[Symbol.iterator] = function* () { for (let i = 0; i < mimeTypes.length; i++) yield mimeTypes[i]; };
      return p;
    };

    const plugins = [];
    const pdf = makePlugin('PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer', []);
    const pdfMt1 = makeMimeType('application/pdf', 'Portable Document Format', 'pdf', pdf);
    const pdfMt2 = makeMimeType('text/pdf', 'Portable Document Format', 'pdf', pdf);
    plugins.push(makePlugin('PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer', [pdfMt1, pdfMt2]));
    plugins.push(makePlugin('Chrome PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer', [pdfMt1, pdfMt2]));
    plugins.push(makePlugin('Chromium PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer', [pdfMt1, pdfMt2]));
    plugins.push(makePlugin('Microsoft Edge PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer', [pdfMt1, pdfMt2]));
    plugins.push(makePlugin('WebKit built-in PDF', 'Portable Document Format', 'internal-pdf-viewer', [pdfMt1, pdfMt2]));

    const pluginArray = Object.create(PluginArray.prototype);
    plugins.forEach((p, i) => {
      Object.defineProperty(pluginArray, i, { value: p, enumerable: true });
      Object.defineProperty(pluginArray, p.name, { value: p, enumerable: false });
    });
    Object.defineProperty(pluginArray, 'length', { value: plugins.length });
    pluginArray[Symbol.iterator] = function* () { for (let i = 0; i < plugins.length; i++) yield plugins[i]; };
    pluginArray.item = (i) => plugins[i] || null;
    pluginArray.namedItem = (name) => plugins.find(p => p.name === name) || null;
    pluginArray.refresh = function refresh() {};

    Object.defineProperty(navigator, 'plugins', { get: () => pluginArray });
  });

  // 4 — navigator.languages
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  // 5 — navigator.permissions (Notification permission leak fix)
  await page.addInitScript(() => {
    if (!navigator.permissions) return;
    const orig = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (params) =>
      params.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission, onchange: null })
        : orig(params);
  });

  // 6 — WebGL vendor/renderer (headless Chrome returns "Google SwiftShader" — a bot signal)
  await page.addInitScript(() => {
    const getParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return 'Intel Inc.';                    // UNMASKED_VENDOR_WEBGL
      if (param === 37446) return 'Intel Iris OpenGL Engine';      // UNMASKED_RENDERER_WEBGL
      return getParam.call(this, param);
    };
    const getParam2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return 'Intel Inc.';
      if (param === 37446) return 'Intel Iris OpenGL Engine';
      return getParam2.call(this, param);
    };
  });

  // 7 — window.outerWidth / outerHeight (headless returns 0)
  await page.addInitScript(() => {
    if (window.outerWidth === 0) {
      Object.defineProperty(window, 'outerWidth',  { get: () => window.innerWidth });
      Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 80 });
    }
  });

  // 8 — navigator.vendor
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });
  });
}
