// ============================================================
// ROTA — /api/analysis
// ============================================================
// Endpoint principal: recebe imagem + dados do pet, valida
// tudo rigorosamente, e retorna análise da IA.
//
// POST /api/analysis/label
//   - multipart/form-data
//   - Campo 'image': arquivo JPG/PNG/WebP (max 5MB)
//   - Campos texto: species, size, age, observation
// ============================================================

import { Router } from 'express';
import multer from 'multer';
import { validateAnalysisInput, validateImageFile } from '../middleware/validator.js';
import { analyzeLabel, compareLabels } from '../services/gemini.js';

export function createAnalysisRouter() {
  const router = Router();

  // Configuração do Multer — upload em memória (sem salvar em disco)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
      files: 1,           // Apenas 1 arquivo por vez
      fields: 10,         // Máximo de 10 campos texto
      fieldSize: 500,     // Máximo de 500 bytes por campo texto
    },
    fileFilter: (_req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Formato de imagem não suportado. Use JPG, PNG ou WebP.'));
      }
    },
  });

  // ── POST /api/analysis/label ─────────────────────────────
  router.post('/label', upload.single('image'), async (req, res, next) => {
    try {
      // 1. Validar imagem (magic bytes, tamanho, tipo real)
      const imageValidation = validateImageFile(req.file);
      if (!imageValidation.valid) {
        return res.status(400).json({ error: imageValidation.error });
      }

      // 2. Validar campos do formulário
      const inputValidation = validateAnalysisInput(req.body);
      if (!inputValidation.valid) {
        return res.status(400).json({ error: inputValidation.error });
      }

      // 3. Chamar a IA (Gemini) para analisar o rótulo
      console.log('[ANALYSIS] Iniciando análise...', {
        species: inputValidation.data.species,
        age: inputValidation.data.age,
        imageSize: `${Math.round(req.file.size / 1024)}KB`,
      });

      const analysisText = await analyzeLabel(
        req.file.buffer,
        req.file.mimetype,
        inputValidation.data
      );

      // 4. Descartar imagem da memória imediatamente (segurança)
      req.file.buffer = null;

      // 5. Retornar resultado
      console.log('[ANALYSIS] Concluída com sucesso.');
      res.json({
        success: true,
        analysis: analysisText,
        timestamp: new Date().toISOString(),
      });

    } catch (err) {
      if (req.file) req.file.buffer = null;
      console.error('[ANALYSIS ERROR]', err.message);
      next(err);
    }
  });

  // ── POST /api/analysis/compare ────────────────────────────
  // Compara dois rótulos frente a frente (Tira-Teima de Rações)
  router.post('/compare', upload.fields([
    { name: 'imageCurrent', maxCount: 1 },
    { name: 'imageNew', maxCount: 1 }
  ]), async (req, res, next) => {
    try {
      const file1 = req.files?.imageCurrent?.[0];
      const file2 = req.files?.imageNew?.[0];

      if (!file1 || !file2) {
        return res.status(400).json({ error: 'Envie as fotos das duas rações para comparar.' });
      }

      const val1 = validateImageFile(file1);
      const val2 = validateImageFile(file2);
      if (!val1.valid) return res.status(400).json({ error: `Ração Atual: ${val1.error}` });
      if (!val2.valid) return res.status(400).json({ error: `Nova Ração: ${val2.error}` });

      const inputValidation = validateAnalysisInput(req.body);
      if (!inputValidation.valid) {
        return res.status(400).json({ error: inputValidation.error });
      }

      console.log('[COMPARE] Iniciando comparativo...', {
        species: inputValidation.data.species,
        age: inputValidation.data.age,
      });

      const compareText = await compareLabels(
        file1.buffer,
        file1.mimetype,
        file2.buffer,
        file2.mimetype,
        inputValidation.data
      );

      file1.buffer = null;
      file2.buffer = null;

      res.json({
        success: true,
        comparison: compareText,
        timestamp: new Date().toISOString(),
      });

    } catch (err) {
      if (req.files?.imageCurrent?.[0]) req.files.imageCurrent[0].buffer = null;
      if (req.files?.imageNew?.[0]) req.files.imageNew[0].buffer = null;
      console.error('[COMPARE ERROR]', err.message);
      next(err);
    }
  });

  // ── GET /api/analysis/status ─────────────────────────────
  // Endpoint leve para o frontend verificar se o backend está pronto
  router.get('/status', (_req, res) => {
    const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'SUA_CHAVE_AQUI';
    res.json({
      ready: hasApiKey,
      message: hasApiKey
        ? 'Backend pronto para análises.'
        : 'Chave da API Gemini não configurada. Configure o .env.',
    });
  });

  return router;
}
