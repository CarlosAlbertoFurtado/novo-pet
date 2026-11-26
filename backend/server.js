// ============================================================
// TRADUTOR DE RAÇÃO — Backend Seguro
// ============================================================
// Camadas de segurança implementadas:
//   1. Helmet        → Headers HTTP seguros (CSP, HSTS, X-Frame, etc.)
//   2. CORS          → Origens permitidas explicitamente
//   3. Rate Limiting → Limite de requisições por IP
//   4. Validação     → Tipo de arquivo, tamanho, campos obrigatórios
//   5. Sanitização   → Inputs limpos contra XSS e injection
//   6. Multer v2     → Upload seguro com filtro de MIME type
//   7. Sem dados persistidos → Imagens descartadas após análise
// ============================================================

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createAnalysisRouter } from './routes/analysis.js';
import { createPaymentRouter } from './routes/payment.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;
const NODE_ENV = process.env.NODE_ENV || (process.env.VERCEL ? 'production' : 'development');

// Desativar header identificador de servidor por segurança
app.disable('x-powered-by');

// ── 0. TRUST PROXY (Vercel / Cloudflare / Nginx) ───────────
// Necessário para identificar corretamente o IP do cliente através do proxy reverso
app.set('trust proxy', 1);

// ── 1. HELMET — Headers de segurança HTTP ──────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  // HSTS: força HTTPS em produção
  hsts: NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

// ── 2. CORS — Origens permitidas ───────────────────────────
const customOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const defaultAllowed = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://novo-pet.vercel.app',
  'https://novo-pet-beta.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições same-origin ou ferramentas que não enviam origin header
    if (!origin) return callback(null, true);

    // Permitir domínios explícitos
    if (defaultAllowed.includes(origin) || customOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Permitir apenas o domínio oficial e previews do projeto novo-pet na Vercel
    if (/^https:\/\/novo-pet(-[a-z0-9]+)?\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Permitir qualquer porta local em desenvolvimento (ex: Live Server 5500, Vite 5173, etc.)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    callback(new Error(`Origem bloqueada pelo CORS: ${origin}`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
}));

// ── 3. RATE LIMITING — Proteção contra brute-force / DDoS ─
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisições deste IP. Aguarde 15 minutos e tente novamente.',
    retryAfter: '15 minutos',
  },
  // Identificar por IP seguro validado pelo Express (trust proxy)
  keyGenerator: (req) => req.ip,
});

app.use('/api/', limiter);

// Rate limiter específico para criação de ordens de pagamento (anti-spam / anti-carding)
const paymentOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de pagamento geradas. Por favor, aguarde alguns minutos ou contate o suporte via WhatsApp.',
  },
  keyGenerator: (req) => req.ip,
});

app.use('/api/payment/create-pix', paymentOrderLimiter);
app.use('/api/payment/create-card-checkout', paymentOrderLimiter);

// ── 3.5 SECURITY SENTINEL — Detecção Ativa de Invasão & Honeypot ─
// Bloqueia e registra qualquer tentativa de scanner, busca de admin, SQLi, XSS ou path traversal
const SUSPICIOUS_PATTERNS = [
  /\.\.\//,                                                                // Path traversal (../)
  /\.(env|git|htaccess|sql|bak|yml|yaml|ini|config|log|conf)/i,            // Leitura de credenciais
  /(union\s+select|information_schema|waitfor\s+delay|sleep\(|drop\s+table|--)/i, // SQL injection
  /(<script|javascript:|onerror\s*=|onload\s*=|eval\(|prompt\(|alert\()/i, // XSS em query/URL
  /(exec\(|passthru\(|system\(|base64_decode|cmd\.exe|\/bin\/sh)/i,        // RCE
  /(\/admin|\/wp-admin|\/administrator|\/phpmyadmin|\/actuator|\/swagger|\/telescope|\/install|\/setup)/i, // Scanners
];

const SUSPICIOUS_USER_AGENTS = /(sqlmap|nikto|acunetix|havij|nessus|masscan|zgrab)/i;

const recentSecurityIncidents = [];

function securitySentinel(req, res, next) {
  const rawUrl = req.originalUrl || req.url || '';
  let target = rawUrl;
  try {
    target = decodeURIComponent(rawUrl);
  } catch (e) {}

  const userAgent = String(req.headers['user-agent'] || '');
  const ip = req.ip || req.connection?.remoteAddress || 'desconhecido';

  let isSuspicious = false;
  let reason = '';

  if (SUSPICIOUS_USER_AGENTS.test(userAgent)) {
    isSuspicious = true;
    reason = `User-Agent suspeito: ${userAgent.slice(0, 50)}`;
  } else {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(target)) {
        isSuspicious = true;
        reason = `Assinatura maliciosa detectada: ${pattern}`;
        break;
      }
    }
  }

  if (isSuspicious) {
    const incident = {
      timestamp: new Date().toISOString(),
      ip,
      method: req.method,
      target: target.slice(0, 150),
      userAgent: userAgent.slice(0, 80),
      reason,
    };

    recentSecurityIncidents.unshift(incident);
    if (recentSecurityIncidents.length > 50) recentSecurityIncidents.pop();

    console.warn(`🚨 [SEGURANÇA - BLOQUEIO SENTINELA] IP: ${ip} | Rota: ${target} | Motivo: ${reason}`);

    // Notificação webhook em tempo real se configurada no .env (ex: Discord, Telegram, Make, etc.)
    if (process.env.SECURITY_ALERT_WEBHOOK) {
      fetch(process.env.SECURITY_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **[TRADUTOR PET] Tentativa de Invasão Bloqueada!**\n- **IP:** \`${ip}\`\n- **Alvo:** \`${target}\`\n- **Motivo:** \`${reason}\`\n- **Data:** ${new Date().toLocaleString('pt-BR')}`
        })
      }).catch(() => {});
    }

    return res.status(403).json({
      error: 'Acesso negado. Ação suspeita detectada e bloqueada pelo sistema de segurança do Tradutor Pet.',
      code: 'SECURITY_SENTINEL_BLOCKED',
    });
  }

  next();
}

app.use(securitySentinel);

// ── 4. BODY PARSING SEGURO ─────────────────────────────────
// Limitar tamanho do body JSON para evitar payload bombing
app.use(express.json({ limit: '1kb' }));
app.use(express.urlencoded({ extended: false, limit: '1kb' }));

// ── 5. LOGGER DE REQUISIÇÕES ───────────────────────────────
app.use(requestLogger);

// ── 6. HEALTH CHECK & STATUS DE SEGURANÇA ─────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/api/security-status', (_req, res) => {
  res.json({
    sentinel: 'active',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: NODE_ENV,
    totalBlockedAttempts: recentSecurityIncidents.length,
    recentBlockedAttempts: recentSecurityIncidents,
    protections: {
      rateLimiter: 'active (30 req / 15min)',
      paymentLimiter: 'active (15 req / 10min)',
      helmetCSP: 'active (Content-Security-Policy & HSTS)',
      magicBytesUploadFilter: 'active (JPEG, PNG, WebP RIFF/WEBP strictly enforced)',
      antiPromptInjection: 'active (Multimodal AI prompt guard)',
      priceTamperingProtection: 'active (Server-side enforced R$ 12,90)',
      databaseExposure: 'none (stateless architecture without vulnerable SQL engines)',
      credentialsLeakRisk: 'none (all API keys strictly isolated in server memory)',
    },
  });
});

// ── 7. ROTAS DA APLICAÇÃO ──────────────────────────────────
app.use('/api/analysis', createAnalysisRouter());
app.use('/api/payment', createPaymentRouter());

// ── 8. SERVIR FRONTEND (apenas em desenvolvimento) ─────────
// Em produção, o frontend será servido por Nginx/Cloudflare
if (NODE_ENV === 'development') {
  app.use(express.static('../', {
    maxAge: 0,
    etag: false,
    // Bloquear acesso a arquivos sensíveis
    setHeaders: (res, path) => {
      if (path.endsWith('.env') || path.includes('node_modules')) {
        res.status(403).end('Forbidden');
      }
    },
  }));
}

// ── 9. HANDLERS DE ERRO ────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── 10. INICIALIZAÇÃO ──────────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  TRADUTOR DE RAÇÃO — Backend Seguro');
    console.log('══════════════════════════════════════════════');
    console.log(`  Ambiente:  ${NODE_ENV}`);
    console.log(`  Porta:     ${PORT}`);
    console.log(`  CORS:      ${[...defaultAllowed, ...customOrigins].join(', ')}`);
    console.log(`  Rate Limit: ${process.env.RATE_LIMIT_MAX || 30} req/15min`);
    console.log(`  Gemini:    ${process.env.GEMINI_API_KEY ? '✓ Configurada' : '✗ NÃO CONFIGURADA'}`);
    console.log('══════════════════════════════════════════════');
    console.log('');
  });
}

// ── GRACEFUL SHUTDOWN ──────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Recebido SIGTERM, encerrando...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Recebido SIGINT, encerrando...');
  process.exit(0);
});

// Capturar erros não tratados sem crashar silenciosamente
process.on('unhandledRejection', (reason) => {
  console.error('[ERRO CRÍTICO] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[ERRO CRÍTICO] Uncaught Exception:', err);
  process.exit(1);
});

export default app;
