// ============================================================
// MIDDLEWARE — Handler de Erros Centralizado
// ============================================================
// Captura todos os erros da aplicação de forma segura:
//   - Em desenvolvimento: mostra stack trace completo
//   - Em produção: mostra mensagem genérica (sem vazar internals)
// ============================================================

/**
 * Handler para rotas não encontradas (404)
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method,
  });
}

/**
 * Handler de erros centralizado (deve ser o último middleware)
 */
export function errorHandler(err, req, res, _next) {
  // Erros de CORS
  if (err.message?.includes('CORS')) {
    return res.status(403).json({
      error: 'Acesso negado: origem não permitida.',
    });
  }

  // Erros de upload (Multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Arquivo muito grande. O limite é 5MB.',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Campo de upload inesperado.',
    });
  }

  // Erro de JSON malformado
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'JSON inválido no corpo da requisição.',
    });
  }

  // Erro de payload muito grande
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Corpo da requisição muito grande.',
    });
  }

  // Log interno (nunca expor para o cliente)
  console.error('[ERROR HANDLER]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  // Resposta segura — sem vazar stack trace em produção
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Erro interno do servidor. Tente novamente mais tarde.',
  });
}
