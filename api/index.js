import express from "express";
import fetchUserData from "./fetch-user-data.js";
import uploadEvent from "./upload-user-event.js";
const app = express();

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
