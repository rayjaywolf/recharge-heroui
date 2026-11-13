import { Hono } from "hono";
import { getMRoboticsBalance } from "@repo/server/mrobotics";
import { getRealRoboBalance } from "@repo/server/realrobo";
import { getJioPosLiteBalance } from "@repo/server/jioposlite";
import { requireAdmin } from "../middleware";

export const balanceRoutes = new Hono();

balanceRoutes.get("/api/balance/jioposlite", requireAdmin, async (c) => {
  try {
    const balance = await getJioPosLiteBalance();

    return c.json({
      success: true,
      balance: balance.data.balance,
      message: balance.msg,
    });
  } catch (error: unknown) {
    console.error("Jio Pos Lite balance check error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check Jio Pos Lite balance",
      },
      500,
    );
  }
});

balanceRoutes.get("/api/balance/realrobo", requireAdmin, async (c) => {
  try {
    const balance = await getRealRoboBalance();

    return c.json({
      success: true,
      balance: balance.data.balance,
      message: balance.msg,
    });
  } catch (error: unknown) {
    console.error("RealRobo balance check error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check RealRobo balance",
      },
      500,
    );
  }
});

balanceRoutes.get("/api/balance/mrobotics", requireAdmin, async (c) => {
  try {
    const balance = await getMRoboticsBalance();

    return c.json({
      success: true,
      balance: balance.data,
      message: "MRobotics balance retrieved successfully",
    });
  } catch (error: unknown) {
    console.error("MRobotics balance check error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check MRobotics balance",
      },
      500,
    );
  }
});
