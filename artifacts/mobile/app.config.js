module.exports = {
  expo: {
    name: "Doggo Dex",
    slug: "doggodex",
    owner: "lizhen",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mobile",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#5AC8FA",
    },
    ios: {
      bundleIdentifier: "com.lizhen.doggodex",
      supportsTablet: false,
      infoPlist: {
        NSCameraUsageDescription:
          "Doggo Dex uses your camera to take photos of dogs for breed detection.",
        NSPhotoLibraryUsageDescription:
          "Doggo Dex accesses your photo library so you can pick dog photos for breed detection.",
      },
    },
    android: {
      package: "com.lizhen.doggodex",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#5AC8FA",
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
      ],
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
    assets: [
      "./assets/ml/dog_breed_classifier.tflite",
      "./assets/ml/labels.json",
      "./assets/ml/breed_index_to_id.json",
    ],
    plugins: [
      [
        "expo-router",
        {
          origin: "https://replit.com/",
        },
      ],
      "expo-font",
      "expo-web-browser",
      "./plugins/withReactNativeSpmGuard",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Doggo Dex accesses your photos to identify dog breeds.",
          cameraPermission: "Doggo Dex uses your camera to take photos of dogs.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Doggo Dex uses your camera for the AR background and to scan dog breeds.",
          microphonePermission: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: "603150f3-fa2a-4aa0-b7de-25a20c9f0c44",
      },
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      domain: process.env.REPLIT_DEV_DOMAIN || process.env.EXPO_PUBLIC_DOMAIN,
    },
  },
};
