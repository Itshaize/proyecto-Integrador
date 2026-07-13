import type { Adult, AdultInput, AlertItem, EmergencyContact, LocationData, NearbyPlace, RouteData, SafeZone, Session } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';
let token = '';
export const setApiToken = (value:string) => { token=value; };

async function request<T>(path:string, options:RequestInit={}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers:{ 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}), ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if(!response.ok) throw new ApiError(body.message ?? 'No pudimos conectar con el servidor.', response.status, body.errors);
  return body as T;
}
export class ApiError extends Error { constructor(message:string, public status:number, public errors?:{field:string;message:string}[]){ super(message); } }
export const api = {
  register:(data:Record<string,unknown>) => request<Session>('/auth/register',{method:'POST',body:JSON.stringify(data)}),
  login:(correo:string,password:string) => request<Session>('/auth/login',{method:'POST',body:JSON.stringify({correo,password})}),
  me:() => request<{usuario:Session['usuario']}>('/auth/me'),
  adults:() => request<{adultos:Adult[];total:number;limite:number}>('/adults'),
  adult:(id:number) => request<{adulto:Adult}>(`/adults/${id}`),
  createAdult:(data:AdultInput) => request<{adulto:Adult}>(`/adults`,{method:'POST',body:JSON.stringify(data)}),
  updateAdult:(id:number,data:AdultInput) => request<{adulto:Adult}>(`/adults/${id}`,{method:'PUT',body:JSON.stringify(data)}),
  geocode:(direccion:string) => request<{direccion:string;latitude:number;longitude:number}>('/geocoding/address',{method:'POST',body:JSON.stringify({direccion})}),
  latestLocation:(adultId:number) => request<LocationData>(`/locations/${adultId}/latest`),
  saveLocation:(data:{adultId:number;latitude:number;longitude:number;accuracy:number;fecha?:string;hora?:string;direccion?:string|null}) => request<LocationData>('/locations',{method:'POST',body:JSON.stringify(data)}),
  safeZone:(adultId:number) => request<SafeZone>(`/safe-zones/${adultId}`),
  createSafeZone:(data:Omit<SafeZone,'id_zona'|'id_adulto'>) => request<SafeZone>('/safe-zones',{method:'POST',body:JSON.stringify(data)}),
  updateSafeZone:(id:number,data:Omit<SafeZone,'id_zona'|'id_adulto'>) => request<SafeZone>(`/safe-zones/${id}`,{method:'PUT',body:JSON.stringify(data)}),
  deleteSafeZone:(id:number) => request<{success:boolean}>(`/safe-zones/${id}`,{method:'DELETE'}),
  alerts:(adultId:number) => request<AlertItem[]>(`/alerts/${adultId}`),
  createAlert:(data:{adultId:number;tipo:'SOS'|'FUERA_DE_ZONA';latitude:number;longitude:number;estado?:string}) => request<{message:string;alerta:AlertItem}>('/alerts',{method:'POST',body:JSON.stringify(data)}),
  updateAlert:(id:number,estado:AlertItem['estado']) => request<{id_alerta:number;estado:AlertItem['estado']}>(`/alerts/${id}/status`,{method:'PUT',body:JSON.stringify({estado})}),
  contacts:(adultId:number) => request<EmergencyContact[]>(`/contacts/${adultId}`),
  route:(origin:{lat:number;lng:number},destination:{lat:number;lng:number}) => request<RouteData>('/routes',{method:'POST',body:JSON.stringify({origin,destination})}),
  nearbyPlaces:(latitude:number,longitude:number,categoria:string) => request<NearbyPlace[]>('/nearby-places',{method:'POST',body:JSON.stringify({latitude,longitude,categoria})}),
};

