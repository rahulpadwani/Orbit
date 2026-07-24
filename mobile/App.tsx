import { ClerkProvider, useAuth } from "@clerk/expo";
import { AuthView } from "@clerk/expo/native";
import { tokenCache } from "@clerk/expo/token-cache";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { OrbitHome } from "./src/screens/OrbitHome";
import { createTheme } from "./src/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

SplashScreen.setOptions({
  duration: 550,
  fade: true,
});

export default function App() {
  if (!publishableKey) {
    return <ConfigurationRequired />;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <OrbitRoot />
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

function OrbitRoot() {
  const { isLoaded, isSignedIn } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const [authOpen, setAuthOpen] = useState(false);
  const scheme = useColorScheme();
  const theme = createTheme(scheme);

  if (!isLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.page }]}>
        <BrandMark />
        <ActivityIndicator color={theme.violet} size="large" />
        <Text style={[styles.loadingText, { color: theme.muted }]}>
          Entering your orbit…
        </Text>
        <StatusBar style={theme.dark ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.page }]}>
      {isSignedIn ? (
        <OrbitHome />
      ) : (
        <WelcomeScreen onOpenAuth={() => setAuthOpen(true)} />
      )}

      <Modal
        visible={authOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAuthOpen(false)}
      >
        <SafeAreaView style={[styles.authScreen, { backgroundColor: theme.page }]}>
          <View style={styles.authTop}>
            <View>
              <Text style={[styles.authKicker, { color: theme.violet }]}>
                ORBIT ACCOUNT
              </Text>
              <Text style={[styles.authTitle, { color: theme.ink }]}>
                Welcome
              </Text>
            </View>
            <Pressable
              onPress={() => setAuthOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close authentication"
              style={[styles.authClose, { backgroundColor: theme.soft }]}
            >
              <Text style={[styles.authCloseText, { color: theme.ink }]}>×</Text>
            </Pressable>
          </View>
          <View style={styles.authView}>
            <AuthView
              mode="signInOrUp"
              isDismissible
              logoMaxHeight={72}
              onDismiss={() => setAuthOpen(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>

      <StatusBar style={theme.dark ? "light" : "dark"} />
    </View>
  );
}

function WelcomeScreen({ onOpenAuth }: { onOpenAuth: () => void }) {
  const scheme = useColorScheme();
  const theme = createTheme(scheme);

  return (
    <SafeAreaView
      style={[styles.welcome, { backgroundColor: theme.page }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.welcomeTop}>
        <BrandMark />
        <View>
          <Text style={[styles.brandName, { color: theme.ink }]}>Orbit</Text>
          <Text style={[styles.brandTag, { color: theme.muted }]}>
            Make space for what matters.
          </Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroOrbits} accessibilityElementsHidden>
          <View style={[styles.heroBubble, styles.heroHigh]} />
          <View style={[styles.heroBubble, styles.heroMedium]} />
          <View style={[styles.heroBubble, styles.heroLow]} />
          <View
            style={[styles.heroRing, { borderColor: `${theme.violet}38` }]}
          />
        </View>
        <Text style={[styles.heroKicker, { color: theme.violet }]}>
          A LIVING TASK BOARD
        </Text>
        <Text style={[styles.heroTitle, { color: theme.ink }]}>
          Tasks feel lighter when they float.
        </Text>
        <Text style={[styles.heroBody, { color: theme.muted }]}>
          Add tasks, share team orbits, talk to Orbital, and burst a bubble when
          the work is done.
        </Text>
      </View>

      <View style={styles.welcomeActions}>
        <Pressable
          onPress={onOpenAuth}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.violet,
              opacity: pressed ? 0.84 : 1,
            },
          ]}
        >
          <Text style={styles.primaryButtonText}>Sign in or create account</Text>
        </Pressable>
        <Text style={[styles.privacy, { color: theme.faint }]}>
          Your tasks sync securely with your existing Orbit account.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function ConfigurationRequired() {
  const theme = createTheme("light");
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.config, { backgroundColor: theme.page }]}>
        <BrandMark />
        <Text style={[styles.configTitle, { color: theme.ink }]}>
          One setup step remains
        </Text>
        <Text style={[styles.configBody, { color: theme.muted }]}>
          Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to mobile/.env, then restart the
          app.
        </Text>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function BrandMark() {
  return (
    <View style={styles.brandMark} accessibilityElementsHidden>
      <View style={[styles.brandOrb, styles.brandOrbOne]} />
      <View style={[styles.brandOrb, styles.brandOrbTwo]} />
      <View style={[styles.brandOrb, styles.brandOrbThree]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { fontSize: 13, fontWeight: "700" },
  welcome: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  welcomeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
  },
  brandMark: { width: 49, height: 49 },
  brandOrb: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#4931b9",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },
  brandOrbOne: {
    width: 31,
    height: 31,
    borderRadius: 16,
    left: 2,
    top: 2,
    backgroundColor: "#7358e8",
  },
  brandOrbTwo: {
    width: 25,
    height: 25,
    borderRadius: 13,
    right: 0,
    bottom: 1,
    backgroundColor: "#20a59b",
  },
  brandOrbThree: {
    width: 17,
    height: 17,
    borderRadius: 9,
    right: 1,
    top: 1,
    backgroundColor: "#ef5b6d",
  },
  brandName: { fontSize: 19, fontWeight: "900" },
  brandTag: { fontSize: 11, marginTop: 1 },
  hero: { flex: 1, justifyContent: "center" },
  heroOrbits: {
    height: 238,
    marginBottom: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
  },
  heroBubble: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    shadowColor: "#4931b9",
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 13 },
  },
  heroHigh: {
    width: 126,
    height: 126,
    borderRadius: 63,
    right: "13%",
    top: 12,
    backgroundColor: "#ef5b6d",
  },
  heroMedium: {
    width: 98,
    height: 98,
    borderRadius: 49,
    left: "12%",
    bottom: 18,
    backgroundColor: "#7358e8",
  },
  heroLow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    right: "22%",
    bottom: 0,
    backgroundColor: "#20a59b",
  },
  heroKicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  heroTitle: {
    maxWidth: 350,
    fontSize: 37,
    lineHeight: 41,
    fontWeight: "900",
    letterSpacing: -1.2,
    marginTop: 9,
  },
  heroBody: {
    maxWidth: 360,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  welcomeActions: { gap: 12 },
  primaryButton: {
    minHeight: 56,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  privacy: { fontSize: 10, lineHeight: 15, textAlign: "center" },
  authScreen: { flex: 1 },
  authTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  authKicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  authTitle: { fontSize: 27, fontWeight: "900", marginTop: 2 },
  authClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  authCloseText: { fontSize: 27, lineHeight: 30 },
  authView: { flex: 1 },
  config: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  configTitle: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 20,
  },
  configBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
  },
});
