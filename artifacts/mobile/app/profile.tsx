import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useClerk, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useCollection } from "@/context/CollectionContext";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { collectionCount, xp, streak } = useCollection();

  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const startEditing = () => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      setEditingName(false);
    } catch (e: any) {
      const msg = e?.errors?.[0]?.longMessage ?? "Failed to update name. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to change your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      const file = {
        uri: result.assets[0].uri,
        type: result.assets[0].mimeType ?? "image/jpeg",
        name: "profile.jpg",
      } as unknown as File;
      await user?.setProfileImage({ file });
      await user?.reload();
    } catch (e: any) {
      const msg = e?.errors?.[0]?.longMessage ?? "Failed to update photo. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      user.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
      "Trainer"
    : "Trainer";

  const trainerLevel = Math.floor(collectionCount / 5) + 1;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={22} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      {!isLoaded ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar — tap to change */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handleChangePhoto} style={styles.avatarWrapper}>
              {uploadingPhoto ? (
                <View style={[styles.avatarPlaceholder, { justifyContent: "center", alignItems: "center" }]}>
                  <ActivityIndicator color="rgba(255,255,255,0.8)" />
                </View>
              ) : user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Feather name="user" size={40} color="#94A3B8" />
                </View>
              )}
              {/* Camera badge */}
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={12} color="#fff" />
              </View>
            </Pressable>
            <Text style={styles.displayName}>{displayName}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lv. {trainerLevel} DogDex Trainer</Text>
            </View>
            {user?.emailAddresses?.[0]?.emailAddress && (
              <Text style={styles.email}>{user.emailAddresses[0].emailAddress}</Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { icon: "hash", value: String(collectionCount), label: "Breeds" },
              { icon: "zap", value: String(xp), label: "XP" },
              { icon: "flame", value: String(streak), label: "Streak" },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Feather name={s.icon as any} size={18} color="#94A3B8" />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Edit name */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Display Name</Text>
              {!editingName && (
                <Pressable onPress={startEditing} hitSlop={8}>
                  <Feather name="edit-2" size={16} color="rgba(255,255,255,0.6)" />
                </Pressable>
              )}
            </View>

            {editingName ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="First name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Last name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={lastName}
                  onChangeText={setLastName}
                />
                <View style={styles.editBtns}>
                  <Pressable style={styles.cancelBtn} onPress={() => setEditingName(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.saveBtn} onPress={handleSaveName} disabled={saving}>
                    {saving ? <ActivityIndicator color="#2C5EAD" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.fieldValue}>{displayName}</Text>
            )}
          </View>

          {/* Username (read-only display) */}
          {user?.username ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Username</Text>
              <Text style={styles.fieldValue}>@{user.username}</Text>
            </View>
          ) : null}

          {/* Sign out */}
          <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
            <Feather name="log-out" size={18} color="#FF6B6B" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const CARD_BG = "rgba(255,255,255,0.14)";
const CARD_BORDER = "rgba(255,255,255,0.28)";

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 8,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
  scroll: { padding: 20, gap: 14 },

  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: "rgba(255,255,255,0.6)",
  },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute", bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#2C5EAD",
    borderWidth: 2, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  levelBadge: {
    backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  levelText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "rgba(255,255,255,0.9)" },
  email: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.6)" },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: CARD_BG, borderWidth: 1,
    borderColor: CARD_BORDER, borderRadius: 14, padding: 14,
    alignItems: "center", gap: 3,
  },
  statIcon: { marginBottom: 2 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)" },

  card: {
    backgroundColor: CARD_BG, borderWidth: 1,
    borderColor: CARD_BORDER, borderRadius: 20, padding: 18, gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 1,
    color: "rgba(255,255,255,0.65)", textTransform: "uppercase",
  },
  fieldValue: { fontFamily: "Inter_500Medium", fontSize: 16, color: "#fff" },

  input: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    color: "#fff", fontFamily: "Inter_400Regular", fontSize: 15,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  editBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10, paddingVertical: 12, alignItems: "center",
  },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.75)", fontSize: 14 },
  saveBtn: {
    flex: 1, backgroundColor: "#fff",
    borderRadius: 10, paddingVertical: 12, alignItems: "center",
  },
  saveBtnText: { fontFamily: "Inter_700Bold", color: "#2C5EAD", fontSize: 14 },

  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: "rgba(255,107,107,0.12)",
    borderWidth: 1, borderColor: "rgba(255,107,107,0.3)",
    borderRadius: 16, paddingVertical: 16, marginTop: 4,
  },
  signOutText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#FF6B6B" },
});
