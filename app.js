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
  const resultCompareSection = document.getElementById("resultCompareSection");
  const premiumLockedWrapper = document.getElementById("premiumLockedWrapper");
  const paywallCardIndividual = document.getElementById("paywallCardIndividual");

  // ==========================================
  // GERENCIAMENTO DA ASSINATURA MENSAL (30 DIAS)
  // ==========================================
  const SUB_STORAGE_KEY = "pet_subscription";
  let isLaudoDesbloqueado = false;

  function getAssinaturaState() {
    try {
      const raw = localStorage.getItem(SUB_STORAGE_KEY);
      if (!raw) return { active: false, diasRestantes: 0 };
      const data = JSON.parse(raw);
      if (!data || !data.expiresAt) return { active: false, diasRestantes: 0 };

      const agora = Date.now();
      if (agora < data.expiresAt) {
        const diffMs = data.expiresAt - agora;
        const diasRestantes = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return {
          active: true,
          diasRestantes,
          method: data.method || 'card',
          autoRenew: Boolean(data.autoRenew),
          expiresAt: data.expiresAt
        };
      }
      return { active: false, diasRestantes: 0, expirado: true };
    } catch {
      return { active: false, diasRestantes: 0 };
    }
  }

  function ativarAssinatura(dias = 30, method = 'card', autoRenew = true) {
    const expiresAt = Date.now() + (dias * 24 * 60 * 60 * 1000);
    const subData = {
      active: true,
      plan: 'monthly',
      method,
      autoRenew,
      activatedAt: new Date().toISOString(),
      expiresAt
    };
    try {
      localStorage.setItem(SUB_STORAGE_KEY, JSON.stringify(subData));
    } catch (e) {
      console.warn("[STORAGE ERROR]", e);
    }
    isLaudoDesbloqueado = true;
    aplicarEstadoAssinatura();
  }

  function aplicarEstadoAssinatura() {
    const sub = getAssinaturaState();
    const activePill = document.getElementById("activeSubPill");
    const activePillCompare = document.getElementById("activeSubPillCompare");
    const countdownEl = document.getElementById("activeSubPillCountdown");
    const methodBadge = document.getElementById("activeSubPillBadge");
    const countdownCompEl = document.getElementById("activeSubPillCompareCountdown");
    const lockedWrapper = premiumLockedWrapper || document.getElementById("premiumLockedWrapper");
    const paywallCard = paywallCardIndividual || document.getElementById("paywallCardIndividual");

    if (sub.active) {
      isLaudoDesbloqueado = true;
      if (lockedWrapper) lockedWrapper.classList.remove("is-locked");
      if (paywallCard) paywallCard.style.display = "none";

      if (activePill) {
        activePill.style.display = "flex";
        if (countdownEl) {
          countdownEl.textContent = `Restam ${sub.diasRestantes} ${sub.diasRestantes === 1 ? 'dia' : 'dias'} de consultas ilimitadas`;
        }
        if (methodBadge) {
          methodBadge.textContent = sub.autoRenew ? "Renovação Automática" : "Passe 30 Dias";
        }
      }

      if (activePillCompare) {
        activePillCompare.style.display = "flex";
        if (countdownCompEl) {
          countdownCompEl.textContent = `Restam ${sub.diasRestantes} ${sub.diasRestantes === 1 ? 'dia' : 'dias'} de consultas ilimitadas`;
        }
      }
    } else {
      if (activePill) activePill.style.display = "none";
      if (activePillCompare) activePillCompare.style.display = "none";
      if (!isLaudoDesbloqueado) {
        if (lockedWrapper) lockedWrapper.classList.add("is-locked");
        if (paywallCard) paywallCard.style.display = "block";
      }
    }
  }

  // ── DETECTAR RETORNO DE PAGAMENTO COM CARTÃO APROVADO (MERCADO PAGO) ──
  const urlParams = new URLSearchParams(window.location.search);
  const paymentReturnStatus = urlParams.get("payment") || urlParams.get("collection_status") || urlParams.get("status");
  if (paymentReturnStatus === "approved" || paymentReturnStatus === "success") {
    ativarAssinatura(30, 'card', true);
    setTimeout(() => {
      aplicarEstadoAssinatura();
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 400);
  } else {
    aplicarEstadoAssinatura();
  }
  const btnNovaComparacao = document.getElementById("btnNovaComparacao");
  const btnIrParaComparador = document.getElementById("btnIrParaComparador");

  // Elementos do Seletor de Modo (1 Ração vs Comparar 2)
  const tabModoAnalise = document.getElementById("tabModoAnalise");
  const tabModoComparar = document.getElementById("tabModoComparar");
  const stepSingleUpload = document.getElementById("stepSingleUpload");
  const stepCompareUpload = document.getElementById("stepCompareUpload");
  const btnSubmitText = document.getElementById("btnSubmitText");

  // Elementos de Upload do Comparador
  const fotoAtualInput = document.getElementById("fotoAtualInput");
  const fotoNovaInput = document.getElementById("fotoNovaInput");
  const dropzoneAtual = document.getElementById("dropzoneAtual");
  const dropzoneNova = document.getElementById("dropzoneNova");
  const previewAtualContainer = document.getElementById("previewAtualContainer");
  const previewNovaContainer = document.getElementById("previewNovaContainer");
  const previewAtualImage = document.getElementById("previewAtualImage");
  const previewNovaImage = document.getElementById("previewNovaImage");
  const btnRemoveAtual = document.getElementById("btnRemoveAtual");
  const btnRemoveNova = document.getElementById("btnRemoveNova");

  // Estado da aplicação
  let currentFile = null;
  let fileAtual = null;
  let fileNova = null;
  let currentMode = 'single'; // 'single' ou 'compare'

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
  // 4. SELETOR DE MODO (1 RAÇÃO VS TIRA-TEIMA)
  // ==========================================
  function alternarModo(novoModo) {
    currentMode = novoModo;
    resultSection.style.display = "none";
    if (resultCompareSection) resultCompareSection.style.display = "none";

    if (currentMode === 'compare') {
      tabModoComparar?.classList.add("active");
      tabModoAnalise?.classList.remove("active");
      stepSingleUpload.style.display = "none";
      stepCompareUpload.style.display = "block";
      if (btnSubmitText) btnSubmitText.textContent = "Comparar Alimentos Agora (Tira-Teima)";
    } else {
      tabModoAnalise?.classList.add("active");
      tabModoComparar?.classList.remove("active");
      stepSingleUpload.style.display = "block";
      stepCompareUpload.style.display = "none";
      if (btnSubmitText) btnSubmitText.textContent = "Analisar Alimento Agora";
    }
  }

  tabModoAnalise?.addEventListener("click", () => alternarModo('single'));
  tabModoComparar?.addEventListener("click", () => alternarModo('compare'));

  // Botão de convite no fim da análise individual
  btnIrParaComparador?.addEventListener("click", () => {
    alternarModo('compare');
    if (currentFile && !fileAtual) {
      fileAtual = currentFile;
      const reader = new FileReader();
      reader.onload = (e) => {
        previewAtualImage.src = e.target.result;
        dropzoneAtual.style.display = "none";
        previewAtualContainer.style.display = "block";
      };
      reader.readAsDataURL(fileAtual);
    }
    formSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // UPLOAD DA RAÇÃO ATUAL (COMPARADOR)
  fotoAtualInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      fileAtual = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewAtualImage.src = ev.target.result;
        dropzoneAtual.style.display = "none";
        previewAtualContainer.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  btnRemoveAtual?.addEventListener("click", () => {
    fileAtual = null;
    fotoAtualInput.value = "";
    previewAtualImage.src = "";
    previewAtualContainer.style.display = "none";
    dropzoneAtual.style.display = "block";
  });

  // UPLOAD DA NOVA RAÇÃO (COMPARADOR)
  fotoNovaInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      fileNova = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewNovaImage.src = ev.target.result;
        dropzoneNova.style.display = "none";
        previewNovaContainer.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  btnRemoveNova?.addEventListener("click", () => {
    fileNova = null;
    fotoNovaInput.value = "";
    previewNovaImage.src = "";
    previewNovaContainer.style.display = "none";
    dropzoneNova.style.display = "block";
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

    // 2. Fallback automático para a API em nuvem na Vercel
    try {
      const betaResp = await fetch('https://novo-pet-beta.vercel.app/api/analysis/status', {
        signal: AbortSignal.timeout(3500)
      });
      if (betaResp.ok) {
        const data = await betaResp.json();
        if (data.ready) {
          activeBackendUrl = 'https://novo-pet-beta.vercel.app';
          console.log('[API] Backend local não detectado. Usando API em nuvem (Vercel): https://novo-pet-beta.vercel.app');
          return activeBackendUrl;
        }
      }
    } catch {
      // Testar fallback alternativo
    }

    try {
      const prodResp = await fetch('https://novo-pet.vercel.app/api/analysis/status', {
        signal: AbortSignal.timeout(2500)
      });
      if (prodResp.ok) {
        const data = await prodResp.json();
        if (data.ready) {
          activeBackendUrl = 'https://novo-pet.vercel.app';
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
      const fallbackTimer = setTimeout(() => resolve(file), 4000);
      const done = (result) => {
        clearTimeout(fallbackTimer);
        resolve(result);
      };

      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          try {
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
                done(file);
                return;
              }
              const cleanName = (file.name || "rotulo").replace(/\.[^/.]+$/, "") + ".jpg";
              try {
                const compressedFile = new File([blob], cleanName, {
                  type: "image/jpeg",
                  lastModified: Date.now()
                });
                console.log(`[CLIENT] Foto otimizada: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
                done(compressedFile);
              } catch {
                blob.name = cleanName;
                done(blob);
              }
            }, "image/jpeg", 0.85);
          } catch (canvasErr) {
            console.warn('[CLIENT] Falha no canvas de compressão:', canvasErr);
            done(file);
          }
        };
        img.onerror = () => done(file);
        img.src = e.target.result;
      };
      reader.onerror = () => done(file);
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
   * Envia as duas imagens para o backend e retorna o comparativo da IA Gemini (Tira-Teima)
   */
  async function compararViaBackend(file1, file2, species, size, age) {
    const file1ToSend = await comprimirImagemSeNecessario(file1);
    const file2ToSend = await comprimirImagemSeNecessario(file2);
    const backendUrl = await resolveBackendUrl();

    const formData = new FormData();
    formData.append('imageCurrent', file1ToSend);
    formData.append('imageNew', file2ToSend);
    formData.append('species', species);
    formData.append('size', size || '');
    formData.append('age', age);
    formData.append('observation', 'normal');

    const resp = await fetch(`${backendUrl}/api/analysis/compare`, {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({ error: 'Erro de conexão com o servidor.' }));
      throw new Error(errData.error || `Erro HTTP ${resp.status}`);
    }

    return await resp.json();
  }

  // Função utilitária global: limpar todos os asteriscos e formatação markdown do texto
  function limpar(text) {
    if (!text) return '';
    return text
      .replace(/\*\*\*/g, '')       // ***bold italic***
      .replace(/\*\*/g, '')         // **bold**
      .replace(/\*/g, '')           // *italic*
      .replace(/_{1,3}/g, '')       // __underline__
      .replace(/^#+\s*/gm, '')      // ## headers
      .replace(/^---+$/gm, '')      // --- separators
      .replace(/^===+$/gm, '')      // === separators
      .replace(/^\s*[-–—]\s*$/gm, '') // linhas só com traço
      .trim();
  }

  /**
   * Converte a resposta markdown do Raio-X da IA Gemini para o formato de resultado do frontend
   */
  function parseGeminiResponse(analysisText, species, size, age, observation) {

    // Extrair seções do markdown
    const sections = {};
    const sectionRegex = /##\s+(.+)\n([\s\S]*?)(?=\n##\s|$)/g;
    let match;
    while ((match = sectionRegex.exec(analysisText)) !== null) {
      sections[match[1].trim().toLowerCase()] = match[2].trim();
    }

    // ── 1. NOTA GERAL (0-10) ──
    const notaSection = sections['nota geral da ração'] || sections['nota geral do alimento'] || sections['nota geral'] || '';
    const notaMatch = notaSection.match(/NOTA:\s*(\d+[\.,]?\d*)\s*\/\s*10/i) 
      || notaSection.match(/(\d+[\.,]?\d*)\s*\/\s*10/i)
      || analysisText.match(/NOTA:\s*(\d+[\.,]?\d*)\s*\/\s*10/i)
      || analysisText.match(/(\d+[\.,]?\d*)\s*\/\s*10/i);
    let nota = notaMatch ? parseFloat(notaMatch[1].replace(',', '.')) : null;
    let notaResumo = limpar(notaSection.replace(/NOTA:\s*\d+[\.,]?\d*\s*\/\s*10/i, '').replace(/^\s*[-–—]\s*/gm, '').trim().split('\n')[0] || '');

    // ── 2. CLASSIFICAÇÃO COMERCIAL ──
    const classSection = sections['classificação comercial'] || sections['classificação'] || '';
    let classificacao = 'standard';
    const classLower = (classSection + ' ' + analysisText.slice(0, 500)).toLowerCase();
    if (classLower.includes('super premium') || classLower.includes('superpremium')) {
      classificacao = 'super-premium';
    } else if (classLower.includes('premium')) {
      classificacao = 'premium';
    } else if (classLower.includes('econômica') || classLower.includes('economica')) {
      classificacao = 'economica';
    }
    const classificacaoTexto = limpar(classSection.slice(0, 500)) || 'Classificação técnica baseada no perfil nutricional e ingredientes.';

    // Se nota não veio no padrão exato, estima com base na classificação
    if (nota === null || isNaN(nota)) {
      nota = classificacao === 'super-premium' ? 8.5 : (classificacao === 'premium' ? 7.0 : 6.0);
    }
    if (!notaResumo) {
      notaResumo = 'Avaliação nutricional baseada na composição e parâmetros oficiais do alimento.';
    }

    // ── 3. SEMÁFORO ──
    const semaforoSection = sections['semáforo de qualidade'] || sections['semáforo'] || sections['semaforo'] || '';
    let semaforoCor = 'amarelo';
    const semaforoLower = (semaforoSection + ' ' + analysisText.slice(0, 600)).toLowerCase();
    if (semaforoLower.includes('🟢') || semaforoLower.includes('verde')) {
      semaforoCor = 'verde';
    } else if (semaforoLower.includes('🔴') || semaforoLower.includes('vermelho')) {
      semaforoCor = 'vermelho';
    }
    let semaforoDesc = limpar(semaforoSection
      .replace(/🟢|🟡|🔴/g, '')
      .replace(/VERDE|AMARELO|VERMELHO/gi, '')
      .replace(/^\s*[\(\)]*\s*/gm, '')
      .trim()
      .slice(0, 400));

    if (!semaforoDesc) {
      semaforoDesc = semaforoCor === 'verde'
        ? 'Os teores de garantia e os ingredientes principais atendem aos parâmetros esperados para a espécie.'
        : 'A fórmula possui ingredientes que exigem atenção quanto ao valor biológico ou presença de aditivos.';
    }

    // ── 4. RAIO-X DOS INGREDIENTES ──
    const raioxSection = sections['raio-x dos ingredientes'] || sections['raio-x'] || sections['raio x dos ingredientes'] || '';
    const ingredientLines = raioxSection.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || l.trim().startsWith('•'));
    const ingredientesAnalisados = ingredientLines.map(line => {
      const clean = line.replace(/^[\s\-*•]+/, '').trim();
      let status = 'neutro';
      if (clean.includes('✅') || /\bPOSITIVO\b/i.test(clean)) status = 'positivo';
      else if (clean.includes('🚫') || /\bEVIT[ÁA]VEL\b/i.test(clean)) status = 'negativo';
      else if (clean.includes('⚠️') || /\bATEN[ÇC][ÃA]O\b/i.test(clean)) status = 'atencao';
      const text = clean.replace(/[✅⚠️🚫]/g, '').replace(/\b(POSITIVO|ATENÇÃO|ATENÇÃO|EVITÁVEL)\b/gi, '').trim();
      const parts = text.split(/[:–—]\s*/);
      return {
        nome: limpar(parts[0] || text),
        status,
        explicacao: limpar(parts.slice(1).join(': ').trim() || '')
      };
    }).filter(i => i.nome.length > 1);

    // Fallback caso ingredientes não venham na seção específica
    if (ingredientesAnalisados.length === 0) {
      const anyBullets = analysisText.split('\n').filter(l => /^[-*•]\s+[^:\n]+:/.test(l.trim()));
      anyBullets.slice(0, 8).forEach(line => {
        const clean = line.replace(/^[\s\-*•]+/, '').trim();
        let status = 'neutro';
        if (clean.includes('✅') || /\bPOSITIVO\b/i.test(clean)) status = 'positivo';
        else if (clean.includes('🚫') || /\bEVIT[ÁA]VEL\b/i.test(clean)) status = 'negativo';
        else if (clean.includes('⚠️') || /\bATEN[ÇC][ÃA]O\b/i.test(clean)) status = 'atencao';
        const text = clean.replace(/[✅⚠️🚫]/g, '').replace(/\b(POSITIVO|ATENÇÃO|EVITÁVEL)\b/gi, '').trim();
        const parts = text.split(/[:–—]\s*/);
        if (parts[0] && parts[0].length > 1) {
          ingredientesAnalisados.push({
            nome: limpar(parts[0]),
            status,
            explicacao: limpar(parts.slice(1).join(': ').trim() || '')
          });
        }
      });
    }

    // ── 5. NÍVEIS DE GARANTIA ──
    const niveisSection = sections['níveis de garantia — decodificados'] || sections['níveis de garantia - decodificados'] || sections['níveis de garantia'] || '';
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
    const qualProtSection = limpar(sections['qualidade da proteína'] || sections['qualidade da proteina'] || sections['fonte proteica'] || '') 
      || 'A fonte proteica foi decodificada com base nas matérias-primas e níveis de garantia da composição.';

    // ── 7. OBSERVAR NO PET ──
    const obsSection = limpar(sections['o que observar no seu pet (30 dias)'] || sections['o que observar no seu pet'] || '');
    let obsTipo = 'normal';
    if (observation === 'grave') obsTipo = 'urgente';
    else if (observation === 'leve') obsTipo = 'atencao';

    // ── 8. VEREDITO DE CUSTO-BENEFÍCIO ──
    const veredictSection = limpar(sections['veredito de custo-benefício'] || sections['veredito de custo-beneficio'] || sections['veredito'] || sections['veredito custo-benefício'] || '')
      || 'Produto analisado em relação à densidade de nutrientes e custo-benefício frente aos requisitos zootécnicos.';

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
      resultado.oQueORotuloDiz.primeiroIngrediente.explicacao = `Fonte de proteína identificada no laudo do sistema: ${ingredientePrincipal}.`;

      // Injetar explicações clínicas personalizadas da IA nos níveis de garantia
      const niveisLines = niveisSection.split('\n').map(l => l.trim()).filter(Boolean);
      const lineProt = niveisLines.find(l => /^[-*•]?\s*prote[ií]na/i.test(l));
      const lineGord = niveisLines.find(l => /^[-*•]?\s*(?:extrato\s*et[ée]reo|gordura)/i.test(l));
      const lineCinz = niveisLines.find(l => /^[-*•]?\s*(?:mat[ée]ria\s*mineral|cinzas)/i.test(l));
      const lineEnn = niveisLines.find(l => /(?:extrato\s*n[aã]o\s*nitrogenado|enn|carboidratos?)/i.test(l));
      const lineCap = niveisLines.find(l => /(?:c[áa]lcio\s*:\s*f[óo]sforo|ca\s*:\s*p)/i.test(l));

      if (lineProt) {
        const explProt = lineProt.replace(/^[-*•]\s*/, '').replace(/^[^—–:]+[—–:]\s*/, '').trim();
        if (explProt.length > 8) resultado.oQueORotuloDiz.proteina.explicacao = limpar(explProt);
      }
      if (lineGord) {
        const explGord = lineGord.replace(/^[-*•]\s*/, '').replace(/^[^—–:]+[—–:]\s*/, '').trim();
        if (explGord.length > 8) resultado.oQueORotuloDiz.gordura.explicacao = limpar(explGord);
      }
      if (lineCinz) {
        const explCinz = lineCinz.replace(/^[-*•]\s*/, '').replace(/^[^—–:]+[—–:]\s*/, '').trim();
        if (explCinz.length > 8) resultado.oQueORotuloDiz.cinzas.explicacao = limpar(explCinz);
      }

      const analiseLower = analysisText.toLowerCase();
      const semCorantes = analiseLower.includes('ausência de corantes') || 
                          analiseLower.includes('sem corantes') || 
                          analiseLower.includes('livre de corantes');
      
      let aditivosTexto = '';
      if (lineEnn) {
        aditivosTexto += `${limpar(lineEnn.replace(/^[-*•]\s*/, ''))}. `;
      }
      if (lineCap) {
        aditivosTexto += `${limpar(lineCap.replace(/^[-*•]\s*/, ''))}. `;
      }
      if (semCorantes) {
        resultado.oQueORotuloDiz.aditivos.contemCorantes = false;
        aditivosTexto += 'Ausência de corantes sintéticos confirmada pelo laudo pericial do sistema.';
      } else {
        aditivosTexto += 'Presença de aditivos e conservantes detalhada no Raio-X dos ingredientes.';
      }
      if (aditivosTexto.trim()) {
        resultado.oQueORotuloDiz.aditivos.explicacao = aditivosTexto.trim();
      }
    }

    // Preservar a análise completa em markdown para uso futuro
    resultado._rawAnalysis = analysisText;

    return resultado;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Coleta dados biológicos do pet
    const species = document.querySelector('input[name="species"]:checked')?.value || "cao";
    const size = document.querySelector('input[name="size"]:checked')?.value || "medio";
    const age = document.querySelector('input[name="age"]:checked')?.value || "adulto";
    const observation = document.querySelector('input[name="observation"]:checked')?.value || "normais";

    // ── FLUXO A: MODO COMPARADOR (TIRA-TEIMA DE 2 RAÇÕES) ──
    if (currentMode === 'compare') {
      if (!fileAtual || !fileNova) {
        alert("Atenção: Para o Tira-Teima, envie a foto da Ração Atual E da Nova Ração.");
        stepCompareUpload.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      processingModal.style.display = "flex";
      const procTitle = document.getElementById("processingTitle");
      const procSub = document.getElementById("processingSub");
      if (procTitle) procTitle.textContent = "Comparando as duas embalagens...";
      if (procSub) procSub.textContent = "O sistema está cruzando a composição e os ingredientes das duas embalagens.";

      const steps = [
        document.getElementById("pstep1"),
        document.getElementById("pstep2"),
        document.getElementById("pstep3"),
        document.getElementById("pstep4")
      ];
      steps.forEach(s => {
        if (!s) return;
        s.classList.remove("active");
        s.innerHTML = `<span>○</span> ${s.textContent.replace(/^[✓○]\s*/, '')}`;
      });

      if (steps[0]) {
        steps[0].classList.add("active");
        steps[0].innerHTML = `<span>✓</span> Enviando fotos das duas rações...`;
      }

      setTimeout(() => {
        if (steps[1]) {
          steps[1].classList.add("active");
          steps[1].innerHTML = `<span>✓</span> Comparando fontes de carne e proteína...`;
        }
      }, 600);

      try {
        const response = await compararViaBackend(fileAtual, fileNova, species, size, age);

        if (steps[2]) {
          steps[2].classList.add("active");
          steps[2].innerHTML = `<span>✓</span> Verificando aditivos e rendimento no prato...`;
        }
        await new Promise(r => setTimeout(r, 400));

        if (steps[3]) {
          steps[3].classList.add("active");
          steps[3].innerHTML = `<span>✓</span> Gerando veredito da troca...`;
        }
        await new Promise(r => setTimeout(r, 300));

        processingModal.style.display = "none";
        renderizarComparativo(response.comparison);

      } catch (err) {
        processingModal.style.display = "none";
        console.error('[COMPARE ERROR]', err);
        alert(`Erro ao comparar rações: ${err.message}\n\nVerifique se as fotos estão nítidas e tente novamente.`);
      }
      return;
    }

    // ── FLUXO B: MODO INDIVIDUAL (1 RAÇÃO) ──
    if (!currentFile) {
      alert("Atenção: O upload da foto do rótulo é obrigatório.\n\nPor favor, tire uma foto do verso da embalagem com a câmera ou escolha da galeria.");
      dropzone.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

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
        alert(`Erro na análise do sistema: ${err.message}\n\nUsando análise local como alternativa.`);

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
  // 6B. FUNÇÃO UTILITÁRIA DE FORMATAÇÃO LIMPA & BLINDAGEM XSS
  // ==========================================
  function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatarTextoVisual(rawText) {
    if (!rawText) return '';
    // 0. Escapa caracteres perigosos antes de qualquer formatação (Anti-XSS)
    let text = escapeHTML(rawText);

    // 1. Elimina todos os asteriscos e formata apenas tags seguras
    text = text
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong>$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\*/g, '')
      .replace(/_{1,3}/g, '')
      .replace(/^#+\s*/gm, '')
      .replace(/^[-=_]{3,}\s*$/gm, '')
      .trim();

    // 2. Transforma cada linha em texto fluido, editorial e organizado
    const lines = text.split('\n');
    const htmlParts = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      const isBullet = /^[•\-–—*]\s*/.test(trimmed);
      const cleanLine = trimmed.replace(/^[•\-–—*]\s*/, '').trim();

      // Caso 1: Negrito com título: <strong>Título</strong>: Descrição
      const strongMatch = cleanLine.match(/^<strong>([^<]+)<\/strong>[:–—]?\s*(.*)$/i);
      if (strongMatch && strongMatch[2].trim()) {
        const title = strongMatch[1].replace(/[:–—\s]+$/, '').trim();
        const desc = strongMatch[2].trim();
        htmlParts.push(`
          <div class="ai-report-point">
            <span class="ai-point-marker"></span>
            <div class="ai-point-content">
              <strong class="ai-point-title">${title}:</strong>
              <span class="ai-point-text">${desc}</span>
            </div>
          </div>
        `);
        continue;
      }

      // Caso 2: Linha de tópico com hífen/marcador e dois-pontos: "- Título: Descrição"
      const colonIndex = cleanLine.indexOf(':');
      if (isBullet && colonIndex > 2 && colonIndex <= 50) {
        const title = cleanLine.substring(0, colonIndex).trim();
        const desc = cleanLine.substring(colonIndex + 1).trim();
        if (!/[.!?]/.test(title) && desc.length > 0) {
          htmlParts.push(`
            <div class="ai-report-point">
              <span class="ai-point-marker"></span>
              <div class="ai-point-content">
                <strong class="ai-point-title">${title}:</strong>
                <span class="ai-point-text">${desc}</span>
              </div>
            </div>
          `);
          continue;
        }
      }

      // Caso 3: Marcador comum de lista sem dois-pontos
      if (isBullet) {
        htmlParts.push(`
          <div class="ai-report-point">
            <span class="ai-point-marker"></span>
            <div class="ai-point-content">
              <span class="ai-point-text">${cleanLine}</span>
            </div>
          </div>
        `);
        continue;
      }

      // Caso 4: Parágrafo regular limpo e respirado
      htmlParts.push(`<p class="ai-report-paragraph">${cleanLine}</p>`);
    }

    return htmlParts.join('');
  }

  // ==========================================
  // 7. RENDERIZAÇÃO DO VEREDITO (v2 — Raio-X)
  // ==========================================
  function renderizarResultado(res) {
    // Configura o estado inicial do Paywall com base na assinatura mensal ativa
    const sub = getAssinaturaState();
    if (sub.active) {
      isLaudoDesbloqueado = true;
      if (premiumLockedWrapper) premiumLockedWrapper.classList.remove("is-locked");
      if (paywallCardIndividual) paywallCardIndividual.style.display = "none";
    } else if (!isLaudoDesbloqueado) {
      if (premiumLockedWrapper) premiumLockedWrapper.classList.add("is-locked");
      if (paywallCardIndividual) paywallCardIndividual.style.display = "block";
    }
    aplicarEstadoAssinatura();

    // 1. Nota Geral (se disponível da IA)
    const notaCard = document.getElementById("notaGeralCard");
    if (notaCard && res.notaGeral !== null && res.notaGeral !== undefined) {
      notaCard.style.display = "block";
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
        raioxList.classList.remove("show-all");
        const totalIng = res.ingredientesAnalisados.length;
        res.ingredientesAnalisados.forEach((ing, index) => {
          const item = document.createElement("div");
          const isHiddenMobile = index >= 4 ? "raiox-hidden-mobile" : "";
          item.className = `raiox-ingrediente-item ${ing.status} ${isHiddenMobile}`.trim();
          const iconSvgMap = {
            positivo: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            atencao: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            negativo: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
            neutro: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
          };
          item.innerHTML = `
            <span class="raiox-icon">${iconSvgMap[ing.status] || iconSvgMap.neutro}</span>
            <div class="raiox-info">
              <div class="raiox-info-top">
                <strong>${escapeHTML(ing.nome)}</strong>
                <span class="raiox-status-badge status-${ing.status}">${ing.status === 'positivo' ? 'Positivo' : (ing.status === 'atencao' ? 'Atenção' : (ing.status === 'negativo' ? 'Evitável' : 'Neutro'))}</span>
              </div>
              ${ing.explicacao ? `<span>${escapeHTML(ing.explicacao)}</span>` : ''}
            </div>
          `;
          raioxList.appendChild(item);
        });

        // Botão para expandir/recolher no celular caso tenha mais de 4 ingredientes
        const existingToggle = raioxContainer.querySelector(".btn-toggle-raiox");
        if (existingToggle) existingToggle.remove();

        if (totalIng > 4) {
          const btnToggle = document.createElement("button");
          btnToggle.type = "button";
          btnToggle.className = "btn-toggle-raiox";
          btnToggle.innerHTML = `
            <span>Ver todos os ${totalIng} ingredientes (+${totalIng - 4})</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
          `;
          btnToggle.addEventListener("click", () => {
            const isExpanded = raioxList.classList.toggle("show-all");
            if (isExpanded) {
              btnToggle.innerHTML = `
                <span>Recolher lista de ingredientes</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
              `;
            } else {
              btnToggle.innerHTML = `
                <span>Ver todos os ${totalIng} ingredientes (+${totalIng - 4})</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              `;
            }
          });
          raioxList.after(btnToggle);
        }
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
        <h4>${escapeHTML(sugestao.titulo)}</h4>
        <p>${escapeHTML(sugestao.texto)}</p>
      `;
      actionContainer.appendChild(card);
    });

    // 9. Declaração de Honestidade & Aviso Legal (se elemento existir)
    const honestyEl = document.getElementById("honestyText");
    if (honestyEl && res.declaracaoHonestidade) {
      honestyEl.textContent = res.declaracaoHonestidade;
    }

    // Ativa a primeira aba no celular (Veredito)
    ativarAbaMobile('resultMobileNav', 'tab-veredito', resultSection);

    // Exibir seção e scroll suave
    if (resultCompareSection) resultCompareSection.style.display = "none";
    resultSection.style.display = "block";
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ==========================================
  // 7B. RENDERIZAÇÃO DO TIRA-TEIMA (COMPARATIVO)
  // ==========================================
  function renderizarComparativo(text) {
    if (!text) return;

    // Extrair seções do markdown retornado pela IA
    const sections = {};
    const sectionRegex = /##\s+(.+)\n([\s\S]*?)(?=\n##\s|$)/g;
    let match;
    while ((match = sectionRegex.exec(text)) !== null) {
      sections[match[1].trim().toLowerCase()] = match[2].trim();
    }

    // 1. Veredito da Troca
    const vereditoSection = sections['veredito da troca'] || '';
    const vereditoCard = document.getElementById("vereditoTrocaCard");
    const vereditoBadge = document.getElementById("vereditoTrocaBadge");
    const vereditoTexto = document.getElementById("vereditoTrocaTexto");

    let badgeText = "TROCA RECOMENDADA";
    let cardClass = "";

    const vLower = vereditoSection.toLowerCase();
    if (vLower.includes('não compensa') || vLower.includes('mantenha a atual') || vLower.includes('nao compensa')) {
      badgeText = "NÃO COMPENSA TROCAR";
      cardClass = "rejeitado";
    } else if (vLower.includes('equivalente')) {
      badgeText = "RAÇÕES EQUIVALENTES";
      cardClass = "alerta";
    }

    if (vereditoBadge) vereditoBadge.textContent = badgeText;
    if (vereditoCard) vereditoCard.className = `veredito-troca-card ${cardClass}`;
    if (vereditoTexto) {
      const cleanVeredito = vereditoSection
        .replace(/^(TROCA RECOMENDADA|NÃO COMPENSA TROCAR|EQUIVALENTES|VALE A PENA TROCAR|MANTENHA A ATUAL)[^\n]*\n?/i, '')
        .trim();
      vereditoTexto.textContent = limpar(cleanVeredito);
    }

    // 2. Ração Atual
    const atualSection = sections['ração atual'] || '';
    const nomeAtualMatch = atualSection.match(/(?:nome|marca)[^:]*:\s*(.+)/i);
    const notaAtualMatch = atualSection.match(/nota[^:]*:\s*(\d+[\.,]?\d*)/i);
    const catAtualMatch = atualSection.match(/categoria[^:]*:\s*(.+)/i);
    const forteAtualMatch = atualSection.match(/ponto\s+forte[^:]*:\s*(.+)/i);
    const fracoAtualMatch = atualSection.match(/ponto\s+(?:fraco|de\s+aten[çc][ãa]o|cr[íi]tico)[^:]*:\s*(.+)/i) || atualSection.match(/aten[çc][ãa]o[^:]*:\s*(.+)/i);

    const elNomeAtual = document.getElementById("nomeRacaoAtual");
    if (elNomeAtual) elNomeAtual.textContent = limpar(nomeAtualMatch?.[1] || "Ração Atual");

    const elScoreAtual = document.getElementById("scoreRacaoAtual");
    if (elScoreAtual) elScoreAtual.textContent = notaAtualMatch ? `${notaAtualMatch[1]}/10` : "--/10";

    const elCatAtual = document.getElementById("categoriaRacaoAtual");
    if (elCatAtual) elCatAtual.textContent = limpar(catAtualMatch?.[1] || "Categoria Comercial");

    const elForteAtual = document.getElementById("forteRacaoAtual");
    if (elForteAtual) elForteAtual.textContent = limpar(forteAtualMatch?.[1] || "Composição padrão de mercado");

    const elFracoAtual = document.getElementById("fracoRacaoAtual");
    if (elFracoAtual) elFracoAtual.textContent = limpar(fracoAtualMatch?.[1] || "Sem grandes pontos críticos");

    // 3. Nova Ração
    const novaSection = sections['nova ração'] || '';
    const nomeNovaMatch = novaSection.match(/(?:nome|marca)[^:]*:\s*(.+)/i);
    const notaNovaMatch = novaSection.match(/nota[^:]*:\s*(\d+[\.,]?\d*)/i);
    const catNovaMatch = novaSection.match(/categoria[^:]*:\s*(.+)/i);
    const forteNovaMatch = novaSection.match(/ponto\s+forte[^:]*:\s*(.+)/i);
    const fracoNovaMatch = novaSection.match(/ponto\s+(?:fraco|de\s+aten[çc][ãa]o|cr[íi]tico)[^:]*:\s*(.+)/i) || novaSection.match(/aten[çc][ãa]o[^:]*:\s*(.+)/i);

    const elNomeNova = document.getElementById("nomeRacaoNova");
    if (elNomeNova) elNomeNova.textContent = limpar(nomeNovaMatch?.[1] || "Nova Ração");

    const elScoreNova = document.getElementById("scoreRacaoNova");
    if (elScoreNova) elScoreNova.textContent = notaNovaMatch ? `${notaNovaMatch[1]}/10` : "--/10";

    const elCatNova = document.getElementById("categoriaRacaoNova");
    if (elCatNova) elCatNova.textContent = limpar(catNovaMatch?.[1] || "Categoria Comercial");

    const elForteNova = document.getElementById("forteRacaoNova");
    if (elForteNova) elForteNova.textContent = limpar(forteNovaMatch?.[1] || "Composição balanceada");

    const elFracoNova = document.getElementById("fracoRacaoNova");
    if (elFracoNova) elFracoNova.textContent = limpar(fracoNovaMatch?.[1] || "Sem grandes pontos críticos");

    // Destaque visual para o card vencedor
    const notaAtual = notaAtualMatch ? parseFloat(notaAtualMatch[1].replace(',', '.')) : 0;
    const notaNova = notaNovaMatch ? parseFloat(notaNovaMatch[1].replace(',', '.')) : 0;
    const cardAtual = document.getElementById("cardRacaoAtual");
    const cardNova = document.getElementById("cardRacaoNova");

    if (cardAtual && cardNova) {
      if (notaNova > notaAtual) {
        cardNova.className = "compare-racao-card card-vencedor";
        cardAtual.className = "compare-racao-card";
      } else if (notaAtual > notaNova) {
        cardAtual.className = "compare-racao-card card-vencedor";
        cardNova.className = "compare-racao-card";
      } else {
        cardAtual.className = "compare-racao-card";
        cardNova.className = "compare-racao-card";
      }
    }

    // 4. Comparativo Lado a Lado
    const breakdownSection = sections['comparativo lado a lado'] || sections['comparativo direto'] || '';
    const breakdownEl = document.getElementById("compareBreakdownText");
    if (breakdownEl) {
      breakdownEl.innerHTML = formatarTextoVisual(breakdownSection);
    }

    // 5. Dica de Ouro
    const dicaSection = sections['dica de ouro para o tutor'] || sections['dica de ouro'] || '';
    const dicaEl = document.getElementById("compareDicaTexto");
    if (dicaEl && dicaSection) {
      dicaEl.textContent = limpar(dicaSection);
    }

    // Ativa a primeira aba no comparativo celular (Vencedor)
    ativarAbaMobile('compareMobileNav', 'tab-comp-vencedor', resultCompareSection);

    // Exibir seção e scroll suave
    resultSection.style.display = "none";
    if (resultCompareSection) {
      resultCompareSection.style.display = "block";
      resultCompareSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ==========================================
  // 7C. CONTROLES DO MODAL DE PAGAMENTO (MERCADO PAGO)
  // ==========================================
  let activePaymentPolling = null;
  let currentPaymentId = null;

  const btnDesbloquearIndividual = document.getElementById("btnDesbloquearIndividual");

  const pixModalOverlay = document.getElementById("pixModalOverlay");
  const btnFecharPix = document.getElementById("btnFecharPix");
  const pixQrImg = document.getElementById("pixQrImg");
  const pixQrPlaceholder = document.getElementById("pixQrPlaceholder");
  const pixCodeInput = document.getElementById("pixCodeInput");
  const btnCopiarPix = document.getElementById("btnCopiarPix");
  const btnCopiarPixText = document.getElementById("btnCopiarPixText");
  const pixStatusText = document.getElementById("pixStatusText");
  const pixDemoNotice = document.getElementById("pixDemoNotice");
  const btnSimularPixAprovado = document.getElementById("btnSimularPixAprovado");

  // Abas de Pagamento (Cartão Automático vs Pix)
  const tabPayPix = document.getElementById("tabPayPix");
  const tabPayCard = document.getElementById("tabPayCard");
  const viewPayPix = document.getElementById("viewPayPix");
  const viewPayCard = document.getElementById("viewPayCard");
  const btnIniciarCheckoutCartao = document.getElementById("btnIniciarCheckoutCartao");

  // Alternância entre as abas Cartão e Pix
  tabPayPix?.addEventListener("click", () => {
    tabPayPix.classList.add("active");
    tabPayCard?.classList.remove("active");
    if (viewPayPix) viewPayPix.style.display = "block";
    if (viewPayCard) viewPayCard.style.display = "none";
    gerarChavePixModal('individual');
  });

  tabPayCard?.addEventListener("click", () => {
    tabPayCard.classList.add("active");
    tabPayPix?.classList.remove("active");
    if (viewPayCard) viewPayCard.style.display = "flex";
    if (viewPayPix) viewPayPix.style.display = "none";
  });

  // Checkout Seguro com Cartão de Crédito e Débito (PCI-DSS Mercado Pago)
  btnIniciarCheckoutCartao?.addEventListener("click", async () => {
    try {
      btnIniciarCheckoutCartao.disabled = true;
      btnIniciarCheckoutCartao.innerHTML = `
        <div class="spinner-small" style="width:16px;height:16px;border-width:2px;border-top-color:#ffffff;"></div>
        <span>Conectando com Mercado Pago...</span>
      `;

      const backendUrl = await resolveBackendUrl();
      const resp = await fetch(`${backendUrl}/api/payment/create-card-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'subscription' })
      });

      if (!resp.ok) {
        throw new Error("Falha ao gerar checkout de cartão.");
      }

      const data = await resp.json();
      const initPoint = data.checkout?.init_point || data.checkout?.sandbox_init_point;

      if (initPoint) {
        // Redireciona com segurança total para o ambiente blindado do Mercado Pago
        window.location.href = initPoint;
      } else {
        throw new Error("Link de pagamento não retornado.");
      }
    } catch (err) {
      console.error("[CARD CHECKOUT ERROR]", err);
      alert("Não foi possível iniciar o pagamento com cartão. Tente via Pix ou recarregue a página.");
      btnIniciarCheckoutCartao.disabled = false;
      btnIniciarCheckoutCartao.innerHTML = `
        <span>Ativar Assinatura com Cartão (R$ 12,90/mês)</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
      `;
    }
  });

  function abrirModalAssinatura() {
    if (!pixModalOverlay) return;

    // Cartão é a aba padrão (cobrança mensal automática)
    if (tabPayCard) tabPayCard.classList.add("active");
    if (tabPayPix) tabPayPix.classList.remove("active");
    if (viewPayCard) viewPayCard.style.display = "flex";
    if (viewPayPix) viewPayPix.style.display = "none";

    pixModalOverlay.style.display = "flex";
  }

  async function gerarChavePixModal(tipo = 'individual') {
    if (pixQrPlaceholder) {
      pixQrPlaceholder.style.display = "flex";
      pixQrPlaceholder.innerHTML = '<div class="spinner-small"></div><span>Gerando chave Pix no Mercado Pago...</span>';
    }
    if (pixQrImg) pixQrImg.style.display = "none";
    if (pixCodeInput) pixCodeInput.value = "Gerando código...";
    if (pixStatusText) pixStatusText.textContent = "Aguardando pagamento... A tela destravará automaticamente.";
    if (pixDemoNotice) pixDemoNotice.style.display = "none";

    try {
      const backendUrl = await resolveBackendUrl();
      const resp = await fetch(`${backendUrl}/api/payment/create-pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tipo })
      });

      if (!resp.ok) {
        throw new Error("Não foi possível gerar a cobrança Pix.");
      }

      const data = await resp.json();
      const p = data.payment;
      currentPaymentId = p.id;

      // Exibe QR Code se disponível em base64
      if (p.qr_code_base64 && pixQrImg) {
        pixQrImg.src = `data:image/png;base64,${p.qr_code_base64}`;
        pixQrImg.style.display = "block";
        if (pixQrPlaceholder) pixQrPlaceholder.style.display = "none";
      } else if (pixQrPlaceholder) {
        // Fallback elegante
        pixQrPlaceholder.innerHTML = `
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/></svg>
          <span style="font-size:0.75rem; color:#047857; font-weight:700;">Pix Copia e Cola</span>
        `;
      }

      if (pixCodeInput) {
        pixCodeInput.value = p.qr_code;
      }

      // Se estiver em modo demonstração, oferece botão de aprovação imediata
      if (p.isDemo && pixDemoNotice) {
        pixDemoNotice.style.display = "flex";
      }

      // Inicia polling para verificar aprovação automática a cada 2.5s
      iniciarPollingPagamento(p.id);

    } catch (err) {
      console.error("[PIX ERROR]", err);
      if (pixQrPlaceholder) {
        pixQrPlaceholder.innerHTML = `<span style="color:#ef4444; font-size:0.85rem;">Erro ao gerar Pix. Tente novamente.</span>`;
      }
    }
  }

  function iniciarPollingPagamento(paymentId) {
    if (activePaymentPolling) clearInterval(activePaymentPolling);

    activePaymentPolling = setInterval(async () => {
      try {
        const backendUrl = await resolveBackendUrl();
        const resp = await fetch(`${backendUrl}/api/payment/status/${paymentId}`);
        if (!resp.ok) return;

        const data = await resp.json();
        if (data.status === "approved") {
          desbloquearSucesso();
        }
      } catch (err) {
        console.warn("[POLLING ERROR]", err.message);
      }
    }, 2500);
  }

  function desbloquearSucesso() {
    if (activePaymentPolling) {
      clearInterval(activePaymentPolling);
      activePaymentPolling = null;
    }

    ativarAssinatura(30, 'pix', false);

    if (pixStatusText) {
      pixStatusText.innerHTML = `<strong style="color:#16a34a;">✓ Pagamento Aprovado! 30 Dias de Acesso Ilimitado Liberados!</strong>`;
    }

    setTimeout(() => {
      fecharModalPix();
      aplicarEstadoAssinatura();

      // Rola suavemente até o Raio-X agora desbloqueado
      const raioxEl = document.getElementById("raioxIngredientesContainer");
      if (raioxEl) {
        raioxEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 900);
  }

  function fecharModalPix() {
    if (activePaymentPolling) {
      clearInterval(activePaymentPolling);
      activePaymentPolling = null;
    }
    if (pixModalOverlay) {
      pixModalOverlay.style.display = "none";
    }
  }

  // Eventos de clique
  btnDesbloquearIndividual?.addEventListener("click", () => {
    abrirModalAssinatura();
  });

  btnFecharPix?.addEventListener("click", fecharModalPix);

  pixModalOverlay?.addEventListener("click", (e) => {
    if (e.target === pixModalOverlay) fecharModalPix();
  });

  btnCopiarPix?.addEventListener("click", async () => {
    if (!pixCodeInput || !pixCodeInput.value) return;
    try {
      await navigator.clipboard.writeText(pixCodeInput.value);
      if (btnCopiarPixText) {
        btnCopiarPixText.textContent = "✓ Copiado!";
        setTimeout(() => {
          btnCopiarPixText.textContent = "Copiar Código Pix";
        }, 2500);
      }
    } catch {
      pixCodeInput.select();
      document.execCommand("copy");
      if (btnCopiarPixText) btnCopiarPixText.textContent = "✓ Copiado!";
    }
  });

  btnSimularPixAprovado?.addEventListener("click", async () => {
    try {
      const backendUrl = await resolveBackendUrl();
      await fetch(`${backendUrl}/api/payment/simulate-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentPaymentId })
      });
      desbloquearSucesso();
    } catch {
      desbloquearSucesso();
    }
  });

  // ==========================================
  // 8. BOTÕES AUXILIARES
  // ==========================================
  btnNovaAnalise?.addEventListener("click", () => {
    resultSection.style.display = "none";
    if (resultCompareSection) resultCompareSection.style.display = "none";
    heroSection.scrollIntoView({ behavior: "smooth" });
  });

  btnNovaComparacao?.addEventListener("click", () => {
    if (resultCompareSection) resultCompareSection.style.display = "none";
    resultSection.style.display = "none";
    heroSection.scrollIntoView({ behavior: "smooth" });
  });

  btnPrintReport?.addEventListener("click", () => {
    window.print();
  });

  // ==========================================
  // 9. NAVEGAÇÃO POR ABAS NO CELULAR (REDUZ ROLAGEM)
  // ==========================================
  function ativarAbaMobile(navId, targetTab, containerEl) {
    const nav = document.getElementById(navId);
    if (nav) {
      const buttons = nav.querySelectorAll(".mobile-nav-btn");
      buttons.forEach(btn => {
        if (btn.dataset.targetTab === targetTab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    if (containerEl) {
      const tabItems = containerEl.querySelectorAll(".mobile-tab-item");
      tabItems.forEach(item => {
        const groups = (item.dataset.mobileGroup || "").split(/\s+/);
        if (groups.includes(targetTab)) {
          item.classList.add("mobile-group-active");
        } else {
          item.classList.remove("mobile-group-active");
        }
      });
    }
  }

  function initMobileTabs() {
    const navResult = document.getElementById("resultMobileNav");
    if (navResult) {
      navResult.addEventListener("click", (e) => {
        const btn = e.target.closest(".mobile-nav-btn");
        if (!btn) return;
        const targetTab = btn.dataset.targetTab;
        if (!targetTab) return;
        ativarAbaMobile("resultMobileNav", targetTab, resultSection);
        navResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }

    const navCompare = document.getElementById("compareMobileNav");
    if (navCompare) {
      navCompare.addEventListener("click", (e) => {
        const btn = e.target.closest(".mobile-nav-btn");
        if (!btn) return;
        const targetTab = btn.dataset.targetTab;
        if (!targetTab) return;
        ativarAbaMobile("compareMobileNav", targetTab, resultCompareSection);
        navCompare.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  initMobileTabs();
});
