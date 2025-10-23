import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gradocerrado.app',
  appName: 'GradoCerrado',
  webDir: 'www',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  // ⬇️ AGREGAR ESTO
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;