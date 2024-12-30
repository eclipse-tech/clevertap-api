import axios from "axios";
import { apiHeaders, BASE_URL } from "./constants.js";

const uploadEvent = async (identity, eventName, eventData) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/1/upload`,
      createEventPayload(identity, eventName, eventData),
      {
        headers: apiHeaders,
      }
    );
    console.log(res.data);
    if (res.data.status !== "success") {
      throw new Error(res.data.error);
    }
    return res.data.data;
  } catch (error) {
    console.log("Error while uploading event", error);
    return error;
  }
};

const createEventPayload = (identity, eventName, eventData) => {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const eventPayload = {
    d: [
      {
        identity: identity,
        ts: currentTimestamp, // time when the event occurred in UNIX epoch value in seconds
        type: "event",
        evtName: eventName,
        evtData: eventData,
      },
    ],
  };

  return JSON.stringify(eventPayload);
};

export default uploadEvent;
