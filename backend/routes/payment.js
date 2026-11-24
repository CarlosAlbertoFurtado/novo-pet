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
      const defaultPrice = parseFloat(process.env.SUBSCRIPTION_MONTHLY_PRICE || process.env.PIX_ANALYSIS_PRICE) || 12.90;
      const { description, email, referredBy } = req.body || {};

      const desc = description || 'Passe Mensal Pet - 30 Dias de Acesso Ilimitado';

      const payment = await createPixPayment({
        amount: defaultPrice,
        description: desc,
        email: email || 'tutor@pet.com',
        referredBy
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
      const defaultPrice = parseFloat(process.env.SUBSCRIPTION_MONTHLY_PRICE || process.env.PIX_ANALYSIS_PRICE) || 12.90;
      const { description, referredBy } = req.body || {};
      const originUrl = req.headers.origin || 'https://novo-pet.vercel.app';

      const desc = description || 'Assinatura Mensal - Tradutor de Ração (30 Dias de Acesso Ilimitado com Renovação Automática)';

      const checkout = await createSubscriptionPreference({
        amount: defaultPrice,
        description: desc,
        originUrl,
        referredBy
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
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID de pagamento obrigatório.' });
      }

      // Sanitização estrita contra injection / directory traversal
      const cleanId = id.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
      if (!cleanId) {
        return res.status(400).json({ error: 'ID de pagamento inválido.' });
      }

      const statusData = await getPaymentStatus(cleanId);
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
      const rawPaymentId = data?.id || queryId;

      if (rawPaymentId && (type === 'payment' || req.query.topic === 'payment')) {
        const cleanId = String(rawPaymentId).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
        console.log(`[PAYMENT WEBHOOK] Notificação recebida para o pagamento ${cleanId}`);
        const status = await getPaymentStatus(cleanId);
        console.log(`[PAYMENT WEBHOOK] Status atualizado:`, status?.status);
      }

      // Mercado Pago exige resposta 200/204 rápida
      res.status(200).send('OK');
    } catch (err) {
      console.error('[PAYMENT WEBHOOK ERROR]', err.message);
      res.status(200).send('OK'); // Não re-tentar erro de processamento
    }
  });

  // ── POST /api/payment/simulate-approval ───────────────────
  // Permite testar a liberação imediata apenas em desenvolvimento/demo
  router.post('/simulate-approval', (req, res) => {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return res.status(403).json({ error: 'Endpoint desabilitado em produção por segurança.' });
    }
    const { id } = req.body || {};
    res.json({
      success: true,
      id,
      status: 'approved',
      simulated: true,
      message: 'Pagamento aprovado em modo de demonstração!'
    });
  });

  // ── CADASTRO DE ASSINANTES PARA ALERTAS DIÁRIOS NO WHATSAPP ──
  const memorySubscribers = [];

  // POST /api/payment/register-subscriber
  router.post('/register-subscriber', (req, res) => {
    try {
      const { nome, whatsapp, method, paymentId } = req.body || {};
      const cleanNome = String(nome || '').trim().replace(/[<>'"`;${}]/g, '').slice(0, 80);
      const rawPhone = String(whatsapp || '').replace(/\D/g, '');

      if (!cleanNome || rawPhone.length < 10) {
        return res.status(400).json({ error: 'Nome e WhatsApp válido com DDD são obrigatórios.' });
      }

      // Adiciona DDI 55 se não tiver
      const fullPhone = rawPhone.startsWith('55') && rawPhone.length >= 12 ? rawPhone : `55${rawPhone}`;

      const subscriber = {
        id: 'sub_' + Date.now(),
        nome: cleanNome,
        whatsapp: fullPhone,
        whatsappFormatted: `+${fullPhone.slice(0,2)} (${fullPhone.slice(2,4)}) ${fullPhone.slice(4)}`,
        method: method || 'checkout',
        paymentId: paymentId || null,
        createdAt: new Date().toISOString()
      };

      memorySubscribers.unshift(subscriber);
      console.log(`[SUBSCRIBER REGISTERED] ${cleanNome} - ${fullPhone}`);

      res.json({ success: true, subscriber });
    } catch (err) {
      console.error('[SUBSCRIBER REGISTER ERROR]', err.message);
      res.status(500).json({ error: 'Erro ao registrar assinante.' });
    }
  });

  // GET /api/payment/subscribers (JSON com todos os contatos cadastrados)
  router.get('/subscribers', (req, res) => {
    res.json({
      total: memorySubscribers.length,
      subscribers: memorySubscribers
    });
  });

  // GET /api/payment/subscribers/csv (Download CSV de números de WhatsApp)
  router.get('/subscribers/csv', (req, res) => {
    let csv = 'Nome,WhatsApp,TelefoneCompleto,Data,Metodo\n';
    memorySubscribers.forEach(s => {
      csv += `"${s.nome}","${s.whatsappFormatted}","${s.whatsapp}","${s.createdAt}","${s.method}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="assinantes_whatsapp.csv"');
    res.send(csv);
  });

  return router;
}

