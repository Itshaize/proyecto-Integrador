import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { Circle, Marker, Polyline } from "./map";
import { api, ApiError } from "./api";
import { Button, Field, Header, Notice, Skeleton } from "./components";
import { colors, fonts, radius } from "./theme";
import type {
  Adult,
  AlertItem,
  EmergencyContact,
  LocationData,
  NearbyPlace,
  SafeZone,
  Session,
  ZoneState,
} from "./types";

const quito = {
  latitude: -0.1807,
  longitude: -78.4678,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

export function AdminMapScreen({
  adult,
  back,
  onZone,
  onPlaces,
}: {
  adult: Adult;
  back: () => void;
  onZone: (zone?: SafeZone) => void;
  onPlaces: () => void;
}) {
  const [location, setLocation] = useState<LocationData>();
  const [zone, setZone] = useState<SafeZone>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [routeFallback, setRouteFallback] = useState(false);
  const [route, setRoute] = useState<{
    coords: { latitude: number; longitude: number }[];
    distance: string;
    duration: string;
  }>();
  const map = useRef<any>(null);
  const load = async () => {
    setLoading(true);
    setError("");
    const [l, z] = await Promise.allSettled([
      api.latestLocation(adult.adultId),
      api.safeZone(adult.adultId),
    ]);
    if (l.status === "fulfilled") setLocation(l.value);
    else if (!(l.reason instanceof ApiError && l.reason.status === 404))
      setError(l.reason.message);
    if (z.status === "fulfilled") setZone(z.value);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [adult.adultId]);
  const center = location
    ? { latitude: location.latitude, longitude: location.longitude }
    : adult.latitude && adult.longitude
      ? { latitude: adult.latitude, longitude: adult.longitude }
      : quito;
  const calculate = async () => {
    const destination = location
      ? { latitude: location.latitude, longitude: location.longitude }
      : adult.latitude && adult.longitude
        ? { latitude: adult.latitude, longitude: adult.longitude }
        : undefined;
    if (!destination) {
      setError("Primero registra o comparte una ubicación para abrir la ruta.");
      return;
    }
    try {
      setError("");
      setRouteFallback(false);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error(
          "Permite la ubicación del administrador para calcular la ruta.",
        );
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const result = await api.route(
        { lat: current.coords.latitude, lng: current.coords.longitude },
        { lat: destination.latitude, lng: destination.longitude },
      );
      const coords = decodePolyline(result.polyline.encodedPolyline);
      setRoute({
        coords,
        distance: result.distancia,
        duration: result.duracion,
      });
      setTimeout(
        () =>
          map.current?.fitToCoordinates(coords, {
            edgePadding: { top: 100, right: 48, bottom: 270, left: 48 },
            animated: true,
          }),
        50,
      );
    } catch (e) {
      setRouteFallback(true);
      setError(
        `${e instanceof Error ? e.message : "No pudimos calcular la ruta."} Puedes continuar en Google Maps.`,
      );
    }
  };
  const openExternalRoute = () =>
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}&travelmode=walking`,
    );
  return (
    <View style={x.full}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        region={{ ...center, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
        mapPadding={{ top: 100, right: 12, bottom: 230, left: 12 }}
      >
        {(location || (adult.latitude && adult.longitude)) && (
          <Marker
            coordinate={center}
            title={adult.nombre}
            pinColor={colors.danger}
          />
        )}{" "}
        {zone && (
          <>
            <Circle
              center={{ latitude: zone.latitude, longitude: zone.longitude }}
              radius={zone.radio}
              fillColor="rgba(39,199,184,.13)"
              strokeColor={colors.teal}
              strokeWidth={2}
            />
            <Marker
              coordinate={{
                latitude: zone.latitude,
                longitude: zone.longitude,
              }}
              title={zone.nombre}
              pinColor={colors.teal}
            />
          </>
        )}
        {route && (
          <Polyline
            coordinates={route.coords}
            strokeColor={colors.teal}
            strokeWidth={5}
          />
        )}
      </MapView>
      <View style={x.mapTop}>
        <Pressable
          accessibilityLabel="Volver"
          onPress={back}
          style={x.roundButton}
        >
          <Ionicons name="arrow-back" size={23} color={colors.text} />
        </Pressable>
        <View style={x.patient}>
          <Text style={x.overline}>Monitoreando</Text>
          <Text numberOfLines={1} style={x.patientName}>
            {adult.nombre}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Actualizar mapa"
          onPress={load}
          style={x.roundButton}
        >
          <Ionicons name="refresh" size={22} color={colors.teal} />
        </Pressable>
      </View>
      <View style={x.mapSheet}>
        <View style={x.handle} />
        {loading ? (
          <Skeleton />
        ) : (
          <>
            <View style={x.stateRow}>
              <ZoneBadge state={location?.estadoZona ?? "SIN_ACTUALIZACION"} />
              <View style={x.update}>
                <Text style={x.meta}>Actualizado</Text>
                <Text style={x.updateValue}>
                  {location?.hora?.slice(0, 5) ?? "--:--"}
                </Text>
              </View>
            </View>
            {error && <Notice type="error" message={error} />}
            {routeFallback && (
              <Pressable
                accessibilityRole="link"
                onPress={openExternalRoute}
                style={({ pressed }) => [
                  x.fallbackAction,
                  pressed && x.pressed,
                ]}
              >
                <Ionicons name="open-outline" size={19} color={colors.teal} />
                <Text style={x.fallbackActionText}>
                  Abrir ruta en Google Maps
                </Text>
              </Pressable>
            )}
            <View style={x.coords}>
              <Metric
                label="Latitud"
                value={location?.latitude.toFixed(5) ?? "—"}
              />
              <Metric
                label="Longitud"
                value={location?.longitude.toFixed(5) ?? "—"}
              />
              <Metric label="Radio" value={zone ? `${zone.radio} m` : "—"} />
            </View>
            {route && (
              <View style={x.routeSummary}>
                <Ionicons name="navigate" size={20} color={colors.teal} />
                <Text style={x.routeStrong}>{route.distance}</Text>
                <Text style={x.meta}>aprox. {route.duration}</Text>
              </View>
            )}
            <View style={x.actionGrid}>
              <MapAction
                icon="shield-checkmark-outline"
                label={zone ? "Editar zona" : "Crear zona"}
                onPress={() => onZone(zone)}
              />
              <MapAction
                icon="navigate-outline"
                label="Ruta"
                onPress={calculate}
              />
              <MapAction
                icon="medkit-outline"
                label="Ayuda cerca"
                onPress={onPlaces}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export function SafeZoneFormScreen({
  adult,
  zone,
  back,
  saved,
}: {
  adult: Adult;
  zone?: SafeZone;
  back: () => void;
  saved: () => void;
}) {
  const initial = {
    latitude: zone?.latitude ?? adult.latitude ?? quito.latitude,
    longitude: zone?.longitude ?? adult.longitude ?? quito.longitude,
  };
  const [name, setName] = useState(zone?.nombre ?? "Casa");
  const [address, setAddress] = useState(zone?.direccion ?? adult.direccion);
  const [point, setPoint] = useState(initial);
  const [radio, setRadio] = useState(zone?.radio ?? 300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const verify = async () => {
    try {
      setLoading(true);
      setError("");
      const g = await api.geocode(address);
      setAddress(g.direccion);
      setPoint({ latitude: g.latitude, longitude: g.longitude });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No encontramos esa dirección.",
      );
    } finally {
      setLoading(false);
    }
  };
  const save = async () => {
    try {
      setLoading(true);
      setError("");
      const data = {
        adultId: adult.adultId,
        nombre: name,
        direccion: address,
        ...point,
        radio,
        estado: "ACTIVO" as const,
      };
      if (zone) await api.updateSafeZone(zone.id_zona, data);
      else await api.createSafeZone(data);
      saved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar la zona.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <ScrollView
      style={x.page}
      contentContainerStyle={x.pageContent}
      keyboardShouldPersistTaps="handled"
    >
      <Header
        title={zone ? "Editar zona segura" : "Nueva zona segura"}
        onBack={back}
      />
      <Text style={x.pageTitle}>Define el lugar seguro</Text>
      <Text style={x.body}>
        Toca el mapa para mover el centro y ajusta el radio entre 50 y 2.000
        metros.
      </Text>
      {error && <Notice type="error" message={error} />}
      <View style={x.form}>
        <Field
          label="Nombre de la zona"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Casa"
        />
        <Field
          label="Dirección en Quito"
          value={address}
          onChangeText={setAddress}
          placeholder="Calle principal y secundaria"
        />
        <Button
          title="Buscar dirección"
          variant="secondary"
          icon="search-outline"
          loading={loading}
          onPress={verify}
        />
      </View>
      <View style={x.zoneMap}>
        <MapView
          style={StyleSheet.absoluteFill}
          region={{ ...point, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
          mapPadding={{ top: 8, right: 8 }}
          onPress={(event: any) => setPoint(event.nativeEvent.coordinate)}
        >
          <Marker
            coordinate={point}
            draggable
            onDragEnd={(event: any) => setPoint(event.nativeEvent.coordinate)}
          />
          <Circle
            center={point}
            radius={radio}
            fillColor="rgba(39,199,184,.13)"
            strokeColor={colors.teal}
          />
        </MapView>
      </View>
      <View style={x.radiusPanel}>
        <View>
          <Text style={x.fieldLabel}>Radio de la zona</Text>
          <Text style={x.radiusValue}>{radio} metros</Text>
        </View>
        <View style={x.stepper}>
          <Pressable
            accessibilityLabel="Reducir radio"
            onPress={() => setRadio(Math.max(50, radio - 50))}
            style={x.step}
          >
            <Ionicons name="remove" size={22} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityLabel="Aumentar radio"
            onPress={() => setRadio(Math.min(2000, radio + 50))}
            style={x.step}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <Button
        title="Guardar zona segura"
        icon="shield-checkmark-outline"
        loading={loading}
        disabled={!name || !address}
        onPress={save}
      />
    </ScrollView>
  );
}

export function AlertsScreen({
  back,
  onOpenMap,
}: {
  back: () => void;
  onOpenMap: (adult: Adult) => void;
}) {
  const [items, setItems] = useState<{ alert: AlertItem; adult: Adult }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      setError("");
      const adults = (await api.adults()).adultos;
      const lists = await Promise.all(
        adults.map(async (adult) => ({
          adult,
          alerts: await api.alerts(adult.adultId),
        })),
      );
      setItems(
        lists
          .flatMap((v) => v.alerts.map((alert) => ({ alert, adult: v.adult })))
          .sort((a, b) => b.alert.id_alerta - a.alert.id_alerta),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos cargar las alertas.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const attend = async (item: { alert: AlertItem; adult: Adult }) => {
    try {
      await api.updateAlert(
        item.alert.id_alerta,
        item.alert.estado === "NUEVA" ? "VISTA" : "ATENDIDA",
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos actualizar la alerta.",
      );
    }
  };
  return (
    <ScrollView style={x.page} contentContainerStyle={x.pageContent}>
      <Header title="Alertas" onBack={back} />
      <View>
        <Text style={x.pageTitle}>Centro de alertas</Text>
        <Text style={x.body}>
          {items.filter((i) => i.alert.estado === "NUEVA").length} alertas
          nuevas requieren revisión.
        </Text>
      </View>
      {error && <Notice type="error" message={error} />}
      {loading ? (
        <>
          <Skeleton />
          <Skeleton />
        </>
      ) : items.length === 0 ? (
        <View style={x.empty}>
          <Ionicons
            name="checkmark-circle-outline"
            size={34}
            color={colors.teal}
          />
          <Text style={x.emptyTitle}>Todo está tranquilo</Text>
          <Text style={x.body}>
            Las alertas S.O.S. y de salida de zona aparecerán aquí.
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <View
            key={item.alert.id_alerta}
            style={[x.alertCard, item.alert.estado === "NUEVA" && x.alertNew]}
          >
            <View style={x.alertIcon}>
              <Ionicons
                name={item.alert.tipo === "SOS" ? "call" : "walk"}
                size={22}
                color={
                  item.alert.tipo === "SOS" ? colors.danger : colors.warning
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={x.alertTop}>
                <Text style={x.alertTitle}>
                  {item.alert.tipo === "SOS"
                    ? "Solicitud S.O.S."
                    : "Fuera de zona"}
                </Text>
                <Text style={x.alertState}>{item.alert.estado}</Text>
              </View>
              <Text style={x.alertName}>{item.adult.nombre}</Text>
              <Text style={x.meta}>
                {item.alert.fecha} · {item.alert.hora.slice(0, 5)}
              </Text>
              <View style={x.alertActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver mapa de ${item.adult.nombre}`}
                  onPress={() => onOpenMap(item.adult)}
                >
                  <Text style={x.link}>Ver mapa</Text>
                </Pressable>
                {item.alert.estado !== "ATENDIDA" &&
                  item.alert.estado !== "CERRADA" && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => attend(item)}
                    >
                      <Text style={x.link}>
                        {item.alert.estado === "NUEVA"
                          ? "Marcar vista"
                          : "Atender"}
                      </Text>
                    </Pressable>
                  )}
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

export function NearbyPlacesScreen({
  adult,
  adultId,
  back,
}: {
  adult?: Adult;
  adultId?: number;
  back: () => void;
}) {
  const [category, setCategory] = useState("hospital");
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  }>();
  useEffect(() => {
    (async () => {
      try {
        if (adult) {
          try {
            setCoords(await api.latestLocation(adult.adultId));
          } catch {
            if (adult.latitude && adult.longitude) {
              setCoords({
                latitude: adult.latitude,
                longitude: adult.longitude,
              });
            } else {
              throw new Error(
                "El adulto todavía no tiene una ubicación registrada.",
              );
            }
          }
        } else {
          const p = await Location.requestForegroundPermissionsAsync();
          if (p.status === "granted") {
            const l = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setCoords(l.coords);
          } else if (adultId) {
            setCoords(await api.latestLocation(adultId));
          } else {
            throw new Error("Permite la ubicación para buscar ayuda cercana.");
          }
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "No tenemos una ubicación disponible.",
        );
      }
    })();
  }, [adult?.adultId, adultId]);
  const search = async (cat = category) => {
    if (!coords) return;
    try {
      setLoading(true);
      setError("");
      setCategory(cat);
      setPlaces(await api.nearbyPlaces(coords.latitude, coords.longitude, cat));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos buscar lugares cercanos.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (coords) search(category);
  }, [coords]);
  const categories = [
    ["hospital", "Hospitales", "medkit-outline"],
    ["farmacia", "Farmacias", "medical-outline"],
    ["centro_salud", "Salud", "fitness-outline"],
    ["policia", "Policía", "shield-outline"],
    ["punto_ayuda", "Ayuda", "flame-outline"],
  ] as const;
  const openGoogleSearch = () => {
    if (!coords) return;
    const label = categories.find(([id]) => id === category)?.[1] ?? "Ayuda";
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${label} cerca de ${coords.latitude},${coords.longitude}`)}`,
    );
  };
  return (
    <ScrollView style={x.page} contentContainerStyle={x.pageContent}>
      <Header title="Ayuda cercana" onBack={back} />
      <Text style={x.pageTitle}>Lugares que pueden ayudarte</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={x.categories}
      >
        {categories.map(([id, label, icon]) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: category === id }}
            onPress={() => search(id)}
            style={[x.category, category === id && x.categoryOn]}
          >
            <Ionicons
              name={icon}
              size={20}
              color={category === id ? colors.canvas : colors.teal}
            />
            <Text
              style={[
                x.categoryText,
                category === id && { color: colors.canvas },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {error && <Notice type="error" message={error} />}{" "}
      {error && coords && (
        <Pressable
          accessibilityRole="link"
          onPress={openGoogleSearch}
          style={({ pressed }) => [x.fallbackAction, pressed && x.pressed]}
        >
          <Ionicons name="search-outline" size={19} color={colors.teal} />
          <Text style={x.fallbackActionText}>Buscar en Google Maps</Text>
        </Pressable>
      )}
      {loading ? (
        <Skeleton />
      ) : places.length === 0 && !error ? (
        <View style={x.empty}>
          <Ionicons name="location-outline" size={32} color={colors.teal} />
          <Text style={x.emptyTitle}>Sin resultados cercanos</Text>
        </View>
      ) : (
        places.map((place) => (
          <Pressable
            key={place.id}
            accessibilityRole="link"
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`,
              )
            }
            style={x.place}
          >
            <View style={x.placeIcon}>
              <Ionicons name="location" size={20} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={x.placeName}>{place.nombre}</Text>
              <Text numberOfLines={2} style={x.meta}>
                {place.direccion}
              </Text>
              <Text style={x.distance}>
                {place.distancia < 1000
                  ? `${place.distancia} m`
                  : `${(place.distancia / 1000).toFixed(1)} km`}
              </Text>
            </View>
            <Ionicons name="navigate-outline" size={21} color={colors.teal} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

export function IntegratedElderHome({
  session,
  logout,
  go,
}: {
  session: Session;
  logout: () => void;
  go: (screen: string) => void;
}) {
  const adultId = session.usuario.adultId;
  const [location, setLocation] = useState<LocationData>();
  const [zone, setZone] = useState<SafeZone>();
  const [contact, setContact] = useState<EmergencyContact>();
  const [status, setStatus] = useState("Buscando GPS…");
  const [error, setError] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [gpsAttempt, setGpsAttempt] = useState(0);
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!adultId) {
      setError("Vuelve a iniciar sesión para activar tu perfil de ubicación.");
      return;
    }
    let subscription: Location.LocationSubscription | undefined;
    (async () => {
      try {
        setError("");
        const [z, c, latest] = await Promise.allSettled([
          api.safeZone(adultId),
          api.contacts(adultId),
          api.latestLocation(adultId),
        ]);
        if (z.status === "fulfilled") setZone(z.value);
        if (c.status === "fulfilled") setContact(c.value[0]);
        if (latest.status === "fulfilled") setLocation(latest.value);

        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          setStatus("GPS sin permiso");
          return;
        }
        setStatus("GPS activo");
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 20,
          },
          async (current) => {
            try {
              const reverse = await Location.reverseGeocodeAsync({
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
              });
              const p = reverse[0];
              const direccion = p
                ? [p.street, p.name, p.city].filter(Boolean).join(", ")
                : null;
              const saved = await api.saveLocation({
                adultId,
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
                accuracy: current.coords.accuracy ?? 0,
                direccion,
              });
              setLocation(saved);
              setStatus("Ubicación compartida");
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "No pudimos compartir la ubicación.",
              );
            }
          },
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ubicación no disponible.");
      }
    })();
    return () => subscription?.remove();
  }, [adultId, gpsAttempt]);
  const region = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }
    : quito;
  const useDemoLocation = async () => {
    if (!adultId) return;
    try {
      setError("");
      setStatus("Guardando punto de prueba…");
      const saved = await api.saveLocation({
        adultId,
        latitude: quito.latitude,
        longitude: quito.longitude,
        accuracy: 25,
        direccion: "Av. Amazonas y Naciones Unidas, Quito (punto de prueba)",
      });
      setLocation(saved);
      setStatus("Punto de prueba compartido");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No pudimos guardar el punto de prueba.",
      );
    }
  };
  const sendSos = async () => {
    if (!adultId || !location) {
      setError(
        "Activa el GPS o usa el punto de prueba antes de enviar la alerta.",
      );
      return;
    }
    try {
      setError("");
      await api.createAlert({
        adultId,
        tipo: "SOS",
        latitude: location.latitude,
        longitude: location.longitude,
      });
      Alert.alert(
        "Alerta enviada",
        "Tu familiar recibió la solicitud y tu ubicación.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos enviar la alerta.");
    }
  };
  const sos = () => {
    const message =
      "Se enviará una alerta S.O.S. con tu ubicación actual a tu familiar.";
    if (Platform.OS === "web") {
      if ((globalThis as any).confirm(`¿Pedir ayuda?\n\n${message}`)) {
        void sendSos();
      }
      return;
    }
    Alert.alert("¿Pedir ayuda?", message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, pedir ayuda",
        style: "destructive",
        onPress: sendSos,
      },
    ]);
  };
  const call = async () => {
    if (!contact) {
      setError("No hay un teléfono familiar configurado.");
      return;
    }
    try {
      setError("");
      await Linking.openURL(`tel:${contact.telefono}`);
    } catch {
      setError(`Llama manualmente a ${contact.nombre}: ${contact.telefono}.`);
    }
  };
  const share = async () => {
    if (!location) {
      setError("Activa el GPS o usa el punto de prueba para compartir.");
      return;
    }
    const message = `Estoy aquí: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    try {
      setError("");
      setShareLink("");
      const clipboard = (globalThis as any).navigator?.clipboard;
      if (Platform.OS === "web") {
        let copied = false;
        if (clipboard) {
          try {
            await clipboard.writeText(message);
            copied = true;
          } catch {
            copied = false;
          }
        }
        if (!copied) {
          const documentRef = (globalThis as any).document;
          const field = documentRef?.createElement("textarea");
          if (field) {
            field.value = message;
            field.style.position = "fixed";
            field.style.opacity = "0";
            documentRef.body.appendChild(field);
            field.focus();
            field.select();
            copied = Boolean(documentRef.execCommand?.("copy"));
            field.remove();
          }
        }
        if (!copied) throw new Error("Clipboard unavailable");
        Alert.alert("Enlace copiado", "Ya puedes pegarlo en cualquier chat.");
      } else {
        await Share.share({ message });
      }
    } catch {
      const url = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      setShareLink(url);
      setError(
        "El navegador bloqueó la copia automática. Mantén pulsado el enlace para copiarlo.",
      );
    }
  };
  return (
    <ScrollView
      style={x.elderPage}
      contentContainerStyle={x.elder}
      showsVerticalScrollIndicator={false}
    >
      <View style={x.elderHeader}>
        <View style={x.gpsRow}>
          <View
            style={[
              x.gpsDot,
              status.includes("sin permiso") && {
                backgroundColor: colors.danger,
              },
            ]}
          />
          <Text style={x.gpsText}>{status}</Text>
        </View>
        <Text style={x.elderTitle}>Mi ubicación</Text>
        <Pressable accessibilityLabel="Cerrar sesión" onPress={logout}>
          <Text style={x.clock}>
            {time.toLocaleTimeString("es-EC", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </Pressable>
      </View>
      {error && <Notice type="error" message={error} />}
      {shareLink && (
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(shareLink)}
          style={({ pressed }) => [x.shareFallback, pressed && x.pressed]}
        >
          <Ionicons name="link-outline" size={18} color={colors.teal} />
          <Text selectable numberOfLines={2} style={x.shareFallbackText}>
            {shareLink}
          </Text>
          <Ionicons name="open-outline" size={18} color={colors.teal} />
        </Pressable>
      )}
      {status.includes("sin permiso") && (
        <View style={x.locationRecovery}>
          <View style={x.locationRecoveryCopy}>
            <Text style={x.locationRecoveryTitle}>
              El navegador bloqueó el GPS
            </Text>
            <Text style={x.locationRecoveryText}>
              Activa el permiso y reintenta. Para la exposición puedes cargar un
              punto de prueba en Quito.
            </Text>
          </View>
          <View style={x.locationRecoveryActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setGpsAttempt((value) => value + 1)}
              style={({ pressed }) => [x.recoveryButton, pressed && x.pressed]}
            >
              <Ionicons name="locate-outline" size={17} color={colors.text} />
              <Text style={x.recoveryButtonText}>Reintentar</Text>
            </Pressable>
            {Platform.OS === "web" && (
              <Pressable
                accessibilityRole="button"
                onPress={useDemoLocation}
                style={({ pressed }) => [
                  x.recoveryButton,
                  x.recoveryButtonPrimary,
                  pressed && x.pressed,
                ]}
              >
                <Ionicons
                  name="flask-outline"
                  size={17}
                  color={colors.canvas}
                />
                <Text style={x.recoveryButtonPrimaryText}>Usar prueba</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
      <View style={x.elderMap}>
        <MapView
          style={StyleSheet.absoluteFill}
          region={region}
          showsUserLocation
        >
          {location && <Marker coordinate={region} />}{" "}
          {zone && (
            <Circle
              center={{ latitude: zone.latitude, longitude: zone.longitude }}
              radius={zone.radio}
              fillColor="rgba(39,199,184,.13)"
              strokeColor={colors.teal}
            />
          )}
        </MapView>
        <View style={x.precision}>
          <Ionicons name="locate-outline" size={15} color={colors.teal} />
          <Text style={x.precisionText}>
            Precisión {location ? `${Math.round(location.accuracy)} m` : "—"}
          </Text>
        </View>
        <View style={x.zoneFloat}>
          <ZoneBadge state={location?.estadoZona ?? "SIN_ACTUALIZACION"} />
        </View>
      </View>
      <View style={x.address}>
        <View style={x.addressIcon}>
          <Ionicons name="location" size={21} color={colors.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={x.meta}>Estás en</Text>
          <Text numberOfLines={2} style={x.addressText}>
            {location?.direccion ?? "Ubicación todavía no disponible"}
          </Text>
        </View>
      </View>
      <Text style={x.sosHint}>Presiona si necesitas ayuda urgente</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pedir ayuda S.O.S."
        onPress={sos}
        style={({ pressed }) => [
          x.sos,
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
      >
        <View style={x.sosInner}>
          <Text style={x.sosText}>SOS</Text>
          <Text style={x.sosSub}>EMERGENCIA</Text>
        </View>
      </Pressable>
      <View style={x.elderActions}>
        <SmallAction icon="call-outline" label="Llamar" onPress={call} />
        <SmallAction
          icon="share-social-outline"
          label="Compartir"
          onPress={share}
        />
        <SmallAction
          icon="medkit-outline"
          label="Ayuda"
          onPress={() => go("elderPlaces")}
        />
        <SmallAction
          icon="time-outline"
          label="Historial"
          onPress={() => go("elderHistory")}
        />
      </View>
      <View style={x.sharing}>
        <View
          style={[x.gpsDot, !location && { backgroundColor: colors.warning }]}
        />
        <Text style={x.sharingText}>
          {location
            ? `Ubicación compartida con ${contact?.nombre ?? "tu familiar"}`
            : "Pendiente de compartir ubicación"}
        </Text>
      </View>
    </ScrollView>
  );
}

export function AdultHistoryScreen({
  session,
  back,
}: {
  session: Session;
  back: () => void;
}) {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (session.usuario.adultId)
      api
        .alerts(session.usuario.adultId)
        .then(setItems)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
  }, []);
  return (
    <ScrollView style={x.page} contentContainerStyle={x.pageContent}>
      <Header title="Mis alertas" onBack={back} />
      <Text style={x.pageTitle}>Historial de ayuda</Text>
      {error && <Notice type="error" message={error} />}{" "}
      {loading ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <View style={x.empty}>
          <Ionicons
            name="checkmark-circle-outline"
            size={34}
            color={colors.teal}
          />
          <Text style={x.emptyTitle}>Sin alertas registradas</Text>
        </View>
      ) : (
        items.map((a) => (
          <View key={a.id_alerta} style={x.history}>
            <Ionicons
              name={a.tipo === "SOS" ? "call" : "walk"}
              size={22}
              color={a.tipo === "SOS" ? colors.danger : colors.warning}
            />
            <View style={{ flex: 1 }}>
              <Text style={x.alertTitle}>
                {a.tipo === "SOS" ? "S.O.S." : "Salida de zona"}
              </Text>
              <Text style={x.meta}>
                {a.fecha} · {a.hora.slice(0, 5)}
              </Text>
            </View>
            <Text style={x.alertState}>{a.estado}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ZoneBadge({ state }: { state: ZoneState }) {
  const value =
    state === "DENTRO_DE_ZONA"
      ? {
          label: "DENTRO DE ZONA",
          color: colors.teal,
          icon: "checkmark-circle" as const,
        }
      : state === "FUERA_DE_ZONA"
        ? {
            label: "FUERA DE ZONA",
            color: colors.danger,
            icon: "warning" as const,
          }
        : state === "UBICACION_DESACTIVADA"
          ? {
              label: "GPS DESACTIVADO",
              color: colors.subtle,
              icon: "location-outline" as const,
            }
          : {
              label: "SIN ACTUALIZACIÓN",
              color: colors.warning,
              icon: "time-outline" as const,
            };
  return (
    <View
      style={[
        x.badge,
        { borderColor: value.color, backgroundColor: `${value.color}18` },
      ]}
    >
      <Ionicons name={value.icon} size={17} color={value.color} />
      <Text style={[x.badgeText, { color: value.color }]}>{value.label}</Text>
    </View>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={x.metric}>
      <Text style={x.metricLabel}>{label}</Text>
      <Text style={x.metricValue}>{value}</Text>
    </View>
  );
}
function MapAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [x.mapAction, pressed && x.pressed]}
    >
      <View style={x.mapActionIcon}>
        <Ionicons name={icon} size={22} color={colors.teal} />
      </View>
      <Text style={x.mapActionText}>{label}</Text>
    </Pressable>
  );
}
function SmallAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [x.smallAction, pressed && x.pressed]}
    >
      <Ionicons name={icon} size={23} color={colors.teal} />
      <Text style={x.smallActionText}>{label}</Text>
    </Pressable>
  );
}
function decodePolyline(encoded: string) {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    let shift = 0,
      result = 0,
      byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

const x = StyleSheet.create({
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
  elderPage: { flex: 1, backgroundColor: colors.canvas },
  full: { flex: 1, backgroundColor: colors.canvas },
  page: { flex: 1, backgroundColor: colors.canvas },
  pageContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 48,
    gap: 18,
  },
  pageTitle: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 30,
    letterSpacing: -0.7,
  },
  body: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  form: { gap: 16 },
  fieldLabel: { fontFamily: fonts.medium, color: colors.text, fontSize: 15 },
  link: { fontFamily: fonts.semibold, color: colors.teal, fontSize: 14 },
  meta: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12 },
  overline: {
    fontFamily: fonts.semibold,
    color: colors.muted,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  mapTop: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 34,
    left: 14,
    right: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(7,16,24,.90)",
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  patient: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: "rgba(7,16,24,.90)",
    borderWidth: 1,
    borderColor: colors.line,
  },
  patientName: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 16,
    marginTop: 2,
  },
  mapSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 230,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === "ios" ? 30 : 18,
    backgroundColor: "rgba(7,16,24,.96)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 13,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginTop: 10,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  update: { alignItems: "flex-end" },
  updateValue: { fontFamily: fonts.semibold, color: colors.teal, fontSize: 14 },
  badge: {
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.4 },
  coords: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
  },
  metricLabel: {
    fontFamily: fonts.medium,
    color: colors.subtle,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontFamily: fonts.semibold,
    color: colors.teal,
    fontSize: 12,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  actionGrid: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  mapAction: { flex: 1, alignItems: "center", gap: 5 },
  mapActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  mapActionText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 11,
  },
  routeSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.tealSoft,
  },
  routeStrong: { fontFamily: fonts.semibold, color: colors.text, fontSize: 14 },
  fallbackAction: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.tealDeep,
    backgroundColor: colors.tealSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  fallbackActionText: {
    fontFamily: fonts.semibold,
    color: colors.teal,
    fontSize: 14,
  },
  shareFallback: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.tealDeep,
    backgroundColor: colors.tealSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
  },
  shareFallbackText: {
    flex: 1,
    fontFamily: fonts.medium,
    color: colors.teal,
    fontSize: 12,
  },
  zoneMap: {
    height: 260,
    borderRadius: radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  radiusPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  radiusValue: {
    fontFamily: fonts.bold,
    color: colors.teal,
    fontSize: 22,
    marginTop: 3,
  },
  stepper: { flexDirection: "row", gap: 8 },
  step: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  empty: {
    padding: 28,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 19 },
  alertCard: {
    flexDirection: "row",
    gap: 13,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  alertNew: { borderColor: colors.dangerDeep, backgroundColor: "#24131A" },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  alertTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
  alertState: {
    fontFamily: fonts.bold,
    color: colors.teal,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  alertName: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 14,
    marginTop: 3,
  },
  alertActions: { flexDirection: "row", gap: 24, marginTop: 11 },
  history: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  categories: { gap: 9, paddingVertical: 2 },
  category: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  categoryOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  categoryText: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 13,
  },
  place: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  placeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  placeName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  distance: {
    fontFamily: fonts.semibold,
    color: colors.teal,
    fontSize: 12,
    marginTop: 5,
  },
  elder: {
    flexGrow: 1,
    backgroundColor: colors.canvas,
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 10,
  },
  elderHeader: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gpsRow: { width: 100, flexDirection: "row", alignItems: "center", gap: 7 },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  gpsText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11 },
  elderTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 19 },
  clock: {
    fontFamily: fonts.semibold,
    color: colors.muted,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  locationRecovery: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dangerDeep,
    backgroundColor: "#24131A",
    padding: 14,
    gap: 12,
  },
  locationRecoveryCopy: { gap: 4 },
  locationRecoveryTitle: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 14,
  },
  locationRecoveryText: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  locationRecoveryActions: { flexDirection: "row", gap: 8 },
  recoveryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  recoveryButtonPrimary: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  recoveryButtonText: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 12,
  },
  recoveryButtonPrimaryText: {
    fontFamily: fonts.semibold,
    color: colors.canvas,
    fontSize: 12,
  },
  elderMap: {
    height: 260,
    minHeight: 190,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  precision: {
    position: "absolute",
    left: 12,
    top: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(7,16,24,.86)",
  },
  precisionText: { fontFamily: fonts.medium, color: colors.text, fontSize: 11 },
  zoneFloat: { position: "absolute", left: 12, right: 12, bottom: 12 },
  address: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  addressIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  addressText: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 14,
    marginTop: 2,
  },
  sosHint: {
    textAlign: "center",
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12,
  },
  sos: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: colors.danger,
    alignSelf: "center",
    padding: 9,
    borderWidth: 1,
    borderColor: "#FF6B7C",
    justifyContent: "center",
    alignItems: "center",
  },
  sosInner: {
    width: 122,
    height: 122,
    borderRadius: 61,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  sosText: {
    fontFamily: fonts.bold,
    color: colors.white,
    fontSize: 39,
    letterSpacing: 2,
  },
  sosSub: {
    fontFamily: fonts.semibold,
    color: "#FFD9DE",
    fontSize: 10,
    letterSpacing: 1.3,
  },
  elderActions: { flexDirection: "row", gap: 7 },
  smallAction: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  smallActionText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 10,
  },
  sharing: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    backgroundColor: colors.tealSoft,
  },
  sharingText: { fontFamily: fonts.medium, color: colors.teal, fontSize: 11 },
});
