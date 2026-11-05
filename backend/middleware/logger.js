// ============================================================
// MIDDLEWARE — Logger de Requisições
// ============================================================
// Loga cada requisição de forma segura, sem expor dados sensíveis.
// Em produção, integre com um serviço de logging (ex: Datadog, Sentry).
// ============================================================

/**
 * Mascara informações sensíveis de headers
 */
function maskSensitive(value) {
  if (!value) return undefined;
  if (value.length <= 8) return '***';
  return value.slice(0, 4) + '***' + value.slice(-4);
}

/**
 * Logger HTTP simples e seguro
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Ao finalizar a resposta, logar o resultado
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
      userAgent: (req.headers['user-agent'] || 'unknown').slice(0, 100),
    };

    // Colorir por status
    if (res.statusCode >= 500) {
      console.error('[ERROR]', JSON.stringify(log));
    } else if (res.statusCode >= 400) {
      console.warn('[WARN]', JSON.stringify(log));
    } else {
      console.log('[INFO]', JSON.stringify(log));
    }
  });

  next();
}
