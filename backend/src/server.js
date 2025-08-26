import { envVars } from "./config/envVars.js";
import app from "./app.js";
const server = app.listen(envVars.PORT, () => { console.log(`Server listening on :${envVars.PORT}`); });
process.on("SIGINT", () => { server.close(()=> process.exit(0)); });
