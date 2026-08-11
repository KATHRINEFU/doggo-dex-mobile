import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useAuth, useClerk, useSSO, useSignIn } from "@clerk/expo";
import { useRouter, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { clerkInstanceLabel } from "@/lib/clerkInstance";

WebBrowser.maybeCompleteAuthSession();

/**
 * Clerk's raw copy ("Identifier is not valid", "Couldn't find your account")
 * doesn't tell someone what to do next. Translate the codes we can act on into
 * plain language; return null to fall back to Clerk's own wording.
 */
function friendlySignInError(
  code: string,
  param: string,
  identifier: string,
): string | null {
  switch (code) {
    case "form_identifier_not_found":
      return `No account found for ${identifier || "that email"}. Create an account first — tap "Sign up" below.`;
    case "form_password_incorrect":
    case "form_password_validation_failed":
      return "Incorrect password. Please try again, or reset it below.";
    case "strategy_for_user_invalid":
      return "This account signs in with Google or Apple. Use one of the buttons below instead of a password.";
    case "form_param_format_invalid":
      return param === "identifier"
        ? "That doesn't look like a valid email address."
        : null;
    case "form_param_nil":
      return param === "identifier"
        ? "Enter the email address you signed up with."
        : null;
    case "identifier_not_allowed":
      return "This app signs in with an email address. Enter the email you signed up with.";
    case "too_many_requests":
      return "Too many attempts. Please wait a minute and try again.";
    default:
      // Some instances return an unknown email as a generic invalid identifier.
      if (param === "identifier" && code.includes("not_valid")) {
        return `No account found for ${identifier || "that email"}. Check the address, or tap "Sign up" to create one.`;
      }
      return null;
  }
}

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
  const { isSignedIn } = useAuth();
  const { setActive } = useClerk();
  const { signIn, fetchStatus } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Client-trust email-code verification state
  const [needsTrustCode, setNeedsTrustCode] = useState(false);
  const [trustCode, setTrustCode] = useState("");
  // When the trust code was triggered by an SSO (Apple/Google) sign-in, the
  // flow must continue on the legacy resource returned by useSSO — the modern
  // `signIn` object is a separate state holder and is NOT updated by it.
  const ssoTrustRef = useRef<{ signIn: any; setActive: any } | null>(null);

  // Safety net: if Clerk reports us signed in while this screen is open,
  // go to the tabs. This covers every path (password, SSO, trust code).
  useEffect(() => {
    if (isSignedIn) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, router]);

  const clearErrors = () => {
    setError(null);
    setEmailError(null);
    setPasswordError(null);
  };

  const finishSignIn = useCallback(async () => {
    // finalize() sets the newly created session as the active session.
    // Navigation happens via the isSignedIn effect above, which only fires
    // once Clerk has actually propagated the signed-in state — this avoids
    // bouncing off protected screens.
    const { error: finalizeError } = await signIn.finalize({
      navigate: async () => {},
    });
    if (finalizeError) {
      const clerkErrors: any[] = (finalizeError as any)?.errors ?? [];
      setError(
        clerkErrors[0]?.longMessage ??
        clerkErrors[0]?.message ??
        (finalizeError as any)?.message ??
        "Could not activate your session. Please try again.",
      );
    }
  }, [signIn]);

  const handleOAuth = useCallback(
    async (strategy: "oauth_google" | "oauth_apple", providerName: string) => {
      try {
        const {
          createdSessionId,
          setActive: ssoSetActive,
          authSessionResult,
          signIn: ssoSignIn,
          signUp: ssoSignUp,
        } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });

        if (createdSessionId) {
          await ssoSetActive!({ session: createdSessionId });
          // Navigation happens via the isSignedIn effect.
          return;
        }

        // User closed the browser sheet — not an error, stay quiet.
        const resultType = authSessionResult?.type;
        if (resultType === "cancel" || resultType === "dismiss") return;

        // OAuth succeeded but no session was created: the sign-in stopped at
        // an intermediate status. Previously this fell through silently and
        // the user was dumped back on the login screen with no session.
        // useSSO and useSignIn wrap the same underlying sign-in resource, so
        // the trust flow can continue on the modern `signIn` object.
        const status = ssoSignIn?.status;

        if (status === "needs_client_trust" && ssoSignIn) {
          // New device: Clerk requires a one-time email code (Client Trust).
          // Continue on the SAME legacy resource useSSO used — the modern
          // `signIn` object is a separate state holder and knows nothing
          // about this attempt.
          try {
            const emailFactor: any = (ssoSignIn.supportedSecondFactors ?? []).find(
              (f: any) => f.strategy === "email_code",
            );
            await ssoSignIn.prepareSecondFactor({
              strategy: "email_code",
              ...(emailFactor?.emailAddressId
                ? { emailAddressId: emailFactor.emailAddressId }
                : {}),
            });
            ssoTrustRef.current = { signIn: ssoSignIn, setActive: ssoSetActive };
            setNeedsTrustCode(true);
          } catch (prepErr: any) {
            setError(
              prepErr?.errors?.[0]?.longMessage ??
                `${providerName} sign-in needs email verification, but the code could not be sent. Please try again.`,
            );
          }
          return;
        }

        setError(
          `${providerName} sign-in did not complete` +
            (status ? ` (status: ${status}` +
              (ssoSignUp?.status ? `, sign-up: ${ssoSignUp.status}` : "") + ")" : "") +
            ". Please try again.",
        );
      } catch (err: any) {
        setError(err?.errors?.[0]?.longMessage ?? err?.message ?? `${providerName} sign-in failed.`);
      }
    },
    [startSSOFlow, signIn],
  );

  const handleGoogle = useCallback(() => handleOAuth("oauth_google", "Google"), [handleOAuth]);
  const handleApple = useCallback(() => handleOAuth("oauth_apple", "Apple"), [handleOAuth]);

  const handleSignIn = async () => {
    clearErrors();
    setLoading(true);

    try {
      const { error: pwError } = await signIn.password({
        emailAddress: email.trim(),
        password,
      });

      if (pwError) {
        const clerkErrors: any[] = (pwError as any)?.errors ?? [];
        let hadFieldError = false;
        for (const e of clerkErrors) {
          const code: string = e.code ?? "";
          const param: string = e.meta?.paramName ?? "";
          const friendly = friendlySignInError(code, param, email.trim());
          if (param === "identifier" || code.includes("identifier")) {
            setEmailError(friendly ?? e.longMessage ?? e.message);
            hadFieldError = true;
          } else if (param === "password" || code.includes("password")) {
            setPasswordError(friendly ?? e.longMessage ?? e.message);
            hadFieldError = true;
          } else if (friendly) {
            setError(friendly);
            hadFieldError = true;
          }
        }
        if (!hadFieldError) {
          setError(
            clerkErrors[0]?.longMessage ??
            clerkErrors[0]?.message ??
            (pwError as any)?.message ??
            "Sign-in failed. Please try again.",
          );
        }
        return;
      }

      if (signIn.status === "complete") {
        await finishSignIn();
      } else if (signIn.status === "needs_client_trust") {
        // Device isn't trusted yet. Clerk requires a one-time email code.
        // Only in the Replit dev preview iframe (web + dev build) Turnstile
        // is CSP-blocked, so activate the already-verified session directly.
        // Real web deployments go through the normal trust verification.
        if (Platform.OS === "web" && __DEV__ && signIn.createdSessionId) {
          await setActive({ session: signIn.createdSessionId });
          // Navigation happens via the isSignedIn effect.
          return;
        }
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) {
          setError("Could not send the verification code. Please try again.");
          return;
        }
        ssoTrustRef.current = null; // password path: use the modern resource
        setNeedsTrustCode(true);
      } else if (signIn.status === "needs_second_factor") {
        setError("Your account has two-factor authentication enabled, which isn't supported in this app yet.");
      } else {
        setError(`Sign-in incomplete (status: ${signIn.status}). Please try again.`);
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? err?.message ?? "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTrustCode = async () => {
    setError(null);
    setLoading(true);
    try {
      // SSO-originated trust flow: verify + activate on the legacy resource.
      if (ssoTrustRef.current) {
        const { signIn: ssoSignIn, setActive: ssoSetActive } = ssoTrustRef.current;
        try {
          const res = await ssoSignIn.attemptSecondFactor({
            strategy: "email_code",
            code: trustCode.trim(),
          });
          if (res.status === "complete" && res.createdSessionId) {
            ssoTrustRef.current = null;
            await ssoSetActive({ session: res.createdSessionId });
            // Navigation happens via the isSignedIn effect.
          } else {
            setError(`Verification incomplete (status: ${res.status}). Please try again.`);
          }
        } catch (ssoErr: any) {
          setError(
            ssoErr?.errors?.[0]?.longMessage ??
              ssoErr?.errors?.[0]?.message ??
              "Invalid code. Please check the code and try again.",
          );
        }
        return;
      }

      const { error: verifyError } = await signIn.mfa.verifyEmailCode({ code: trustCode.trim() });
      if (verifyError) {
        const clerkErrors: any[] = (verifyError as any)?.errors ?? [];
        setError(
          clerkErrors[0]?.longMessage ??
          clerkErrors[0]?.message ??
          "Invalid code. Please check the code and try again.",
        );
        return;
      }
      if (signIn.status === "complete") {
        await finishSignIn();
      } else {
        setError(`Verification incomplete (status: ${signIn.status}). Please try again.`);
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? err?.message ?? "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendTrustCode = async () => {
    setError(null);
    try {
      if (ssoTrustRef.current) {
        const ssoSignIn = ssoTrustRef.current.signIn;
        const emailFactor: any = (ssoSignIn.supportedSecondFactors ?? []).find(
          (f: any) => f.strategy === "email_code",
        );
        await ssoSignIn.prepareSecondFactor({
          strategy: "email_code",
          ...(emailFactor?.emailAddressId
            ? { emailAddressId: emailFactor.emailAddressId }
            : {}),
        });
        return;
      }
      const { error: resendError } = await signIn.mfa.sendEmailCode();
      if (resendError) {
        setError("Could not resend the code. Please try again.");
      }
    } catch {
      setError("Could not resend the code. Please try again.");
    }
  };

  const busy = loading || fetchStatus === "fetching";

  // ---- Client-trust verification screen ----
  if (needsTrustCode) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="always"
          >
            <Feather name="mail" size={48} color="rgba(255,255,255,0.9)" />
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a verification code to {email.trim() || "your email address"}.{"\n"}Enter it below to finish signing in.
            </Text>

            <View style={styles.card}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={14} color="#fff" />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Verification code</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor="rgba(0,0,0,0.3)"
                value={trustCode}
                onChangeText={(t) => { setTrustCode(t); setError(null); }}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
              />

              <Pressable
                style={[styles.primaryBtn, (busy || trustCode.trim().length === 0) && styles.btnDisabled]}
                onPress={handleVerifyTrustCode}
                disabled={busy || trustCode.trim().length === 0}
              >
                {busy
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Verify</Text>}
              </Pressable>

              <Pressable style={styles.secondaryBtn} onPress={handleResendTrustCode} disabled={busy}>
                <Text style={styles.secondaryBtnText}>Resend code</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryBtn}
                onPress={() => { setNeedsTrustCode(false); setTrustCode(""); setError(null); }}
              >
                <Text style={styles.secondaryBtnText}>Start over</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

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
          <Text style={styles.subtitle}>Sign in to continue your Doggo Dex journey</Text>

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
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Sign In</Text>}
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New trainer? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable><Text style={styles.link}>Create account</Text></Pressable>
            </Link>
          </View>

          {/* Which Clerk instance is this build talking to? A binary carrying a
              key from a retired instance fails Apple sign-in and 401s profile
              saves, while looking correctly configured everywhere else. This
              makes that visible on the device itself. */}
          <Text style={styles.instanceTag}>auth: {clerkInstanceLabel}</Text>
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
  secondaryBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  secondaryBtnText: { color: "#2C5EAD", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  footerRow: { flexDirection: "row", marginTop: 20, alignItems: "center" },
  footerText: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
  link: { color: "#fff", fontFamily: "Inter_700Bold" },
  instanceTag: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 16,
  },
});
