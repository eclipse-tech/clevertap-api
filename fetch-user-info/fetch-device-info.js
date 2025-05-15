import fs from "fs";
import csvParser from "csv-parser";

import fetchUserData from "../api/fetch-user-data.js";

const inputFile = "./input.csv";
const outputFile = "./output.csv";

// Write the header to the output file
const header =
  "Mobile Number, Device 1, Device 2, Device 3, Device 4, Device 5, Device 6, Device 7, Device 8, Device 9, Device 10";

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
        const { platformInfo } = await fetchUserData(`+91${mobileNumber}`);

        /*
        platformInfo: [
    {
      df: [Object],
      ls: 1705411628,
      phone: 918880522285,
      os_version: '13',
      app_version: '1.0.0',
      make: 'Google',
      model: 'Sdk_gphone64_arm64',
      objectId: '__f81331178e744b5cb29d72f59327282c',
      platform: 'Android'
    },
    {
      df: [Object],
      ls: 1707727895,
      phone: 918880522285,
      os_version: '13',
      app_version: '4.0.1',
      make: 'Oneplus',
      model: 'In2021',
      objectId: '__a00843ede6154f1697aeabf9215d1ec8',
      platform: 'Android'
    },
    {
      df: [Object],
      ls: 1745216529,
      push_token: 'fcm:eHo1gRc7RTGnBcxImfJOyS:APA91bFakwvQax3rEc_Ae9EfbGuBEaQykfdLd9zWaaj848UlFv28TiS0kHO6nWpL_B-SmGzfBo3WkDUBe8aGXMFw96DxPA9qnLaC1n_MS-7J3l0HBMUvC10',
      phone: 918880522285,
      os_version: '15',
      app_version: '5.6.0',
      make: 'Google',
      model: 'Pixel 9 pro xl',
      objectId: '__4e9ac13328db4a619b7d2c19a21d3b4d',
      platform: 'Android'
    },
    {
      df: [Object],
      ls: 1718771383,
      phone: 918880522285,
      os_version: '13',
      app_version: '4.2.2',
      make: 'Google',
      model: 'Sdk_gphone64_arm64',
      objectId: '__57d3b4a0e9214070937e2d9a5f11403e',
      platform: 'Android'
    },
    {
      df: [Object],
      ls: 1723806798,
      phone: 918880522285,
      os_version: '13',
      app_version: '5.0.0',
      make: 'Oneplus',
      model: 'In2021',
      objectId: '__927792e4caa44eea9bffb6aa32c0fd19',
      platform: 'Android'
    },
        */

        // // Extract the required information from the API response
        // const requiredInfo = response.data.requiredInfo;

        /*
        os_version: '13',
 app_version: '5.0.0',
 make: 'Oneplus',
 model: 'In2021',
 objectId: '__f27e033d91604c2796236a37881c69d7',
 platform: 'Android' */
        const deviceInfo = platformInfo
          .map(
            (info) =>
              `make:${info.make}; model:${info.model}; os_version:${info.os_version}; app_version:${info.app_version}; platform:${info.platform}; objectId:${info.objectId}`
          )
          .join(",");
        // // Append the data row to the output CSV file
        fs.appendFileSync(outputFile, `\n${mobileNumber},${deviceInfo}`);

        await new Promise((resolve) => setTimeout(resolve, 25));
      } catch (error) {
        fs.appendFileSync(outputFile, `\n${mobileNumber},NA`);
        console.error("Profile not found ");
      }
    }

    console.log("CSV parsing and API calls complete");
  });
