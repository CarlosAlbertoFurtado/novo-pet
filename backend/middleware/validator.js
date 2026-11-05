// ============================================================
// MIDDLEWARE — Validação e Sanitização de Inputs
// ============================================================
// Protege contra:
//   - XSS (Cross-Site Scripting) via inputs de texto
//   - Injection (SQL, NoSQL, command injection)
//   - Uploads maliciosos (executáveis disfarçados de imagem)
//   - Campos obrigatórios ausentes
// ============================================================

// Valores permitidos (whitelist) — qualquer coisa fora disso é rejeitada
const ALLOWED_SPECIES = ['cao', 'gato'];
const ALLOWED_SIZES = ['pequeno', 'medio', 'grande', ''];
const ALLOWED_AGES = ['filhote', 'adulto', 'idoso'];
const ALLOWED_OBSERVATIONS = ['normal', 'leve', 'grave'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// Magic bytes para validação real do tipo de arquivo (não confiar só no MIME)
const IMAGE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': null, // RIFF....WEBP — validação mais complexa
};

/**
 * Remove caracteres perigosos de uma string
 * Protege contra XSS e injection sem quebrar texto legítimo
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>'"`;$\\{}()]/g, '')  // Remove chars perigosos
    .replace(/javascript:/gi, '')      // Remove javascript: URIs
    .replace(/on\w+\s*=/gi, '')        // Remove event handlers (onclick=, etc)
    .replace(/\.\.\//g, '')            // Remove path traversal
    .slice(0, 200);                    // Limitar tamanho
}

/**
 * Valida os campos do formulário de análise
 * Retorna { valid: true, data: {...} } ou { valid: false, error: '...' }
 */
export function validateAnalysisInput(body) {
  const errors = [];

  // Espécie (obrigatório)
  const species = sanitizeString(body.species || '').toLowerCase();
  if (!ALLOWED_SPECIES.includes(species)) {
    errors.push('Espécie inválida. Escolha: Cão ou Gato.');
  }

  // Porte (obrigatório para cão)
  const size = sanitizeString(body.size || '').toLowerCase();
  if (species === 'cao' && !['pequeno', 'medio', 'grande'].includes(size)) {
    errors.push('Porte obrigatório para cães: Pequeno, Médio ou Grande.');
  }

  // Idade (obrigatório)
  const age = sanitizeString(body.age || '').toLowerCase();
  if (!ALLOWED_AGES.includes(age)) {
    errors.push('Idade inválida. Escolha: Filhote, Adulto ou Idoso.');
  }

  // Observação (obrigatório)
  const observation = sanitizeString(body.observation || '').toLowerCase();
  if (!ALLOWED_OBSERVATIONS.includes(observation)) {
    errors.push('Observação inválida. Escolha: Normal, Leve ou Grave.');
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join(' ') };
  }

  return {
    valid: true,
    data: { species, size, age, observation },
  };
}

/**
 * Valida se o arquivo é realmente uma imagem (verifica magic bytes, não só extensão)
 * Protege contra executáveis disfarçados de .jpg
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'Imagem do rótulo é obrigatória.' };
  }

  // Verificar MIME type
  if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    return { valid: false, error: 'Formato de imagem não suportado. Use JPG, PNG ou WebP.' };
  }

  // Verificar tamanho (double-check além do Multer)
  const maxSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: `Imagem muito grande. Limite: ${Math.floor(maxSize / 1024 / 1024)}MB.` };
  }

  // Verificar magic bytes (assinatura real do arquivo)
  if (file.buffer && file.buffer.length >= 4) {
    const bytes = [...file.buffer.slice(0, 4)];

    if (file.mimetype === 'image/jpeg') {
      if (bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) {
        return { valid: false, error: 'Arquivo corrompido ou não é uma imagem JPEG válida.' };
      }
    } else if (file.mimetype === 'image/png') {
      if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
        return { valid: false, error: 'Arquivo corrompido ou não é uma imagem PNG válida.' };
      }
    } else if (file.mimetype === 'image/webp') {
      // WebP: deve começar com RIFF
      if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) {
        return { valid: false, error: 'Arquivo corrompido ou não é uma imagem WebP válida.' };
      }
    }
  }

  return { valid: true };
}
