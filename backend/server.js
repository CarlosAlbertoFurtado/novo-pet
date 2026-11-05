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
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

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
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sem origin (ex: Postman, curl em dev)
    if (!origin && NODE_ENV === 'development') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
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
  // Identificar por IP real (caso esteja atrás de proxy/Cloudflare)
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  },
});

app.use('/api/', limiter);

// ── 4. BODY PARSING SEGURO ─────────────────────────────────
// Limitar tamanho do body JSON para evitar payload bombing
app.use(express.json({ limit: '1kb' }));
app.use(express.urlencoded({ extended: false, limit: '1kb' }));

// ── 5. LOGGER DE REQUISIÇÕES ───────────────────────────────
app.use(requestLogger);

// ── 6. HEALTH CHECK ────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// ── 7. ROTAS DA APLICAÇÃO ──────────────────────────────────
app.use('/api/analysis', createAnalysisRouter());

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
    console.log(`  CORS:      ${allowedOrigins.join(', ')}`);
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
