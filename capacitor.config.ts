import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cloud.dziedzic.ballsort',
  appName: 'Łamigłówki',
  webDir: 'dist',
  android: {
    backgroundColor: '#213f57',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#213f57',
      showSpinner: false,
    },
  },
};

export default config;
