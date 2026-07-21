const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Bundle .tflite model files as static assets
config.resolver.assetExts.push("tflite");

module.exports = config;
