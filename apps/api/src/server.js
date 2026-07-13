import { createApp } from "./app.js";
import { config } from "./config.js";
import { createDatabase } from "./db.js";
const app = createApp(createDatabase());
app.listen(config.port, "0.0.0.0", () => console.log(`Cuido+ API disponible en http://localhost:${config.port}/api`));
