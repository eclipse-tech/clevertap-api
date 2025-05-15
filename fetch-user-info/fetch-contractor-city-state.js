import fs from "fs";
import csvParser from "csv-parser";

import fetchUserData from "../api/fetch-user-data.js";

const inputFile = "./input.csv";
const outputFile = "./output.csv";

// Write the header to the output file
const header = "Mobile Number, City, State";

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
        const { profileData } = await fetchUserData(`+91${mobileNumber}`);

        // // Extract the required information from the API response
        // const requiredInfo = response.data.requiredInfo;

        const { city, state } = profileData;
        // // Append the data row to the output CSV file
        fs.appendFileSync(outputFile, `\n${mobileNumber},${city},${state}`);

        await new Promise((resolve) => setTimeout(resolve, 25));
      } catch (error) {
        fs.appendFileSync(outputFile, `\n${mobileNumber},NA,NA`);
        console.error("Profile not found ");
      }
    }

    console.log("CSV parsing and API calls complete");
  });
