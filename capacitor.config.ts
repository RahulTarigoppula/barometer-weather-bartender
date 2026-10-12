import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rahul.barometer', // NEVER changes after the first install
  appName: 'The Globe Bar',
  webDir: 'dist',
  android: {
    webContentsDebuggingEnabled: process.env.CAP_WEBVIEW_DEBUG === '1', // release builds ship false
    backgroundColor: '#1A0F0A', // kills the white flash
  },
  plugins: {
    SplashScreen: { backgroundColor: '#1A0F0A', showSpinner: false, launchAutoHide: false },
    StatusBar: { overlaysWebView: true, style: 'DARK', backgroundColor: '#00000000' },
  },
};

export default config;
