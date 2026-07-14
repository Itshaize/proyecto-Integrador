import { createApp } from "./app.js";
import { config } from "./config.js";
import { connectDatabase } from "./db.js";

await connectDatabase();
const app = createApp();
app.listen(config.port, "0.0.0.0", () => {
  console.log(`Cuido+ API disponible en http://localhost:${config.port}/api`);
  console.log(`MongoDB conectado a la base ${config.mongodbDatabase}`);
});
