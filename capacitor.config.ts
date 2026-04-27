// capacitor.config.ts — Capacitor native platform configuration
// Authors: WU Shaowei & Li Mu — Native plugin integration for A3
// Plugins: @capacitor/network (Network status), @capacitor/camera (Photo capture)
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inventorymanager.app',
  appName: 'Inventory Manager',
  webDir: 'www',
  server: {
    // In development, allow connections to the SCU API server
    androidScheme: 'https'
  },
  plugins: {
    // Network plugin configuration
    Network: {
      // Use native network status detection on mobile devices
    },
    // Camera plugin configuration
    Camera: {
      // Camera permissions prompt settings
      permissions: ['camera', 'photos'],
      // Image quality (0-100)
      quality: 85,
      // Allow editing after capture
      allowEditing: false,
      // Correct orientation
      correctOrientation: true,
      // Save to gallery
      saveToGallery: false,
      // Output format
      resultType: 'base64' // base64 for easy upload to API
    }
  }
};

export default config;
