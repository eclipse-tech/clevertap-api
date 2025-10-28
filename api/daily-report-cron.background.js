import dotenv from "dotenv";
import { generateDailyReport } from "./daily-report-generator/daily-report.js";

// Load environment variables (useful for local/dev)
dotenv.config();

export default async function handler(req, res) {
  const startedAt = new Date().toISOString();
  console.log("[daily-report-cron.background] Start", {
    method: req.method,
    url: req.url,
    startedAt,
  });

  try {
    const result = await generateDailyReport();

    if (!result?.success) {
      console.error("[daily-report-cron.background] Failed", result);
      return res.status(500).json({
        success: false,
        error: result?.error || "Report generation failed",
        details: result?.details || null,
        startedAt,
        finishedAt: new Date().toISOString(),
      });
    }

    console.log("[daily-report-cron.background] Success");
    return res.status(200).json({
      success: true,
      message: "Daily report job completed",
      data: result?.data || null,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[daily-report-cron.background] Unexpected error", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: "Internal error",
      details: error.message,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
  }
}
