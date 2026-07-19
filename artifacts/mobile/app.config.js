module.exports = {
  expo: {
    name: "DogDex",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mobile",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#3396D3",
    },
    ios: {
      supportsTablet: false,
      infoPlist: {
        NSCameraUsageDescription:
          "DogDex uses your camera to take photos of dogs for breed detection.",
        NSPhotoLibraryUsageDescription:
          "DogDex accesses your photo library so you can pick dog photos for breed detection.",
      },
    },
    android: {
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
      ],
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
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
            "DogDex accesses your photos to identify dog breeds.",
          cameraPermission: "DogDex uses your camera to take photos of dogs.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "DogDex uses your camera for the AR background and to scan dog breeds.",
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
