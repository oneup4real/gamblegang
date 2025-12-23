import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oneup4real.gamblegang',
  appName: 'GambleGang',
  webDir: 'out',
  server: {
    url: 'https://gamblegang-926e3.web.app',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'gamblegang-926e3.web.app',
      '*.firebaseapp.com',
      '*.googleapis.com',
      '*.google.com'
    ]
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
