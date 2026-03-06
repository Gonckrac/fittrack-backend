// api/push.js — FitTrack Web Push endpoint
// Maneja suscripciones y envío de notificaciones push

import webpush from 'web-push';

// Las claves VAPID van en variables de entorno de Vercel
webpush.setVapidDetails(
  'mailto:tu@email.com', // cambiá por tu email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Almacenamiento temporal en memoria (se resetea entre deploys)
// Para producción real usaría una DB, pero para uso personal alcanza
const subscriptions = new Map();

export default async function handler(req, res) {
  // CORS para tu GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', 'https://gonckrac.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/push?action=vapid-public-key
  // La app la llama al iniciar para suscribirse
  if (req.method === 'GET') {
    const { action } = req.query;
    if (action === 'vapid-public-key') {
      return res.status(200).json({ key: process.env.VAPID_PUBLIC_KEY });
    }
    return res.status(400).json({ error: 'Unknown action' });
  }

  // POST /api/push — body: { action, ... }
  if (req.method === 'POST') {
    const { action } = req.body;

    // Guardar suscripción del dispositivo
    if (action === 'subscribe') {
      const { subscription, deviceId } = req.body;
      if (!subscription || !deviceId) {
        return res.status(400).json({ error: 'Missing subscription or deviceId' });
      }
      subscriptions.set(deviceId, subscription);
      console.log('[Push] Suscripción guardada para', deviceId);
      return res.status(200).json({ ok: true });
    }

    // Programar notificación: espera delayMs y la manda
    if (action === 'schedule') {
      const { deviceId, title, body, delayMs } = req.body;
      if (!deviceId || !title || !delayMs) {
        return res.status(400).json({ error: 'Missing params' });
      }

      const subscription = subscriptions.get(deviceId);
      if (!subscription) {
        return res.status(404).json({ error: 'No subscription for this device' });
      }

      const delay = Math.min(Math.max(0, delayMs), 10 * 60 * 1000); // max 10 min

      // Responder inmediato y enviar la push después del delay
      res.status(200).json({ ok: true, scheduledIn: delay });

      setTimeout(async () => {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({ title, body })
          );
          console.log('[Push] Notificación enviada a', deviceId);
        } catch (err) {
          console.error('[Push] Error enviando:', err.statusCode, err.message);
          if (err.statusCode === 410) {
            // Suscripción expirada
            subscriptions.delete(deviceId);
          }
        }
      }, delay);

      return; // ya respondimos arriba
    }

    // Cancelar (no hay forma real de cancelar un setTimeout en serverless,
    // pero la notificación llega igual — la app la ignora si el timer fue salteado)
    if (action === 'cancel') {
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
