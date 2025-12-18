import { Router, Request, Response } from "express";
import { sendTestEmail } from "../services/email.service";
import { logError, logInfo } from "../utils/logger";

type RequestWithId = Request & { requestId?: string };

const router = Router();
const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

router.use((req: Request, res: Response, next) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({
      success: false,
      error: "Route non disponible",
      requestId: (req as RequestWithId).requestId,
    });
    return;
  }

  next();
});

router.post("/test-email", async (req: Request, res: Response) => {
  const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
  const requestId = (req as RequestWithId).requestId;

  if (!to || !emailRegex.test(to)) {
    res.status(400).json({
      success: false,
      error: "Adresse email invalide",
      requestId,
    });
    return;
  }

  logInfo({
    context: "DEV",
    event: "dev.testEmail.request",
    requestId,
    to,
  });

  try {
    await sendTestEmail(to, requestId);
    res.status(200).json({
      success: true,
      requestId,
    });
  } catch (error) {
    logError({
      context: "DEV",
      event: "dev.testEmail.error",
      requestId,
      msg: error instanceof Error ? error.message : "Erreur inconnue",
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: "Impossible d'envoyer l'email de test",
      requestId,
    });
  }
});

export default router;
