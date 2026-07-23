import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/expo";
import { useGetLeaderboard } from "@workspace/api-client-react";
import type { LeaderboardEntry } from "@workspace/api-client-react";

const RANK_COLORS = ["#FBBF24", "#94A3B8", "#D97706"];

function LeaderboardRow({
  item,
  isMe,
}: {
  item: LeaderboardEntry;
  isMe: boolean;
}) {
  const medalColor = item.rank <= 3 ? RANK_COLORS[item.rank - 1] : "#64748B";
  return (
    <View
      style={[
        styles.row,
        isMe && { backgroundColor: "rgba(59,130,246,0.08)" },
      ]}
    >
      <Text style={[styles.rank, { color: medalColor }]}>
        {item.rank <= 3 ? ["1st", "2nd", "3rd"][item.rank - 1] : `#${item.rank}`}
      </Text>

      <View style={styles.avatarWrap}>
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>
              {(item.displayName ?? item.username).charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.displayName ?? item.username} {isMe && <Text style={styles.youBadge}>YOU</Text>}
        </Text>
        <Text style={styles.country}>{item.countryFlag} {item.country}</Text>
      </View>

      <View style={styles.stats}>
        <Text style={styles.count}>{item.collectionCount}</Text>
        <Text style={styles.countLabel}>breeds</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [scope, setScope] = useState<"global" | "country">("global");

  // TODO: fetch current user's country from backend context or local storage
  const userCountry = undefined; // will be wired once user profile is stored locally

  const { data, isLoading } = useGetLeaderboard(
    scope === "country" && userCountry
      ? { country: userCountry, limit: 50 }
      : { limit: 50 }
  );

  const entries = data ?? [];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#4BB8FA", "#3A8FDC", "#2C5EAD"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <FlatList
        data={entries}
        keyExtractor={(item) => item.clerkId}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.heading}>Leaderboard</Text>
            <Text style={styles.sub}>Top collectors worldwide</Text>

            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, scope === "global" && styles.toggleActive]}
                onPress={() => setScope("global")}
              >
                <Text style={[styles.toggleText, scope === "global" && styles.toggleTextActive]}>
                  Global
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, scope === "country" && styles.toggleActive]}
                onPress={() => setScope("country")}
              >
                <Text style={[styles.toggleText, scope === "country" && styles.toggleTextActive]}>
                  My Country
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Feather name="star" size={48} color="#FBBF24" />
            <Text style={styles.emptyTitle}>
              {isLoading ? "Loading..." : "No rankings yet"}
            </Text>
            {!isLoading && (
              <Text style={styles.emptySub}>
                Be the first to collect breeds and top the leaderboard!
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <LeaderboardRow item={item} isMe={item.clerkId === userId} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heading: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.8)",
  },
  toggleTextActive: {
    color: "#1E3A5F",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  rank: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    width: 36,
    textAlign: "center",
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  avatar: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  info: { flex: 1 },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#1E293B",
  },
  youBadge: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#3B82F6",
    backgroundColor: "rgba(59,130,246,0.12)",
    borderRadius: 4,
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  country: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
    marginTop: 2,
  },
  stats: { alignItems: "flex-end" },
  count: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#1E293B",
  },
  countLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.9)",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    marginTop: 6,
  },
});
