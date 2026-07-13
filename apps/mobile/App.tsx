import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { api, setApiToken } from "./src/api";
import { colors } from "./src/theme";
import { clearSession, loadSession, saveSession } from "./src/sessionStore";
import type { Adult, SafeZone, Session } from "./src/types";
import {
  AdminHome,
  AdultDetail,
  AdultForm,
  AdultsList,
  ElderHome,
  Login,
  Register,
  SettingsScreen,
  Welcome,
} from "./src/screens";
import {
  AdminMapScreen,
  AdultHistoryScreen,
  AlertsScreen,
  IntegratedElderHome,
  NearbyPlacesScreen,
  SafeZoneFormScreen,
} from "./src/integratedScreens";

type Screen =
  | "welcome"
  | "login"
  | "register"
  | "home"
  | "adults"
  | "adultDetail"
  | "adultForm"
  | "adminMap"
  | "safeZone"
  | "alerts"
  | "places"
  | "elderPlaces"
  | "elderHistory"
  | "settings";
export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [selected, setSelected] = useState<Adult | undefined>();
  const [selectedZone, setSelectedZone] = useState<SafeZone | undefined>();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadSession()
      .then(async (raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Session;
          setApiToken(parsed.token);
          try {
            const fresh = await api.me();
            const hydrated = { ...parsed, usuario: fresh.usuario };
            setSession(hydrated);
            await saveSession(JSON.stringify(hydrated));
            setScreen("home");
          } catch {
            setApiToken("");
            await clearSession();
          }
        }
      })
      .finally(() => setReady(true));
  }, []);
  const login = async (value: Session) => {
    setApiToken(value.token);
    setSession(value);
    await saveSession(JSON.stringify(value));
    setScreen("home");
  };
  const logout = async () => {
    setApiToken("");
    setSession(null);
    setSelected(undefined);
    await clearSession();
    setScreen("welcome");
  };
  const go = (next: string, adult?: Adult) => {
    if (adult) setSelected(adult);
    setScreen(next as Screen);
  };
  if (!fontsLoaded || !ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.canvas,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  let content: React.ReactNode;
  if (!session) {
    content =
      screen === "login" ? (
        <Login back={() => setScreen("welcome")} onSession={login} go={go} />
      ) : screen === "register" ? (
        <Register back={() => setScreen("welcome")} onSession={login} />
      ) : (
        <Welcome go={go} />
      );
  } else if (session.usuario.rol === "ADULTO_MAYOR")
    content =
      screen === "elderPlaces" ? (
        <NearbyPlacesScreen
          adultId={session.usuario.adultId}
          back={() => setScreen("home")}
        />
      ) : screen === "elderHistory" ? (
        <AdultHistoryScreen session={session} back={() => setScreen("home")} />
      ) : (
        <IntegratedElderHome session={session} logout={logout} go={go} />
      );
  else if (screen === "settings")
    content = <SettingsScreen session={session} go={go} logout={logout} />;
  else if (screen === "adults")
    content = <AdultsList back={() => setScreen("home")} go={go} />;
  else if (screen === "alerts")
    content = (
      <AlertsScreen
        back={() => setScreen("home")}
        onOpenMap={(adult) => {
          setSelected(adult);
          setScreen("adminMap");
        }}
      />
    );
  else if (screen === "adminMap" && selected)
    content = (
      <AdminMapScreen
        adult={selected}
        back={() => setScreen("adultDetail")}
        onZone={(zone) => {
          setSelectedZone(zone);
          setScreen("safeZone");
        }}
        onPlaces={() => setScreen("places")}
      />
    );
  else if (screen === "safeZone" && selected)
    content = (
      <SafeZoneFormScreen
        adult={selected}
        zone={selectedZone}
        back={() => setScreen("adminMap")}
        saved={() => setScreen("adminMap")}
      />
    );
  else if (screen === "places" && selected)
    content = (
      <NearbyPlacesScreen adult={selected} back={() => setScreen("adminMap")} />
    );
  else if (screen === "adultDetail" && selected)
    content = (
      <AdultDetail
        adult={selected}
        back={() => setScreen("adults")}
        edit={() => setScreen("adultForm")}
        onMap={() => setScreen("adminMap")}
      />
    );
  else if (screen === "adultForm")
    content = (
      <AdultForm
        adult={selected}
        back={() => {
          setSelected(undefined);
          setScreen(selected ? "adultDetail" : "home");
        }}
        saved={(adult) => {
          setSelected(adult);
          setScreen("adultDetail");
        }}
      />
    );
  else
    content = (
      <AdminHome
        key={screen}
        session={session}
        go={(n, a) => {
          if (n === "adultForm" && !a) setSelected(undefined);
          go(n, a);
        }}
        logout={logout}
      />
    );
  return (
    <>
      <StatusBar style="light" />
      {content}
    </>
  );
}
