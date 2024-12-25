import dotenv from "dotenv";

import axios from "axios";

dotenv.config();

const headers = {
  "X-CleverTap-Account-Id": process.env.ACCOUNT_ID,
  "X-CleverTap-Passcode": process.env.PASSCODE,
  "Content-Type": "application/json",
};

const fetchUserData = async (identity, filterEvents) => {
  try {
    const { data } = await axios.get(
      "https://api.clevertap.com/1/profile.json",
      {
        headers: headers,
        params: {
          identity: identity,
        },
      }
    );

    const { platformInfo, name, profileData, events } = data.record;

    const sortedPlatformInfo = platformInfo.sort((a, b) => b.ls - a.ls);
    const latestPlatformInfo = sortedPlatformInfo[0];

    const filteredEvents = {};
    filterEvents.forEach((eventName) => {
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
    return null;
  }
};

export default fetchUserData;
