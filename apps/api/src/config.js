import "dotenv/config";
const config = {
  port: Number(process.env.PORT ?? 4e3),
  jwtSecret: process.env.JWT_SECRET ?? "solo-desarrollo-cambiar-en-produccion",
  databasePath: process.env.DATABASE_PATH ?? "./data/cuido.db",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? ""
};
export {
  config
};
