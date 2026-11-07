// ============================================================
// SERVIÇO — Integração Mercado Pago (PIX Instantâneo)
// ============================================================
// Gera cobrança via Pix com QR Code base64 e código Copia e Cola.
// Não requer bibliotecas pesadas — utiliza a API REST oficial v1.
// Se MERCADO_PAGO_ACCESS_TOKEN não estiver configurado, opera
// em modo Sandbox/Simulação sem quebrar a aplicação.
// ============================================================

import crypto from 'crypto';

const MP_API_URL = 'https://api.mercadopago.com/v1/payments';

/**
 * Cria uma ordem de pagamento Pix no Mercado Pago
 * @param {object} params
 * @param {number} params.amount - Valor da cobrança (ex: 4.90)
 * @param {string} params.description - Descrição do produto
 * @param {string} params.email - E-mail do pagador (opcional)
 * @returns {Promise<object>} Dados do Pix (id, qr_code, qr_code_base64, status)
 */
export async function createPixPayment({ amount = 4.90, description = 'Laudo Nutricional Pet', email = 'tutor@pet.com' }) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  // ── MODO SIMULAÇÃO / DEMO (se o usuário ainda não colocou a credencial no .env) ──
  if (!token || token.startsWith('SEU_') || token === 'SUA_CHAVE_AQUI') {
    console.warn('[MERCADO PAGO] Token não configurado. Gerando Pix em modo demonstração.');
    const mockId = 'demo_' + Date.now();
    return {
      id: mockId,
      status: 'pending',
      amount: Number(amount).toFixed(2),
      description,
      qr_code: '00020126580014br.gov.bcb.pix0136demo-chave-pix-tradutor-racao52040000530398654044.905802BR5917Tradutor de Racao6009Sao Paulo62070503***6304ABCD',
      qr_code_base64: '', // Front-end gera SVG se vazio
      isDemo: true,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
  }

  const idempotencyKey = crypto.randomUUID();

  const body = {
    transaction_amount: Number(amount),
    description: description.slice(0, 100),
    payment_method_id: 'pix',
    payer: {
      email: email && email.includes('@') ? email : 'cliente@tradutorderacao.com.br',
      first_name: 'Tutor',
      last_name: 'Pet'
    }
  };

  try {
    const response = await fetch(MP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MERCADO PAGO ERROR]', data);
      throw new Error(data.message || 'Erro ao comunicar com Mercado Pago.');
    }

    const txData = data.point_of_interaction?.transaction_data;

    return {
      id: String(data.id),
      status: data.status,
      amount: data.transaction_amount,
      description: data.description,
      qr_code: txData?.qr_code || '',
      qr_code_base64: txData?.qr_code_base64 || '',
      isDemo: false,
      expiresAt: data.date_of_expiration || new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
  } catch (err) {
    console.error('[MERCADO PAGO EXCEPTION]', err.message);
    throw err;
  }
}

/**
 * Consulta o status de um pagamento Pix
 * @param {string} paymentId
 * @returns {Promise<object>} { id, status: 'pending' | 'approved' | 'rejected' }
 */
export async function getPaymentStatus(paymentId) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  // Em modo demo
  if (paymentId.startsWith('demo_') || !token || token.startsWith('SEU_')) {
    return {
      id: paymentId,
      status: 'pending',
      isDemo: true
    };
  }

  try {
    const response = await fetch(`${MP_API_URL}/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn(`[MERCADO PAGO] Falha ao consultar ${paymentId}:`, err.slice(0, 100));
      return { id: paymentId, status: 'unknown' };
    }

    const data = await response.json();
    return {
      id: String(data.id),
      status: data.status, // 'approved', 'pending', 'cancelled', 'rejected'
      status_detail: data.status_detail,
      amount: data.transaction_amount
    };
  } catch (err) {
    console.error('[MERCADO PAGO STATUS ERROR]', err.message);
    return { id: paymentId, status: 'error' };
  }
}
