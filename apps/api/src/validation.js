import { z } from "zod";
const cedula = z.string().regex(/^\d{10}$/, "La c\xE9dula debe tener 10 d\xEDgitos").refine((value) => {
  const province = Number(value.slice(0, 2));
  if (province < 1 || province > 24) return false;
  const digits = value.split("").map(Number);
  const sum = digits.slice(0, 9).reduce((total, digit, index) => {
    const result = digit * (index % 2 === 0 ? 2 : 1);
    return total + (result > 9 ? result - 9 : result);
  }, 0);
  return (10 - sum % 10) % 10 === digits[9];
}, "La c\xE9dula ecuatoriana no es v\xE1lida");
const correo = z.string().trim().toLowerCase().email("Ingresa un correo v\xE1lido");
const telefono = z.string().regex(/^0\d{8,9}$/, "Ingresa un tel\xE9fono ecuatoriano v\xE1lido");
const password = z.string().min(8, "La contrase\xF1a debe tener al menos 8 caracteres").regex(/[A-Za-z]/, "La contrase\xF1a debe incluir una letra").regex(/\d/, "La contrase\xF1a debe incluir un n\xFAmero");
const registerSchema = z.object({
  nombre: z.string().trim().min(3).max(100),
  cedula,
  correo,
  telefono,
  password
});
const loginSchema = z.object({ correo, password: z.string().min(1, "Ingresa tu contrase\xF1a") });
const adultSchema = z.object({
  nombre: z.string().trim().min(3).max(100),
  cedula,
  fecha_nacimiento: z.iso.date(),
  telefono,
  direccion: z.string().trim().min(5).max(200),
  contacto_emergencia: telefono,
  correo,
  password: password.optional(),
  foto: z.string().trim().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional()
}).refine((data) => new Date(data.fecha_nacimiento) < /* @__PURE__ */ new Date(), {
  message: "La fecha de nacimiento debe estar en el pasado",
  path: ["fecha_nacimiento"]
});
const createAdultSchema = z.object({
  nombre: adultSchema.shape.nombre,
  cedula: adultSchema.shape.cedula,
  fecha_nacimiento: adultSchema.shape.fecha_nacimiento,
  telefono: adultSchema.shape.telefono,
  direccion: adultSchema.shape.direccion,
  contacto_emergencia: adultSchema.shape.contacto_emergencia,
  correo: adultSchema.shape.correo,
  password,
  foto: adultSchema.shape.foto,
  latitude: adultSchema.shape.latitude,
  longitude: adultSchema.shape.longitude
}).refine((data) => new Date(data.fecha_nacimiento) < /* @__PURE__ */ new Date(), { message: "La fecha de nacimiento debe estar en el pasado", path: ["fecha_nacimiento"] });
const updateAdultSchema = z.object({
  nombre: adultSchema.shape.nombre,
  cedula: adultSchema.shape.cedula,
  fecha_nacimiento: adultSchema.shape.fecha_nacimiento,
  telefono: adultSchema.shape.telefono,
  direccion: adultSchema.shape.direccion,
  contacto_emergencia: adultSchema.shape.contacto_emergencia,
  correo: adultSchema.shape.correo,
  estado: adultSchema.shape.estado,
  foto: adultSchema.shape.foto,
  latitude: adultSchema.shape.latitude,
  longitude: adultSchema.shape.longitude
}).refine((data) => new Date(data.fecha_nacimiento) < /* @__PURE__ */ new Date(), { message: "La fecha de nacimiento debe estar en el pasado", path: ["fecha_nacimiento"] });
const geocodeSchema = z.object({ direccion: z.string().trim().min(5).max(200) });
export {
  adultSchema,
  createAdultSchema,
  geocodeSchema,
  loginSchema,
  registerSchema,
  updateAdultSchema
};
