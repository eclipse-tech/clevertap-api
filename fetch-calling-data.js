import fs from "fs";
import csvParser from "csv-parser";

import fetchUserData from "./api/fetch-user-data.js";

const inputFile = "./calling-data-mobile.csv";
const outputFile = "./clevertap-event-info.csv";

// Define the CSV header
const filterEvents = [
  "App Installed",
  "app_opened",
  "store_page_viewed",
  "designs_services_page_viewed",
  "dp_website_client_called",
  "dp_website_client_whatsapp",
];

// Write the header to the output file
const header =
  "Name, Mobile Number, App Last Opened Date, Last Store Page Viewed Date, Store page view count, Design Service Page Viewed Date, Design Service page view count, App Platform";

fs.writeFileSync(outputFile, header);

const mobileNumbers = [];
fs.createReadStream(inputFile)
  .pipe(csvParser())
  .on("data", (row) => {
    mobileNumbers.push(row["Mobile Number"]);
  })
  .on("end", async () => {
    for (const mobileNumber of mobileNumbers) {
      try {
        const { name, latestPlatformInfo, events } = await fetchUserData(
          `+91${mobileNumber}`,
          filterEvents
        );

        // // Extract the required information from the API response
        // const requiredInfo = response.data.requiredInfo;

        const appLastOpenedDate = events["app_opened"]?.["last_seen"]
          ? getHumanReadableDate(events["app_opened"]?.["last_seen"])
          : "NA";

        const storePageLastOpenedDate = events["store_page_viewed"]?.[
          "last_seen"
        ]
          ? getHumanReadableDate(events["store_page_viewed"]?.["last_seen"])
          : "NA";

        const storePageViewCount = events["store_page_viewed"]?.["count"] || 0;
        const daasPageLastOpenedDate = events["designs_services_page_viewed"]?.[
          "last_seen"
        ]
          ? getHumanReadableDate(
              events["designs_services_page_viewed"]?.["last_seen"]
            )
          : "NA";

        const daasPageViewCount =
          events["designs_services_page_viewed"]?.["count"] || 0;
        const appPlatform = platformInfo.platform;

        // // Append the data row to the output CSV file
        fs.appendFileSync(
          outputFile,
          `\n${name},${mobileNumber},${appLastOpenedDate},${storePageLastOpenedDate},${storePageViewCount},${daasPageLastOpenedDate},${daasPageViewCount},${appPlatform}`
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        fs.appendFileSync(outputFile, `\nNA,${mobileNumber},NA,NA,NA,NA,NA,NA`);
        console.error(error);
      }
    }

    console.log("CSV parsing and API calls complete");
  });

// csv columns
// Name, Mobile Number, App Last Opened Date, App Installed Date, Last Store Page Viewed Date, Store page view count, Design Service Page Viewed Date, Design Service page view count, Number of Client via DP, App Platform

const getHumanReadableDate = (timestamp) => {
  if (!timestamp) {
    return "";
  }
  const dateInMillisecond = new Date(timestamp * 1000);
  return `${dateInMillisecond.toLocaleString("default", {
    month: "long",
  })} ${dateInMillisecond.getDate()} ${dateInMillisecond.getFullYear()}`;
};
