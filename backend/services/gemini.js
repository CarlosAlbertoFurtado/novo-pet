// ============================================================
// SERVIÇO — Integração com Google Gemini API
// ============================================================
// Envia a imagem do rótulo + contexto do pet para a API Gemini
// e retorna a análise em linguagem simples para o tutor.
//
// Segurança:
//   - A chave da API nunca é exposta ao frontend
//   - A imagem é enviada como base64 inline (não salva em disco)
//   - Timeout de 30s para evitar conexões penduradas
//   - Retry com backoff exponencial em caso de falha temporária
// ============================================================

// Lista de modelos resilientes em ordem de prioridade
const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
  'gemini-pro-latest'
];

/**
 * Monta o prompt técnico para a IA analisar o rótulo
 */
function buildPrompt(petData) {
  const { species, size, age, observation } = petData;

  const speciesName = species === 'cao' ? 'cão' : 'gato';
  const sizeText = species === 'cao' ? ` de porte ${size}` : '';
  const ageText = age;

  const observationMap = {
    normal: 'O tutor relata que o pelo e as fezes estão normais.',
    leve: 'O tutor relata pelo um pouco opaco e/ou fezes moles.',
    grave: 'O tutor relata pelo muito ruim, coceira frequente e/ou fezes muito alteradas.',
  };

  return `Você é um especialista em nutrição animal e rotulagem de ração para pets no Brasil.

TAREFA: Analise a imagem do rótulo de ração enviada e forneça uma avaliação técnica em linguagem SIMPLES que qualquer pessoa leiga consiga entender.

CONTEXTO DO PET:
- Espécie: ${speciesName}${sizeText}
- Fase de vida: ${ageText}
- Observação do tutor: ${observationMap[observation] || 'Sem observação.'}

REGRAS OBRIGATÓRIAS:
1. NUNCA faça diagnóstico de saúde. Você analisa RÓTULOS, não o animal.
2. Use linguagem do dia a dia. Evite termos técnicos sem explicá-los.
3. Seja honesto: "Não é possível garantir a qualidade real só pelo rótulo. O teste verdadeiro é observar seu pet ao longo de 30 dias."
4. Se o tutor relatou problemas (pelo opaco, coceira, fezes moles), diga: "Sua observação é um sinal importante. Consulte um veterinário para descartar outras causas. A ração pode ser um fator, mas não é o único."

ESTRUTURA DA RESPOSTA (use exatamente estes títulos):

## Semáforo de Qualidade
Classifique como VERDE (boa), AMARELO (atenção) ou VERMELHO (preocupante) com base nos níveis de garantia e ingredientes.

## O que o Rótulo Diz
Extraia da imagem:
- Proteína bruta (mínimo): X%
- Gordura bruta (mínimo): X%
- Matéria mineral/cinzas (máximo): X%
- Primeiro ingrediente listado
- Se houver taurina (importante para gatos)

Explique cada número de forma simples. Ex: "Proteína de 22% está dentro do mínimo para cães adultos, mas não sobra muito."

## O que Observar no Seu Pet
Diga o que o tutor deve ficar de olho nos próximos 30 dias.

## O que Você Pode Fazer
Dê 2-3 sugestões práticas e acessíveis.

## Aviso Importante
Inclua: "Esta análise é baseada apenas no rótulo. Rações podem variar entre lotes. A melhor avaliação é a resposta real do seu pet. Consulte sempre um médico-veterinário."

IMPORTANTE: Se não conseguir ler algum dado do rótulo, diga honestamente "Não consegui identificar esse dado na imagem" em vez de inventar valores.`;
}

/**
 * Chama a API do Gemini com a imagem e retorna a análise
 * @param {Buffer} imageBuffer - Buffer da imagem do rótulo
 * @param {string} mimeType - MIME type da imagem (image/jpeg, image/png, image/webp)
 * @param {object} petData - Dados do pet { species, size, age, observation }
 * @returns {Promise<string>} Texto da análise formatado em Markdown
 */
export async function analyzeLabel(imageBuffer, mimeType, petData) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') {
    throw new Error('GEMINI_API_KEY não configurada. Edite o arquivo .env no backend.');
  }

  const base64Image = imageBuffer.toString('base64');
  const prompt = buildPrompt(petData);

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  // Tenta modelos em ordem de prioridade com tolerância a picos de demanda
  let lastError;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.text();
          console.warn(`[GEMINI] Modelo ${model} retornou ${response.status} (tentativa ${attempt}):`, 
            errorData.slice(0, 150));

          if (response.status === 429 || response.status === 404 || response.status === 503) {
            // Tenta o próximo modelo ou retry
            break;
          }
          if (response.status === 403) {
            throw new Error('Chave da API Gemini sem permissão ou inválida. Verifique o .env.');
          }
          throw new Error(`Erro na API Gemini (${model}): ${response.status}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('A IA não retornou o texto da análise.');
        }

        console.log(`[GEMINI] Análise gerada com sucesso usando o modelo: ${model}`);
        return text;

      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          lastError = new Error('A análise demorou muito (timeout de 30s). Tente com uma imagem menor.');
        }
        if (attempt === 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }
  }

  throw lastError || new Error('Não foi possível obter resposta dos modelos de IA no momento.');
}
