import express from "express";
import fetchUserData from "./fetch-user-data.js";
const app = express();

app.use(express.json()); // Add this line

app.get("/helath", (_, res) => res.send("Health Check"));

app.post("/get-user-profile", async (req, res) => {
  const { identity } = req.body;
  const { filterEvents } = req.body;

  const userProfile = await fetchUserData(identity, filterEvents);

  res.send(userProfile);
});

export default app;
