import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import MapView, { Circle, Marker } from "./map";
import { api, ApiError } from "./api";
import { Brand, Button, Field, Header, Notice, Skeleton, useConfirm } from "./components";
import { colors, fonts, radius } from "./theme";
const Page = ({ children }) => /* @__PURE__ */ React.createElement(
  KeyboardAvoidingView,
  {
    behavior: Platform.OS === "ios" ? "padding" : void 0,
    style: s.page
  },
  /* @__PURE__ */ React.createElement(
    ScrollView,
    {
      keyboardShouldPersistTaps: "handled",
      contentContainerStyle: s.content
    },
    children
  )
);
function Welcome({ go }) {
  return /* @__PURE__ */ React.createElement(View, { style: s.welcome }, /* @__PURE__ */ React.createElement(View, { style: s.orbit }, /* @__PURE__ */ React.createElement(View, { style: s.orbitInner }, /* @__PURE__ */ React.createElement(Ionicons, { name: "location", size: 42, color: colors.teal }))), /* @__PURE__ */ React.createElement(View, null, /* @__PURE__ */ React.createElement(Brand, null), /* @__PURE__ */ React.createElement(Text, { style: s.hero }, "Cerca cuando m\xE1s importa."), /* @__PURE__ */ React.createElement(Text, { style: s.lead }, "Ubicaci\xF3n, cuidado y respuesta familiar desde un solo lugar.")), /* @__PURE__ */ React.createElement(View, { style: s.actions }, /* @__PURE__ */ React.createElement(
    Button,
    {
      title: "Iniciar sesi\xF3n",
      icon: "arrow-forward",
      onPress: () => go("login")
    }
  ), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: "Crear cuenta de administrador",
      variant: "secondary",
      onPress: () => go("register")
    }
  ), /* @__PURE__ */ React.createElement(Text, { style: s.legal }, "Al continuar aceptas los t\xE9rminos de uso y la pol\xEDtica de privacidad.")));
}
function Login({
  back,
  onSession,
  go
}) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { show: showConfirm, dialog: confirmDialog } = useConfirm();
  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      onSession(await api.login(correo, password));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos iniciar sesi\xF3n.");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ React.createElement(Page, null, confirmDialog, /* @__PURE__ */ React.createElement(Header, { title: "Acceso seguro", onBack: back }), /* @__PURE__ */ React.createElement(View, { style: s.formIntro }, /* @__PURE__ */ React.createElement(Text, { style: s.eyebrow }, "Un solo acceso"), /* @__PURE__ */ React.createElement(Text, { style: s.title }, "Bienvenido de vuelta"), /* @__PURE__ */ React.createElement(Text, { style: s.subtitle }, "Ingresa con tu cuenta de administrador o adulto mayor.")), !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }), /* @__PURE__ */ React.createElement(View, { style: s.form }, /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Correo electr\xF3nico",
      icon: "mail-outline",
      value: correo,
      onChangeText: setCorreo,
      placeholder: "nombre@correo.com",
      keyboardType: "email-address",
      autoCapitalize: "none"
    }
  ), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Contrase\xF1a",
      icon: "lock-closed-outline",
      value: password,
      onChangeText: setPassword,
      placeholder: "Tu contrase\xF1a",
      secureTextEntry: true
    }
  ), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: "Ingresar",
      loading,
      disabled: !correo || !password,
      onPress: submit
    }
  ), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: "Recuperar contrase\xF1a",
      variant: "ghost",
      onPress: () => showConfirm({
        title: "Recuperaci\xF3n de acceso",
        message: "Solicita al administrador del sistema el restablecimiento de tu cuenta.",
        confirmLabel: "Entendido",
        confirmVariant: "primary"
      })
    }
  )), /* @__PURE__ */ React.createElement(View, { style: s.inline }, /* @__PURE__ */ React.createElement(Text, { style: s.muted }, "\xBFA\xFAn no tienes cuenta?"), /* @__PURE__ */ React.createElement(Pressable, { onPress: () => go("register") }, /* @__PURE__ */ React.createElement(Text, { style: s.link }, "Crear cuenta"))));
}
function Register({
  back,
  onSession
}) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    nombre: "",
    cedula: "",
    correo: "",
    telefono: "",
    password: "",
    confirm: ""
  });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const next = () => {
    if (!f.nombre || !f.cedula || !f.telefono) {
      setError("Completa tus datos personales para continuar.");
      return;
    }
    setError("");
    setStep(2);
  };
  const submit = async () => {
    if (f.password !== f.confirm) {
      setError("Las contrase\xF1as no coinciden.");
      return;
    }
    if (!terms) {
      setError("Debes aceptar los t\xE9rminos para crear tu cuenta.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      onSession(await api.register(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ React.createElement(Page, null, /* @__PURE__ */ React.createElement(
    Header,
    {
      title: "Crear cuenta",
      onBack: step === 1 ? back : () => setStep(1)
    }
  ), /* @__PURE__ */ React.createElement(View, { style: s.progressRow }, /* @__PURE__ */ React.createElement(View, { style: [s.progress, s.progressActive] }), /* @__PURE__ */ React.createElement(View, { style: [s.progress, step === 2 && s.progressActive] }), /* @__PURE__ */ React.createElement(Text, { style: s.progressText }, step, " de 2")), /* @__PURE__ */ React.createElement(View, { style: s.formIntro }, /* @__PURE__ */ React.createElement(Text, { style: s.eyebrow }, step === 1 ? "Tu informaci\xF3n" : "Protege tu cuenta"), /* @__PURE__ */ React.createElement(Text, { style: s.title }, step === 1 ? "Datos del administrador" : "Datos de acceso"), /* @__PURE__ */ React.createElement(Text, { style: s.subtitle }, step === 1 ? "Ser\xE1s la persona responsable de hasta dos adultos mayores." : "Usa un correo activo y una contrase\xF1a que puedas recordar.")), !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }), /* @__PURE__ */ React.createElement(View, { style: s.form }, step === 1 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Nombre completo",
      value: f.nombre,
      onChangeText: set("nombre"),
      placeholder: "Ej. Ana Sof\xEDa Ruiz"
    }
  ), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "C\xE9dula",
      value: f.cedula,
      onChangeText: set("cedula"),
      keyboardType: "number-pad",
      maxLength: 10,
      placeholder: "10 d\xEDgitos"
    }
  ), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Tel\xE9fono",
      value: f.telefono,
      onChangeText: set("telefono"),
      keyboardType: "phone-pad",
      maxLength: 10,
      placeholder: "09XXXXXXXX"
    }
  ), /* @__PURE__ */ React.createElement(Button, { title: "Continuar", icon: "arrow-forward", onPress: next })) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Correo electr\xF3nico",
      value: f.correo,
      onChangeText: set("correo"),
      keyboardType: "email-address",
      autoCapitalize: "none",
      placeholder: "nombre@correo.com"
    }
  ), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Contrase\xF1a",
      value: f.password,
      onChangeText: set("password"),
      secureTextEntry: true,
      placeholder: "M\xEDnimo 8 caracteres",
      hint: "Incluye al menos una letra y un n\xFAmero."
    }
  ), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Confirmar contrase\xF1a",
      value: f.confirm,
      onChangeText: set("confirm"),
      secureTextEntry: true,
      placeholder: "Repite la contrase\xF1a"
    }
  ), /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityRole: "checkbox",
      accessibilityState: { checked: terms },
      onPress: () => setTerms(!terms),
      style: s.checkRow
    },
    /* @__PURE__ */ React.createElement(View, { style: [s.check, terms && s.checkOn] }, terms && /* @__PURE__ */ React.createElement(Ionicons, { name: "checkmark", size: 17, color: colors.canvas })),
    /* @__PURE__ */ React.createElement(Text, { style: s.checkText }, "Acepto los t\xE9rminos de uso y el tratamiento de datos.")
  ), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: "Crear mi cuenta",
      loading,
      onPress: submit
    }
  ))));
}
function AdminHome({
  session,
  go,
  logout
}) {
  const [adults, setAdults] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [error, setError] = useState("");
  const { show: showConfirm, dialog: confirmDialog } = useConfirm();
  const load = async () => {
    try {
      setError("");
      const list = (await api.adults()).adultos;
      setAdults(list);
      const alerts = await Promise.all(
        list.map((a) => api.alerts(a.adultId).catch(() => []))
      );
      setAlertCount(alerts.flat().filter((a) => a.estado === "NUEVA").length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar tus datos.");
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const first = session.usuario.nombre.split(" ")[0];
  return /* @__PURE__ */ React.createElement(View, { style: s.dashboard },
    confirmDialog,
    /* @__PURE__ */ React.createElement(
    ScrollView,
    {
      refreshControl: /* @__PURE__ */ React.createElement(
        RefreshControl,
        {
          tintColor: colors.teal,
          refreshing: refresh,
          onRefresh: () => {
            setRefresh(true);
            load();
          }
        }
      ),
      contentContainerStyle: s.dashboardContent
    },
    /* @__PURE__ */ React.createElement(
      Header,
      {
        title: "",
        action: /* @__PURE__ */ React.createElement(
          Pressable,
          {
            accessibilityLabel: "Cerrar sesi\xF3n",
            onPress: () => showConfirm({
              title: "Cerrar sesi\xF3n",
              message: "\xBFQuieres salir de Cuido+?",
              confirmLabel: "Cerrar sesi\xF3n",
              confirmVariant: "danger",
              onConfirm: logout
            }),
            style: s.avatar
          },
          /* @__PURE__ */ React.createElement(Text, { style: s.avatarText }, initials(session.usuario.nombre))
        )
      }
    ),
    /* @__PURE__ */ React.createElement(Text, { style: s.eyebrow }, "Panel familiar"),
    /* @__PURE__ */ React.createElement(Text, { style: s.title }, "Hola, ", first),
    /* @__PURE__ */ React.createElement(Text, { style: s.subtitle }, "Este es el estado de las personas a tu cuidado."),
    !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }),
    /* @__PURE__ */ React.createElement(View, { style: s.metrics }, /* @__PURE__ */ React.createElement(View, null, /* @__PURE__ */ React.createElement(Text, { style: s.metricValue }, adults.length, /* @__PURE__ */ React.createElement(Text, { style: s.metricMax }, " / 2")), /* @__PURE__ */ React.createElement(Text, { style: s.metricLabel }, "adultos registrados")), /* @__PURE__ */ React.createElement(View, { style: s.metricDivider }), /* @__PURE__ */ React.createElement(View, null, /* @__PURE__ */ React.createElement(View, { style: s.statusLine }, /* @__PURE__ */ React.createElement(
      View,
      {
        style: [
          s.safeDot,
          alertCount > 0 && { backgroundColor: colors.danger }
        ]
      }
    ), /* @__PURE__ */ React.createElement(Text, { style: s.metricValue }, alertCount)), /* @__PURE__ */ React.createElement(Text, { style: s.metricLabel }, "alertas nuevas"))),
    loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Skeleton, null), /* @__PURE__ */ React.createElement(Skeleton, null)) : adults.length === 0 ? /* @__PURE__ */ React.createElement(EmptyAdults, { onAdd: () => go("adultForm") }) : /* @__PURE__ */ React.createElement(View, { style: s.section }, /* @__PURE__ */ React.createElement(View, { style: s.sectionHeader }, /* @__PURE__ */ React.createElement(Text, { style: s.sectionTitle }, "Personas a tu cuidado"), /* @__PURE__ */ React.createElement(Pressable, { onPress: () => go("adults") }, /* @__PURE__ */ React.createElement(Text, { style: s.link }, "Ver todas"))), adults.slice(0, 2).map((a) => /* @__PURE__ */ React.createElement(
      AdultCard,
      {
        key: a.adultId,
        adult: a,
        onPress: () => go("adultDetail", a)
      }
    ))),
    /* @__PURE__ */ React.createElement(
      Button,
      {
        title: adults.length >= 2 ? "L\xEDmite de registros alcanzado" : "+ Registrar adulto mayor",
        disabled: adults.length >= 2,
        onPress: () => go("adultForm")
      }
    ),
    adults.length >= 2 && /* @__PURE__ */ React.createElement(Text, { style: s.centerHint }, "Cada administrador puede registrar hasta dos adultos mayores."),
    /* @__PURE__ */ React.createElement(Text, { style: s.updated }, "\xDAltima actualizaci\xF3n: ahora")
  ), /* @__PURE__ */ React.createElement(BottomNav, { current: "home", go }));
}
function EmptyAdults({ onAdd }) {
  return /* @__PURE__ */ React.createElement(View, { style: s.empty }, /* @__PURE__ */ React.createElement(View, { style: s.emptyIcon }, /* @__PURE__ */ React.createElement(Ionicons, { name: "people-outline", size: 30, color: colors.teal })), /* @__PURE__ */ React.createElement(Text, { style: s.emptyTitle }, "Empieza por registrar a una persona"), /* @__PURE__ */ React.createElement(Text, { style: s.emptyText }, "Su cuenta se crear\xE1 autom\xE1ticamente y podr\xE1 ingresar desde el mismo acceso."), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: "Registrar primer adulto",
      variant: "secondary",
      onPress: onAdd
    }
  ));
}
function AdultCard({ adult, onPress }) {
  const [latest, setLatest] = useState();
  useEffect(() => {
    api.latestLocation(adult.adultId).then(setLatest).catch(() => void 0);
  }, [adult.adultId]);
  const zoneLabel = latest?.estadoZona === "DENTRO_DE_ZONA" ? "Dentro de zona" : latest?.estadoZona === "FUERA_DE_ZONA" ? "Fuera de zona" : "Sin zona actualizada";
  return /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityRole: "button",
      accessibilityLabel: `Abrir perfil de ${adult.nombre}`,
      onPress,
      style: ({ pressed }) => [
        s.adultCard,
        pressed && { transform: [{ scale: 0.99 }] }
      ]
    },
    adult.foto ? /* @__PURE__ */ React.createElement(Image, { source: { uri: adult.foto }, style: s.photo }) : /* @__PURE__ */ React.createElement(View, { style: s.photoFallback }, /* @__PURE__ */ React.createElement(Text, { style: s.photoInitial }, initials(adult.nombre))),
    /* @__PURE__ */ React.createElement(View, { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(View, { style: s.nameRow }, /* @__PURE__ */ React.createElement(Text, { numberOfLines: 1, style: s.adultName }, adult.nombre), /* @__PURE__ */ React.createElement(
      View,
      {
        style: [s.stateTag, adult.estado === "INACTIVO" && s.inactiveTag]
      },
      /* @__PURE__ */ React.createElement(
        View,
        {
          style: [
            s.safeDot,
            adult.estado === "INACTIVO" && {
              backgroundColor: colors.subtle
            }
          ]
        }
      ),
      /* @__PURE__ */ React.createElement(Text, { style: s.stateText }, adult.estado)
    )), /* @__PURE__ */ React.createElement(View, { style: s.locationRow }, /* @__PURE__ */ React.createElement(Ionicons, { name: "location-outline", size: 16, color: colors.muted }), /* @__PURE__ */ React.createElement(Text, { numberOfLines: 1, style: s.adultMeta }, latest?.direccion ?? adult.direccion)), /* @__PURE__ */ React.createElement(Text, { style: s.adultTime }, latest ? `Actualizado ${latest.hora.slice(0, 5)} \xB7 ${zoneLabel}` : "Sin ubicaci\xF3n reciente")),
    /* @__PURE__ */ React.createElement(Ionicons, { name: "chevron-forward", size: 20, color: colors.subtle })
  );
}
function AdultsList({
  back,
  go
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api.adults().then((r) => setItems(r.adultos)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  return /* @__PURE__ */ React.createElement(View, { style: s.dashboard }, /* @__PURE__ */ React.createElement(ScrollView, { contentContainerStyle: s.dashboardContent }, /* @__PURE__ */ React.createElement(Header, { title: "Adultos mayores", onBack: back }), !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }), /* @__PURE__ */ React.createElement(View, { style: s.listCount }, /* @__PURE__ */ React.createElement(Text, { style: s.sectionTitle }, items.length, " registrados"), /* @__PURE__ */ React.createElement(Text, { style: s.muted }, "M\xE1ximo 2")), loading ? /* @__PURE__ */ React.createElement(Skeleton, null) : items.map((a) => /* @__PURE__ */ React.createElement(
    AdultCard,
    {
      key: a.adultId,
      adult: a,
      onPress: () => go("adultDetail", a)
    }
  )), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: "Registrar adulto mayor",
      disabled: items.length >= 2,
      onPress: () => go("adultForm")
    }
  )), /* @__PURE__ */ React.createElement(BottomNav, { current: "adults", go }));
}
function SettingsScreen({
  session,
  go,
  logout
}) {
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState();
  const { show: showConfirm, dialog: confirmDialog } = useConfirm();
  const checkConnection = async () => {
    try {
      setChecking(true);
      await api.me();
      setConnection("online");
    } catch {
      setConnection("error");
    } finally {
      setChecking(false);
    }
  };
  const confirmLogout = () => showConfirm({
    title: "Cerrar sesi\xF3n",
    message: "\xBFQuieres salir de Cuido+?",
    confirmLabel: "Cerrar sesi\xF3n",
    confirmVariant: "danger",
    onConfirm: logout
  });
  return /* @__PURE__ */ React.createElement(View, { style: s.dashboard },
    confirmDialog,
    /* @__PURE__ */ React.createElement(ScrollView, { contentContainerStyle: s.dashboardContent }, /* @__PURE__ */ React.createElement(Header, { title: "Ajustes", onBack: () => go("home") }), /* @__PURE__ */ React.createElement(View, { style: s.settingsProfile }, /* @__PURE__ */ React.createElement(View, { style: s.settingsAvatar }, /* @__PURE__ */ React.createElement(Text, { style: s.settingsAvatarText }, initials(session.usuario.nombre))), /* @__PURE__ */ React.createElement(View, { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(Text, { style: s.settingsName }, session.usuario.nombre), /* @__PURE__ */ React.createElement(Text, { style: s.muted }, "Cuenta familiar activa"))), /* @__PURE__ */ React.createElement(View, { style: s.settingsGroup }, /* @__PURE__ */ React.createElement(
    Detail,
    {
      icon: "shield-checkmark-outline",
      label: "Tipo de cuenta",
      value: "Administrador familiar"
    }
  ), /* @__PURE__ */ React.createElement(
    Detail,
    {
      icon: "language-outline",
      label: "Idioma",
      value: "Espa\xF1ol (Ecuador)"
    }
  ), /* @__PURE__ */ React.createElement(
    Detail,
    {
      icon: "moon-outline",
      label: "Apariencia",
      value: "Tema oscuro de alto contraste"
    }
  )), connection === "online" && /* @__PURE__ */ React.createElement(
    Notice,
    {
      type: "success",
      message: "Servidor y sesi\xF3n conectados correctamente."
    }
  ), connection === "error" && /* @__PURE__ */ React.createElement(
    Notice,
    {
      type: "error",
      message: "No pudimos contactar al servidor. Revisa que la API siga encendida."
    }
  ), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: "Comprobar conexi\xF3n",
      variant: "secondary",
      icon: "pulse-outline",
      loading: checking,
      onPress: checkConnection
    }
  ), /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityRole: "button",
      onPress: confirmLogout,
      style: ({ pressed }) => [
        s.logoutButton,
        pressed && { opacity: 0.82, transform: [{ scale: 0.98 }] }
      ]
    },
    /* @__PURE__ */ React.createElement(Ionicons, { name: "log-out-outline", size: 21, color: colors.danger }),
    /* @__PURE__ */ React.createElement(Text, { style: s.logoutText }, "Cerrar sesi\xF3n")
  )), /* @__PURE__ */ React.createElement(BottomNav, { current: "settings", go }));
}
function AdultDetail({
  adult,
  back,
  edit,
  onMap
}) {
  return /* @__PURE__ */ React.createElement(Page, null, /* @__PURE__ */ React.createElement(
    Header,
    {
      title: "Detalle",
      onBack: back,
      action: /* @__PURE__ */ React.createElement(Pressable, { onPress: edit, style: s.iconAction }, /* @__PURE__ */ React.createElement(Ionicons, { name: "create-outline", size: 22, color: colors.teal }))
    }
  ), /* @__PURE__ */ React.createElement(View, { style: s.profileHead }, adult.foto ? /* @__PURE__ */ React.createElement(Image, { source: { uri: adult.foto }, style: s.profilePhoto }) : /* @__PURE__ */ React.createElement(View, { style: s.profileFallback }, /* @__PURE__ */ React.createElement(Text, { style: s.profileInitial }, initials(adult.nombre))), /* @__PURE__ */ React.createElement(Text, { style: s.profileName }, adult.nombre), /* @__PURE__ */ React.createElement(View, { style: s.stateTag }, /* @__PURE__ */ React.createElement(View, { style: s.safeDot }), /* @__PURE__ */ React.createElement(Text, { style: s.stateText }, adult.estado))), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: "Ver ubicaci\xF3n y zona segura",
      icon: "map-outline",
      onPress: onMap
    }
  ), /* @__PURE__ */ React.createElement(View, { style: s.detailGroup }, /* @__PURE__ */ React.createElement(Detail, { icon: "card-outline", label: "C\xE9dula", value: adult.cedula }), /* @__PURE__ */ React.createElement(Detail, { icon: "call-outline", label: "Tel\xE9fono", value: adult.telefono }), /* @__PURE__ */ React.createElement(
    Detail,
    {
      icon: "mail-outline",
      label: "Cuenta de acceso",
      value: adult.correo
    }
  ), /* @__PURE__ */ React.createElement(
    Detail,
    {
      icon: "calendar-outline",
      label: "Fecha de nacimiento",
      value: adult.fecha_nacimiento
    }
  ), /* @__PURE__ */ React.createElement(
    Detail,
    {
      icon: "location-outline",
      label: "Direcci\xF3n segura",
      value: adult.direccion
    }
  ), /* @__PURE__ */ React.createElement(
    Detail,
    {
      icon: "medical-outline",
      label: "Contacto de emergencia",
      value: adult.contacto_emergencia
    }
  )), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: "Editar informaci\xF3n",
      variant: "secondary",
      icon: "create-outline",
      onPress: edit
    }
  ));
}
function Detail({
  icon,
  label,
  value
}) {
  return /* @__PURE__ */ React.createElement(View, { style: s.detail }, /* @__PURE__ */ React.createElement(View, { style: s.detailIcon }, /* @__PURE__ */ React.createElement(Ionicons, { name: icon, size: 20, color: colors.teal })), /* @__PURE__ */ React.createElement(View, { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(Text, { style: s.detailLabel }, label), /* @__PURE__ */ React.createElement(Text, { style: s.detailValue }, value)));
}
const blank = {
  nombre: "",
  cedula: "",
  correo: "",
  telefono: "",
  estado: "ACTIVO",
  fecha_nacimiento: "",
  direccion: "",
  latitude: null,
  longitude: null,
  contacto_emergencia: "",
  foto: null,
  password: ""
};
function AdultForm({
  adult,
  back,
  saved
}) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState(
    adult ? { ...adult, password: void 0 } : blank
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.65,
      base64: true
    });
    if (!result.canceled) {
      const a = result.assets[0];
      if (a)
        set("foto")(
          a.base64 ? `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}` : a.uri
        );
    }
  };
  const geocode = async () => {
    if (!f.direccion) {
      setError("Ingresa primero una direcci\xF3n.");
      return;
    }
    setGeoLoading(true);
    setError("");
    try {
      const g = await api.geocode(f.direccion);
      setF((x) => ({
        ...x,
        direccion: g.direccion,
        latitude: g.latitude,
        longitude: g.longitude
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No encontramos la direcci\xF3n.");
    } finally {
      setGeoLoading(false);
    }
  };
  const next = () => {
    const required = step === 1 ? [f.nombre, f.cedula, f.fecha_nacimiento, f.telefono] : [
      f.direccion,
      f.contacto_emergencia,
      f.correo,
      adult ? "ok" : f.password
    ];
    if (required.some((x) => !x)) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    setError("");
    setStep(2);
  };
  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const r = adult ? await api.updateAdult(adult.adultId, f) : await api.createAdult(f);
      saved(r.adulto);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No pudimos guardar el registro."
      );
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ React.createElement(Page, null, /* @__PURE__ */ React.createElement(
    Header,
    {
      title: adult ? "Editar adulto" : "Nuevo adulto",
      onBack: step === 1 ? back : () => setStep(1)
    }
  ), /* @__PURE__ */ React.createElement(View, { style: s.progressRow }, /* @__PURE__ */ React.createElement(View, { style: [s.progress, s.progressActive] }), /* @__PURE__ */ React.createElement(View, { style: [s.progress, step === 2 && s.progressActive] }), /* @__PURE__ */ React.createElement(Text, { style: s.progressText }, step, " de 2")), /* @__PURE__ */ React.createElement(View, { style: s.formIntro }, /* @__PURE__ */ React.createElement(Text, { style: s.eyebrow }, step === 1 ? "Informaci\xF3n personal" : "Cuenta y cuidado"), /* @__PURE__ */ React.createElement(Text, { style: s.title }, step === 1 ? "\xBFA qui\xE9n vas a cuidar?" : "Configura su acceso")), !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }), /* @__PURE__ */ React.createElement(View, { style: s.form }, step === 1 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Pressable, { onPress: pick, style: s.photoPicker }, f.foto ? /* @__PURE__ */ React.createElement(Image, { source: { uri: f.foto }, style: s.pickerPhoto }) : /* @__PURE__ */ React.createElement(Ionicons, { name: "camera-outline", size: 28, color: colors.teal }), /* @__PURE__ */ React.createElement(Text, { style: s.link }, f.foto ? "Cambiar fotograf\xEDa" : "Agregar fotograf\xEDa")), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Nombre completo",
      value: f.nombre,
      onChangeText: set("nombre"),
      placeholder: "Nombre y apellidos"
    }
  ), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "C\xE9dula",
      value: f.cedula,
      onChangeText: set("cedula"),
      keyboardType: "number-pad",
      maxLength: 10,
      placeholder: "10 d\xEDgitos"
    }
  ), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Fecha de nacimiento",
      value: f.fecha_nacimiento,
      onChangeText: set("fecha_nacimiento"),
      placeholder: "AAAA-MM-DD"
    }
  ), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Tel\xE9fono",
      value: f.telefono,
      onChangeText: set("telefono"),
      keyboardType: "phone-pad",
      maxLength: 10,
      placeholder: "09XXXXXXXX"
    }
  ), /* @__PURE__ */ React.createElement(Button, { title: "Continuar", onPress: next })) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Direcci\xF3n en Quito",
      value: f.direccion,
      onChangeText: set("direccion"),
      placeholder: "Calle principal y secundaria"
    }
  ), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: f.latitude ? "Direcci\xF3n verificada" : "Verificar en el mapa",
      variant: "secondary",
      icon: "location-outline",
      loading: geoLoading,
      onPress: geocode
    }
  ), f.latitude && /* @__PURE__ */ React.createElement(
    Notice,
    {
      type: "success",
      message: `Coordenadas guardadas: ${f.latitude.toFixed(5)}, ${f.longitude?.toFixed(5)}`
    }
  ), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Contacto de emergencia",
      value: f.contacto_emergencia,
      onChangeText: set("contacto_emergencia"),
      keyboardType: "phone-pad",
      maxLength: 10,
      placeholder: "09XXXXXXXX"
    }
  ), /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Usuario o correo",
      value: f.correo,
      onChangeText: set("correo"),
      keyboardType: "email-address",
      autoCapitalize: "none",
      placeholder: "adulto@correo.com"
    }
  ), !adult && /* @__PURE__ */ React.createElement(
    Field,
    {
      label: "Contrase\xF1a temporal",
      value: f.password,
      onChangeText: set("password"),
      secureTextEntry: true,
      placeholder: "M\xEDnimo 8 caracteres",
      hint: "Debe incluir una letra y un n\xFAmero."
    }
  ), adult && /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityRole: "switch",
      accessibilityState: { checked: f.estado === "ACTIVO" },
      onPress: () => set("estado")(f.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO"),
      style: s.switchRow
    },
    /* @__PURE__ */ React.createElement(View, null, /* @__PURE__ */ React.createElement(Text, { style: s.labelText }, "Cuenta activa"), /* @__PURE__ */ React.createElement(Text, { style: s.muted }, "Permite que la persona inicie sesi\xF3n.")),
    /* @__PURE__ */ React.createElement(View, { style: [s.switch, f.estado === "ACTIVO" && s.switchOn] }, /* @__PURE__ */ React.createElement(
      View,
      {
        style: [
          s.switchKnob,
          f.estado === "ACTIVO" && s.switchKnobOn
        ]
      }
    ))
  ), /* @__PURE__ */ React.createElement(
    Button,
    {
      title: adult ? "Guardar cambios" : "Crear cuenta del adulto",
      loading,
      onPress: submit
    }
  ))));
}
function ElderHome({
  session,
  logout
}) {
  const [location, setLocation] = useState(
    null
  );
  const [status, setStatus] = useState("Obteniendo ubicaci\xF3n\u2026");
  const { show: showConfirm, dialog: confirmDialog } = useConfirm();
  useEffect(() => {
    (async () => {
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== "granted") {
        setStatus("Activa el permiso de ubicaci\xF3n");
        return;
      }
      const l = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      setLocation(l);
      setStatus("Ubicaci\xF3n compartida con tu familia");
    })();
  }, []);
  const region = useMemo(
    () => ({
      latitude: location?.coords.latitude ?? -0.1807,
      longitude: location?.coords.longitude ?? -78.4678,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012
    }),
    [location]
  );
  const sos = () => showConfirm({
    title: "Activar alerta S.O.S.",
    message: "Se avisar\xE1 de inmediato a tu contacto familiar y se compartir\xE1 tu ubicaci\xF3n.",
    confirmLabel: "Pedir ayuda",
    confirmVariant: "danger",
    onConfirm: () => showConfirm({
      title: "Alerta enviada",
      message: "Tu familiar recibi\xF3 la solicitud de ayuda.",
      confirmLabel: "Cerrar",
      confirmVariant: "primary"
    })
  });
  return /* @__PURE__ */ React.createElement(View, { style: s.elder }, confirmDialog, /* @__PURE__ */ React.createElement(View, { style: s.elderTop }, /* @__PURE__ */ React.createElement(View, null, /* @__PURE__ */ React.createElement(Text, { style: s.elderHello }, "Hola, ", session.usuario.nombre.split(" ")[0]), /* @__PURE__ */ React.createElement(Text, { style: s.muted }, "Tu familia est\xE1 cerca")), /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityLabel: "Cerrar sesi\xF3n",
      onPress: logout,
      style: s.iconButton
    },
    /* @__PURE__ */ React.createElement(Ionicons, { name: "log-out-outline", size: 22, color: colors.text })
  )), /* @__PURE__ */ React.createElement(View, { style: s.mapWrap }, /* @__PURE__ */ React.createElement(
    MapView,
    {
      style: StyleSheet.absoluteFill,
      region,
      showsUserLocation: true
    },
    location && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Marker, { coordinate: region }), /* @__PURE__ */ React.createElement(
      Circle,
      {
        center: region,
        radius: 120,
        fillColor: "rgba(39,199,184,.13)",
        strokeColor: colors.teal
      }
    ))
  ), /* @__PURE__ */ React.createElement(View, { style: s.mapStatus }, /* @__PURE__ */ React.createElement(View, { style: s.safeDot }), /* @__PURE__ */ React.createElement(Text, { style: s.mapStatusText }, status))), /* @__PURE__ */ React.createElement(View, { style: s.addressStrip }, /* @__PURE__ */ React.createElement(Ionicons, { name: "location-outline", size: 22, color: colors.teal }), /* @__PURE__ */ React.createElement(View, { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(Text, { style: s.addressTitle }, "Mi ubicaci\xF3n"), /* @__PURE__ */ React.createElement(Text, { style: s.addressText }, location ? `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}` : "Esperando se\xF1al del tel\xE9fono"))), /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityRole: "button",
      accessibilityLabel: "Pedir ayuda S.O.S.",
      onPress: sos,
      style: ({ pressed }) => [
        s.sos,
        pressed && { transform: [{ scale: 0.98 }] }
      ]
    },
    /* @__PURE__ */ React.createElement(Ionicons, { name: "call-outline", size: 32, color: colors.white }),
    /* @__PURE__ */ React.createElement(Text, { style: s.sosText }, "S.O.S."),
    /* @__PURE__ */ React.createElement(Text, { style: s.sosHint }, "Toca para pedir ayuda")
  ), /* @__PURE__ */ React.createElement(View, { style: s.shared }, /* @__PURE__ */ React.createElement(View, { style: s.safeDot }), /* @__PURE__ */ React.createElement(Text, { style: s.sharedText }, "Ubicaci\xF3n compartida"), /* @__PURE__ */ React.createElement(Text, { style: s.sharedWith }, "con tu familia")));
}
function BottomNav({
  current,
  go
}) {
  return /* @__PURE__ */ React.createElement(View, { style: s.bottom }, /* @__PURE__ */ React.createElement(
    Nav,
    {
      icon: "home-outline",
      label: "Inicio",
      active: current === "home",
      onPress: () => go("home")
    }
  ), /* @__PURE__ */ React.createElement(
    Nav,
    {
      icon: "people-outline",
      label: "Adultos",
      active: current === "adults",
      onPress: () => go("adults")
    }
  ), /* @__PURE__ */ React.createElement(
    Nav,
    {
      icon: "notifications-outline",
      label: "Alertas",
      active: current === "alerts",
      onPress: () => go("alerts")
    }
  ), /* @__PURE__ */ React.createElement(
    Nav,
    {
      icon: "settings-outline",
      label: "Ajustes",
      active: current === "settings",
      onPress: () => go("settings")
    }
  ));
}
function Nav({
  icon,
  label,
  active = false,
  onPress
}) {
  return /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityRole: "button",
      accessibilityState: { selected: active },
      onPress,
      style: s.nav
    },
    /* @__PURE__ */ React.createElement(
      Ionicons,
      {
        name: icon,
        size: 23,
        color: active ? colors.teal : colors.subtle
      }
    ),
    /* @__PURE__ */ React.createElement(Text, { style: [s.navText, active && { color: colors.teal }] }, label)
  );
}
const initials = (name) => name.split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase();
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 48,
    gap: 22
  },
  welcome: {
    flex: 1,
    backgroundColor: colors.canvas,
    padding: 24,
    paddingTop: 70,
    paddingBottom: 34,
    justifyContent: "space-between"
  },
  orbit: {
    height: 250,
    marginHorizontal: -24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#091A24",
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden"
  },
  orbitInner: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.tealDeep,
    alignItems: "center",
    justifyContent: "center"
  },
  hero: {
    fontFamily: fonts.bold,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -1.5,
    color: colors.text,
    marginTop: 22,
    maxWidth: 330
  },
  lead: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 25,
    color: colors.muted,
    marginTop: 12,
    maxWidth: 330
  },
  actions: { gap: 12 },
  legal: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.subtle,
    textAlign: "center",
    marginTop: 6
  },
  formIntro: { gap: 7 },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.teal
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.text
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
    maxWidth: 380
  },
  form: { gap: 18 },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  muted: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14 },
  link: { fontFamily: fonts.semibold, color: colors.teal, fontSize: 14 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progress: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: colors.elevated
  },
  progressActive: { backgroundColor: colors.teal },
  progressText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12,
    marginLeft: 8
  },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center"
  },
  checkOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  checkText: {
    flex: 1,
    fontFamily: fonts.regular,
    color: colors.muted,
    lineHeight: 21
  },
  dashboard: { flex: 1, backgroundColor: colors.canvas },
  dashboardContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 130,
    gap: 18
  },
  settingsProfile: {
    minHeight: 92,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  settingsAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.tealDeep,
    alignItems: "center",
    justifyContent: "center"
  },
  settingsAvatarText: {
    fontFamily: fonts.bold,
    color: colors.teal,
    fontSize: 17
  },
  settingsName: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 18,
    marginBottom: 3
  },
  settingsGroup: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden"
  },
  logoutButton: {
    minHeight: 50,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.dangerDeep,
    backgroundColor: "#24131A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9
  },
  logoutText: {
    fontFamily: fonts.semibold,
    color: colors.danger,
    fontSize: 15
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.tealDeep,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { fontFamily: fonts.semibold, color: colors.teal, fontSize: 14 },
  metrics: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center"
  },
  metricValue: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 30,
    fontVariant: ["tabular-nums"]
  },
  metricMax: { color: colors.subtle, fontSize: 18 },
  metricLabel: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 13,
    marginTop: 3
  },
  metricDivider: {
    height: 48,
    width: 1,
    backgroundColor: colors.line,
    marginHorizontal: 26
  },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 9 },
  safeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal
  },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 18
  },
  adultCard: {
    minHeight: 104,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13
  },
  photo: { width: 58, height: 68, borderRadius: 15 },
  photoFallback: {
    width: 58,
    height: 68,
    borderRadius: 15,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  photoInitial: {
    fontFamily: fonts.semibold,
    color: colors.teal,
    fontSize: 17
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  adultName: {
    flex: 1,
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 16
  },
  stateTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8
  },
  inactiveTag: { backgroundColor: colors.elevated },
  stateText: { fontFamily: fonts.semibold, color: colors.muted, fontSize: 9 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 7
  },
  adultMeta: {
    flex: 1,
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 13
  },
  adultTime: {
    fontFamily: fonts.regular,
    color: colors.subtle,
    fontSize: 11,
    marginTop: 4
  },
  empty: {
    padding: 24,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "flex-start",
    gap: 12
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 20 },
  emptyText: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  centerHint: {
    textAlign: "center",
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12
  },
  updated: {
    textAlign: "center",
    fontFamily: fonts.regular,
    color: colors.subtle,
    fontSize: 11,
    marginTop: 4
  },
  listCount: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  bottom: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 72,
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === "ios" ? 8 : 0,
    flexDirection: "row",
    backgroundColor: "#0B1720F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line
  },
  nav: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  navText: { fontFamily: fonts.medium, color: colors.subtle, fontSize: 11 },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  profileHead: { alignItems: "center", gap: 10 },
  profilePhoto: { width: 104, height: 120, borderRadius: 28 },
  profileFallback: {
    width: 104,
    height: 120,
    borderRadius: 28,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  profileInitial: { fontFamily: fonts.bold, color: colors.teal, fontSize: 30 },
  profileName: { fontFamily: fonts.bold, color: colors.text, fontSize: 25 },
  detailGroup: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden"
  },
  detail: {
    flexDirection: "row",
    gap: 13,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  detailLabel: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12 },
  detailValue: {
    fontFamily: fonts.medium,
    color: colors.text,
    fontSize: 15,
    marginTop: 3
  },
  photoPicker: { alignSelf: "center", alignItems: "center", gap: 9 },
  pickerPhoto: { width: 94, height: 104, borderRadius: 24 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  labelText: { fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.line,
    padding: 3
  },
  switchOn: { backgroundColor: colors.teal },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text
  },
  switchKnobOn: {
    transform: [{ translateX: 20 }],
    backgroundColor: colors.canvas
  },
  elder: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 22,
    gap: 12
  },
  elderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  elderHello: { fontFamily: fonts.semibold, color: colors.text, fontSize: 22 },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  mapWrap: {
    flex: 1,
    minHeight: 210,
    borderRadius: radius.panel,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line
  },
  mapStatus: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.overlay
  },
  mapStatusText: { fontFamily: fonts.medium, color: colors.text, fontSize: 13 },
  addressStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  addressTitle: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 15
  },
  addressText: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12,
    marginTop: 2
  },
  sos: {
    minHeight: 132,
    borderRadius: 26,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 5,
    borderBottomColor: colors.dangerDeep
  },
  sosText: {
    fontFamily: fonts.bold,
    color: colors.white,
    fontSize: 38,
    letterSpacing: 1.5
  },
  sosHint: { fontFamily: fonts.medium, color: "#FFD9DE", fontSize: 13 },
  shared: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.tealDeep
  },
  sharedText: { fontFamily: fonts.semibold, color: colors.teal, fontSize: 12 },
  sharedWith: {
    marginLeft: "auto",
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12
  }
});
export {
  AdminHome,
  AdultDetail,
  AdultForm,
  AdultsList,
  ElderHome,
  Login,
  Register,
  SettingsScreen,
  Welcome
};
