import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { OrbitTheme } from "../theme";
import type { Team } from "../types";

type TeamsModalProps = {
  visible: boolean;
  teams: Team[];
  theme: OrbitTheme;
  onClose: () => void;
  onCreate: (name: string) => Promise<Team>;
  onInvite: (teamId: string) => Promise<string>;
};

export function TeamsModal({
  visible,
  teams,
  theme,
  onClose,
  onCreate,
  onInvite,
}: TeamsModalProps) {
  const [name, setName] = useState("");
  const [busyKey, setBusyKey] = useState("");

  async function createTeam() {
    const cleanName = name.trim();
    if (cleanName.length < 2 || busyKey) return;
    setBusyKey("create");
    try {
      await onCreate(cleanName);
      setName("");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(
        "Team not created",
        "Orbit could not create the team. Check your connection and try again.",
      );
    } finally {
      setBusyKey("");
    }
  }

  async function shareInvite(team: Team) {
    if (busyKey) return;
    setBusyKey(team.id);
    try {
      const url = await onInvite(team.id);
      await Share.share({
        title: `Join ${team.name} on Orbit`,
        message: `Join ${team.name} on Orbit and work on shared task bubbles: ${url}`,
        url,
      });
    } catch {
      Alert.alert(
        "Invite not ready",
        "Orbit could not create the invitation. Check your connection and try again.",
      );
    } finally {
      setBusyKey("");
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { backgroundColor: theme.page }]}>
        <View style={[styles.handle, { backgroundColor: theme.line }]} />
        <View style={styles.header}>
          <View>
            <Text style={[styles.kicker, { color: theme.violet }]}>
              SHARED ORBITS
            </Text>
            <Text style={[styles.heading, { color: theme.ink }]}>Teams</Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close teams"
            style={[styles.close, { backgroundColor: theme.soft }]}
          >
            <Text style={[styles.closeText, { color: theme.ink }]}>×</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={[
              styles.createCard,
              { backgroundColor: theme.panel, borderColor: theme.line },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.ink }]}>
              Create another team
            </Text>
            <Text style={[styles.cardBody, { color: theme.muted }]}>
              Each team gets its own shared task orbit.
            </Text>
            <View style={styles.createRow}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Team name"
                placeholderTextColor={theme.faint}
                maxLength={50}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.soft,
                    borderColor: theme.line,
                    color: theme.ink,
                  },
                ]}
              />
              <Pressable
                onPress={createTeam}
                disabled={name.trim().length < 2 || Boolean(busyKey)}
                style={[
                  styles.createButton,
                  {
                    backgroundColor: theme.violet,
                    opacity:
                      name.trim().length < 2 || busyKey ? 0.45 : 1,
                  },
                ]}
              >
                {busyKey === "create" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </Pressable>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.ink }]}>
            Your teams
          </Text>
          {teams.length === 0 ? (
            <View
              style={[
                styles.empty,
                { backgroundColor: theme.panel, borderColor: theme.line },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: theme.ink }]}>
                No shared orbits yet
              </Text>
              <Text style={[styles.emptyBody, { color: theme.muted }]}>
                Create a team, then share its invitation with your teammates.
              </Text>
            </View>
          ) : (
            teams.map((team) => (
              <View
                key={team.id}
                style={[
                  styles.team,
                  { backgroundColor: theme.panel, borderColor: theme.line },
                ]}
              >
                <View
                  style={[
                    styles.teamOrb,
                    {
                      backgroundColor:
                        team.role === "owner" ? theme.violet : theme.mint,
                    },
                  ]}
                >
                  <Text style={styles.teamInitial}>
                    {team.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.teamCopy}>
                  <Text style={[styles.teamName, { color: theme.ink }]}>
                    {team.name}
                  </Text>
                  <Text style={[styles.teamMeta, { color: theme.muted }]}>
                    {team.memberCount}{" "}
                    {team.memberCount === 1 ? "member" : "members"} · {team.role}
                  </Text>
                </View>
                {team.role === "owner" && (
                  <Pressable
                    onPress={() => void shareInvite(team)}
                    disabled={Boolean(busyKey)}
                    style={[
                      styles.invite,
                      { backgroundColor: theme.soft, borderColor: theme.line },
                    ]}
                  >
                    {busyKey === team.id ? (
                      <ActivityIndicator color={theme.violet} size="small" />
                    ) : (
                      <Text style={[styles.inviteText, { color: theme.violet }]}>
                        Invite
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 4,
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  heading: { fontSize: 30, fontWeight: "900", marginTop: 3 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 27, lineHeight: 30 },
  content: { padding: 20, paddingBottom: 44 },
  createCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  cardTitle: { fontSize: 17, fontWeight: "900" },
  cardBody: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  createRow: { flexDirection: "row", gap: 9, marginTop: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  createButton: {
    minWidth: 82,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  createButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  sectionTitle: { fontSize: 13, fontWeight: "900", marginTop: 24, marginBottom: 10 },
  team: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  teamOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  teamInitial: { color: "#fff", fontSize: 18, fontWeight: "900" },
  teamCopy: { flex: 1, minWidth: 0 },
  teamName: { fontSize: 15, fontWeight: "800" },
  teamMeta: { fontSize: 11, marginTop: 3, textTransform: "capitalize" },
  invite: {
    minWidth: 68,
    height: 38,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  inviteText: { fontSize: 11, fontWeight: "900" },
  empty: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyBody: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
  },
});
