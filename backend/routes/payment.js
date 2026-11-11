// ============================================================
// ROTA — /api/payment
// ============================================================
// Endpoints de Pagamento Pix com Mercado Pago:
//   - POST /api/payment/create-pix
//   - GET  /api/payment/status/:id
//   - POST /api/payment/webhook
//   - POST /api/payment/simulate-approval (apenas para testes locais)
// ============================================================

import { Router } from 'express';
import { createPixPayment, getPaymentStatus, createCardCheckoutPreference, createSubscriptionPreference } from '../services/mercadopago.js';

export function createPaymentRouter() {
  const router = Router();

  // ── POST /api/payment/create-pix ──────────────────────────
  // Gera cobrança Pix para Passe Mensal de 30 Dias de Acesso Ilimitado
  router.post('/create-pix', async (req, res, next) => {
    try {
      const defaultPrice = parseFloat(process.env.SUBSCRIPTION_MONTHLY_PRICE || process.env.PIX_ANALYSIS_PRICE) || 9.90;
      const { description, email } = req.body || {};

      const desc = description || 'Passe Mensal Pet - 30 Dias de Acesso Ilimitado';

      const payment = await createPixPayment({
        amount: defaultPrice,
        description: desc,
        email: email || 'tutor@pet.com'
      });

      res.json({
        success: true,
        payment
      });
    } catch (err) {
      console.error('[PAYMENT CREATE ERROR]', err.message);
      next(err);
    }
  });

  // ── POST /api/payment/create-card-checkout ────────────────
  // Gera assinatura mensal recorrente com cobrança automática no Cartão (Mercado Pago)
  router.post('/create-card-checkout', async (req, res, next) => {
    try {
      const defaultPrice = parseFloat(process.env.SUBSCRIPTION_MONTHLY_PRICE || process.env.PIX_ANALYSIS_PRICE) || 9.90;
      const { description } = req.body || {};
      const originUrl = req.headers.origin || 'https://novo-pet-beta.vercel.app';

      const desc = description || 'Assinatura Mensal - Tradutor de Ração (30 Dias de Acesso Ilimitado com Renovação Automática)';

      const checkout = await createSubscriptionPreference({
        amount: defaultPrice,
        description: desc,
        originUrl
      });

      res.json({
        success: true,
        checkout
      });
    } catch (err) {
      console.error('[CARD CHECKOUT ERROR]', err.message);
      next(err);
    }
  });

  // ── GET /api/payment/status/:id ───────────────────────────
  router.get('/status/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'ID de pagamento obrigatório.' });
      }

      const statusData = await getPaymentStatus(id);
      res.json({
        success: true,
        ...statusData
      });
    } catch (err) {
      console.error('[PAYMENT STATUS ERROR]', err.message);
      next(err);
    }
  });

  // ── POST /api/payment/webhook ─────────────────────────────
  // Recebe notificações instantâneas do Mercado Pago
  router.post('/webhook', async (req, res) => {
    try {
      const { type, data } = req.body || {};
      const queryId = req.query['data.id'] || req.query.id;
      const paymentId = data?.id || queryId;

      if (paymentId && (type === 'payment' || req.query.topic === 'payment')) {
        console.log(`[PAYMENT WEBHOOK] Notificação recebida para o pagamento ${paymentId}`);
        const status = await getPaymentStatus(paymentId);
        console.log(`[PAYMENT WEBHOOK] Status atualizado:`, status);
      }

      // Mercado Pago exige resposta 200/204 rápida
      res.status(200).send('OK');
    } catch (err) {
      console.error('[PAYMENT WEBHOOK ERROR]', err.message);
      res.status(200).send('OK'); // Não re-tentar erro de processamento
    }
  });

  // ── POST /api/payment/simulate-approval ───────────────────
  // Permite testar a liberação imediata sem gastar dinheiro real em desenvolvimento/demo
  router.post('/simulate-approval', (req, res) => {
    const { id } = req.body || {};
    res.json({
      success: true,
      id,
      status: 'approved',
      simulated: true,
      message: 'Pagamento aprovado em modo de demonstração!'
    });
  });

  return router;
}

