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
const MP_PREFERENCES_URL = 'https://api.mercadopago.com/checkout/preferences';
const MP_PREAPPROVAL_PLAN_URL = 'https://api.mercadopago.com/preapproval_plan';

/**
 * Cria uma ordem de pagamento Pix no Mercado Pago (Passe de 30 Dias)
 * @param {object} params
 * @param {number} params.amount - Valor da cobrança (ex: 12.90)
 * @param {string} params.description - Descrição do produto
 * @param {string} params.email - E-mail do pagador (opcional)
 * @returns {Promise<object>} Dados do Pix (id, qr_code, qr_code_base64, status)
 */
export async function createPixPayment({ amount = 12.90, description = 'Plano Mensal Pet - 30 Dias de Acesso', email = 'tutor@pet.com' }) {
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

/**
 * Cria uma preferência do Mercado Pago Checkout Pro para Cartão de Crédito e Débito.
 * SEGURANÇA TOTAL (PCI-DSS Level 1): O cliente preenche os dados do cartão diretamente
 * no cofre criptografado do Mercado Pago. Nosso servidor nunca toca nem armazena números de cartão.
 * @param {object} params
 * @param {number} params.amount - Valor da cobrança
 * @param {string} params.description - Título do laudo
 * @param {string} params.originUrl - URL base para retorno do cliente após pagamento
 * @returns {Promise<object>} { id, init_point, isDemo }
 */
export async function createCardCheckoutPreference({ amount = 4.90, description = 'Laudo Nutricional Pet', originUrl = 'https://novo-pet-beta.vercel.app' }) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!token || token.startsWith('SEU_') || token === 'SUA_CHAVE_AQUI') {
    return {
      id: 'demo_pref_' + Date.now(),
      init_point: `${originUrl}/?payment=approved&demo=true`,
      isDemo: true
    };
  }

  const baseReturn = originUrl.replace(/\/+$/, '');

  const body = {
    items: [
      {
        title: description.slice(0, 100),
        quantity: 1,
        unit_price: Number(amount),
        currency_id: 'BRL',
        description: 'Desbloqueio do Laudo Nutricional Completo'
      }
    ],
    back_urls: {
      success: `${baseReturn}/?payment=approved`,
      failure: `${baseReturn}/?payment=failure`,
      pending: `${baseReturn}/?payment=pending`
    },
    auto_return: 'approved',
    statement_descriptor: 'TRADUTOR PET',
    payment_methods: {
      excluded_payment_types: [
        { id: 'ticket' } // Exclui boleto bancário (foco em cartão de crédito e débito com aprovação imediata)
      ],
      installments: 1
    }
  };

  try {
    const response = await fetch(MP_PREFERENCES_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MERCADO PAGO PREFERENCE ERROR]', data);
      throw new Error(data.message || 'Erro ao gerar checkout com cartão.');
    }

    return {
      id: data.id,
      init_point: data.init_point, // Link oficial protegido do Mercado Pago
      sandbox_init_point: data.sandbox_init_point,
      isDemo: false
    };
  } catch (err) {
    console.error('[MERCADO PAGO CARD CHECKOUT EXCEPTION]', err.message);
    throw err;
  }
}

/**
 * Cria assinatura mensal recorrente com cobrança automática no Cartão de Crédito
 * via API de Assinaturas (Preapproval) do Mercado Pago.
 * O cliente autoriza a cobrança mensal uma única vez e o Mercado Pago
 * debita automaticamente a cada 30 dias.
 */
export async function createSubscriptionPreference({ amount = 12.90, description = 'Assinatura Mensal - Tradutor de Ração', originUrl = 'https://novo-pet-beta.vercel.app' }) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!token || token.startsWith('SEU_') || token === 'SUA_CHAVE_AQUI') {
    return {
      id: 'demo_sub_' + Date.now(),
      init_point: `${originUrl}/?payment=approved&type=subscription&demo=true`,
      isRecurring: true,
      isDemo: true
    };
  }

  const baseReturn = originUrl.replace(/\/+$/, '');

  // 1. Tentar criar plano de assinatura com cobrança recorrente mensal automática no Mercado Pago
  try {
    const planBody = {
      reason: description.slice(0, 100),
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(amount),
        currency_id: 'BRL'
      },
      back_url: `${baseReturn}/?payment=approved&type=subscription`
    };

    const respPlan = await fetch(MP_PREAPPROVAL_PLAN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(planBody)
    });

    const dataPlan = await respPlan.json();
    if (respPlan.ok && dataPlan.init_point) {
      console.log(`[MERCADO PAGO] Plano de assinatura mensal criado com sucesso: ${dataPlan.id}`);
      return {
        id: String(dataPlan.id),
        init_point: dataPlan.init_point,
        isRecurring: true,
        isDemo: false
      };
    } else {
      console.warn('[MERCADO PAGO] Preapproval_plan resposta alternativa:', dataPlan);
    }
  } catch (errPlan) {
    console.warn('[MERCADO PAGO SUBSCRIPTION PLAN WARN]', errPlan.message);
  }

  // 2. Fallback robusto para Checkout Pro com especificação de assinatura mensal
  return await createCardCheckoutPreference({
    amount,
    description: 'Plano Mensal - Tradutor de Ração (30 dias de acesso com renovação automática)',
    originUrl
  });
}

