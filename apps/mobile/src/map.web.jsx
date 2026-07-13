import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef
} from "react";
import { StyleSheet, View } from "react-native";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
const DEFAULT_REGION = {
  latitude: -0.1807,
  longitude: -78.4678,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018
};
function Marker(_props) {
  return null;
}
function Circle(_props) {
  return null;
}
function Polyline(_props) {
  return null;
}
function flattenChildren(children) {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) return [];
    if (child.type === React.Fragment)
      return flattenChildren(
        child.props.children
      );
    return [child];
  });
}
function markerIcon(color) {
  return L.divIcon({
    className: "cuido-leaflet-marker",
    html: `<span style="display:block;width:30px;height:30px;border-radius:50% 50% 50% 8px;transform:rotate(-45deg);background:${color};border:5px solid rgba(7,16,24,.82);box-shadow:0 8px 18px rgba(2,8,15,.35)"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#071018;position:absolute;left:7px;top:7px"></span></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    tooltipAnchor: [0, -24]
  });
}
const MapView = forwardRef(
  ({ children, style, region, initialRegion, mapPadding, onPress }, ref) => {
    const containerRef = useRef(null);
    const mapRef = useRef(void 0);
    const overlayGroupRef = useRef(void 0);
    const mapRegion = region ?? initialRegion ?? DEFAULT_REGION;
    const descriptors = useMemo(() => flattenChildren(children), [children]);
    useImperativeHandle(ref, () => ({
      fitToCoordinates: (coordinates, options) => {
        if (!mapRef.current || coordinates.length === 0) return;
        const bounds = L.latLngBounds(
          coordinates.map((point) => [point.latitude, point.longitude])
        );
        const padding = options?.edgePadding;
        mapRef.current.fitBounds(bounds, {
          animate: options?.animated,
          maxZoom: 17,
          paddingTopLeft: L.point(padding?.left ?? 24, padding?.top ?? 24),
          paddingBottomRight: L.point(
            padding?.right ?? 24,
            padding?.bottom ?? 24
          )
        });
      },
      animateToRegion: (next) => mapRef.current?.flyTo([next.latitude, next.longitude], 16, {
        duration: 0.25
      })
    }));
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [mapRegion.latitude, mapRegion.longitude],
        zoom: 16,
        zoomControl: false,
        attributionControl: true
      });
      const zoom = L.control.zoom({ position: "topright" }).addTo(map);
      const zoomContainer = zoom.getContainer();
      if (zoomContainer) {
        zoomContainer.style.marginTop = `${mapPadding?.top ?? 44}px`;
        zoomContainer.style.marginRight = `${mapPadding?.right ?? 10}px`;
      }
      map.attributionControl.setPrefix(false);
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "&copy; OpenStreetMap &copy; CARTO",
          subdomains: "abcd",
          maxZoom: 20
        }
      ).addTo(map);
      overlayGroupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      const styleId = "cuido-leaflet-theme";
      if (!document.getElementById(styleId)) {
        const theme = document.createElement("style");
        theme.id = styleId;
        theme.textContent = `
          .leaflet-control-zoom { border: 1px solid #1f3544 !important; border-radius: 12px !important; overflow: hidden; }
          .leaflet-control-zoom a { background: rgba(7,16,24,.94) !important; color: #27c7b8 !important; border: 0 !important; border-bottom: 1px solid #1f3544 !important; }
          .leaflet-control-zoom a:last-child { border-bottom: 0 !important; }
          .leaflet-control-zoom a:hover, .leaflet-control-zoom a:focus { background: #102331 !important; color: #f4f8fa !important; }
          .leaflet-control-attribution { background: rgba(7,16,24,.82) !important; color: #8fa5b2 !important; border-radius: 8px 0 0 0; padding: 3px 6px !important; font: 10px Outfit, sans-serif !important; }
          .leaflet-control-attribution a { color: #70d9cf !important; }
          .leaflet-tooltip { background: #0b1720 !important; color: #f4f8fa !important; border: 1px solid #1f3544 !important; box-shadow: 0 8px 18px rgba(2,8,15,.28) !important; font: 12px Outfit, sans-serif !important; }
        `;
        document.head.appendChild(theme);
      }
      requestAnimationFrame(() => map.invalidateSize());
      return () => {
        map.remove();
        mapRef.current = void 0;
        overlayGroupRef.current = void 0;
      };
    }, []);
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      const latitudeDelta = mapRegion.latitudeDelta ?? 0.018;
      const longitudeDelta = mapRegion.longitudeDelta ?? latitudeDelta;
      const bounds = L.latLngBounds(
        [
          mapRegion.latitude - latitudeDelta / 2,
          mapRegion.longitude - longitudeDelta / 2
        ],
        [
          mapRegion.latitude + latitudeDelta / 2,
          mapRegion.longitude + longitudeDelta / 2
        ]
      );
      map.fitBounds(bounds, { animate: false });
    }, [
      mapRegion.latitude,
      mapRegion.longitude,
      mapRegion.latitudeDelta,
      mapRegion.longitudeDelta
    ]);
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !onPress) return;
      const handler = (event) => onPress({
        nativeEvent: {
          coordinate: {
            latitude: event.latlng.lat,
            longitude: event.latlng.lng
          }
        }
      });
      map.on("click", handler);
      return () => {
        map.off("click", handler);
      };
    }, [onPress]);
    useEffect(() => {
      const group = overlayGroupRef.current;
      if (!group) return;
      group.clearLayers();
      descriptors.forEach((descriptor) => {
        let layer;
        if (descriptor.type === Marker) {
          const props = descriptor.props;
          const point = L.marker(
            [props.coordinate.latitude, props.coordinate.longitude],
            {
              icon: markerIcon(props.pinColor ?? "#27C7B8"),
              draggable: props.draggable,
              keyboard: true,
              title: props.title
            }
          );
          if (props.title)
            point.bindTooltip(props.title, {
              direction: "top",
              offset: [0, -8]
            });
          if (props.onDragEnd)
            point.on("dragend", (event) => {
              const next = event.target.getLatLng();
              props.onDragEnd?.({
                nativeEvent: {
                  coordinate: { latitude: next.lat, longitude: next.lng }
                }
              });
            });
          layer = point;
        } else if (descriptor.type === Circle) {
          const props = descriptor.props;
          layer = L.circle([props.center.latitude, props.center.longitude], {
            radius: props.radius,
            color: props.strokeColor ?? "#27C7B8",
            weight: props.strokeWidth ?? 2,
            fillColor: props.fillColor ?? "rgba(39,199,184,.13)",
            fillOpacity: 0.22
          });
        } else if (descriptor.type === Polyline) {
          const props = descriptor.props;
          layer = L.polyline(
            props.coordinates.map((point) => [point.latitude, point.longitude]),
            {
              color: props.strokeColor ?? "#27C7B8",
              weight: props.strokeWidth ?? 5,
              opacity: 0.95
            }
          );
        }
        if (layer) group.addLayer(layer);
      });
    }, [descriptors]);
    return /* @__PURE__ */ React.createElement(
      View,
      {
        ref: containerRef,
        style: [styles.map, style],
        accessibilityLabel: "Mapa interactivo"
      }
    );
  }
);
MapView.displayName = "WebMapView";
var stdin_default = MapView;
const styles = StyleSheet.create({
  map: { overflow: "hidden", backgroundColor: "#0B1722" }
});
export {
  Circle,
  Marker,
  Polyline,
  stdin_default as default
};
