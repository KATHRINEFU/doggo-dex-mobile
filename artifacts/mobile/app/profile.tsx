import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  useGetDogBreeds,
  getGetLeaderboardQueryKey,
  getGetMyProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken, isSignedIn } = useAuth();
  const { collectionCount, xp, streak, addDog, isCollected, resetCollection } = useCollection();
  // Dev-only: breed catalog for seeding test data
  const { data: allBreeds } = useGetDogBreeds({ query: { enabled: __DEV__ } } as any);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/(auth)/sign-in");
    }
  }, [isLoaded, isSignedIn]);

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

  // Level info modal
  const [showLevelInfo, setShowLevelInfo] = useState(false);

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
    if (!isSignedIn) {
      Alert.alert("Sign in required", "Please sign in again before changing your country.");
      return;
    }
    // Fall back to Clerk username or email prefix if DB profile isn't synced yet
    const username =
      profile?.username ??
      user?.username ??
      user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ??
      "";
    if (!username) {
      Alert.alert("Username required", "Please set a username before selecting a country.");
      return;
    }
    try {
      await syncUser.mutateAsync({
        data: {
          username,
          displayName: displayName ?? null,
          country: option.name,
          // Convert ISO code (e.g. "US") to flag emoji (e.g. "🇺🇸")
          countryFlag: [...option.code.toUpperCase()]
            .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
            .join(""),
        },
      });
      // Invalidate both the profile cache (leaderboard screen reads its own copy
      // of useGetMyProfile to power the "My Country" scope) and the leaderboard.
      await queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
    } catch (err: any) {
      // Surface the actual reason instead of a generic retry message — the
      // status tells us whether it's auth, a name clash, or a server fault.
      const status: number | undefined = err?.status;
      const serverMessage: string | undefined = err?.data?.message;
      console.warn("[Profile] country update failed", status, serverMessage ?? err?.message);

      let message: string;
      if (status === 401) {
        message =
          "The server rejected your sign-in. Sign out and sign in again — if that doesn't help, update to the latest version of the app.";
      } else if (status === 409) {
        message =
          serverMessage ??
          `The name "${username}" is already taken. Pick a different name, then set your country.`;
      } else if (status === 400) {
        message = serverMessage ?? "That username or country wasn't accepted. Please try a different one.";
      } else if (status && status >= 500) {
        message = "The server couldn't save your country right now. Please try again in a moment.";
      } else if (status === undefined) {
        message = "Couldn't reach the server. Check your connection and try again.";
      } else {
        message = serverMessage ?? `Failed to update country (error ${status}).`;
      }
      Alert.alert("Couldn't update country", message);
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

  const handleResetAppData = () => {
    Alert.alert(
      "Start over?",
      "This permanently clears this device's Doggo Dex collection, XP, streak, and saved badge images, then signs you out. Your Clerk account is not deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset and sign out",
          style: "destructive",
          onPress: async () => {
            await resetCollection();
            queryClient.clear();
            await signOut();
            router.replace("/(auth)/sign-up");
          },
        },
      ],
    );
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
            <Pressable
              style={styles.levelBadge}
              onPress={() => setShowLevelInfo(true)}
              hitSlop={8}
            >
              <Text style={styles.levelText}>
                Lv.{trainerLevel} Trainer
              </Text>
              <Feather name="info" size={11} color="rgba(255,255,255,0.7)" style={{ marginLeft: 5 }} />
            </Pressable>
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
            </View>
            {syncUser.isPending ? (
              <ActivityIndicator
                color="rgba(255,255,255,0.7)"
                size="small"
                style={{ alignSelf: "flex-start" }}
              />
            ) : (
              <Pressable onPress={() => setShowCountryPicker(true)} hitSlop={4}>
                <Text style={styles.fieldValue}>
                  {profile?.countryFlag ? `${profile.countryFlag}  ` : ""}
                  {profile?.country || "Tap to set your country"}
                </Text>
              </Pressable>
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

          <Pressable
            style={[styles.signOutBtn, { borderColor: "rgba(255,107,107,0.55)" }]}
            onPress={handleResetAppData}
          >
            <Feather name="refresh-ccw" size={18} color="#FF6B6B" />
            <Text style={styles.signOutText}>Reset app data</Text>
          </Pressable>

          {/* Dev-only: seed test breeds for badge testing */}
          {__DEV__ && (
            <Pressable
              style={[styles.signOutBtn, { borderColor: "rgba(90,200,250,0.4)" }]}
              disabled={seeding}
              onPress={async () => {
                if (!allBreeds?.length) {
                  Alert.alert("Dev seed", "Breed catalog not loaded yet.");
                  return;
                }
                setSeeding(true);
                try {
                  const candidates = allBreeds.filter((b) => !isCollected(b.id)).slice(0, 10);
                  for (const b of candidates) {
                    await addDog({
                      breedId: b.id,
                      breedName: b.name,
                      imageUri: b.imageUrl,
                      collectedAt: new Date().toISOString(),
                      confidence: 0.95,
                      description: b.description,
                      rarity: b.rarity as any,
                    });
                  }
                  Alert.alert("Dev seed", `Added ${candidates.length} breeds to your local collection.`);
                } finally {
                  setSeeding(false);
                }
              }}
            >
              {seeding ? (
                <ActivityIndicator size="small" color="#5AC8FA" />
              ) : (
                <Feather name="plus-circle" size={18} color="#5AC8FA" />
              )}
              <Text style={[styles.signOutText, { color: "#5AC8FA" }]}>
                Dev: Seed 10 test breeds
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Level Info Modal */}
      <Modal
        visible={showLevelInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLevelInfo(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLevelInfo(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How levels work</Text>
              <Pressable onPress={() => setShowLevelInfo(false)} hitSlop={8}>
                <Feather name="x" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>

            <Text style={styles.modalFormula}>1 level per 5 breeds collected</Text>

            <View style={styles.modalStatRow}>
              <Feather name="hash" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.modalStatText}>
                You've collected <Text style={styles.modalBold}>{collectionCount} breed{collectionCount !== 1 ? "s" : ""}</Text>
                {" → "}
                <Text style={styles.modalBold}>Lv. {trainerLevel}</Text>
              </Text>
            </View>

            {(() => {
              const breedsToNext = 5 - (collectionCount % 5);
              const isExact = collectionCount % 5 === 0 && collectionCount > 0;
              return (
                <View style={styles.modalStatRow}>
                  <Feather name="trending-up" size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.modalStatText}>
                    {isExact
                      ? <><Text style={styles.modalBold}>5 more breeds</Text> to reach Lv. {trainerLevel + 1}</>
                      : <><Text style={styles.modalBold}>{breedsToNext} more breed{breedsToNext !== 1 ? "s" : ""}</Text> to reach Lv. {trainerLevel + 1}</>
                    }
                  </Text>
                </View>
              );
            })()}

            <Pressable style={styles.modalDismissBtn} onPress={() => setShowLevelInfo(false)}>
              <Text style={styles.modalDismissBtnText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
    flexDirection: "row",
    alignItems: "center",
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

  // Level info modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#1E3A6E",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#fff",
  },
  modalFormula: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: "hidden",
  },
  modalStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalStatText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    flex: 1,
  },
  modalBold: {
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  modalDismissBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  modalDismissBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});
