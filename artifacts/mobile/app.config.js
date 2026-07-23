module.exports = {
  expo: {
    name: "PawDex",
    slug: "pawdex",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mobile",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#0A1628",
    },
    ios: {
      bundleIdentifier: "com.pawdex.app",
      supportsTablet: false,
      infoPlist: {
        NSCameraUsageDescription:
          "PawDex uses your camera to take photos of dogs for breed detection.",
        NSPhotoLibraryUsageDescription:
          "PawDex accesses your photo library so you can pick dog photos for breed detection.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#0A1628",
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
      [
        "expo-image-picker",
        {
          photosPermission:
            "PawDex accesses your photos to identify dog breeds.",
          cameraPermission: "PawDex uses your camera to take photos of dogs.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "PawDex uses your camera for the AR background and to scan dog breeds.",
          microphonePermission: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      domain: process.env.REPLIT_DEV_DOMAIN,
    },
  },
};
