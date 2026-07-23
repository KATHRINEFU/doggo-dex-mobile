import React, { useState, useEffect } from "react";
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
import { useClerk, useUser, useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useCollection } from "@/context/CollectionContext";
import { CountryPickerModal, type CountryOption } from "@/components/CountryPicker";
import {
  useGetMyProfile,
  useSyncUser,
  getGetLeaderboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const { collectionCount, xp, streak } = useCollection();

  // DB profile — wait until Clerk auth is ready so the token getter is registered
  const { data: profile, refetch: refetchProfile } = useGetMyProfile(
    { query: { enabled: isLoaded && !!user, retry: 2 } } as any,
  );

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Country editing
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Photo
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Optimistic display name (in case the DB hasn't synced yet)
  const [localDisplayName, setLocalDisplayName] = useState<string | null>(null);

  const syncUser = useSyncUser();
  const queryClient = useQueryClient();

  const apiBase = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";

  // Source of truth: local override → DB → Clerk → fallback
  const displayName =
    localDisplayName ??
    profile?.displayName ??
    (user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.username ||
        "Trainer"
      : "Trainer");

  const trainerLevel = Math.floor(collectionCount / 5) + 1;

  // Clear local override once DB profile is loaded with matching data
  useEffect(() => {
    if (localDisplayName && profile?.displayName === localDisplayName) {
      setLocalDisplayName(null);
    }
  }, [profile?.displayName, localDisplayName]);

  const startEditing = () => {
    const dbName = profile?.displayName ?? "";
    const parts = dbName ? dbName.split(" ") : [];
    setFirstName(parts[0] ?? user?.firstName ?? "");
    setLastName((parts.slice(1).join(" ") || user?.lastName) ?? "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const newName =
      [trimmedFirst, trimmedLast].filter(Boolean).join(" ") || "Trainer";
    // Optimistic UI — show new name immediately
    setLocalDisplayName(newName);
    setEditingName(false);
    setSavingName(true);
    try {
      const token = await getToken();
      await fetch(`${apiBase}/api/users/display-name`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ displayName: newName }),
      });
      // Silently update Clerk too
      user
        ?.update({ firstName: trimmedFirst, lastName: trimmedLast })
        .catch(() => {});
      refetchProfile();
      // Bust leaderboard cache so rank tab shows new name immediately
      queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
    } catch {
      // keep optimistic override, user sees the new name even if save failed
    } finally {
      setSavingName(false);
    }
  };

  const handleSelectCountry = async (option: CountryOption) => {
    if (!profile?.username) return;
    try {
      await syncUser.mutateAsync({
        data: {
          username: profile.username,
          displayName: displayName,
          country: option.name,
          countryFlag: option.code,
        },
      });
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
    } catch {
      Alert.alert("Error", "Failed to update country. Please try again.");
    }
  };

  const handleChangePhoto = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please allow photo access to change your profile photo."
        );
        return;
      }
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
      const uri = result.assets[0].uri;
      let file: File;
      if (Platform.OS === "web") {
        // On web: convert blob URL to a proper File object
        const response = await fetch(uri);
        const blob = await response.blob();
        file = new File([blob], "profile.jpg", {
          type: blob.type || "image/jpeg",
        });
      } else {
        file = {
          uri,
          type: result.assets[0].mimeType ?? "image/jpeg",
          name: "profile.jpg",
        } as unknown as File;
      }
      await user?.setProfileImage({ file });
      await user?.reload();
    } catch (e: any) {
      const msg =
        e?.errors?.[0]?.longMessage ??
        "Failed to update photo. Please try again.";
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
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handleChangePhoto} style={styles.avatarWrapper}>
              {uploadingPhoto ? (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  <ActivityIndicator color="rgba(255,255,255,0.8)" />
                </View>
              ) : user?.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Feather name="user" size={40} color="#94A3B8" />
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={12} color="#fff" />
              </View>
            </Pressable>
            <Text style={styles.displayName}>{displayName}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>
                Lv. {trainerLevel} PawDex Trainer
              </Text>
            </View>
            {user?.emailAddresses?.[0]?.emailAddress && (
              <Text style={styles.email}>
                {user.emailAddresses[0].emailAddress}
              </Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { icon: "hash", value: String(collectionCount), label: "Breeds" },
              { icon: "battery", value: String(xp), label: "XP" },
              { icon: "sun", value: String(streak), label: "Streak" },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Feather
                  name={s.icon as any}
                  size={18}
                  color="rgba(255,255,255,0.85)"
                />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Display Name */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Display Name</Text>
              {!editingName && (
                <Pressable onPress={startEditing} hitSlop={8}>
                  <Feather
                    name="edit-2"
                    size={16}
                    color="rgba(255,255,255,0.6)"
                  />
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
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => setEditingName(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.saveBtn} onPress={handleSaveName}>
                    {savingName ? (
                      <ActivityIndicator color="#2C5EAD" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.fieldValue}>{displayName}</Text>
            )}
          </View>

          {/* Country */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Country</Text>
              {profile?.username && (
                <Pressable
                  onPress={() => setShowCountryPicker(true)}
                  hitSlop={8}
                  disabled={syncUser.isPending}
                >
                  <Feather
                    name="edit-2"
                    size={16}
                    color="rgba(255,255,255,0.6)"
                  />
                </Pressable>
              )}
            </View>
            {syncUser.isPending ? (
              <ActivityIndicator
                color="rgba(255,255,255,0.7)"
                size="small"
                style={{ alignSelf: "flex-start" }}
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.countryFlag ? `${profile.countryFlag}  ` : ""}
                {profile?.country || "—"}
              </Text>
            )}
          </View>

          {/* Username (read-only) */}
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

      <CountryPickerModal
        visible={showCountryPicker}
        selected={profile?.countryFlag}
        onSelect={(option) => {
          setShowCountryPicker(false);
          handleSelectCountry(option);
        }}
        onClose={() => setShowCountryPicker(false)}
      />
    </View>
  );
}

const CARD_BG = "rgba(255,255,255,0.14)";
const CARD_BORDER = "rgba(255,255,255,0.28)";

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff" },
  scroll: { padding: 20, gap: 14 },

  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.6)",
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2C5EAD",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  levelBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  levelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  email: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 3,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },

  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1,
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
  },
  fieldValue: { fontFamily: "Inter_500Medium", fontSize: 16, color: "#fff" },

  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#fff",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  editBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    color: "#2C5EAD",
    fontSize: 14,
  },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,107,107,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  signOutText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FF6B6B",
  },
});
