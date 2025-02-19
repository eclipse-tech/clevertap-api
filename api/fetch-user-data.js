import axios from "axios";
import { apiHeaders, BASE_URL } from "./constants.js";

const fetchUserData = async (identity, filterEvents) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/1/profile.json`, {
      headers: apiHeaders,
      params: {
        identity: identity,
      },
    });

    if (!data.record) {
      throw new Error("No data found");
    }

    const { platformInfo, name, profileData, events } = data.record;
    console.log("🚀 ~ fetchUserData ~  data.record;:", data.record);

    const sortedPlatformInfo = platformInfo.sort((a, b) => b.ls - a.ls);
    const latestPlatformInfo = sortedPlatformInfo[0];

    const filteredEvents = {};
    filterEvents?.forEach((eventName) => {
      if (events[eventName]) {
        filteredEvents[eventName] = events[eventName];
      }
    });

    return {
      name,
      profileData,
      platformInfo: latestPlatformInfo,
      events: filteredEvents,
    };
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

export default fetchUserData;
