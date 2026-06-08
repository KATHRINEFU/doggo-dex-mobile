import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCollection } from "@/context/CollectionContext";
import { DetectionResultModal } from "@/components/DetectionResultModal";
import { useDetectDogBreed, useGetDogBreeds } from "@workspace/api-client-react";
import type { DetectBreedResult, DogBreed } from "@workspace/api-client-react";

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addDog, isCollected, collectionCount } = useCollection();

  const [detecting, setDetecting] = useState(false);
  const [imageUri, setImageUri] = useState("");
  const [result, setResult] = useState<DetectBreedResult | null>(null);
  const [matchedBreed, setMatchedBreed] = useState<DogBreed | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { data: allBreeds } = useGetDogBreeds();
  const detectMutation = useDetectDogBreed();

  async function pickAndDetect(fromCamera: boolean) {
    try {
      let picked: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          Alert.alert("Permission needed", "Camera permission is required to take photos.");
          return;
        }
        picked = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
          allowsEditing: true,
          aspect: [1, 1],
        });
      } else {
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!granted) {
          Alert.alert("Permission needed", "Photo library permission is required.");
          return;
        }
        picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
          allowsEditing: true,
          aspect: [1, 1],
        });
      }

      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      if (!asset.base64) {
        Alert.alert("Error", "Could not read image data.");
        return;
      }

      setImageUri(asset.uri);
      setDetecting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const res = await detectMutation.mutateAsync({
        data: {
          imageBase64: asset.base64,
          mimeType: asset.mimeType ?? "image/jpeg",
        },
      });

      setResult(res);

      // Find matched breed in DB
      if (res.breedId && allBreeds) {
        const found = allBreeds.find((b) => b.id === res.breedId) ?? null;
        setMatchedBreed(found);
      } else {
        setMatchedBreed(null);
      }

      setModalVisible(true);
    } catch (err) {
      Alert.alert("Detection failed", "Could not analyze the image. Please try again.");
    } finally {
      setDetecting(false);
    }
  }

  async function handleCollect() {
    if (!result || !imageUri) return;
    await addDog({
      breedId: result.breedId,
      breedName: result.breedName,
      imageUri,
      collectedAt: new Date().toISOString(),
      confidence: result.confidence,
      description: result.description,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  }

  const totalBreeds = allBreeds?.length ?? 32;
  const progressPct = Math.min((collectionCount / totalBreeds) * 100, 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={["#3396D3", "#1a7ab5"]}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
      >
        <Text style={styles.headerTitle}>DogDex</Text>
        <Text style={styles.headerSub}>Gotta sniff 'em all!</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{collectionCount}/{totalBreeds} breeds</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Big scan card */}
        <View
          style={[
            styles.scanCard,
            { backgroundColor: colors.card, borderRadius: colors.radius + 4 },
          ]}
        >
          <View style={[styles.pawIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="paw" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.scanTitle, { color: colors.foreground }]}>Spot a Dog?</Text>
          <Text style={[styles.scanSub, { color: colors.mutedForeground }]}>
            Take a photo or upload one to identify the breed and add it to your collection!
          </Text>

          {detecting ? (
            <View style={styles.detectingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.detectingText, { color: colors.mutedForeground }]}>
                Analyzing breed...
              </Text>
            </View>
          ) : (
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: colors.primary, borderRadius: colors.radius },
                ]}
                onPress={() => pickAndDetect(true)}
              >
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.actionBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors.secondary,
                    borderRadius: colors.radius,
                    borderWidth: 2,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => pickAndDetect(false)}
              >
                <Ionicons name="images" size={24} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Upload</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* How it works */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How It Works</Text>
        <View style={styles.steps}>
          {[
            { icon: "camera-outline", text: "Take or upload a dog photo" },
            { icon: "search-outline", text: "AI identifies the breed instantly" },
            { icon: "albums-outline", text: "Add it to your DogDex collection" },
            { icon: "ribbon-outline", text: "Earn medals as you collect more!" },
          ].map((step, i) => (
            <View
              key={i}
              style={[
                styles.step,
                { backgroundColor: colors.card, borderRadius: colors.radius },
              ]}
            >
              <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Ionicons name={step.icon as any} size={20} color={colors.primary} />
              <Text style={[styles.stepText, { color: colors.foreground }]}>{step.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <DetectionResultModal
        visible={modalVisible}
        result={result}
        breed={matchedBreed}
        imageUri={imageUri}
        alreadyCollected={result ? isCollected(result.breedId) : false}
        onCollect={handleCollect}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
  },
  progressRow: {
    gap: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFF0CE",
    borderRadius: 4,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  scanCard: {
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  pawIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scanTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  scanSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  detectingContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  detectingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  actionBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  steps: {
    gap: 10,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  stepText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
