import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for SafeTube Kids.
 *
 * Runs the same web app inside a native WebView for iOS, Android and
 * Android TV. Build web first (`bun run build`), then `npx cap sync`.
 *
 * For live-reload during development, set `server.url` to your Lovable
 * preview URL. Leave commented out for release builds.
 */
const config: CapacitorConfig = {
  appId: "com.safetube.kids",
  appName: "SafeTube Kids",
  webDir: "dist",
  backgroundColor: "#FFF7EDFF",
  // server: {
  //   url: "https://safe-whitelisted-play.lovable.app",
  //   cleartext: false,
  // },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#FFF7EDFF",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DEFAULT",
      backgroundColor: "#FFF7EDFF",
    },
  },
};

export default config;
