import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { Circle, Marker, Polyline } from "./map";
import { api, ApiError } from "./api";
import { Button, Field, Header, Notice, Skeleton, useConfirm } from "./components";
import { colors, fonts, radius } from "./theme";
const quito = {
  latitude: -0.1807,
  longitude: -78.4678,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018
};
function AdminMapScreen({
  adult,
  back,
  onZone,
  onPlaces
}) {
  const [location, setLocation] = useState();
  const [zone, setZone] = useState();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [routeFallback, setRouteFallback] = useState(false);
  const [route, setRoute] = useState();
  const map = useRef(null);
  const load = async () => {
    setLoading(true);
    setError("");
    const [l, z] = await Promise.allSettled([
      api.latestLocation(adult.adultId),
      api.safeZone(adult.adultId)
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
  const center = location ? { latitude: location.latitude, longitude: location.longitude } : adult.latitude && adult.longitude ? { latitude: adult.latitude, longitude: adult.longitude } : quito;
  const calculate = async () => {
    const destination = location ? { latitude: location.latitude, longitude: location.longitude } : adult.latitude && adult.longitude ? { latitude: adult.latitude, longitude: adult.longitude } : void 0;
    if (!destination) {
      setError("Primero registra o comparte una ubicaci\xF3n para abrir la ruta.");
      return;
    }
    try {
      setError("");
      setRouteFallback(false);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error(
          "Permite la ubicaci\xF3n del administrador para calcular la ruta."
        );
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const result = await api.route(
        { lat: current.coords.latitude, lng: current.coords.longitude },
        { lat: destination.latitude, lng: destination.longitude }
      );
      const coords = decodePolyline(result.polyline.encodedPolyline);
      setRoute({
        coords,
        distance: result.distancia,
        duration: result.duracion
      });
      setTimeout(
        () => map.current?.fitToCoordinates(coords, {
          edgePadding: { top: 100, right: 48, bottom: 270, left: 48 },
          animated: true
        }),
        50
      );
    } catch (e) {
      setRouteFallback(true);
      setError(
        `${e instanceof Error ? e.message : "No pudimos calcular la ruta."} Puedes continuar en Google Maps.`
      );
    }
  };
  const openExternalRoute = () => Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}&travelmode=walking`
  );
  return /* @__PURE__ */ React.createElement(View, { style: x.full }, /* @__PURE__ */ React.createElement(
    MapView,
    {
      ref: map,
      style: StyleSheet.absoluteFill,
      region: { ...center, latitudeDelta: 0.015, longitudeDelta: 0.015 },
      mapPadding: { top: 100, right: 12, bottom: 230, left: 12 }
    },
    (location || adult.latitude && adult.longitude) && /* @__PURE__ */ React.createElement(
      Marker,
      {
        coordinate: center,
        title: adult.nombre,
        pinColor: colors.danger
      }
    ),
    zone && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Circle,
      {
        center: { latitude: zone.latitude, longitude: zone.longitude },
        radius: zone.radio,
        fillColor: "rgba(39,199,184,.13)",
        strokeColor: colors.teal,
        strokeWidth: 2
      }
    ), /* @__PURE__ */ React.createElement(
      Marker,
      {
        coordinate: {
          latitude: zone.latitude,
          longitude: zone.longitude
        },
        title: zone.nombre,
        pinColor: colors.teal
      }
    )),
    route && /* @__PURE__ */ React.createElement(
      Polyline,
      {
        coordinates: route.coords,
        strokeColor: colors.teal,
        strokeWidth: 5
      }
    )
  ), /* @__PURE__ */ React.createElement(View, { style: x.mapTop }, /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityLabel: "Volver",
      onPress: back,
      style: x.roundButton
    },
    /* @__PURE__ */ React.createElement(Ionicons, { name: "arrow-back", size: 23, color: colors.text })
  ), /* @__PURE__ */ React.createElement(View, { style: x.patient }, /* @__PURE__ */ React.createElement(Text, { style: x.overline }, "Monitoreando"), /* @__PURE__ */ React.createElement(Text, { numberOfLines: 1, style: x.patientName }, adult.nombre)), /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityLabel: "Actualizar mapa",
      onPress: load,
      style: x.roundButton
    },
    /* @__PURE__ */ React.createElement(Ionicons, { name: "refresh", size: 22, color: colors.teal })
  )), /* @__PURE__ */ React.createElement(View, { style: x.mapSheet }, /* @__PURE__ */ React.createElement(View, { style: x.handle }), loading ? /* @__PURE__ */ React.createElement(Skeleton, null) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(View, { style: x.stateRow }, /* @__PURE__ */ React.createElement(ZoneBadge, { state: location?.estadoZona ?? "SIN_ACTUALIZACION" }), /* @__PURE__ */ React.createElement(View, { style: x.update }, /* @__PURE__ */ React.createElement(Text, { style: x.meta }, "Actualizado"), /* @__PURE__ */ React.createElement(Text, { style: x.updateValue }, location?.hora?.slice(0, 5) ?? "--:--"))), !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }), routeFallback && /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityRole: "link",
      onPress: openExternalRoute,
      style: ({ pressed }) => [
        x.fallbackAction,
        pressed && x.pressed
      ]
    },
    /* @__PURE__ */ React.createElement(Ionicons, { name: "open-outline", size: 19, color: colors.teal }),
    /* @__PURE__ */ React.createElement(Text, { style: x.fallbackActionText }, "Abrir ruta en Google Maps")
  ), /* @__PURE__ */ React.createElement(View, { style: x.coords }, /* @__PURE__ */ React.createElement(
    Metric,
    {
      label: "Latitud",
      value: location?.latitude.toFixed(5) ?? "\u2014"
    }
  ), /* @__PURE__ */ React.createElement(
    Metric,
    {
      label: "Longitud",
      value: location?.longitude.toFixed(5) ?? "\u2014"
    }
  ), /* @__PURE__ */ React.createElement(Metric, { label: "Radio", value: zone ? `${zone.radio} m` : "\u2014" })), route && /* @__PURE__ */ React.createElement(View, { style: x.routeSummary }, /* @__PURE__ */ React.createElement(Ionicons, { name: "navigate", size: 20, color: colors.teal }), /* @__PURE__ */ React.createElement(Text, { style: x.routeStrong }, route.distance), /* @__PURE__ */ React.createElement(Text, { style: x.meta }, "aprox. ", route.duration)), /* @__PURE__ */ React.createElement(View, { style: x.actionGrid }, /* @__PURE__ */ React.createElement(
    MapAction,
    {
      icon: "shield-checkmark-outline",
      label: zone ? "Editar zona" : "Crear zona",
      onPress: () => onZone(zone)
    }
  ), /* @__PURE__ */ React.createElement(
    MapAction,
    {
      icon: "navigate-outline",
      label: "Ruta",
      onPress: calculate
    }
  ), /* @__PURE__ */ React.createElement(
    MapAction,
    {
      icon: "medkit-outline",
      label: "Ayuda cerca",
      onPress: onPlaces
    }
  )))));
}
function SafeZoneFormScreen({
  adult,
  zone,
  back,
  saved
}) {
  const initial = {
    latitude: zone?.latitude ?? adult.latitude ?? quito.latitude,
    longitude: zone?.longitude ?? adult.longitude ?? quito.longitude
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
        e instanceof Error ? e.message : "No encontramos esa direcci\xF3n."
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
        estado: "ACTIVO"
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
  return /* @__PURE__ */ React.createElement(
    ScrollView,
    {
      style: x.page,
      contentContainerStyle: x.pageContent,
      keyboardShouldPersistTaps: "handled"
    },
    /* @__PURE__ */ React.createElement(
      Header,
      {
        title: zone ? "Editar zona segura" : "Nueva zona segura",
        onBack: back
      }
    ),
    /* @__PURE__ */ React.createElement(Text, { style: x.pageTitle }, "Define el lugar seguro"),
    /* @__PURE__ */ React.createElement(Text, { style: x.body }, "Toca el mapa para mover el centro y ajusta el radio entre 50 y 2.000 metros."),
    !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }),
    /* @__PURE__ */ React.createElement(View, { style: x.form }, /* @__PURE__ */ React.createElement(
      Field,
      {
        label: "Nombre de la zona",
        value: name,
        onChangeText: setName,
        placeholder: "Ej. Casa"
      }
    ), /* @__PURE__ */ React.createElement(
      Field,
      {
        label: "Direcci\xF3n en Quito",
        value: address,
        onChangeText: setAddress,
        placeholder: "Calle principal y secundaria"
      }
    ), /* @__PURE__ */ React.createElement(
      Button,
      {
        title: "Buscar direcci\xF3n",
        variant: "secondary",
        icon: "search-outline",
        loading,
        onPress: verify
      }
    )),
    /* @__PURE__ */ React.createElement(View, { style: x.zoneMap }, /* @__PURE__ */ React.createElement(
      MapView,
      {
        style: StyleSheet.absoluteFill,
        region: { ...point, latitudeDelta: 0.012, longitudeDelta: 0.012 },
        mapPadding: { top: 8, right: 8 },
        onPress: (event) => setPoint(event.nativeEvent.coordinate)
      },
      /* @__PURE__ */ React.createElement(
        Marker,
        {
          coordinate: point,
          draggable: true,
          onDragEnd: (event) => setPoint(event.nativeEvent.coordinate)
        }
      ),
      /* @__PURE__ */ React.createElement(
        Circle,
        {
          center: point,
          radius: radio,
          fillColor: "rgba(39,199,184,.13)",
          strokeColor: colors.teal
        }
      )
    )),
    /* @__PURE__ */ React.createElement(View, { style: x.radiusPanel }, /* @__PURE__ */ React.createElement(View, null, /* @__PURE__ */ React.createElement(Text, { style: x.fieldLabel }, "Radio de la zona"), /* @__PURE__ */ React.createElement(Text, { style: x.radiusValue }, radio, " metros")), /* @__PURE__ */ React.createElement(View, { style: x.stepper }, /* @__PURE__ */ React.createElement(
      Pressable,
      {
        accessibilityLabel: "Reducir radio",
        onPress: () => setRadio(Math.max(50, radio - 50)),
        style: x.step
      },
      /* @__PURE__ */ React.createElement(Ionicons, { name: "remove", size: 22, color: colors.text })
    ), /* @__PURE__ */ React.createElement(
      Pressable,
      {
        accessibilityLabel: "Aumentar radio",
        onPress: () => setRadio(Math.min(2e3, radio + 50)),
        style: x.step
      },
      /* @__PURE__ */ React.createElement(Ionicons, { name: "add", size: 22, color: colors.text })
    ))),
    /* @__PURE__ */ React.createElement(
      Button,
      {
        title: "Guardar zona segura",
        icon: "shield-checkmark-outline",
        loading,
        disabled: !name || !address,
        onPress: save
      }
    )
  );
}
function AlertsScreen({
  back,
  onOpenMap
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      setError("");
      const adults = (await api.adults()).adultos;
      const lists = await Promise.all(
        adults.map(async (adult) => ({
          adult,
          alerts: await api.alerts(adult.adultId)
        }))
      );
      setItems(
        lists.flatMap((v) => v.alerts.map((alert) => ({ alert, adult: v.adult }))).sort((a, b) => b.alert.id_alerta - a.alert.id_alerta)
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos cargar las alertas."
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const attend = async (item) => {
    try {
      await api.updateAlert(
        item.alert.id_alerta,
        item.alert.estado === "NUEVA" ? "VISTA" : "ATENDIDA"
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos actualizar la alerta."
      );
    }
  };
  return /* @__PURE__ */ React.createElement(ScrollView, { style: x.page, contentContainerStyle: x.pageContent }, /* @__PURE__ */ React.createElement(Header, { title: "Alertas", onBack: back }), /* @__PURE__ */ React.createElement(View, null, /* @__PURE__ */ React.createElement(Text, { style: x.pageTitle }, "Centro de alertas"), /* @__PURE__ */ React.createElement(Text, { style: x.body }, items.filter((i) => i.alert.estado === "NUEVA").length, " alertas nuevas requieren revisi\xF3n.")), !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }), loading ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Skeleton, null), /* @__PURE__ */ React.createElement(Skeleton, null)) : items.length === 0 ? /* @__PURE__ */ React.createElement(View, { style: x.empty }, /* @__PURE__ */ React.createElement(
    Ionicons,
    {
      name: "checkmark-circle-outline",
      size: 34,
      color: colors.teal
    }
  ), /* @__PURE__ */ React.createElement(Text, { style: x.emptyTitle }, "Todo est\xE1 tranquilo"), /* @__PURE__ */ React.createElement(Text, { style: x.body }, "Las alertas S.O.S. y de salida de zona aparecer\xE1n aqu\xED.")) : items.map((item) => /* @__PURE__ */ React.createElement(
    View,
    {
      key: item.alert.id_alerta,
      style: [x.alertCard, item.alert.estado === "NUEVA" && x.alertNew]
    },
    /* @__PURE__ */ React.createElement(View, { style: x.alertIcon }, /* @__PURE__ */ React.createElement(
      Ionicons,
      {
        name: item.alert.tipo === "SOS" ? "call" : "walk",
        size: 22,
        color: item.alert.tipo === "SOS" ? colors.danger : colors.warning
      }
    )),
    /* @__PURE__ */ React.createElement(View, { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(View, { style: x.alertTop }, /* @__PURE__ */ React.createElement(Text, { style: x.alertTitle }, item.alert.tipo === "SOS" ? "Solicitud S.O.S." : "Fuera de zona"), /* @__PURE__ */ React.createElement(Text, { style: x.alertState }, item.alert.estado)), /* @__PURE__ */ React.createElement(Text, { style: x.alertName }, item.adult.nombre), /* @__PURE__ */ React.createElement(Text, { style: x.meta }, item.alert.fecha, " \xB7 ", item.alert.hora.slice(0, 5)), /* @__PURE__ */ React.createElement(View, { style: x.alertActions }, /* @__PURE__ */ React.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: `Ver mapa de ${item.adult.nombre}`,
        onPress: () => onOpenMap(item.adult)
      },
      /* @__PURE__ */ React.createElement(Text, { style: x.link }, "Ver mapa")
    ), item.alert.estado !== "ATENDIDA" && item.alert.estado !== "CERRADA" && /* @__PURE__ */ React.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        onPress: () => attend(item)
      },
      /* @__PURE__ */ React.createElement(Text, { style: x.link }, item.alert.estado === "NUEVA" ? "Marcar vista" : "Atender")
    )))
  )));
}
function NearbyPlacesScreen({
  adult,
  adultId,
  back
}) {
  const [category, setCategory] = useState("hospital");
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState();
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
                longitude: adult.longitude
              });
            } else {
              throw new Error(
                "El adulto todav\xEDa no tiene una ubicaci\xF3n registrada."
              );
            }
          }
        } else {
          const p = await Location.requestForegroundPermissionsAsync();
          if (p.status === "granted") {
            const l = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced
            });
            setCoords(l.coords);
          } else if (adultId) {
            setCoords(await api.latestLocation(adultId));
          } else {
            throw new Error("Permite la ubicaci\xF3n para buscar ayuda cercana.");
          }
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No tenemos una ubicaci\xF3n disponible."
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
        e instanceof Error ? e.message : "No pudimos buscar lugares cercanos."
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
    ["policia", "Polic\xEDa", "shield-outline"],
    ["punto_ayuda", "Ayuda", "flame-outline"]
  ];
  const openGoogleSearch = () => {
    if (!coords) return;
    const label = categories.find(([id]) => id === category)?.[1] ?? "Ayuda";
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${label} cerca de ${coords.latitude},${coords.longitude}`)}`
    );
  };
  return /* @__PURE__ */ React.createElement(ScrollView, { style: x.page, contentContainerStyle: x.pageContent }, /* @__PURE__ */ React.createElement(Header, { title: "Ayuda cercana", onBack: back }), /* @__PURE__ */ React.createElement(Text, { style: x.pageTitle }, "Lugares que pueden ayudarte"), /* @__PURE__ */ React.createElement(
    ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      contentContainerStyle: x.categories
    },
    categories.map(([id, label, icon]) => /* @__PURE__ */ React.createElement(
      Pressable,
      {
        key: id,
        accessibilityRole: "button",
        accessibilityState: { selected: category === id },
        onPress: () => search(id),
        style: [x.category, category === id && x.categoryOn]
      },
      /* @__PURE__ */ React.createElement(
        Ionicons,
        {
          name: icon,
          size: 20,
          color: category === id ? colors.canvas : colors.teal
        }
      ),
      /* @__PURE__ */ React.createElement(
        Text,
        {
          style: [
            x.categoryText,
            category === id && { color: colors.canvas }
          ]
        },
        label
      )
    ))
  ), !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }), !!error && coords && /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityRole: "link",
      onPress: openGoogleSearch,
      style: ({ pressed }) => [x.fallbackAction, pressed && x.pressed]
    },
    /* @__PURE__ */ React.createElement(Ionicons, { name: "search-outline", size: 19, color: colors.teal }),
    /* @__PURE__ */ React.createElement(Text, { style: x.fallbackActionText }, "Buscar en Google Maps")
  ), loading ? /* @__PURE__ */ React.createElement(Skeleton, null) : places.length === 0 && !error ? /* @__PURE__ */ React.createElement(View, { style: x.empty }, /* @__PURE__ */ React.createElement(Ionicons, { name: "location-outline", size: 32, color: colors.teal }), /* @__PURE__ */ React.createElement(Text, { style: x.emptyTitle }, "Sin resultados cercanos")) : places.map((place) => /* @__PURE__ */ React.createElement(
    Pressable,
    {
      key: place.id,
      accessibilityRole: "link",
      onPress: () => Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
      ),
      style: x.place
    },
    /* @__PURE__ */ React.createElement(View, { style: x.placeIcon }, /* @__PURE__ */ React.createElement(Ionicons, { name: "location", size: 20, color: colors.teal })),
    /* @__PURE__ */ React.createElement(View, { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(Text, { style: x.placeName }, place.nombre), /* @__PURE__ */ React.createElement(Text, { numberOfLines: 2, style: x.meta }, place.direccion), /* @__PURE__ */ React.createElement(Text, { style: x.distance }, place.distancia < 1e3 ? `${place.distancia} m` : `${(place.distancia / 1e3).toFixed(1)} km`)),
    /* @__PURE__ */ React.createElement(Ionicons, { name: "navigate-outline", size: 21, color: colors.teal })
  )));
}
function IntegratedElderHome({
  session,
  logout,
  go
}) {
  const adultId = session.usuario.adultId;
  const [location, setLocation] = useState();
  const [zone, setZone] = useState();
  const [contact, setContact] = useState();
  const [status, setStatus] = useState("Buscando GPS\u2026");
  const [error, setError] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [gpsAttempt, setGpsAttempt] = useState(0);
  const [time, setTime] = useState(/* @__PURE__ */ new Date());
  const { show: showConfirm, dialog: confirmDialog } = useConfirm();
  useEffect(() => {
    const timer = setInterval(() => setTime(/* @__PURE__ */ new Date()), 3e4);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!adultId) {
      setError("Vuelve a iniciar sesi\xF3n para activar tu perfil de ubicaci\xF3n.");
      return;
    }
    let subscription;
    (async () => {
      try {
        setError("");
        const [z, c, latest] = await Promise.allSettled([
          api.safeZone(adultId),
          api.contacts(adultId),
          api.latestLocation(adultId)
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
            timeInterval: 15e3,
            distanceInterval: 20
          },
          async (current) => {
            try {
              const reverse = await Location.reverseGeocodeAsync({
                latitude: current.coords.latitude,
                longitude: current.coords.longitude
              });
              const p = reverse[0];
              const direccion = p ? [p.street, p.name, p.city].filter(Boolean).join(", ") : null;
              const saved = await api.saveLocation({
                adultId,
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
                accuracy: current.coords.accuracy ?? 0,
                direccion
              });
              setLocation(saved);
              setStatus("Ubicaci\xF3n compartida");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "No pudimos compartir la ubicaci\xF3n."
              );
            }
          }
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ubicaci\xF3n no disponible.");
      }
    })();
    return () => subscription?.remove();
  }, [adultId, gpsAttempt]);
  const region = location ? {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012
  } : quito;
  const useDemoLocation = async () => {
    if (!adultId) return;
    try {
      setError("");
      setStatus("Guardando punto de prueba\u2026");
      const saved = await api.saveLocation({
        adultId,
        latitude: quito.latitude,
        longitude: quito.longitude,
        accuracy: 25,
        direccion: "Av. Amazonas y Naciones Unidas, Quito (punto de prueba)"
      });
      setLocation(saved);
      setStatus("Punto de prueba compartido");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos guardar el punto de prueba."
      );
    }
  };
  const [sosSuccess, setSosSuccess] = useState(false);
  const sendSos = async () => {
    if (!adultId || !location) {
      setError(
        "Activa el GPS o usa el punto de prueba antes de enviar la alerta."
      );
      return;
    }
    try {
      setError("");
      await api.createAlert({
        adultId,
        tipo: "SOS",
        latitude: location.latitude,
        longitude: location.longitude
      });
      setSosSuccess(true);
      setTimeout(() => setSosSuccess(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos enviar la alerta.");
    }
  };
  const sos = () => {
    const message = "Se enviar\xE1 una alerta S.O.S. con tu ubicaci\xF3n actual a tu familiar.";
    showConfirm({
      title: "\xBFPedir ayuda?",
      message,
      confirmLabel: "S\xED, pedir ayuda",
      confirmVariant: "danger",
      onConfirm: () => void sendSos()
    });
  };
  const call = async () => {
    if (!contact) {
      setError("No hay un tel\xE9fono familiar configurado.");
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
    const message = `Estoy aqu\xED: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    try {
      setError("");
      setShareLink("");
      const clipboard = globalThis.navigator?.clipboard;
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
          const documentRef = globalThis.document;
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
        setSosSuccess(true);
        setTimeout(() => setSosSuccess(false), 3500);
      } else {
        await Share.share({ message });
      }
    } catch {
      const url = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      setShareLink(url);
      setError(
        "El navegador bloque\xF3 la copia autom\xE1tica. Mant\xE9n pulsado el enlace para copiarlo."
      );
    }
  };
  return /* @__PURE__ */ React.createElement(
    ScrollView,
    {
      style: x.elderPage,
      contentContainerStyle: x.elder,
      showsVerticalScrollIndicator: false
    },
    confirmDialog,
    /* @__PURE__ */ React.createElement(View, { style: x.elderHeader }, /* @__PURE__ */ React.createElement(View, { style: x.gpsRow }, /* @__PURE__ */ React.createElement(
      View,
      {
        style: [
          x.gpsDot,
          status.includes("sin permiso") && {
            backgroundColor: colors.danger
          }
        ]
      }
    ), /* @__PURE__ */ React.createElement(Text, { style: x.gpsText }, status)), /* @__PURE__ */ React.createElement(Text, { style: x.elderTitle }, "Mi ubicaci\xF3n"), /* @__PURE__ */ React.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: "Cerrar sesi\xF3n",
        onPress: () => showConfirm({
          title: "Cerrar sesi\xF3n",
          message: "\xBFQuieres salir de Cuido+?",
          confirmLabel: "Cerrar sesi\xF3n",
          confirmVariant: "danger",
          onConfirm: logout
        }),
        style: ({ pressed }) => [x.clockAction, pressed && x.pressed]
      },
      /* @__PURE__ */ React.createElement(Text, { style: x.clock }, time.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit"
      })),
      /* @__PURE__ */ React.createElement(Ionicons, { name: "log-out-outline", size: 16, color: colors.muted })
    )),
    !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }),
    !!sosSuccess && /* @__PURE__ */ React.createElement(Notice, { type: "success", message: "✅ Alerta enviada. Tu familiar recibió la solicitud y tu ubicación." }),
    !!shareLink && /* @__PURE__ */ React.createElement(
      Pressable,
      {
        accessibilityRole: "link",
        onPress: () => Linking.openURL(shareLink),
        style: ({ pressed }) => [x.shareFallback, pressed && x.pressed]
      },
      /* @__PURE__ */ React.createElement(Ionicons, { name: "link-outline", size: 18, color: colors.teal }),
      /* @__PURE__ */ React.createElement(Text, { selectable: true, numberOfLines: 2, style: x.shareFallbackText }, shareLink),
      /* @__PURE__ */ React.createElement(Ionicons, { name: "open-outline", size: 18, color: colors.teal })
    ),
    status.includes("sin permiso") && /* @__PURE__ */ React.createElement(View, { style: x.locationRecovery }, /* @__PURE__ */ React.createElement(View, { style: x.locationRecoveryCopy }, /* @__PURE__ */ React.createElement(Text, { style: x.locationRecoveryTitle }, "El navegador bloque\xF3 el GPS"), /* @__PURE__ */ React.createElement(Text, { style: x.locationRecoveryText }, "Activa el permiso y reintenta. Para la exposici\xF3n puedes cargar un punto de prueba en Quito.")), /* @__PURE__ */ React.createElement(View, { style: x.locationRecoveryActions }, /* @__PURE__ */ React.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        onPress: () => setGpsAttempt((value) => value + 1),
        style: ({ pressed }) => [x.recoveryButton, pressed && x.pressed]
      },
      /* @__PURE__ */ React.createElement(Ionicons, { name: "locate-outline", size: 17, color: colors.text }),
      /* @__PURE__ */ React.createElement(Text, { style: x.recoveryButtonText }, "Reintentar")
    ), Platform.OS === "web" && /* @__PURE__ */ React.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        onPress: useDemoLocation,
        style: ({ pressed }) => [
          x.recoveryButton,
          x.recoveryButtonPrimary,
          pressed && x.pressed
        ]
      },
      /* @__PURE__ */ React.createElement(
        Ionicons,
        {
          name: "flask-outline",
          size: 17,
          color: colors.canvas
        }
      ),
      /* @__PURE__ */ React.createElement(Text, { style: x.recoveryButtonPrimaryText }, "Usar prueba")
    ))),
    /* @__PURE__ */ React.createElement(View, { style: x.elderMap }, /* @__PURE__ */ React.createElement(
      MapView,
      {
        style: StyleSheet.absoluteFill,
        region,
        showsUserLocation: true
      },
      location && /* @__PURE__ */ React.createElement(Marker, { coordinate: region }),
      zone && /* @__PURE__ */ React.createElement(
        Circle,
        {
          center: { latitude: zone.latitude, longitude: zone.longitude },
          radius: zone.radio,
          fillColor: "rgba(39,199,184,.13)",
          strokeColor: colors.teal
        }
      )
    ), /* @__PURE__ */ React.createElement(View, { style: x.precision }, /* @__PURE__ */ React.createElement(Ionicons, { name: "locate-outline", size: 15, color: colors.teal }), /* @__PURE__ */ React.createElement(Text, { style: x.precisionText }, "Precisi\xF3n ", location ? `${Math.round(location.accuracy)} m` : "\u2014")), /* @__PURE__ */ React.createElement(View, { style: x.zoneFloat }, /* @__PURE__ */ React.createElement(ZoneBadge, { state: location?.estadoZona ?? "SIN_ACTUALIZACION" }))),
    /* @__PURE__ */ React.createElement(View, { style: x.address }, /* @__PURE__ */ React.createElement(View, { style: x.addressIcon }, /* @__PURE__ */ React.createElement(Ionicons, { name: "location", size: 21, color: colors.teal })), /* @__PURE__ */ React.createElement(View, { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(Text, { style: x.meta }, "Est\xE1s en"), /* @__PURE__ */ React.createElement(Text, { numberOfLines: 2, style: x.addressText }, location?.direccion ?? "Ubicaci\xF3n todav\xEDa no disponible"))),
    /* @__PURE__ */ React.createElement(Text, { style: x.sosHint }, "Presiona si necesitas ayuda urgente"),
    /* @__PURE__ */ React.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: "Pedir ayuda S.O.S.",
        onPress: sos,
        style: ({ pressed }) => [
          x.sos,
          pressed && { transform: [{ scale: 0.97 }] }
        ]
      },
      /* @__PURE__ */ React.createElement(View, { style: x.sosInner }, /* @__PURE__ */ React.createElement(Text, { style: x.sosText }, "SOS"), /* @__PURE__ */ React.createElement(Text, { style: x.sosSub }, "EMERGENCIA"))
    ),
    /* @__PURE__ */ React.createElement(View, { style: x.elderActions }, /* @__PURE__ */ React.createElement(SmallAction, { icon: "call-outline", label: "Llamar", onPress: call }), /* @__PURE__ */ React.createElement(
      SmallAction,
      {
        icon: "share-social-outline",
        label: "Compartir",
        onPress: share
      }
    ), /* @__PURE__ */ React.createElement(
      SmallAction,
      {
        icon: "medkit-outline",
        label: "Ayuda",
        onPress: () => go("elderPlaces")
      }
    ), /* @__PURE__ */ React.createElement(
      SmallAction,
      {
        icon: "time-outline",
        label: "Historial",
        onPress: () => go("elderHistory")
      }
    )),
    /* @__PURE__ */ React.createElement(View, { style: x.sharing }, /* @__PURE__ */ React.createElement(
      View,
      {
        style: [x.gpsDot, !location && { backgroundColor: colors.warning }]
      }
    ), /* @__PURE__ */ React.createElement(Text, { style: x.sharingText }, location ? `Ubicaci\xF3n compartida con ${contact?.nombre ?? "tu familiar"}` : "Pendiente de compartir ubicaci\xF3n"))
  );
}
function AdultHistoryScreen({
  session,
  back
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (session.usuario.adultId)
      api.alerts(session.usuario.adultId).then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  return /* @__PURE__ */ React.createElement(ScrollView, { style: x.page, contentContainerStyle: x.pageContent }, /* @__PURE__ */ React.createElement(Header, { title: "Mis alertas", onBack: back }), /* @__PURE__ */ React.createElement(Text, { style: x.pageTitle }, "Historial de ayuda"), !!error && /* @__PURE__ */ React.createElement(Notice, { type: "error", message: error }), loading ? /* @__PURE__ */ React.createElement(Skeleton, null) : items.length === 0 ? /* @__PURE__ */ React.createElement(View, { style: x.empty }, /* @__PURE__ */ React.createElement(
    Ionicons,
    {
      name: "checkmark-circle-outline",
      size: 34,
      color: colors.teal
    }
  ), /* @__PURE__ */ React.createElement(Text, { style: x.emptyTitle }, "Sin alertas registradas")) : items.map((a) => /* @__PURE__ */ React.createElement(View, { key: a.id_alerta, style: x.history }, /* @__PURE__ */ React.createElement(
    Ionicons,
    {
      name: a.tipo === "SOS" ? "call" : "walk",
      size: 22,
      color: a.tipo === "SOS" ? colors.danger : colors.warning
    }
  ), /* @__PURE__ */ React.createElement(View, { style: { flex: 1 } }, /* @__PURE__ */ React.createElement(Text, { style: x.alertTitle }, a.tipo === "SOS" ? "S.O.S." : "Salida de zona"), /* @__PURE__ */ React.createElement(Text, { style: x.meta }, a.fecha, " \xB7 ", a.hora.slice(0, 5))), /* @__PURE__ */ React.createElement(Text, { style: x.alertState }, a.estado))));
}
function ZoneBadge({ state }) {
  const value = state === "DENTRO_DE_ZONA" ? {
    label: "DENTRO DE ZONA",
    color: colors.teal,
    icon: "checkmark-circle"
  } : state === "FUERA_DE_ZONA" ? {
    label: "FUERA DE ZONA",
    color: colors.danger,
    icon: "warning"
  } : state === "UBICACION_DESACTIVADA" ? {
    label: "GPS DESACTIVADO",
    color: colors.subtle,
    icon: "location-outline"
  } : {
    label: "SIN ACTUALIZACI\xD3N",
    color: colors.warning,
    icon: "time-outline"
  };
  return /* @__PURE__ */ React.createElement(
    View,
    {
      style: [
        x.badge,
        { borderColor: value.color, backgroundColor: `${value.color}18` }
      ]
    },
    /* @__PURE__ */ React.createElement(Ionicons, { name: value.icon, size: 17, color: value.color }),
    /* @__PURE__ */ React.createElement(Text, { style: [x.badgeText, { color: value.color }] }, value.label)
  );
}
function Metric({ label, value }) {
  return /* @__PURE__ */ React.createElement(View, { style: x.metric }, /* @__PURE__ */ React.createElement(Text, { style: x.metricLabel }, label), /* @__PURE__ */ React.createElement(Text, { style: x.metricValue }, value));
}
function MapAction({
  icon,
  label,
  onPress
}) {
  return /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityRole: "button",
      accessibilityLabel: label,
      onPress,
      style: ({ pressed }) => [x.mapAction, pressed && x.pressed]
    },
    /* @__PURE__ */ React.createElement(View, { style: x.mapActionIcon }, /* @__PURE__ */ React.createElement(Ionicons, { name: icon, size: 22, color: colors.teal })),
    /* @__PURE__ */ React.createElement(Text, { style: x.mapActionText }, label)
  );
}
function SmallAction({
  icon,
  label,
  onPress
}) {
  return /* @__PURE__ */ React.createElement(
    Pressable,
    {
      accessibilityRole: "button",
      accessibilityLabel: label,
      onPress,
      style: ({ pressed }) => [x.smallAction, pressed && x.pressed]
    },
    /* @__PURE__ */ React.createElement(Ionicons, { name: icon, size: 23, color: colors.teal }),
    /* @__PURE__ */ React.createElement(Text, { style: x.smallActionText }, label)
  );
}
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
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
    gap: 18
  },
  pageTitle: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 30,
    letterSpacing: -0.7
  },
  body: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
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
    textTransform: "uppercase"
  },
  mapTop: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 34,
    left: 14,
    right: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(7,16,24,.90)",
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center"
  },
  patient: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: "rgba(7,16,24,.90)",
    borderWidth: 1,
    borderColor: colors.line
  },
  patientName: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 16,
    marginTop: 2
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
    gap: 13
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginTop: 10
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
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
    paddingHorizontal: 11
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.4 },
  coords: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10
  },
  metricLabel: {
    fontFamily: fonts.medium,
    color: colors.subtle,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  metricValue: {
    fontFamily: fonts.semibold,
    color: colors.teal,
    fontSize: 12,
    marginTop: 4,
    fontVariant: ["tabular-nums"]
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
    justifyContent: "center"
  },
  mapActionText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 11
  },
  routeSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.tealSoft
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
    paddingHorizontal: 14
  },
  fallbackActionText: {
    fontFamily: fonts.semibold,
    color: colors.teal,
    fontSize: 14
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
    paddingHorizontal: 13
  },
  shareFallbackText: {
    flex: 1,
    fontFamily: fonts.medium,
    color: colors.teal,
    fontSize: 12
  },
  zoneMap: {
    height: 260,
    borderRadius: radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line
  },
  radiusPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  radiusValue: {
    fontFamily: fonts.bold,
    color: colors.teal,
    fontSize: 22,
    marginTop: 3
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
    borderColor: colors.line
  },
  empty: {
    padding: 28,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    gap: 10
  },
  emptyTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 19 },
  alertCard: {
    flexDirection: "row",
    gap: 13,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  alertNew: { borderColor: colors.dangerDeep, backgroundColor: "#24131A" },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center"
  },
  alertTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  alertTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16 },
  alertState: {
    fontFamily: fonts.bold,
    color: colors.teal,
    fontSize: 9,
    letterSpacing: 0.5
  },
  alertName: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 14,
    marginTop: 3
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
    borderColor: colors.line
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
    gap: 7
  },
  categoryOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  categoryText: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 13
  },
  place: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  placeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  placeName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  distance: {
    fontFamily: fonts.semibold,
    color: colors.teal,
    fontSize: 12,
    marginTop: 5
  },
  elder: {
    flexGrow: 1,
    backgroundColor: colors.canvas,
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 10
  },
  elderHeader: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  gpsRow: { width: 100, flexDirection: "row", alignItems: "center", gap: 7 },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal
  },
  gpsText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11 },
  elderTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 19 },
  clock: {
    fontFamily: fonts.semibold,
    color: colors.muted,
    fontSize: 14,
    fontVariant: ["tabular-nums"]
  },
  clockAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5
  },
  locationRecovery: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dangerDeep,
    backgroundColor: "#24131A",
    padding: 14,
    gap: 12
  },
  locationRecoveryCopy: { gap: 4 },
  locationRecoveryTitle: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 14
  },
  locationRecoveryText: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
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
    gap: 7
  },
  recoveryButtonPrimary: {
    backgroundColor: colors.teal,
    borderColor: colors.teal
  },
  recoveryButtonText: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 12
  },
  recoveryButtonPrimaryText: {
    fontFamily: fonts.semibold,
    color: colors.canvas,
    fontSize: 12
  },
  elderMap: {
    height: 260,
    minHeight: 190,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line
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
    backgroundColor: "rgba(7,16,24,.86)"
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
    borderColor: colors.line
  },
  addressIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  addressText: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 14,
    marginTop: 2
  },
  sosHint: {
    textAlign: "center",
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12
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
    alignItems: "center"
  },
  sosInner: {
    width: 122,
    height: 122,
    borderRadius: 61,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,.35)",
    alignItems: "center",
    justifyContent: "center"
  },
  sosText: {
    fontFamily: fonts.bold,
    color: colors.white,
    fontSize: 39,
    letterSpacing: 2
  },
  sosSub: {
    fontFamily: fonts.semibold,
    color: "#FFD9DE",
    fontSize: 10,
    letterSpacing: 1.3
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
    borderColor: colors.line
  },
  smallActionText: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 10
  },
  sharing: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    backgroundColor: colors.tealSoft
  },
  sharingText: { fontFamily: fonts.medium, color: colors.teal, fontSize: 11 }
});
export {
  AdminMapScreen,
  AdultHistoryScreen,
  AlertsScreen,
  IntegratedElderHome,
  NearbyPlacesScreen,
  SafeZoneFormScreen
};
