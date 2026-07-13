import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold
} from "@expo-google-fonts/outfit";
import { api, setApiToken } from "./src/api";
import { colors } from "./src/theme";
import { clearSession, loadSession, saveSession } from "./src/sessionStore";
import {
  AdminHome,
  AdultDetail,
  AdultForm,
  AdultsList,
  Login,
  Register,
  SettingsScreen,
  Welcome
} from "./src/screens";
import {
  AdminMapScreen,
  AdultHistoryScreen,
  AlertsScreen,
  IntegratedElderHome,
  NearbyPlacesScreen,
  SafeZoneFormScreen
} from "./src/integratedScreens";
function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold
  });
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState("welcome");
  const [selected, setSelected] = useState();
  const [selectedZone, setSelectedZone] = useState();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadSession().then(async (raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
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
    }).finally(() => setReady(true));
  }, []);
  const login = async (value) => {
    setApiToken(value.token);
    setSession(value);
    await saveSession(JSON.stringify(value));
    setScreen("home");
  };
  const logout = async () => {
    setApiToken("");
    setSession(null);
    setSelected(void 0);
    await clearSession();
    setScreen("welcome");
  };
  const go = (next, adult) => {
    if (adult) setSelected(adult);
    setScreen(next);
  };
  if (!fontsLoaded || !ready)
    return /* @__PURE__ */ React.createElement(
      View,
      {
        style: {
          flex: 1,
          backgroundColor: colors.canvas,
          alignItems: "center",
          justifyContent: "center"
        }
      },
      /* @__PURE__ */ React.createElement(ActivityIndicator, { color: colors.teal })
    );
  let content;
  if (!session) {
    content = screen === "login" ? /* @__PURE__ */ React.createElement(Login, { back: () => setScreen("welcome"), onSession: login, go }) : screen === "register" ? /* @__PURE__ */ React.createElement(Register, { back: () => setScreen("welcome"), onSession: login }) : /* @__PURE__ */ React.createElement(Welcome, { go });
  } else if (session.usuario.rol === "ADULTO_MAYOR")
    content = screen === "elderPlaces" ? /* @__PURE__ */ React.createElement(
      NearbyPlacesScreen,
      {
        adultId: session.usuario.adultId,
        back: () => setScreen("home")
      }
    ) : screen === "elderHistory" ? /* @__PURE__ */ React.createElement(AdultHistoryScreen, { session, back: () => setScreen("home") }) : /* @__PURE__ */ React.createElement(IntegratedElderHome, { session, logout, go });
  else if (screen === "settings")
    content = /* @__PURE__ */ React.createElement(SettingsScreen, { session, go, logout });
  else if (screen === "adults")
    content = /* @__PURE__ */ React.createElement(AdultsList, { back: () => setScreen("home"), go });
  else if (screen === "alerts")
    content = /* @__PURE__ */ React.createElement(
      AlertsScreen,
      {
        back: () => setScreen("home"),
        onOpenMap: (adult) => {
          setSelected(adult);
          setScreen("adminMap");
        }
      }
    );
  else if (screen === "adminMap" && selected)
    content = /* @__PURE__ */ React.createElement(
      AdminMapScreen,
      {
        adult: selected,
        back: () => setScreen("adultDetail"),
        onZone: (zone) => {
          setSelectedZone(zone);
          setScreen("safeZone");
        },
        onPlaces: () => setScreen("places")
      }
    );
  else if (screen === "safeZone" && selected)
    content = /* @__PURE__ */ React.createElement(
      SafeZoneFormScreen,
      {
        adult: selected,
        zone: selectedZone,
        back: () => setScreen("adminMap"),
        saved: () => setScreen("adminMap")
      }
    );
  else if (screen === "places" && selected)
    content = /* @__PURE__ */ React.createElement(NearbyPlacesScreen, { adult: selected, back: () => setScreen("adminMap") });
  else if (screen === "adultDetail" && selected)
    content = /* @__PURE__ */ React.createElement(
      AdultDetail,
      {
        adult: selected,
        back: () => setScreen("adults"),
        edit: () => setScreen("adultForm"),
        onMap: () => setScreen("adminMap")
      }
    );
  else if (screen === "adultForm")
    content = /* @__PURE__ */ React.createElement(
      AdultForm,
      {
        adult: selected,
        back: () => {
          setSelected(void 0);
          setScreen(selected ? "adultDetail" : "home");
        },
        saved: (adult) => {
          setSelected(adult);
          setScreen("adultDetail");
        }
      }
    );
  else
    content = /* @__PURE__ */ React.createElement(
      AdminHome,
      {
        key: screen,
        session,
        go: (n, a) => {
          if (n === "adultForm" && !a) setSelected(void 0);
          go(n, a);
        },
        logout
      }
    );
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(StatusBar, { style: "light" }), content);
}
export {
  App as default
};
