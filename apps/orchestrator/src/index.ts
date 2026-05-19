import cors from "cors";
import express from "express";
import { config } from "./config.js";
import "./db.js"; // ensure schema is initialized
import { charactersRouter } from "./routes/characters.js";
import { mediaRouter } from "./routes/media.js";
import { scenariosRouter } from "./routes/scenarios.js";
import { sessionsRouter } from "./routes/sessions.js";
import { worldsRouter } from "./routes/worlds.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/characters", charactersRouter);
app.use("/worlds", worldsRouter);
app.use("/scenarios", scenariosRouter);
app.use("/sessions", sessionsRouter);
app.use("/media", mediaRouter);
app.use("/media/files", express.static(config.dataDir));

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[orchestrator] listening on http://localhost:${config.port}`);
});
