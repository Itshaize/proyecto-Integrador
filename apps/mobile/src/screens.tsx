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
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import MapView, { Circle, Marker } from "./map";
import { api, ApiError } from "./api";
import { Brand, Button, Field, Header, Notice, Skeleton } from "./components";
import { colors, fonts, radius } from "./theme";
import type { Adult, AdultInput, LocationData, Session } from "./types";

const Page = ({ children }: { children: React.ReactNode }) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    style={s.page}
  >
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      {children}
    </ScrollView>
  </KeyboardAvoidingView>
);

export function Welcome({ go }: { go: (screen: string) => void }) {
  return (
    <View style={s.welcome}>
      <View style={s.orbit}>
        <View style={s.orbitInner}>
          <Ionicons name="location" size={42} color={colors.teal} />
        </View>
      </View>
      <View>
        <Brand />
        <Text style={s.hero}>Cerca cuando más importa.</Text>
        <Text style={s.lead}>
          Ubicación, cuidado y respuesta familiar desde un solo lugar.
        </Text>
      </View>
      <View style={s.actions}>
        <Button
          title="Iniciar sesión"
          icon="arrow-forward"
          onPress={() => go("login")}
        />
        <Button
          title="Crear cuenta de administrador"
          variant="secondary"
          onPress={() => go("register")}
        />
        <Text style={s.legal}>
          Al continuar aceptas los términos de uso y la política de privacidad.
        </Text>
      </View>
    </View>
  );
}

export function Login({
  back,
  onSession,
  go,
}: {
  back: () => void;
  onSession: (s: Session) => void;
  go: (s: string) => void;
}) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      onSession(await api.login(correo, password));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Page>
      <Header title="Acceso seguro" onBack={back} />
      <View style={s.formIntro}>
        <Text style={s.eyebrow}>Un solo acceso</Text>
        <Text style={s.title}>Bienvenido de vuelta</Text>
        <Text style={s.subtitle}>
          Ingresa con tu cuenta de administrador o adulto mayor.
        </Text>
      </View>
      {error && <Notice type="error" message={error} />}
      <View style={s.form}>
        <Field
          label="Correo electrónico"
          icon="mail-outline"
          value={correo}
          onChangeText={setCorreo}
          placeholder="nombre@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Contraseña"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="Tu contraseña"
          secureTextEntry
        />
        <Button
          title="Ingresar"
          loading={loading}
          disabled={!correo || !password}
          onPress={submit}
        />
        <Button
          title="Recuperar contraseña"
          variant="ghost"
          onPress={() =>
            Alert.alert(
              "Recuperación de acceso",
              "Solicita al administrador del sistema el restablecimiento de tu cuenta.",
            )
          }
        />
      </View>
      <View style={s.inline}>
        <Text style={s.muted}>¿Aún no tienes cuenta?</Text>
        <Pressable onPress={() => go("register")}>
          <Text style={s.link}>Crear cuenta</Text>
        </Pressable>
      </View>
    </Page>
  );
}

export function Register({
  back,
  onSession,
}: {
  back: () => void;
  onSession: (s: Session) => void;
}) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    nombre: "",
    cedula: "",
    correo: "",
    telefono: "",
    password: "",
    confirm: "",
  });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
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
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!terms) {
      setError("Debes aceptar los términos para crear tu cuenta.");
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
  return (
    <Page>
      <Header
        title="Crear cuenta"
        onBack={step === 1 ? back : () => setStep(1)}
      />
      <View style={s.progressRow}>
        <View style={[s.progress, s.progressActive]} />
        <View style={[s.progress, step === 2 && s.progressActive]} />
        <Text style={s.progressText}>{step} de 2</Text>
      </View>
      <View style={s.formIntro}>
        <Text style={s.eyebrow}>
          {step === 1 ? "Tu información" : "Protege tu cuenta"}
        </Text>
        <Text style={s.title}>
          {step === 1 ? "Datos del administrador" : "Datos de acceso"}
        </Text>
        <Text style={s.subtitle}>
          {step === 1
            ? "Serás la persona responsable de hasta dos adultos mayores."
            : "Usa un correo activo y una contraseña que puedas recordar."}
        </Text>
      </View>
      {error && <Notice type="error" message={error} />}
      <View style={s.form}>
        {step === 1 ? (
          <>
            <Field
              label="Nombre completo"
              value={f.nombre}
              onChangeText={set("nombre")}
              placeholder="Ej. Ana Sofía Ruiz"
            />
            <Field
              label="Cédula"
              value={f.cedula}
              onChangeText={set("cedula")}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="10 dígitos"
            />
            <Field
              label="Teléfono"
              value={f.telefono}
              onChangeText={set("telefono")}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="09XXXXXXXX"
            />
            <Button title="Continuar" icon="arrow-forward" onPress={next} />
          </>
        ) : (
          <>
            <Field
              label="Correo electrónico"
              value={f.correo}
              onChangeText={set("correo")}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="nombre@correo.com"
            />
            <Field
              label="Contraseña"
              value={f.password}
              onChangeText={set("password")}
              secureTextEntry
              placeholder="Mínimo 8 caracteres"
              hint="Incluye al menos una letra y un número."
            />
            <Field
              label="Confirmar contraseña"
              value={f.confirm}
              onChangeText={set("confirm")}
              secureTextEntry
              placeholder="Repite la contraseña"
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: terms }}
              onPress={() => setTerms(!terms)}
              style={s.checkRow}
            >
              <View style={[s.check, terms && s.checkOn]}>
                {terms && (
                  <Ionicons name="checkmark" size={17} color={colors.canvas} />
                )}
              </View>
              <Text style={s.checkText}>
                Acepto los términos de uso y el tratamiento de datos.
              </Text>
            </Pressable>
            <Button
              title="Crear mi cuenta"
              loading={loading}
              onPress={submit}
            />
          </>
        )}
      </View>
    </Page>
  );
}

export function AdminHome({
  session,
  go,
  logout,
}: {
  session: Session;
  go: (s: string, a?: Adult) => void;
  logout: () => void;
}) {
  const [adults, setAdults] = useState<Adult[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      setError("");
      const list = (await api.adults()).adultos;
      setAdults(list);
      const alerts = await Promise.all(
        list.map((a) => api.alerts(a.adultId).catch(() => [])),
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
  return (
    <View style={s.dashboard}>
      <ScrollView
        refreshControl={
          <RefreshControl
            tintColor={colors.teal}
            refreshing={refresh}
            onRefresh={() => {
              setRefresh(true);
              load();
            }}
          />
        }
        contentContainerStyle={s.dashboardContent}
      >
        <Header
          title=""
          action={
            <Pressable
              accessibilityLabel="Cerrar sesión"
              onPress={() => {
                if (Platform.OS === "web") {
                  if (
                    (globalThis as any).confirm(
                      "¿Quieres cerrar tu sesión de Cuido+?",
                    )
                  )
                    logout();
                  return;
                }
                Alert.alert("Cerrar sesión", "¿Quieres salir de Cuido+?", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Cerrar sesión",
                    style: "destructive",
                    onPress: logout,
                  },
                ]);
              }}
              style={s.avatar}
            >
              <Text style={s.avatarText}>
                {initials(session.usuario.nombre)}
              </Text>
            </Pressable>
          }
        />
        <Text style={s.eyebrow}>Panel familiar</Text>
        <Text style={s.title}>Hola, {first}</Text>
        <Text style={s.subtitle}>
          Este es el estado de las personas a tu cuidado.
        </Text>
        {error && <Notice type="error" message={error} />}
        <View style={s.metrics}>
          <View>
            <Text style={s.metricValue}>
              {adults.length}
              <Text style={s.metricMax}> / 2</Text>
            </Text>
            <Text style={s.metricLabel}>adultos registrados</Text>
          </View>
          <View style={s.metricDivider} />
          <View>
            <View style={s.statusLine}>
              <View
                style={[
                  s.safeDot,
                  alertCount > 0 && { backgroundColor: colors.danger },
                ]}
              />
              <Text style={s.metricValue}>{alertCount}</Text>
            </View>
            <Text style={s.metricLabel}>alertas nuevas</Text>
          </View>
        </View>
        {loading ? (
          <>
            <Skeleton />
            <Skeleton />
          </>
        ) : adults.length === 0 ? (
          <EmptyAdults onAdd={() => go("adultForm")} />
        ) : (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Personas a tu cuidado</Text>
              <Pressable onPress={() => go("adults")}>
                <Text style={s.link}>Ver todas</Text>
              </Pressable>
            </View>
            {adults.slice(0, 2).map((a) => (
              <AdultCard
                key={a.adultId}
                adult={a}
                onPress={() => go("adultDetail", a)}
              />
            ))}
          </View>
        )}
        <Button
          title={
            adults.length >= 2
              ? "Límite de registros alcanzado"
              : "+ Registrar adulto mayor"
          }
          disabled={adults.length >= 2}
          onPress={() => go("adultForm")}
        />
        {adults.length >= 2 && (
          <Text style={s.centerHint}>
            Cada administrador puede registrar hasta dos adultos mayores.
          </Text>
        )}
        <Text style={s.updated}>Última actualización: ahora</Text>
      </ScrollView>
      <BottomNav current="home" go={go} />
    </View>
  );
}

function EmptyAdults({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name="people-outline" size={30} color={colors.teal} />
      </View>
      <Text style={s.emptyTitle}>Empieza por registrar a una persona</Text>
      <Text style={s.emptyText}>
        Su cuenta se creará automáticamente y podrá ingresar desde el mismo
        acceso.
      </Text>
      <Button
        title="Registrar primer adulto"
        variant="secondary"
        onPress={onAdd}
      />
    </View>
  );
}
function AdultCard({ adult, onPress }: { adult: Adult; onPress: () => void }) {
  const [latest, setLatest] = useState<LocationData>();
  useEffect(() => {
    api
      .latestLocation(adult.adultId)
      .then(setLatest)
      .catch(() => undefined);
  }, [adult.adultId]);
  const zoneLabel =
    latest?.estadoZona === "DENTRO_DE_ZONA"
      ? "Dentro de zona"
      : latest?.estadoZona === "FUERA_DE_ZONA"
        ? "Fuera de zona"
        : "Sin zona actualizada";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir perfil de ${adult.nombre}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.adultCard,
        pressed && { transform: [{ scale: 0.99 }] },
      ]}
    >
      {adult.foto ? (
        <Image source={{ uri: adult.foto }} style={s.photo} />
      ) : (
        <View style={s.photoFallback}>
          <Text style={s.photoInitial}>{initials(adult.nombre)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={s.nameRow}>
          <Text numberOfLines={1} style={s.adultName}>
            {adult.nombre}
          </Text>
          <View
            style={[s.stateTag, adult.estado === "INACTIVO" && s.inactiveTag]}
          >
            <View
              style={[
                s.safeDot,
                adult.estado === "INACTIVO" && {
                  backgroundColor: colors.subtle,
                },
              ]}
            />
            <Text style={s.stateText}>{adult.estado}</Text>
          </View>
        </View>
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.muted} />
          <Text numberOfLines={1} style={s.adultMeta}>
            {latest?.direccion ?? adult.direccion}
          </Text>
        </View>
        <Text style={s.adultTime}>
          {latest
            ? `Actualizado ${latest.hora.slice(0, 5)} · ${zoneLabel}`
            : "Sin ubicación reciente"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.subtle} />
    </Pressable>
  );
}

export function AdultsList({
  back,
  go,
}: {
  back: () => void;
  go: (s: string, a?: Adult) => void;
}) {
  const [items, setItems] = useState<Adult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .adults()
      .then((r) => setItems(r.adultos))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <View style={s.dashboard}>
      <ScrollView contentContainerStyle={s.dashboardContent}>
        <Header title="Adultos mayores" onBack={back} />
        {error && <Notice type="error" message={error} />}
        <View style={s.listCount}>
          <Text style={s.sectionTitle}>{items.length} registrados</Text>
          <Text style={s.muted}>Máximo 2</Text>
        </View>
        {loading ? (
          <Skeleton />
        ) : (
          items.map((a) => (
            <AdultCard
              key={a.adultId}
              adult={a}
              onPress={() => go("adultDetail", a)}
            />
          ))
        )}
        <Button
          title="Registrar adulto mayor"
          disabled={items.length >= 2}
          onPress={() => go("adultForm")}
        />
      </ScrollView>
      <BottomNav current="adults" go={go} />
    </View>
  );
}

export function SettingsScreen({
  session,
  go,
  logout,
}: {
  session: Session;
  go: (screen: string) => void;
  logout: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState<"online" | "error">();
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
  const confirmLogout = () => {
    if (Platform.OS === "web") {
      if ((globalThis as any).confirm("¿Quieres cerrar tu sesión de Cuido+?"))
        logout();
      return;
    }
    Alert.alert("Cerrar sesión", "¿Quieres salir de Cuido+?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: logout },
    ]);
  };
  return (
    <View style={s.dashboard}>
      <ScrollView contentContainerStyle={s.dashboardContent}>
        <Header title="Ajustes" onBack={() => go("home")} />
        <View style={s.settingsProfile}>
          <View style={s.settingsAvatar}>
            <Text style={s.settingsAvatarText}>
              {initials(session.usuario.nombre)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.settingsName}>{session.usuario.nombre}</Text>
            <Text style={s.muted}>Cuenta familiar activa</Text>
          </View>
        </View>
        <View style={s.settingsGroup}>
          <Detail
            icon="shield-checkmark-outline"
            label="Tipo de cuenta"
            value="Administrador familiar"
          />
          <Detail
            icon="language-outline"
            label="Idioma"
            value="Español (Ecuador)"
          />
          <Detail
            icon="moon-outline"
            label="Apariencia"
            value="Tema oscuro de alto contraste"
          />
        </View>
        {connection === "online" && (
          <Notice
            type="success"
            message="Servidor y sesión conectados correctamente."
          />
        )}
        {connection === "error" && (
          <Notice
            type="error"
            message="No pudimos contactar al servidor. Revisa que la API siga encendida."
          />
        )}
        <Button
          title="Comprobar conexión"
          variant="secondary"
          icon="pulse-outline"
          loading={checking}
          onPress={checkConnection}
        />
        <Pressable
          accessibilityRole="button"
          onPress={confirmLogout}
          style={({ pressed }) => [
            s.logoutButton,
            pressed && { opacity: 0.82, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Ionicons name="log-out-outline" size={21} color={colors.danger} />
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
      <BottomNav current="settings" go={go} />
    </View>
  );
}

export function AdultDetail({
  adult,
  back,
  edit,
  onMap,
}: {
  adult: Adult;
  back: () => void;
  edit: () => void;
  onMap: () => void;
}) {
  return (
    <Page>
      <Header
        title="Detalle"
        onBack={back}
        action={
          <Pressable onPress={edit} style={s.iconAction}>
            <Ionicons name="create-outline" size={22} color={colors.teal} />
          </Pressable>
        }
      />
      <View style={s.profileHead}>
        {adult.foto ? (
          <Image source={{ uri: adult.foto }} style={s.profilePhoto} />
        ) : (
          <View style={s.profileFallback}>
            <Text style={s.profileInitial}>{initials(adult.nombre)}</Text>
          </View>
        )}
        <Text style={s.profileName}>{adult.nombre}</Text>
        <View style={s.stateTag}>
          <View style={s.safeDot} />
          <Text style={s.stateText}>{adult.estado}</Text>
        </View>
      </View>
      <Button
        title="Ver ubicación y zona segura"
        icon="map-outline"
        onPress={onMap}
      />
      <View style={s.detailGroup}>
        <Detail icon="card-outline" label="Cédula" value={adult.cedula} />
        <Detail icon="call-outline" label="Teléfono" value={adult.telefono} />
        <Detail
          icon="mail-outline"
          label="Cuenta de acceso"
          value={adult.correo}
        />
        <Detail
          icon="calendar-outline"
          label="Fecha de nacimiento"
          value={adult.fecha_nacimiento}
        />
        <Detail
          icon="location-outline"
          label="Dirección segura"
          value={adult.direccion}
        />
        <Detail
          icon="medical-outline"
          label="Contacto de emergencia"
          value={adult.contacto_emergencia}
        />
      </View>
      <Button
        title="Editar información"
        variant="secondary"
        icon="create-outline"
        onPress={edit}
      />
    </Page>
  );
}
function Detail({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={s.detail}>
      <View style={s.detailIcon}>
        <Ionicons name={icon} size={20} color={colors.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const blank: AdultInput = {
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
  password: "",
};
export function AdultForm({
  adult,
  back,
  saved,
}: {
  adult?: Adult;
  back: () => void;
  saved: (a: Adult) => void;
}) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState<AdultInput>(
    adult ? { ...adult, password: undefined } : blank,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const set = (k: keyof AdultInput) => (v: any) =>
    setF((x) => ({ ...x, [k]: v }));
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.65,
      base64: true,
    });
    if (!result.canceled) {
      const a = result.assets[0];
      if (a)
        set("foto")(
          a.base64
            ? `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`
            : a.uri,
        );
    }
  };
  const geocode = async () => {
    if (!f.direccion) {
      setError("Ingresa primero una dirección.");
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
        longitude: g.longitude,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No encontramos la dirección.");
    } finally {
      setGeoLoading(false);
    }
  };
  const next = () => {
    const required =
      step === 1
        ? [f.nombre, f.cedula, f.fecha_nacimiento, f.telefono]
        : [
            f.direccion,
            f.contacto_emergencia,
            f.correo,
            adult ? "ok" : f.password,
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
      const r = adult
        ? await api.updateAdult(adult.adultId, f)
        : await api.createAdult(f);
      saved(r.adulto);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No pudimos guardar el registro.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <Page>
      <Header
        title={adult ? "Editar adulto" : "Nuevo adulto"}
        onBack={step === 1 ? back : () => setStep(1)}
      />
      <View style={s.progressRow}>
        <View style={[s.progress, s.progressActive]} />
        <View style={[s.progress, step === 2 && s.progressActive]} />
        <Text style={s.progressText}>{step} de 2</Text>
      </View>
      <View style={s.formIntro}>
        <Text style={s.eyebrow}>
          {step === 1 ? "Información personal" : "Cuenta y cuidado"}
        </Text>
        <Text style={s.title}>
          {step === 1 ? "¿A quién vas a cuidar?" : "Configura su acceso"}
        </Text>
      </View>
      {error && <Notice type="error" message={error} />}
      <View style={s.form}>
        {step === 1 ? (
          <>
            <Pressable onPress={pick} style={s.photoPicker}>
              {f.foto ? (
                <Image source={{ uri: f.foto }} style={s.pickerPhoto} />
              ) : (
                <Ionicons name="camera-outline" size={28} color={colors.teal} />
              )}
              <Text style={s.link}>
                {f.foto ? "Cambiar fotografía" : "Agregar fotografía"}
              </Text>
            </Pressable>
            <Field
              label="Nombre completo"
              value={f.nombre}
              onChangeText={set("nombre")}
              placeholder="Nombre y apellidos"
            />
            <Field
              label="Cédula"
              value={f.cedula}
              onChangeText={set("cedula")}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="10 dígitos"
            />
            <Field
              label="Fecha de nacimiento"
              value={f.fecha_nacimiento}
              onChangeText={set("fecha_nacimiento")}
              placeholder="AAAA-MM-DD"
            />
            <Field
              label="Teléfono"
              value={f.telefono}
              onChangeText={set("telefono")}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="09XXXXXXXX"
            />
            <Button title="Continuar" onPress={next} />
          </>
        ) : (
          <>
            <Field
              label="Dirección en Quito"
              value={f.direccion}
              onChangeText={set("direccion")}
              placeholder="Calle principal y secundaria"
            />
            <Button
              title={
                f.latitude ? "Dirección verificada" : "Verificar en el mapa"
              }
              variant="secondary"
              icon="location-outline"
              loading={geoLoading}
              onPress={geocode}
            />
            {f.latitude && (
              <Notice
                type="success"
                message={`Coordenadas guardadas: ${f.latitude.toFixed(5)}, ${f.longitude?.toFixed(5)}`}
              />
            )}
            <Field
              label="Contacto de emergencia"
              value={f.contacto_emergencia}
              onChangeText={set("contacto_emergencia")}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="09XXXXXXXX"
            />
            <Field
              label="Usuario o correo"
              value={f.correo}
              onChangeText={set("correo")}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="adulto@correo.com"
            />
            {!adult && (
              <Field
                label="Contraseña temporal"
                value={f.password}
                onChangeText={set("password")}
                secureTextEntry
                placeholder="Mínimo 8 caracteres"
                hint="Debe incluir una letra y un número."
              />
            )}
            {adult && (
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: f.estado === "ACTIVO" }}
                onPress={() =>
                  set("estado")(f.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO")
                }
                style={s.switchRow}
              >
                <View>
                  <Text style={s.labelText}>Cuenta activa</Text>
                  <Text style={s.muted}>
                    Permite que la persona inicie sesión.
                  </Text>
                </View>
                <View style={[s.switch, f.estado === "ACTIVO" && s.switchOn]}>
                  <View
                    style={[
                      s.switchKnob,
                      f.estado === "ACTIVO" && s.switchKnobOn,
                    ]}
                  />
                </View>
              </Pressable>
            )}
            <Button
              title={adult ? "Guardar cambios" : "Crear cuenta del adulto"}
              loading={loading}
              onPress={submit}
            />
          </>
        )}
      </View>
    </Page>
  );
}

export function ElderHome({
  session,
  logout,
}: {
  session: Session;
  logout: () => void;
}) {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [status, setStatus] = useState("Obteniendo ubicación…");
  useEffect(() => {
    (async () => {
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.status !== "granted") {
        setStatus("Activa el permiso de ubicación");
        return;
      }
      const l = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(l);
      setStatus("Ubicación compartida con tu familia");
    })();
  }, []);
  const region = useMemo(
    () => ({
      latitude: location?.coords.latitude ?? -0.1807,
      longitude: location?.coords.longitude ?? -78.4678,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }),
    [location],
  );
  const sos = () =>
    Alert.alert(
      "Activar alerta S.O.S.",
      "Se avisará de inmediato a tu contacto familiar y se compartirá tu ubicación.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Pedir ayuda",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Alerta enviada",
              "Tu familiar recibió la solicitud de ayuda.",
            ),
        },
      ],
    );
  return (
    <View style={s.elder}>
      <View style={s.elderTop}>
        <View>
          <Text style={s.elderHello}>
            Hola, {session.usuario.nombre.split(" ")[0]}
          </Text>
          <Text style={s.muted}>Tu familia está cerca</Text>
        </View>
        <Pressable
          accessibilityLabel="Cerrar sesión"
          onPress={logout}
          style={s.iconButton}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.text} />
        </Pressable>
      </View>
      <View style={s.mapWrap}>
        <MapView
          style={StyleSheet.absoluteFill}
          region={region}
          showsUserLocation
        >
          {location && (
            <>
              <Marker coordinate={region} />
              <Circle
                center={region}
                radius={120}
                fillColor="rgba(39,199,184,.13)"
                strokeColor={colors.teal}
              />
            </>
          )}
        </MapView>
        <View style={s.mapStatus}>
          <View style={s.safeDot} />
          <Text style={s.mapStatusText}>{status}</Text>
        </View>
      </View>
      <View style={s.addressStrip}>
        <Ionicons name="location-outline" size={22} color={colors.teal} />
        <View style={{ flex: 1 }}>
          <Text style={s.addressTitle}>Mi ubicación</Text>
          <Text style={s.addressText}>
            {location
              ? `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`
              : "Esperando señal del teléfono"}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pedir ayuda S.O.S."
        onPress={sos}
        style={({ pressed }) => [
          s.sos,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <Ionicons name="call-outline" size={32} color={colors.white} />
        <Text style={s.sosText}>S.O.S.</Text>
        <Text style={s.sosHint}>Toca para pedir ayuda</Text>
      </Pressable>
      <View style={s.shared}>
        <View style={s.safeDot} />
        <Text style={s.sharedText}>Ubicación compartida</Text>
        <Text style={s.sharedWith}>con tu familia</Text>
      </View>
    </View>
  );
}

function BottomNav({
  current,
  go,
}: {
  current: string;
  go: (s: string) => void;
}) {
  return (
    <View style={s.bottom}>
      <Nav
        icon="home-outline"
        label="Inicio"
        active={current === "home"}
        onPress={() => go("home")}
      />
      <Nav
        icon="people-outline"
        label="Adultos"
        active={current === "adults"}
        onPress={() => go("adults")}
      />
      <Nav
        icon="notifications-outline"
        label="Alertas"
        active={current === "alerts"}
        onPress={() => go("alerts")}
      />
      <Nav
        icon="settings-outline"
        label="Ajustes"
        active={current === "settings"}
        onPress={() => go("settings")}
      />
    </View>
  );
}
function Nav({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={s.nav}
    >
      <Ionicons
        name={icon}
        size={23}
        color={active ? colors.teal : colors.subtle}
      />
      <Text style={[s.navText, active && { color: colors.teal }]}>{label}</Text>
    </Pressable>
  );
}
const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 48,
    gap: 22,
  },
  welcome: {
    flex: 1,
    backgroundColor: colors.canvas,
    padding: 24,
    paddingTop: 70,
    paddingBottom: 34,
    justifyContent: "space-between",
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
    overflow: "hidden",
  },
  orbitInner: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.tealDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    fontFamily: fonts.bold,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -1.5,
    color: colors.text,
    marginTop: 22,
    maxWidth: 330,
  },
  lead: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 25,
    color: colors.muted,
    marginTop: 12,
    maxWidth: 330,
  },
  actions: { gap: 12 },
  legal: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.subtle,
    textAlign: "center",
    marginTop: 6,
  },
  formIntro: { gap: 7 },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.teal,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
    maxWidth: 380,
  },
  form: { gap: 18 },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  muted: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14 },
  link: { fontFamily: fonts.semibold, color: colors.teal, fontSize: 14 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progress: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: colors.elevated,
  },
  progressActive: { backgroundColor: colors.teal },
  progressText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12,
    marginLeft: 8,
  },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  checkText: {
    flex: 1,
    fontFamily: fonts.regular,
    color: colors.muted,
    lineHeight: 21,
  },
  dashboard: { flex: 1, backgroundColor: colors.canvas },
  dashboardContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 130,
    gap: 18,
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
    gap: 14,
  },
  settingsAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.tealDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsAvatarText: {
    fontFamily: fonts.bold,
    color: colors.teal,
    fontSize: 17,
  },
  settingsName: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 18,
    marginBottom: 3,
  },
  settingsGroup: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
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
    gap: 9,
  },
  logoutText: {
    fontFamily: fonts.semibold,
    color: colors.danger,
    fontSize: 15,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.tealDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.semibold, color: colors.teal, fontSize: 14 },
  metrics: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  metricValue: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 30,
    fontVariant: ["tabular-nums"],
  },
  metricMax: { color: colors.subtle, fontSize: 18 },
  metricLabel: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
  metricDivider: {
    height: 48,
    width: 1,
    backgroundColor: colors.line,
    marginHorizontal: 26,
  },
  statusLine: { flexDirection: "row", alignItems: "center", gap: 9 },
  safeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 18,
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
    gap: 13,
  },
  photo: { width: 58, height: 68, borderRadius: 15 },
  photoFallback: {
    width: 58,
    height: 68,
    borderRadius: 15,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  photoInitial: {
    fontFamily: fonts.semibold,
    color: colors.teal,
    fontSize: 17,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  adultName: {
    flex: 1,
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 16,
  },
  stateTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  inactiveTag: { backgroundColor: colors.elevated },
  stateText: { fontFamily: fonts.semibold, color: colors.muted, fontSize: 9 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 7,
  },
  adultMeta: {
    flex: 1,
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 13,
  },
  adultTime: {
    fontFamily: fonts.regular,
    color: colors.subtle,
    fontSize: 11,
    marginTop: 4,
  },
  empty: {
    padding: 24,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "flex-start",
    gap: 12,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 20 },
  emptyText: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  centerHint: {
    textAlign: "center",
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12,
  },
  updated: {
    textAlign: "center",
    fontFamily: fonts.regular,
    color: colors.subtle,
    fontSize: 11,
    marginTop: 4,
  },
  listCount: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    borderColor: colors.line,
  },
  nav: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  navText: { fontFamily: fonts.medium, color: colors.subtle, fontSize: 11 },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHead: { alignItems: "center", gap: 10 },
  profilePhoto: { width: 104, height: 120, borderRadius: 28 },
  profileFallback: {
    width: 104,
    height: 120,
    borderRadius: 28,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: { fontFamily: fonts.bold, color: colors.teal, fontSize: 30 },
  profileName: { fontFamily: fonts.bold, color: colors.text, fontSize: 25 },
  detailGroup: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  detail: {
    flexDirection: "row",
    gap: 13,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12 },
  detailValue: {
    fontFamily: fonts.medium,
    color: colors.text,
    fontSize: 15,
    marginTop: 3,
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
    borderColor: colors.line,
  },
  labelText: { fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.line,
    padding: 3,
  },
  switchOn: { backgroundColor: colors.teal },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text,
  },
  switchKnobOn: {
    transform: [{ translateX: 20 }],
    backgroundColor: colors.canvas,
  },
  elder: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 22,
    gap: 12,
  },
  elderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  elderHello: { fontFamily: fonts.semibold, color: colors.text, fontSize: 22 },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  mapWrap: {
    flex: 1,
    minHeight: 210,
    borderRadius: radius.panel,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
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
    backgroundColor: colors.overlay,
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
    borderColor: colors.line,
  },
  addressTitle: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 15,
  },
  addressText: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  sos: {
    minHeight: 132,
    borderRadius: 26,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 5,
    borderBottomColor: colors.dangerDeep,
  },
  sosText: {
    fontFamily: fonts.bold,
    color: colors.white,
    fontSize: 38,
    letterSpacing: 1.5,
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
    borderColor: colors.tealDeep,
  },
  sharedText: { fontFamily: fonts.semibold, color: colors.teal, fontSize: 12 },
  sharedWith: {
    marginLeft: "auto",
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12,
  },
});
