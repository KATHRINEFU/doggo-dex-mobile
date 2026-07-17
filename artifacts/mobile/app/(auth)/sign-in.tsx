import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSSO, useSignIn } from "@clerk/expo";
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

export default function SignInScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startSSOFlow } = useSSO();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleGoogle = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("Google SSO error:", JSON.stringify(err));
    }
  }, [startSSOFlow, router]);

  const handleApple = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_apple",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("Apple SSO error:", JSON.stringify(err));
    }
  }, [startSSOFlow, router]);

  const handleSignIn = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setFieldErrors({});
    try {
      const result = await signIn.create({
        strategy: "password",
        identifier: email,
        password,
      });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setFieldErrors({ general: `Unexpected status: ${result.status}. Please try again.` });
      }
    } catch (err: any) {
      const clerkErrors = err?.errors ?? [];
      const newErrs: Record<string, string> = {};
      for (const e of clerkErrors) {
        const param = e.meta?.paramName;
        if (param === "identifier") newErrs.email = e.longMessage ?? e.message;
        else if (param === "password") newErrs.password = e.longMessage ?? e.message;
        else newErrs.general = e.longMessage ?? e.message;
      }
      if (!Object.keys(newErrs).length) newErrs.general = "Incorrect email or password.";
      setFieldErrors(newErrs);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: mfaCode,
      });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      setFieldErrors({ code: err?.errors?.[0]?.longMessage ?? "Invalid code." });
    } finally {
      setLoading(false);
    }
  };

  if (signIn?.status === "needs_first_factor") {
    return (
      <View style={styles.root}>
        <LinearGradient colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.card, { marginTop: insets.top + 80, marginHorizontal: 24 }]}>
          <Text style={styles.heading}>Check your email</Text>
          <Text style={styles.sub}>We sent a verification code to {email}</Text>
          <TextInput
            style={styles.input}
            placeholder="Verification code"
            placeholderTextColor="rgba(0,0,0,0.35)"
            value={mfaCode}
            onChangeText={setMfaCode}
            keyboardType="number-pad"
          />
          {fieldErrors.code && <Text style={styles.error}>{fieldErrors.code}</Text>}
          <Pressable style={styles.primaryBtn} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify</Text>}
          </Pressable>
        </View>
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

          <Text style={styles.logo}>🐾</Text>
          <Text style={styles.title}>Welcome back,{"\n"}Trainer!</Text>
          <Text style={styles.subtitle}>Sign in to continue your DogDex journey</Text>

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
                placeholder="••••••••"
                placeholderTextColor="rgba(0,0,0,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="rgba(0,0,0,0.4)" />
              </Pressable>
            </View>
            {fieldErrors.password && <Text style={styles.error}>{fieldErrors.password}</Text>}
            {fieldErrors.general && <Text style={styles.error}>{fieldErrors.general}</Text>}

            <Pressable
              style={[styles.primaryBtn, (!email || !password || loading) && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={!email || !password || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New trainer? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable><Text style={styles.link}>Create account</Text></Pressable>
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
  backBtn: { alignSelf: "flex-end", padding: 8, marginBottom: 8 },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.78)", textAlign: "center", marginBottom: 28, fontFamily: "Inter_400Regular" },

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
