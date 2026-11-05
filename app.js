/**
 * Tradutor de Ração - Controlador Principal da Aplicação (app.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  // Instancia o analisador com a configuração de espécies
  const analyzer = new TradutorRacaoAnalyzer(SPECIES_CONFIG);

  // Elementos do DOM
  const form = document.getElementById("racaoForm");
  const fileInput = document.getElementById("fotoRotuloInput");
  const dropzone = document.getElementById("dropzoneArea");
  const previewContainer = document.getElementById("previewContainer");
  const previewImage = document.getElementById("previewImage");
  const scanLaser = document.getElementById("scanLaser");
  const btnRemoveImage = document.getElementById("btnRemoveImage");

  const porteGroup = document.getElementById("porteGroup");
  const porteRadios = document.querySelectorAll('input[name="size"]');
  const idadeRadios = document.querySelectorAll('input[name="age"]');
  const speciesRadios = document.querySelectorAll('input[name="species"]');
  const obsCards = document.querySelectorAll(".obs-card");

  const toggleManualFields = document.getElementById("toggleManualFields");
  const manualFieldsContainer = document.getElementById("manualFieldsContainer");
  const accordionArrow = document.getElementById("accordionArrow");

  const inputProteina = document.getElementById("inputProteina");
  const inputGordura = document.getElementById("inputGordura");
  const inputCinzas = document.getElementById("inputCinzas");
  const inputPrimeiroIngrediente = document.getElementById("inputPrimeiroIngrediente");

  const processingModal = document.getElementById("processingModal");
  const resultSection = document.getElementById("resultSection");
  const formSection = document.getElementById("formSection");
  const heroSection = document.getElementById("heroSection");

  const btnNovaAnalise = document.getElementById("btnNovaAnalise");
  const btnPrintReport = document.getElementById("btnPrintReport");
  const presetButtons = document.querySelectorAll(".btn-preset");

  // Estado da aplicação
  let currentFile = null;
  let activePresetKey = null;

  // ==========================================
  // 1. CONTROLE DE ESPÉCIE & PORTE
  // ==========================================
  speciesRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      const selectedSpecies = e.target.value;
      if (selectedSpecies === "cao") {
        porteGroup.style.display = "block";
      } else {
        porteGroup.style.display = "none";
      }
    });
  });

  // Segmented control styling para porte e idade
  document.querySelectorAll(".segmented-control").forEach(control => {
    const labels = control.querySelectorAll("label");
    labels.forEach(label => {
      label.addEventListener("click", () => {
        labels.forEach(l => l.classList.remove("active"));
        label.classList.add("active");
      });
    });
  });

  // ==========================================
  // 2. PERGUNTA DE OBSERVAÇÃO (PELO & FEZES)
  // ==========================================
  obsCards.forEach(card => {
    card.addEventListener("click", () => {
      obsCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // ==========================================
  // 3. UPLOAD DE FOTO & DRAG AND DROP
  // ==========================================
  function handleImageFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WEBP).");
      return;
    }
    currentFile = file;
    activePresetKey = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      dropzone.style.display = "none";
      previewContainer.style.display = "block";
      scanLaser.style.display = "block";

      // Simulação rápida de extração OCR caso os campos manuais estejam vazios
      if (!inputProteina.value && !inputGordura.value) {
        // Se a espécie for cão, define valores médios sugeridos de leitura caso o tutor não digite
        const isCat = document.querySelector('input[name="species"]:checked')?.value === "gato";
        inputProteina.value = isCat ? 32 : 24;
        inputGordura.value = isCat ? 14 : 12;
        inputCinzas.value = 8.5;
        inputPrimeiroIngrediente.value = "Farinha de vísceras de frango";
      }
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  // Drag and drop events
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("drag-over");
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-over");
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files && dt.files[0]) {
      handleImageFile(dt.files[0]);
    }
  });

  btnRemoveImage.addEventListener("click", () => {
    currentFile = null;
    activePresetKey = null;
    fileInput.value = "";
    previewImage.src = "";
    previewContainer.style.display = "none";
    scanLaser.style.display = "none";
    dropzone.style.display = "block";
  });

  // ==========================================
  // 4. TESTE RÁPIDO COM PRESETS (1 CLIQUE)
  // ==========================================
  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const presetKey = btn.getAttribute("data-preset");
      const presetData = EXEMPLOS_ROTULOS[presetKey];
      if (!presetData) return;

      activePresetKey = presetKey;
      currentFile = { name: `${presetKey}.jpg` };

      // Gera um card de imagem ilustrativo SVG do rótulo para preview
      const svgLabel = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
        <rect width="600" height="300" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="4"/>
        <rect x="20" y="20" width="560" height="40" fill="%230f172a" rx="6"/>
        <text x="300" y="46" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">NÍVEIS DE GARANTIA - ${presetData.nome.toUpperCase()}</text>
        <text x="40" y="95" font-family="Arial, sans-serif" font-size="14" fill="%23334155">• Umidade (máx.): 100 g/kg (10,0%)</text>
        <text x="40" y="125" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="%230d9488">• Proteína Bruta (mín.): ${presetData.rotulo.proteina * 10} g/kg (${presetData.rotulo.proteina}%)</text>
        <text x="40" y="155" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="%230d9488">• Extrato Etéreo / Gordura (mín.): ${presetData.rotulo.gordura * 10} g/kg (${presetData.rotulo.gordura}%)</text>
        <text x="40" y="185" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="%23e11d48">• Matéria Mineral / Cinzas (máx.): ${presetData.rotulo.cinzas * 10} g/kg (${presetData.rotulo.cinzas}%)</text>
        <text x="40" y="215" font-family="Arial, sans-serif" font-size="14" fill="%23334155">• Matéria Fibrosa (máx.): ${presetData.rotulo.fibra * 10} g/kg (${presetData.rotulo.fibra}%)</text>
        <text x="40" y="255" font-family="Arial, sans-serif" font-size="12" fill="%2364748b">1º Ingrediente: ${presetData.rotulo.primeiroIngrediente}</text>
      </svg>`;

      previewImage.src = svgLabel;
      dropzone.style.display = "none";
      previewContainer.style.display = "block";
      scanLaser.style.display = "block";

      // Seta espécie
      const speciesRadio = document.querySelector(`input[name="species"][value="${presetData.species}"]`);
      if (speciesRadio) {
        speciesRadio.checked = true;
        speciesRadio.dispatchEvent(new Event("change"));
      }

      // Seta porte (se cão)
      if (presetData.species === "cao" && presetData.size) {
        const porteRadio = document.querySelector(`input[name="size"][value="${presetData.size}"]`);
        if (porteRadio) {
          porteRadio.checked = true;
          document.querySelectorAll("#porteControl label").forEach(l => l.classList.remove("active"));
          porteRadio.closest("label")?.classList.add("active");
        }
      }

      // Seta idade
      const ageRadio = document.querySelector(`input[name="age"][value="${presetData.age}"]`);
      if (ageRadio) {
        ageRadio.checked = true;
        document.querySelectorAll("#idadeControl label").forEach(l => l.classList.remove("active"));
        ageRadio.closest("label")?.classList.add("active");
      }

      // Seta observação
      const obsCard = document.querySelector(`.obs-card[data-obs="${presetData.observation}"]`);
      if (obsCard) {
        obsCard.click();
      }

      // Preenche campos manuais
      inputProteina.value = presetData.rotulo.proteina;
      inputGordura.value = presetData.rotulo.gordura;
      inputCinzas.value = presetData.rotulo.cinzas;
      inputPrimeiroIngrediente.value = presetData.rotulo.primeiroIngrediente;

      // Scroll suave até o formulário
      formSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // ==========================================
  // 5. ACORDEÃO DE DADOS MANUAIS
  // ==========================================
  let isAccordionOpen = true; // Deixamos aberto para clareza e transparência
  toggleManualFields.addEventListener("click", () => {
    isAccordionOpen = !isAccordionOpen;
    manualFieldsContainer.style.display = isAccordionOpen ? "grid" : "none";
    accordionArrow.textContent = isAccordionOpen ? "▼" : "▶";
  });

  // ==========================================
  // 6. SUBMISSÃO DO FORMULÁRIO E ANÁLISE IA
  // ==========================================

  // URL do backend com detecção inteligente e fallback resiliente
  let activeBackendUrl = null;

  async function resolveBackendUrl() {
    if (activeBackendUrl !== null) return activeBackendUrl;

    const hostname = window.location.hostname;
    const isVercel = hostname.endsWith('.vercel.app');

    // Se estiver em produção na Vercel, usa mesma origem relativa
    if (isVercel) {
      activeBackendUrl = '';
      return activeBackendUrl;
    }

    // Se estiver em ambiente local (localhost, 127.0.0.1, Live Server ou file:)
    // 1. Tentar backend local na porta 3001
    try {
      const localResp = await fetch('http://localhost:3001/api/analysis/status', {
        signal: AbortSignal.timeout(1200)
      });
      if (localResp.ok) {
        const data = await localResp.json();
        if (data.ready) {
          activeBackendUrl = 'http://localhost:3001';
          console.log('[API] Conectado ao backend local na porta 3001.');
          return activeBackendUrl;
        }
      }
    } catch {
      // Backend local desligado, testar fallback em nuvem
    }

    // 2. Fallback automático para a API em nuvem na Vercel (garante que a IA funcione em qualquer ambiente)
    try {
      const prodResp = await fetch('https://novo-pet-beta.vercel.app/api/analysis/status', {
        signal: AbortSignal.timeout(3500)
      });
      if (prodResp.ok) {
        const data = await prodResp.json();
        if (data.ready) {
          activeBackendUrl = 'https://novo-pet-beta.vercel.app';
          console.log('[API] Backend local não detectado. Usando API em nuvem (Vercel): https://novo-pet-beta.vercel.app');
          return activeBackendUrl;
        }
      }
    } catch {
      // Ambos indisponíveis
    }

    activeBackendUrl = '';
    return activeBackendUrl;
  }

  /**
   * Verifica se o backend está disponível e com API key configurada
   */
  async function checkBackendReady() {
    try {
      const url = await resolveBackendUrl();
      const resp = await fetch(`${url}/api/analysis/status`, { signal: AbortSignal.timeout(4000) });
      if (!resp.ok) return false;
      const data = await resp.json();
      return data.ready === true;
    } catch {
      return false;
    }
  }

  /**
   * Redimensiona e comprime imagens pesadas de smartphone no navegador
   * Evita estouro de payload de 4.5MB da Vercel e acelera envio em 4G/5G
   */
  async function comprimirImagemSeNecessario(file) {
    if (!file || !(file instanceof File)) return file;
    // Se o arquivo já for leve (abaixo de 1.2MB), envia direto
    if (file.size <= 1.2 * 1024 * 1024 && (file.type === "image/jpeg" || file.type === "image/webp")) {
      return file;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1600; // Resolução ideal para OCR do Gemini

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file); // Fallback caso canvas falhe
              return;
            }
            const cleanName = (file.name || "rotulo").replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: "image/jpeg",
              lastModified: Date.now()
            });
            console.log(`[CLIENT] Foto otimizada: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
            resolve(compressedFile);
          }, "image/jpeg", 0.85);
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Envia imagem real para o backend e retorna a análise da IA Gemini
   */
  async function analisarViaBackend(file, species, size, age, observation) {
    const fileToSend = await comprimirImagemSeNecessario(file);
    const backendUrl = await resolveBackendUrl();

    const formData = new FormData();
    formData.append('image', fileToSend);
    formData.append('species', species);
    formData.append('size', size || '');
    formData.append('age', age);
    formData.append('observation', observation);

    const resp = await fetch(`${backendUrl}/api/analysis/label`, {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({ error: 'Erro de conexão com o servidor.' }));
      throw new Error(errData.error || `Erro HTTP ${resp.status}`);
    }

    return await resp.json();
  }

  /**
   * Converte a resposta markdown do Raio-X da IA Gemini para o formato de resultado do frontend
   */
  function parseGeminiResponse(analysisText, species, size, age, observation) {
    // Função utilitária: limpar todos os asteriscos e formatação markdown do texto
    function limpar(text) {
      if (!text) return '';
      return text
        .replace(/\*\*\*/g, '')       // ***bold italic***
        .replace(/\*\*/g, '')         // **bold**
        .replace(/\*/g, '')           // *italic*
        .replace(/__/g, '')           // __underline__
        .replace(/^#+\s*/gm, '')      // ## headers
        .replace(/^---+$/gm, '')      // --- separators
        .replace(/^===+$/gm, '')      // === separators
        .replace(/^\s*[-–—]\s*$/gm, '') // linhas só com traço
        .trim();
    }

    // Extrair seções do markdown
    const sections = {};
    const sectionRegex = /##\s+(.+)\n([\s\S]*?)(?=\n##\s|$)/g;
    let match;
    while ((match = sectionRegex.exec(analysisText)) !== null) {
      sections[match[1].trim().toLowerCase()] = match[2].trim();
    }

    // ── 1. NOTA GERAL (0-10) ──
    const notaSection = sections['nota geral da ração'] || '';
    const notaMatch = notaSection.match(/NOTA:\s*(\d+[\.,]?\d*)\s*\/\s*10/i) 
      || notaSection.match(/(\d+[\.,]?\d*)\s*\/\s*10/i);
    const nota = notaMatch ? parseFloat(notaMatch[1].replace(',', '.')) : null;
    const notaResumo = limpar(notaSection.replace(/NOTA:\s*\d+[\.,]?\d*\s*\/\s*10/i, '').replace(/^\s*[-–—]\s*/gm, '').trim().split('\n')[0] || '');

    // ── 2. CLASSIFICAÇÃO COMERCIAL ──
    const classSection = sections['classificação comercial'] || '';
    let classificacao = 'standard';
    const classLower = classSection.toLowerCase();
    if (classLower.includes('super premium') || classLower.includes('superpremium')) {
      classificacao = 'super-premium';
    } else if (classLower.includes('premium')) {
      classificacao = 'premium';
    } else if (classLower.includes('econômica') || classLower.includes('economica')) {
      classificacao = 'economica';
    }
    const classificacaoTexto = limpar(classSection.slice(0, 500));

    // ── 3. SEMÁFORO ──
    const semaforoSection = sections['semáforo de qualidade'] || '';
    let semaforoCor = 'amarelo';
    const semaforoLower = semaforoSection.toLowerCase();
    if (semaforoLower.includes('🟢') || semaforoLower.includes('verde')) {
      semaforoCor = 'verde';
    } else if (semaforoLower.includes('🔴') || semaforoLower.includes('vermelho')) {
      semaforoCor = 'vermelho';
    }
    const semaforoDesc = limpar(semaforoSection
      .replace(/🟢|🟡|🔴/g, '')
      .replace(/VERDE|AMARELO|VERMELHO/gi, '')
      .replace(/^\s*[\(\)]*\s*/gm, '')
      .trim()
      .slice(0, 400));

    // ── 4. RAIO-X DOS INGREDIENTES ──
    const raioxSection = sections['raio-x dos ingredientes'] || '';
    const ingredientLines = raioxSection.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || l.trim().startsWith('•'));
    const ingredientesAnalisados = ingredientLines.map(line => {
      const clean = line.replace(/^[\s\-*•]+/, '').trim();
      let status = 'neutro';
      if (clean.includes('✅')) status = 'positivo';
      else if (clean.includes('🚫')) status = 'negativo';
      else if (clean.includes('⚠️')) status = 'atencao';
      const text = clean.replace(/[✅⚠️🚫]/g, '').trim();
      const parts = text.split(/[:–—]\s*/);
      return {
        nome: limpar(parts[0] || text),
        status,
        explicacao: limpar(parts.slice(1).join(': ').trim() || '')
      };
    }).filter(i => i.nome.length > 1);

    // ── 5. NÍVEIS DE GARANTIA ──
    const niveisSection = sections['níveis de garantia — decodificados'] || sections['níveis de garantia - decodificados'] || '';
    // Extrair valores da tabela ou texto
    const proteinaMatch = niveisSection.match(/prote[ií]na[^|]*\|\s*(\d+[\.,]?\d*)\s*%/i)
      || analysisText.match(/prote[ií]na[^:]*(?:mín|min)[^:]*:\s*(\d+[\.,]?\d*)\s*%/i)
      || analysisText.match(/prote[ií]na\s*bruta[^:]*:\s*(\d+[\.,]?\d*)\s*%/i);
    const gorduraMatch = niveisSection.match(/(?:extrato\s*et[ée]reo|gordura)[^|]*\|\s*(\d+[\.,]?\d*)\s*%/i)
      || analysisText.match(/(?:extrato\s*et[ée]reo|gordura)[^:]*(?:mín|min)[^:]*:\s*(\d+[\.,]?\d*)\s*%/i);
    const cinzasMatch = niveisSection.match(/(?:matéria\s*mineral|cinzas)[^|]*\|\s*(\d+[\.,]?\d*)\s*%/i)
      || analysisText.match(/(?:matéria\s*mineral|cinzas)[^:]*(?:máx|max)[^:]*:\s*(\d+[\.,]?\d*)\s*%/i);
    const fibrosaMatch = niveisSection.match(/(?:matéria\s*fibrosa|fibra)[^|]*\|\s*(\d+[\.,]?\d*)\s*%/i)
      || analysisText.match(/(?:matéria\s*fibrosa|fibra)[^:]*:\s*(\d+[\.,]?\d*)\s*%/i);
    const umidadeMatch = niveisSection.match(/umidade[^|]*\|\s*(\d+[\.,]?\d*)\s*%/i)
      || analysisText.match(/umidade[^:]*:\s*(\d+[\.,]?\d*)\s*%/i);

    const proteina = proteinaMatch ? parseFloat(proteinaMatch[1].replace(',', '.')) : 0;
    const gordura = gorduraMatch ? parseFloat(gorduraMatch[1].replace(',', '.')) : 0;
    const cinzas = cinzasMatch ? parseFloat(cinzasMatch[1].replace(',', '.')) : 0;
    const fibrosa = fibrosaMatch ? parseFloat(fibrosaMatch[1].replace(',', '.')) : 0;
    const umidade = umidadeMatch ? parseFloat(umidadeMatch[1].replace(',', '.')) : 0;

    // ── 6. QUALIDADE DA PROTEÍNA ──
    const qualProtSection = limpar(sections['qualidade da proteína'] || '');

    // ── 7. OBSERVAR NO PET ──
    const obsSection = limpar(sections['o que observar no seu pet (30 dias)'] || sections['o que observar no seu pet'] || '');
    let obsTipo = 'normal';
    if (observation === 'grave') obsTipo = 'urgente';
    else if (observation === 'leve') obsTipo = 'atencao';

    // ── 8. VEREDITO DE CUSTO-BENEFÍCIO ──
    const veredictSection = limpar(sections['veredito de custo-benefício'] || sections['veredito de custo-beneficio'] || '');

    // ── 9. SUGESTÕES PRÁTICAS ──
    const sugestoesSection = sections['sugestões práticas'] || sections['o que você pode fazer'] || '';
    const sugestoes = [];
    if (sugestoesSection) {
      const bullets = sugestoesSection.split(/\n[-*•]\s+|\n\d+\.\s+/).filter(Boolean);
      bullets.slice(0, 4).forEach((text, i) => {
        const clean = limpar(text);
        const parts = clean.split(/[:–—.]\s+/);
        sugestoes.push({
          titulo: limpar(parts[0] || `Sugestão ${i + 1}`),
          texto: limpar(parts.slice(1).join('. ').trim() || clean)
        });
      });
    }

    // Aviso legal removido — UX limpa

    // Determinar o 1º ingrediente de forma limpa e confiável (sem pegar frases de veredito)
    let ingredientePrincipal = 'Farinha de carne / vísceras';
    if (ingredientesAnalisados.length > 0 && ingredientesAnalisados[0].nome) {
      ingredientePrincipal = limpar(ingredientesAnalisados[0].nome);
    } else {
      const matchIngr = qualProtSection.match(/(?:fonte\s+principal|ingrediente\s+principal|1º\s+ingrediente)[:–—]\s*([^\n.,]+)/i);
      if (matchIngr && matchIngr[1].trim().length < 60) {
        ingredientePrincipal = limpar(matchIngr[1].trim());
      }
    }

    const resultado = analyzer.analisar({
      species, size, age, observation,
      labelData: {
        proteina, gordura, cinzas,
        primeiroIngrediente: ingredientePrincipal,
        ingredientesTexto: ingredientesAnalisados.map(i => i.nome).join(', ') || ingredientePrincipal
      }
    });

    // ── SOBRESCREVER com dados ricos da IA ──
    resultado.notaGeral = nota;
    resultado.notaResumo = notaResumo;
    resultado.classificacao = classificacao;
    resultado.classificacaoTexto = classificacaoTexto;
    resultado.semaforo.cor = semaforoCor;
    resultado.semaforo.titulo = { verde: 'Qualidade Adequada', amarelo: 'Pontos de Atenção', vermelho: 'Sinais Preocupantes' }[semaforoCor];
    resultado.semaforo.descricao = semaforoDesc;
    resultado.ingredientesAnalisados = ingredientesAnalisados;
    resultado.niveisGarantia = { proteina, gordura, cinzas, fibrosa, umidade };
    resultado.qualidadeProteina = qualProtSection;
    resultado.observacaoPet = obsSection;
    resultado.oQueObservarNoSeuPet.mensagem = obsSection || resultado.oQueObservarNoSeuPet.mensagem;
    resultado.oQueObservarNoSeuPet.tipo = obsTipo;
    resultado.veredict = veredictSection;
    if (sugestoes.length > 0) resultado.oQueVocePodeFazer = sugestoes;

    // Sobrescrever primeiro ingrediente e aditivos com dados refinados da IA
    if (resultado.oQueORotuloDiz) {
      resultado.oQueORotuloDiz.primeiroIngrediente.valor = ingredientePrincipal;
      resultado.oQueORotuloDiz.primeiroIngrediente.explicacao = `Fonte de proteína identificada no laudo da IA: ${ingredientePrincipal}.`;

      const analiseLower = analysisText.toLowerCase();
      const semCorantes = analiseLower.includes('ausência de corantes') || 
                          analiseLower.includes('sem corantes') || 
                          analiseLower.includes('livre de corantes');
      if (semCorantes) {
        resultado.oQueORotuloDiz.aditivos.contemCorantes = false;
        resultado.oQueORotuloDiz.aditivos.explicacao = 'Ausência de corantes sintéticos confirmada pelo laudo do Raio-X da IA.';
      }
    }

    // Preservar a análise completa em markdown para uso futuro
    resultado._rawAnalysis = analysisText;

    return resultado;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validação da foto obrigatória (Item 2 dos Requisitos: "Upload da foto do rótulo (obrigatório)")
    if (!currentFile) {
      alert("Atenção: O upload da foto do rótulo é obrigatório.\n\nPor favor, envie uma foto do verso da embalagem ou selecione um dos exemplos clínicos de teste acima.");
      dropzone.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Coleta dados
    const species = document.querySelector('input[name="species"]:checked')?.value || "cao";
    const size = document.querySelector('input[name="size"]:checked')?.value || "medio";
    const age = document.querySelector('input[name="age"]:checked')?.value || "adulto";
    const observation = document.querySelector('input[name="observation"]:checked')?.value || "normais";

    // Mapear valores do frontend para o formato esperado pelo backend
    const obsMap = { normais: 'normal', leve: 'leve', grave: 'grave' };
    const backendObs = obsMap[observation] || 'normal';

    const labelData = {
      proteina: parseFloat(inputProteina.value) || 0,
      gordura: parseFloat(inputGordura.value) || 0,
      cinzas: parseFloat(inputCinzas.value) || 0,
      primeiroIngrediente: inputPrimeiroIngrediente.value || ""
    };

    // Caso o preset traga o texto dos ingredientes
    if (activePresetKey && EXEMPLOS_ROTULOS[activePresetKey]) {
      labelData.ingredientesTexto = EXEMPLOS_ROTULOS[activePresetKey].rotulo.ingredientesTexto;
    } else {
      labelData.ingredientesTexto = labelData.primeiroIngrediente;
    }

    // Se nenhum valor foi preenchido, define valores padrão para não falhar
    if (!labelData.proteina) labelData.proteina = species === "gato" ? 30 : 22;
    if (!labelData.gordura) labelData.gordura = species === "gato" ? 15 : 12;
    if (!labelData.cinzas) labelData.cinzas = 8.0;

    // Determinar se deve usar backend (imagem real) ou análise local (preset)
    const isRealImage = currentFile instanceof File;
    let useBackend = false;

    if (isRealImage) {
      useBackend = await checkBackendReady();
    }

    if (useBackend) {
      // ── MODO BACKEND: IA Gemini analisa a imagem real ──
      processingModal.style.display = "flex";
      const steps = [
        document.getElementById("pstep1"),
        document.getElementById("pstep2"),
        document.getElementById("pstep3"),
        document.getElementById("pstep4")
      ];

      // Ativar steps progressivamente durante a chamada real à API
      steps.forEach(s => {
        s.classList.remove("active");
        s.innerHTML = `<span>○</span> ${s.textContent.replace(/^[✓○]\s*/, '')}`;
      });

      // Step 1: Enviando imagem
      steps[0].classList.add("active");
      steps[0].innerHTML = `<span>✓</span> ${steps[0].textContent.replace(/^[✓○]\s*/, '')}`;

      try {
        // Step 2: Processando com IA
        setTimeout(() => {
          steps[1].classList.add("active");
          steps[1].innerHTML = `<span>✓</span> ${steps[1].textContent.replace(/^[✓○]\s*/, '')}`;
        }, 500);

        const response = await analisarViaBackend(currentFile, species, size, age, backendObs);

        // Step 3: Montando análise
        steps[2].classList.add("active");
        steps[2].innerHTML = `<span>✓</span> ${steps[2].textContent.replace(/^[✓○]\s*/, '')}`;

        await new Promise(r => setTimeout(r, 300));

        // Step 4: Preparando veredito
        steps[3].classList.add("active");
        steps[3].innerHTML = `<span>✓</span> ${steps[3].textContent.replace(/^[✓○]\s*/, '')}`;

        await new Promise(r => setTimeout(r, 300));

        processingModal.style.display = "none";

        // Converter resposta da IA para formato do resultado
        const resultado = parseGeminiResponse(response.analysis, species, size, age, observation);
        renderizarResultado(resultado);

      } catch (err) {
        processingModal.style.display = "none";
        console.error('[BACKEND ERROR]', err);
        alert(`Erro na análise por IA: ${err.message}\n\nUsando análise local como alternativa.`);

        // Fallback: usar análise local
        iniciarProcessamento(() => {
          const resultado = analyzer.analisar({ species, size, age, observation, labelData });
          renderizarResultado(resultado);
        });
      }
    } else {
      // ── MODO LOCAL: Análise baseada em regras (presets e fallback) ──
      iniciarProcessamento(() => {
        const resultado = analyzer.analisar({
          species,
          size,
          age,
          observation,
          labelData
        });

        renderizarResultado(resultado);
      });
    }
  });

  function iniciarProcessamento(callback) {
    processingModal.style.display = "flex";

    const steps = [
      document.getElementById("pstep1"),
      document.getElementById("pstep2"),
      document.getElementById("pstep3"),
      document.getElementById("pstep4")
    ];

    steps.forEach((s, i) => {
      s.classList.remove("active");
      s.innerHTML = `<span>○</span> ${s.textContent.replace(/^[✓○]\s*/, '')}`;
    });

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        steps[currentStep].classList.add("active");
        steps[currentStep].innerHTML = `<span>✓</span> ${steps[currentStep].textContent.replace(/^[✓○]\s*/, '')}`;
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          processingModal.style.display = "none";
          callback();
        }, 350);
      }
    }, 300);
  }

  // ==========================================
  // 7. RENDERIZAÇÃO DO VEREDITO (v2 — Raio-X)
  // ==========================================
  function renderizarResultado(res) {
    // 1. Nota Geral (se disponível da IA)
    const notaCard = document.getElementById("notaGeralCard");
    if (notaCard && res.notaGeral !== null && res.notaGeral !== undefined) {
      notaCard.style.display = "flex";
      const notaValor = document.getElementById("notaGeralValor");
      const notaLabel = document.getElementById("notaGeralLabel");
      const notaResumo = document.getElementById("notaGeralResumo");
      const notaBar = document.getElementById("notaGeralBar");

      if (notaValor) notaValor.textContent = res.notaGeral.toFixed(1);
      if (notaLabel) {
        let label = 'Analisando...';
        if (res.notaGeral >= 8) label = 'Excelente';
        else if (res.notaGeral >= 6) label = 'Boa';
        else if (res.notaGeral >= 4) label = 'Regular';
        else if (res.notaGeral >= 2) label = 'Fraca';
        else label = 'Preocupante';
        notaLabel.textContent = label;
      }
      if (notaResumo) notaResumo.textContent = res.notaResumo || '';
      if (notaBar) {
        notaBar.style.width = `${(res.notaGeral / 10) * 100}%`;
        if (res.notaGeral >= 7) notaBar.className = 'nota-bar-fill verde';
        else if (res.notaGeral >= 4) notaBar.className = 'nota-bar-fill amarelo';
        else notaBar.className = 'nota-bar-fill vermelho';
      }

      // Classificação Comercial
      const classTag = document.getElementById("classificacaoTag");
      const classTexto = document.getElementById("classificacaoTexto");
      if (classTag) {
        const classNames = {
          'economica': 'Econômica',
          'standard': 'Standard',
          'premium': 'Premium',
          'super-premium': 'Super Premium'
        };
        classTag.textContent = classNames[res.classificacao] || 'Standard';
        classTag.className = `classificacao-tag ${res.classificacao}`;
      }
      if (classTexto) classTexto.textContent = res.classificacaoTexto || '';
    } else if (notaCard) {
      notaCard.style.display = "none";
    }

    // 2. Semáforo
    const semaphoreCard = document.getElementById("semaphoreCard");
    const semaphoreBadge = document.getElementById("semaphoreBadge");
    const semaphoreTitle = document.getElementById("semaphoreTitle");
    const semaphoreDesc = document.getElementById("semaphoreDesc");

    semaphoreCard.className = `semaphore-card ${res.semaforo.cor}`;
    semaphoreBadge.textContent = `Semáforo ${res.semaforo.cor.toUpperCase()}`;
    semaphoreTitle.textContent = res.semaforo.titulo;
    semaphoreDesc.textContent = res.semaforo.descricao;

    // 3. Raio-X dos Ingredientes (se disponível)
    const raioxContainer = document.getElementById("raioxIngredientesContainer");
    if (raioxContainer && res.ingredientesAnalisados && res.ingredientesAnalisados.length > 0) {
      raioxContainer.style.display = "block";
      const raioxList = document.getElementById("raioxIngredientesList");
      if (raioxList) {
        raioxList.innerHTML = "";
        res.ingredientesAnalisados.forEach(ing => {
          const item = document.createElement("div");
          item.className = `raiox-ingrediente-item ${ing.status}`;
          const iconMap = { positivo: '✅', atencao: '⚠️', negativo: '🚫', neutro: '➖' };
          item.innerHTML = `
            <span class="raiox-icon">${iconMap[ing.status] || '➖'}</span>
            <div class="raiox-info">
              <strong>${ing.nome}</strong>
              ${ing.explicacao ? `<span>${ing.explicacao}</span>` : ''}
            </div>
          `;
          raioxList.appendChild(item);
        });
      }
    } else if (raioxContainer) {
      raioxContainer.style.display = "none";
    }

    // 4. "O que o rótulo diz" (Níveis de Garantia)
    document.getElementById("valProteina").textContent = res.oQueORotuloDiz.proteina.valor;
    const tagProteina = document.getElementById("tagProteina");
    tagProteina.className = `nutrient-status-tag ${res.oQueORotuloDiz.proteina.status}`;
    tagProteina.textContent = res.oQueORotuloDiz.proteina.status === "ideal" ? "Adequado" : (res.oQueORotuloDiz.proteina.status === "atencao" ? "Atenção" : "Baixo");
    document.getElementById("descProteina").textContent = res.oQueORotuloDiz.proteina.explicacao;

    document.getElementById("valGordura").textContent = res.oQueORotuloDiz.gordura.valor;
    const tagGordura = document.getElementById("tagGordura");
    tagGordura.className = `nutrient-status-tag ${res.oQueORotuloDiz.gordura.status}`;
    tagGordura.textContent = res.oQueORotuloDiz.gordura.status === "ideal" ? "Equilibrado" : "Atenção";
    document.getElementById("descGordura").textContent = res.oQueORotuloDiz.gordura.explicacao;

    document.getElementById("valCinzas").textContent = res.oQueORotuloDiz.cinzas.valor;
    const tagCinzas = document.getElementById("tagCinzas");
    tagCinzas.className = `nutrient-status-tag ${res.oQueORotuloDiz.cinzas.status}`;
    tagCinzas.textContent = res.oQueORotuloDiz.cinzas.status === "ideal" ? "Controlado" : (res.oQueORotuloDiz.cinzas.status === "alerta" ? "Alerta Alto (>10%)" : "Intermediário");
    document.getElementById("descCinzas").textContent = res.oQueORotuloDiz.cinzas.explicacao;

    document.getElementById("valPrimeiroIngrediente").textContent = res.oQueORotuloDiz.primeiroIngrediente.valor;
    const tagIngrediente = document.getElementById("tagPrimeiroIngrediente");
    tagIngrediente.className = `nutrient-status-tag ${res.oQueORotuloDiz.primeiroIngrediente.status}`;
    tagIngrediente.textContent = res.oQueORotuloDiz.primeiroIngrediente.status === "qualidade_inferior" ? "Qualidade Inferior" : (res.oQueORotuloDiz.primeiroIngrediente.status === "qualidade_nobre" ? "Fonte Nobre" : "Padrão");
    document.getElementById("descPrimeiroIngrediente").textContent = res.oQueORotuloDiz.primeiroIngrediente.explicacao;

    document.getElementById("descAditivos").textContent = res.oQueORotuloDiz.aditivos.explicacao;

    // Função utilitária para renderizar texto da IA 100% limpo, sem asteriscos, com tópicos elegantes
    function formatarTextoVisual(rawText) {
      if (!rawText) return '';
      // 1. Elimina todos os asteriscos (bold, italic, bullets soltos)
      let text = rawText
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong>$1</strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/\*/g, '')
        .replace(/_{1,3}/g, '')
        .replace(/^#+\s*/gm, '')
        .replace(/^[-=_]{3,}\s*$/gm, '')
        .trim();

      // 2. Transforma cada linha em tópico ou parágrafo legível
      const lines = text.split('\n');
      const htmlParts = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (/^[•\-–—]\s*/.test(trimmed)) {
          return `<div class="clean-bullet-item"><span class="bullet-dot">•</span><span>${trimmed.replace(/^[•\-–—]\s*/, '')}</span></div>`;
        }
        return `<p class="clean-paragraph">${trimmed}</p>`;
      });

      return htmlParts.filter(Boolean).join('');
    }

    // 5. Qualidade da Proteína (se disponível)
    const qualProtCard = document.getElementById("qualidadeProteinaCard");
    if (qualProtCard && res.qualidadeProteina) {
      qualProtCard.style.display = "block";
      const qualProtText = document.getElementById("qualidadeProteinaText");
      if (qualProtText) {
        qualProtText.innerHTML = formatarTextoVisual(res.qualidadeProteina);
      }
    } else if (qualProtCard) {
      qualProtCard.style.display = "none";
    }

    // 6. "O que observar no seu pet"
    const alertBox = document.getElementById("petObservationAlertBox");
    alertBox.className = `pet-observation-alert-box ${res.oQueObservarNoSeuPet.tipo}`;
    document.getElementById("obsAlertTitle").textContent = res.oQueObservarNoSeuPet.titulo;
    document.getElementById("obsAlertText").innerHTML = formatarTextoVisual(res.oQueObservarNoSeuPet.mensagem);
    
    const obsIconMap = {
      normal: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
      atencao: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      urgente: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    };
    document.getElementById("obsAlertIcon").innerHTML = obsIconMap[res.oQueObservarNoSeuPet.tipo] || obsIconMap.normal;

    // 7. Veredito de Custo-Benefício (se disponível)
    const veredictCard = document.getElementById("veredictCustoBeneficioCard");
    if (veredictCard && res.veredict) {
      veredictCard.style.display = "block";
      const veredictText = document.getElementById("veredictCustoBeneficioText");
      if (veredictText) {
        veredictText.innerHTML = formatarTextoVisual(res.veredict);
      }
    } else if (veredictCard) {
      veredictCard.style.display = "none";
    }

    // 8. "O que você pode fazer" (Sugestões Práticas)
    const actionContainer = document.getElementById("actionCardsContainer");
    actionContainer.innerHTML = "";
    res.oQueVocePodeFazer.forEach(sugestao => {
      const card = document.createElement("div");
      card.className = "action-card-item";
      card.innerHTML = `
        <h4>${sugestao.titulo}</h4>
        <p>${sugestao.texto}</p>
      `;
      actionContainer.appendChild(card);
    });

    // 9. Declaração de Honestidade & Aviso Legal (se elemento existir)
    const honestyEl = document.getElementById("honestyText");
    if (honestyEl && res.declaracaoHonestidade) {
      honestyEl.textContent = res.declaracaoHonestidade;
    }

    // Exibir seção e scroll suave
    resultSection.style.display = "block";
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }


  // ==========================================
  // 8. BOTÕES AUXILIARES
  // ==========================================
  btnNovaAnalise.addEventListener("click", () => {
    resultSection.style.display = "none";
    heroSection.scrollIntoView({ behavior: "smooth" });
  });

  btnPrintReport.addEventListener("click", () => {
    window.print();
  });
});
