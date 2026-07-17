import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as ImagePicker from "expo-image-picker";
import { useSSO, useSignUp, useUser } from "@clerk/expo";
import { useRouter, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

async function uploadPhoto(user: ReturnType<typeof useUser>["user"], uri: string) {
  if (!user) return;
  try {
    const file = { uri, type: "image/jpeg", name: "profile.jpg" } as unknown as File;
    await user.setProfileImage({ file });
  } catch (e) {
    console.error("Photo upload failed:", e);
  }
}

export default function SignUpScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startSSOFlow } = useSSO();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { user } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [readyToNavigate, setReadyToNavigate] = useState(false);
  const pendingPhotoRef = useRef<string | null>(null);

  useEffect(() => {
    if (readyToNavigate && user) {
      const doIt = async () => {
        if (pendingPhotoRef.current) {
          await uploadPhoto(user, pendingPhotoRef.current);
          pendingPhotoRef.current = null;
        }
        router.replace("/(tabs)");
      };
      doIt();
    }
  }, [readyToNavigate, user]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to set a profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleGoogle = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        if (photoUri) pendingPhotoRef.current = photoUri;
        setReadyToNavigate(true);
      }
    } catch (err) {
      console.error("Google SSO error:", JSON.stringify(err));
    }
  }, [startSSOFlow, photoUri]);

  const handleApple = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_apple",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        if (photoUri) pendingPhotoRef.current = photoUri;
        setReadyToNavigate(true);
      }
    } catch (err) {
      console.error("Apple SSO error:", JSON.stringify(err));
    }
  }, [startSSOFlow, photoUri]);

  const handleSignUp = async () => {
    if (!isLoaded) return;
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = "Username is required";
    if (!email.trim()) errs.email = "Email is required";
    if (!password.trim()) errs.password = "Password is required";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
        username: username.trim().toLowerCase(),
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (err: any) {
      const clerkErrors = err?.errors ?? [];
      const newErrs: Record<string, string> = {};
      for (const e of clerkErrors) {
        if (e.meta?.paramName === "email_address") newErrs.email = e.longMessage ?? e.message;
        else if (e.meta?.paramName === "password") newErrs.password = e.longMessage ?? e.message;
        else if (e.meta?.paramName === "username") newErrs.username = e.longMessage ?? e.message;
        else newErrs.general = e.longMessage ?? e.message;
      }
      if (!Object.keys(newErrs).length) newErrs.general = "Something went wrong. Please try again.";
      setFieldErrors(newErrs);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verifyCode });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        if (photoUri) pendingPhotoRef.current = photoUri;
        setReadyToNavigate(true);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? "Invalid code. Please try again.";
      setFieldErrors({ code: msg });
    } finally {
      setLoading(false);
    }
  };

  if (signUp?.status === "missing_requirements" && signUp?.unverifiedFields?.includes("email_address")) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.card, { marginHorizontal: 24, marginTop: insets.top + 80 }]}>
          <Text style={styles.heading}>Verify your email</Text>
          <Text style={styles.sub}>We sent a code to {email}</Text>
          <Text style={styles.inputLabel}>Verification code</Text>
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            placeholderTextColor="rgba(0,0,0,0.35)"
            value={verifyCode}
            onChangeText={setVerifyCode}
            keyboardType="number-pad"
          />
          {fieldErrors.code && <Text style={styles.error}>{fieldErrors.code}</Text>}
          <Pressable style={styles.primaryBtn} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Start</Text>}
          </Pressable>
          <Pressable
            onPress={() => signUp.prepareEmailAddressVerification({ strategy: "email_code" })}
            style={{ marginTop: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#2C5EAD", fontFamily: "Inter_600SemiBold" }}>Resend code</Text>
          </Pressable>
        </View>
        <View nativeID="clerk-captcha" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="x" size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>

          {/* Profile photo picker */}
          <Pressable onPress={pickPhoto} style={styles.photoPicker}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Feather name="camera" size={28} color="rgba(255,255,255,0.7)" />
              </View>
            )}
            <View style={styles.photoEditBadge}>
              <Feather name="plus" size={12} color="#fff" />
            </View>
          </Pressable>
          <Text style={styles.photoHint}>Add profile photo (optional)</Text>

          <Text style={styles.title}>Start your{"\n"}DogDex journey!</Text>
          <Text style={styles.subtitle}>Create your trainer account to collect all 100 breeds</Text>

          <Pressable style={styles.socialBtn} onPress={handleGoogle}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.socialText}>Continue with Google</Text>
          </Pressable>

          <Pressable style={[styles.socialBtn, styles.appleBtn]} onPress={handleApple}>
            <FontAwesome name="apple" size={20} color="#fff" style={{ width: 24, textAlign: "center" }} />
            <Text style={[styles.socialText, { color: "#fff" }]}>Continue with Apple</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Username <Text style={{ color: "#E53E3E" }}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="trainer_name"
              placeholderTextColor="rgba(0,0,0,0.3)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
            />
            {fieldErrors.username && <Text style={styles.error}>{fieldErrors.username}</Text>}

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="trainer@dogdex.com"
              placeholderTextColor="rgba(0,0,0,0.3)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {fieldErrors.email && <Text style={styles.error}>{fieldErrors.email}</Text>}

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Min. 8 characters"
                placeholderTextColor="rgba(0,0,0,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="rgba(0,0,0,0.4)" />
              </Pressable>
            </View>
            {fieldErrors.password && <Text style={styles.error}>{fieldErrors.password}</Text>}
            {fieldErrors.general && <Text style={styles.error}>{fieldErrors.general}</Text>}

            <Pressable
              style={[styles.primaryBtn, (!username || !email || !password || loading) && styles.btnDisabled]}
              onPress={handleSignUp}
              disabled={!username || !email || !password || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
            </Pressable>

            <View nativeID="clerk-captcha" />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already a trainer? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable><Text style={styles.link}>Sign in</Text></Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2C5EAD" },
  scroll: { paddingHorizontal: 24, alignItems: "center" },
  backBtn: { alignSelf: "flex-end", padding: 8, marginBottom: 4 },

  photoPicker: { position: "relative", marginBottom: 6, marginTop: 4 },
  photoPreview: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: "rgba(255,255,255,0.7)" },
  photoPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  photoEditBadge: {
    position: "absolute", bottom: 2, right: 2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#2C5EAD",
    borderWidth: 2, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  photoHint: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginBottom: 16 },

  title: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.78)", textAlign: "center", marginBottom: 24, fontFamily: "Inter_400Regular" },

  socialBtn: {
    width: "100%", flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20,
    marginBottom: 12, gap: 12,
  },
  appleBtn: { backgroundColor: "#000" },
  googleG: { fontSize: 18, fontWeight: "700", color: "#333", width: 24, textAlign: "center" },
  socialText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#1a1a1a" },

  dividerRow: { flexDirection: "row", alignItems: "center", width: "100%", marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.35)" },
  dividerText: { color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", fontSize: 13 },

  card: {
    width: "100%", backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  inputLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#1A3A8F", marginBottom: 6, marginTop: 4, letterSpacing: 0.5 },
  input: {
    backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Inter_400Regular", color: "#111",
    marginBottom: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.07)",
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  eyeBtn: { padding: 8 },

  primaryBtn: {
    backgroundColor: "#2C5EAD", borderRadius: 12,
    paddingVertical: 15, alignItems: "center", marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },

  heading: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#111", marginBottom: 6 },
  sub: { fontSize: 13, color: "rgba(0,0,0,0.5)", marginBottom: 20, fontFamily: "Inter_400Regular" },
  error: { color: "#EF4444", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },

  footerRow: { flexDirection: "row", marginTop: 20, alignItems: "center" },
  footerText: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  link: { color: "#fff", fontFamily: "Inter_700Bold" },
});
