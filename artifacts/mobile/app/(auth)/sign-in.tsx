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
import { useSSO } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
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
  const [loading, setLoading] = useState(false);
  // null = idle, string = error message to show inline
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const clearErrors = () => {
    setError(null);
    setEmailError(null);
    setPasswordError(null);
  };

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
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? err?.message ?? "Google sign-in failed.");
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
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? err?.message ?? "Apple sign-in failed.");
    }
  }, [startSSOFlow, router]);

  const handleSignIn = async () => {
    clearErrors();

    if (!isLoaded || !signIn) {
      setError("Auth is still loading — please wait a moment and try again.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn.create({
        strategy: "password",
        identifier: email.trim(),
        password,
      });

      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError(`Sign-in incomplete (status: ${result.status}). Please try again.`);
      }
    } catch (err: any) {
      const clerkErrors: any[] = err?.errors ?? [];
      if (clerkErrors.length > 0) {
        let hadFieldError = false;
        for (const e of clerkErrors) {
          const code: string = e.code ?? "";
          const param: string = e.meta?.paramName ?? "";
          if (param === "identifier" || code.includes("identifier") || code === "form_identifier_not_found") {
            setEmailError(e.longMessage ?? e.message);
            hadFieldError = true;
          } else if (param === "password" || code.includes("password")) {
            setPasswordError(e.longMessage ?? e.message);
            hadFieldError = true;
          }
        }
        if (!hadFieldError) {
          setError(clerkErrors[0]?.longMessage ?? clerkErrors[0]?.message ?? "Sign-in failed. Please try again.");
        }
      } else {
        setError(err?.message ?? "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="always"
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="x" size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>

          <Feather name="maximize" size={48} color="rgba(255,255,255,0.9)" />
          <Text style={styles.title}>Welcome back,{"\n"}Trainer!</Text>
          <Text style={styles.subtitle}>Sign in to continue your PawDex journey</Text>

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
            {/* General error banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#fff" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="trainer@dogdex.com"
              placeholderTextColor="rgba(0,0,0,0.3)"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(null); setError(null); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, passwordError ? styles.inputError : null]}
                placeholder="••••••••"
                placeholderTextColor="rgba(0,0,0,0.3)"
                value={password}
                onChangeText={(t) => { setPassword(t); setPasswordError(null); setError(null); }}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="rgba(0,0,0,0.4)" />
              </Pressable>
            </View>
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

            {/* Clerk bot-protection element (required on web) */}
            <View nativeID="clerk-captcha" />

            <Pressable
              style={[styles.primaryBtn, (loading || !isLoaded) && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={loading || !isLoaded}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>
                    {!isLoaded ? "Initializing…" : "Sign In"}
                  </Text>
              }
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
  title: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", marginBottom: 6, marginTop: 12 },
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

  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#EF4444", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1, color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium",
  },

  inputLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#1A3A8F", marginBottom: 6, marginTop: 4, letterSpacing: 0.5 },
  input: {
    backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Inter_400Regular", color: "#111",
    marginBottom: 4, borderWidth: 1, borderColor: "rgba(0,0,0,0.07)",
  },
  inputError: { borderColor: "#EF4444", borderWidth: 1.5 },
  fieldError: { color: "#EF4444", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8, marginTop: 2 },

  passwordRow: { position: "relative", marginBottom: 4 },
  passwordInput: { paddingRight: 44, marginBottom: 0 },
  eyeBtn: { position: "absolute", right: 0, top: 0, bottom: 0, paddingHorizontal: 12, justifyContent: "center" },

  primaryBtn: {
    backgroundColor: "#2C5EAD", borderRadius: 12,
    paddingVertical: 15, alignItems: "center", marginTop: 12,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },

  footerRow: { flexDirection: "row", marginTop: 20, alignItems: "center" },
  footerText: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  link: { color: "#fff", fontFamily: "Inter_700Bold" },
});
