import type { Adult, AdultInput, Session } from './types';

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
  adults:() => request<{adultos:Adult[];total:number;limite:number}>('/adults'),
  adult:(id:number) => request<{adulto:Adult}>(`/adults/${id}`),
  createAdult:(data:AdultInput) => request<{adulto:Adult}>(`/adults`,{method:'POST',body:JSON.stringify(data)}),
  updateAdult:(id:number,data:AdultInput) => request<{adulto:Adult}>(`/adults/${id}`,{method:'PUT',body:JSON.stringify(data)}),
  geocode:(direccion:string) => request<{direccion:string;latitude:number;longitude:number}>('/geocoding/address',{method:'POST',body:JSON.stringify({direccion})}),
};

