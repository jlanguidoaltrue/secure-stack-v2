import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
const options = { definition: { openapi: "3.0.0", info: { title: "Secure API", version: "1.0.0" } }, apis: ["./src/routes/**/*.js"] };
export function setupSwagger(app){
  const specs = swaggerJsdoc(options);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(specs));
}
