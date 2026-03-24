import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { toiletsRouter } from "./routes/toilets.js";

// API entrypoint:
// - wires shared middleware
// - exposes a simple health endpoint
// - mounts toilet-related routes under /toilets
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "gottago-api",
  });
});

app.use("/toilets", toiletsRouter);

app.listen(env.PORT, () => {
  console.log(`GottaGo API listening on port ${env.PORT}`);
});
