import express from "express";
import cors from "cors";
import fetchUserData from "./fetch-user-data.js";
import uploadEvent from "./upload-user-event.js";

// List of allowed origins
const allowedOrigins = [
  "https://letsmultiply.co.in",
  "https://stage.letsmultiply.co.in",
  "https://dev.letsmultiply.co.in",
  "http://localhost:3000",
];

const app = express();

// CORS middleware configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type"], // Allowed headers
  })
);

app.use(express.json()); // Add this line

app.get("/helath", (_, res) => res.send("Health Check"));

app.post("/api/v1/get-user-profile", async (req, res) => {
  const { identity } = req.body;
  const { filterEvents } = req.body;
  try {
    const userProfile = await fetchUserData(identity, filterEvents);
    res.send(userProfile);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/api/v1/upload-event", async (req, res) => {
  const { identity, eventName, eventData } = req.body;
  try {
    const res = await uploadEvent(identity, eventName, eventData);
    res.send(res);
  } catch (error) {
    res.status(500).send(error);
  }
});

export default app;
