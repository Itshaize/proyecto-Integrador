import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: [resolve(sourceDirectory, "../../../.env"), resolve(sourceDirectory, "../.env")], quiet: true });
const config = {
  port: Number(process.env.PORT ?? 4e3),
  jwtSecret: process.env.JWT_SECRET ?? "solo-desarrollo-cambiar-en-produccion",
  mongodbUri: process.env.MONGODB_URI ?? "",
  mongodbDatabase: process.env.MONGODB_DATABASE ?? "cuido",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? ""
};
export {
  config
};
