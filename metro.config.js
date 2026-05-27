/**
 * Metro bundler config — overrides Expo's defaults only where needed.
 *
 * Why this file exists:
 *   @supabase/supabase-js v2 ships an optional OpenTelemetry tracing
 *   hook that does a runtime `import('@opentelemetry/api').catch(...)`.
 *   Webpack, Turbopack, and Vite all honor the `webpackIgnore` /
 *   `turbopackIgnore` / `@vite-ignore` comments next to that import,
 *   so they skip the resolution. Metro doesn't — it tries to resolve
 *   the package statically at build time and bails because we don't
 *   have @opentelemetry/api installed (and don't need it; the catch
 *   returns null and Supabase no-ops tracing).
 *
 *   Fix: tell Metro to treat that specific module name as an empty
 *   module. Supabase's `.catch(() => null)` handles the runtime no-op
 *   gracefully. Zero bundle impact.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro doesn't honor package.json `exports` subpath maps by default,
// which breaks any modern package that uses them (botid, @vercel/sandbox,
// etc.). Opt in to the modern resolver.
config.resolver.unstable_enablePackageExports = true;

const OPTIONAL_EMPTY_MODULES = new Set([
  '@opentelemetry/api',
]);

// Web-only modules: shim to empty on native builds so the dynamic
// import doesn't blow up the dependency graph. The runtime guards
// (`Platform.OS !== 'web' return`) prevent execution; this prevents
// resolution failure during the native bundle pass.
const WEB_ONLY_PREFIXES = ['botid'];

const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (OPTIONAL_EMPTY_MODULES.has(moduleName)) {
    return { type: 'empty' };
  }
  if (platform !== 'web') {
    for (const prefix of WEB_ONLY_PREFIXES) {
      if (moduleName === prefix || moduleName.startsWith(`${prefix}/`)) {
        return { type: 'empty' };
      }
    }
  }
  if (typeof originalResolve === 'function') {
    return originalResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
