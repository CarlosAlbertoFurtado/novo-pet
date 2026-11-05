/**
 * Tradutor de Ração - Motor de Análise e Regras de Negócio da IA (analyzer.js)
 * 
 * Cumpre rigorosamente todas as regras do Item 4:
 * 1. NUNCA diagnostica doenças. NUNCA diz "esta ração está fazendo mal".
 * 2. Faz a tradução técnica dos níveis de garantia e 1º ingrediente.
 * 3. Integra a observação do tutor (pelo e fezes).
 * 4. Mantém honestidade: o rótulo sozinho não prevê o aproveitamento biológico real.
 * 5. Destaca o aviso legal obrigatório.
 */

class TradutorRacaoAnalyzer {
  constructor(speciesConfig = SPECIES_CONFIG) {
    this.config = speciesConfig;
  }

  /**
   * Analisa os dados do rótulo e perfil do pet
   * @param {Object} input
   * @param {string} input.species - "cao" ou "gato" (futuro: "aves", etc.)
   * @param {string} input.age - "filhote", "adulto" ou "idoso"
   * @param {string} input.size - "pequeno", "medio", "grande" (quando cão)
   * @param {string} input.observation - "normais", "pouco_opaco_fezes_moles", "muito_ruim_coceira"
   * @param {Object} input.labelData - Dados extraídos ou preenchidos do rótulo
   * @param {number} input.labelData.proteina - % Proteína Bruta
   * @param {number} input.labelData.gordura - % Extrato Etéreo / Gordura
   * @param {number} input.labelData.cinzas - % Matéria Mineral / Cinzas
   * @param {number} [input.labelData.fibra] - % Matéria Fibrosa
   * @param {string} [input.labelData.primeiroIngrediente] - Primeiro ingrediente da lista
   * @param {string} [input.labelData.ingredientesTexto] - Texto completo da composição
   * @returns {Object} Veredito completo
   */
  analisar(input) {
    const speciesKey = (input.species || "cao").toLowerCase();
    const speciesRules = this.config[speciesKey] || this.config.cao;
    const age = input.age || "adulto";
    const observation = input.observation || "normais";
    const labelData = input.labelData || {};

    // 1. Extração e sanitização dos valores
    const proteina = parseFloat(labelData.proteina) || 0;
    const gordura = parseFloat(labelData.gordura) || 0;
    const cinzas = parseFloat(labelData.cinzas) || 0;
    const fibra = parseFloat(labelData.fibra) || 0;
    const primeiroIngrediente = (labelData.primeiroIngrediente || "").trim().toLowerCase();
    const ingredientesTexto = (labelData.ingredientesTexto || "").toLowerCase();

    // 2. Avaliação da Proteína
    const proteinaRecomendadaObj = speciesRules.niveis_garantia.proteina[age] || speciesRules.niveis_garantia.proteina.adulto;
    const proteinaMinima = proteinaRecomendadaObj.min_recomendado;
    
    let proteinaStatus = "ideal"; // "ideal", "atencao", "baixo"
    let proteinaMensagem = "";

    if (proteina >= proteinaMinima) {
      proteinaStatus = "ideal";
      proteinaMensagem = `Essa ração possui ${proteina}% de proteína, nível considerado adequado para a espécie. Para um ${speciesRules.nome.toLowerCase()} ${age}, o parâmetro de referência é de no mínimo ${proteinaMinima}%. A proteína constitui a base muscular e imunológica da dieta pet, preservando massa magra e vigor diário.`;
    } else if (proteina >= proteinaMinima - 3) {
      proteinaStatus = "atencao";
      proteinaMensagem = `A proteína está em ${proteina}%, muito próxima do limite regulatório de ${proteinaMinima}%. Atende a animais de rotina calma, mas pode ser insuficiente para animais com alta demanda energética.`;
    } else {
      proteinaStatus = "baixo";
      proteinaMensagem = `Atenção aos níveis: apenas ${proteina}% de proteína, enquanto o patamar indicado para ${speciesRules.nome.toLowerCase()} ${age} é de pelo menos ${proteinaMinima}%. Indica formulação com baixa concentração de fontes proteicas.`;
    }

    // 3. Avaliação da Gordura (Extrato Etéreo)
    const gorduraMin = speciesRules.niveis_garantia.gordura.min;
    const gorduraMax = speciesRules.niveis_garantia.gordura.max;
    let gorduraStatus = "ideal";
    let gorduraMensagem = "";

    if (gordura >= gorduraMin && gordura <= gorduraMax) {
      gorduraStatus = "ideal";
      gorduraMensagem = `${gordura}% de gordura (extrato etéreo), dentro da faixa nutricional recomendada de ${gorduraMin}% a ${gorduraMax}%. Os lipídios fornecem ácidos graxos essenciais, auxiliam na absorção de vitaminas lipossolúveis e garantem a saúde da barreira cutânea.`;
    } else if (gordura < gorduraMin) {
      gorduraStatus = "atencao";
      gorduraMensagem = `Teor de ${gordura}% de gordura, abaixo do piso indicado de ${gorduraMin}%. Níveis reduzidos de gordura podem comprometer a densidade calórica e o brilho da pelagem.`;
    } else {
      gorduraStatus = "atencao";
      gorduraMensagem = `${gordura}% de gordura, acima da faixa habitual de ${gorduraMax}%. Requer cautela redobrada em animais castrados ou sedentários pelo risco de ganho de peso.`;
    }

    // 4. Avaliação das Cinzas (Matéria Mineral)
    // Regra: >10% é um alerta de baixa qualidade
    const cinzasAlerta = speciesRules.niveis_garantia.cinzas_max_alerta;
    let cinzasStatus = "ideal";
    let cinzasMensagem = "";

    if (cinzas > cinzasAlerta) {
      cinzasStatus = "alerta";
      cinzasMensagem = `[Atenção aos Rins] ${cinzas}% de matéria mineral (cinzas). Valores superiores a 10% frequentemente decorrem de alta proporção de carcaças e ossos moídos na receita para baratear a produção, sobrecarregando a filtração renal a longo prazo.`;
    } else if (cinzas >= 8.5) {
      cinzasStatus = "atencao";
      cinzasMensagem = `${cinzas}% de matéria mineral. Valor dentro do limite legal, porém limítrofe. Recomenda-se acompanhamento da densidade e estímulo à ingestão hídrica.`;
    } else {
      cinzasStatus = "ideal";
      cinzasMensagem = `${cinzas}% de matéria mineral, índice controlado e favorável. Indica processamento limpo com predomínio de tecidos cárneos de melhor digestibilidade.`;
    }

    // 5. Avaliação do 1º Ingrediente e Aditivos
    // Regra: Se o primeiro for "farinha de carne e ossos" ou "subprodutos", classifique como "qualidade inferior"
    let ingredienteClassificacao = "padrao";
    let ingredienteMensagem = "";
    let isInferior = false;
    let isNobre = false;

    const ingredientesInferiores = speciesRules.ingredientes_inferiores || [];
    const ingredientesNobres = speciesRules.ingredientes_nobres || [];

    for (const inf of ingredientesInferiores) {
      if (primeiroIngrediente.includes(inf) || ingredientesTexto.startsWith(inf)) {
        isInferior = true;
        break;
      }
    }

    if (!isInferior) {
      for (const nob of ingredientesNobres) {
        if (primeiroIngrediente.includes(nob)) {
          isNobre = true;
          break;
        }
      }
    }

    if (isInferior) {
      ingredienteClassificacao = "qualidade_inferior";
      ingredienteMensagem = `[Atenção aos Ingredientes] O ingrediente predominante declarado é "${labelData.primeiroIngrediente || 'Farinha de carne e ossos / Subprodutos'}". Pela legislação do MAPA, os ingredientes são listados em ordem decrescente de peso. O uso de subprodutos ou farinhas residuais como item principal indica baixa biodisponibilidade e menor absorção de nutrientes pelo organismo do animal.`;
    } else if (isNobre) {
      ingredienteClassificacao = "qualidade_nobre";
      ingredienteMensagem = `Ingrediente principal de padrão nobre: "${labelData.primeiroIngrediente}". A utilização de carne ou farinha de vísceras selecionadas como primeiro item assegura maior digestibilidade, melhor perfil de aminoácidos e menor volume fecal.`;
    } else if (primeiroIngrediente) {
      ingredienteClassificacao = "padrao";
      ingredienteMensagem = `Primeiro ingrediente declarado: "${labelData.primeiroIngrediente}". Certifique-se de que a fonte proteica animal antecede os derivados de cereais e grãos na lista oficial do verso da embalagem.`;
    } else {
      ingredienteClassificacao = "nao_identificado";
      ingredienteMensagem = "Primeiro ingrediente não informado. Recomenda-se conferir o topo da lista de composição básica no verso da embalagem para validar a presença de fontes de carne nobre antes de derivados vegetais.";
    }

    // Detecção adicional de corantes e conservantes (com filtro contra falsos positivos como "sem corantes")
    const temNegacaoCorantes = /sem\s+corante|livre\s+de\s+corante|zero\s+corante|n[aã]o\s+cont[eé]m\s+corante|aus[eê]ncia\s+de\s+corante/i.test(ingredientesTexto);
    const contemCorantes = !temNegacaoCorantes && (
      ingredientesTexto.includes("tartrazina") || 
      ingredientesTexto.includes("vermelho 40") || 
      ingredientesTexto.includes("amarelo") ||
      ingredientesTexto.includes("dióxido de titânio") ||
      (ingredientesTexto.includes("corante") && !temNegacaoCorantes)
    );
    const temNegacaoAntiox = /sem\s+(?:bha|bht)|livre\s+de\s+(?:bha|bht)|antioxidante\s+natural/i.test(ingredientesTexto);
    const contemBhaBht = !temNegacaoAntiox && (ingredientesTexto.includes("bha") || ingredientesTexto.includes("bht"));

    // 6. Cálculo do Semáforo de Qualidade do Rótulo
    // Pontuação de 0 a 100 baseada puramente nos critérios técnicos de rotulagem
    let pontos = 70;

    // Proteína
    if (proteinaStatus === "ideal") pontos += 15;
    else if (proteinaStatus === "baixo") pontos -= 25;

    // Gordura
    if (gorduraStatus === "ideal") pontos += 5;
    else pontos -= 5;

    // Cinzas
    if (cinzasStatus === "alerta") pontos -= 30; // >10% é critério severo
    else if (cinzasStatus === "ideal") pontos += 10;

    // Ingredientes
    if (ingredienteClassificacao === "qualidade_inferior") pontos -= 30;
    else if (ingredienteClassificacao === "qualidade_nobre") pontos += 15;

    // Corantes artificiais
    if (contemCorantes) pontos -= 10;

    // Determinação do Semáforo
    let semaforo = "verde"; // "verde", "amarelo", "vermelho"
    let semaforoTitulo = "";
    let semaforoDescricao = "";

    if (pontos >= 75 && cinzasStatus !== "alerta" && ingredienteClassificacao !== "qualidade_inferior") {
      semaforo = "verde";
      semaforoTitulo = "Rótulo com Parâmetros Nutricionais Favoráveis";
      semaforoDescricao = "Pelos índices declarados na embalagem, a formulação apresenta concentração adequada de proteína, teor equilibrado de lipídios e controle de cinzas. Atende aos requisitos da espécie, devendo ser validada pela resposta biológica do animal por 30 dias.";
    } else if (pontos >= 50 && cinzasStatus !== "alerta" && ingredienteClassificacao !== "qualidade_inferior") {
      semaforo = "amarelo";
      semaforoTitulo = "Rótulo com Pontos de Atenção Nutricional";
      semaforoDescricao = "A composição atende aos pisos regulatórios, porém apresenta índices limítrofes em proteína, gordura ou matéria mineral. Acompanhe a adaptação clínica do animal.";
    } else {
      semaforo = "vermelho";
      semaforoTitulo = "Alerta de Qualidade: Sinais Críticos no Rótulo";
      semaforoDescricao = "Identificados fatores desfavoráveis na rotulagem, como matéria mineral elevada (possível excesso de ossos moídos), baixa densidade proteica ou fontes residuais de subprodutos. Recomenda-se orientação veterinária.";
    }

    // 7. Integração da Pergunta de Observação do Tutor
    // Regra estrita: NÃO diagnosticar doença. NÃO dizer "esta ração está fazendo mal".
    let observacaoTitulo = "";
    let observacaoMensagem = "";
    let observacaoTipo = "info"; // "normal", "atencao", "urgente"

    if (observation === "normais") {
      observacaoTitulo = "Pelagem íntegra e fezes consistentes: resposta clínica favorável";
      observacaoMensagem = "A estabilidade na consistência das fezes e o brilho da pelagem constituem o indicador prático mais seguro de absorção nutricional. A observação clínica diária do animal é soberana em relação a qualquer dado de rótulo.";
      observacaoTipo = "normal";
    } else if (observation === "pouco_opaco_fezes_moles") {
      observacaoTitulo = "Sinais clínicos de alteração gastrointestinal ou dermatológica";
      observacaoMensagem = "Sua observação sobre fezes amolecidas ou pelagem opaca é um dado clínico relevante. A dieta pode ser um fator contribuinte, mas não o único (parasitoses, sensibilidades ou estresse devem ser avaliados). Consulte um médico-veterinário para diagnóstico preciso.";
      observacaoTipo = "atencao";
      // Se a observação do pet é de desconforto, nunca deixe o semáforo verde puro
      if (semaforo === "verde") {
        semaforo = "amarelo";
        semaforoTitulo = "Rótulo com bons índices, porém com sinais clínicos de atenção";
        semaforoDescricao = "Embora a ração apresente especificações aceitáveis no rótulo, a manifestação física do pet indica necessidade de avaliação veterinária presencial.";
      }
    } else if (observation === "muito_ruim_coceira") {
      observacaoTitulo = "Sintomatologia severa identificada: priorize atendimento veterinário";
      observacaoMensagem = "Prurido persistente, eritema cutâneo, perda acentuada de pelos ou episódios recorrentes de diarreia demandam consulta clínica imediata. A ração pode atuar como gatilho alérgeno, mas apenas o profissional veterinário pode fechar diagnóstico e indicar conduta segura.";
      observacaoTipo = "urgente";
      semaforo = "vermelho";
      semaforoTitulo = "Prioridade Clínica: Avaliação Veterinária Recomendada";
      semaforoDescricao = "O quadro sintomático sobrepõe-se à análise de rotulagem. Agende uma consulta veterinária como prioridade antes de qualquer alteração na dieta.";
    }

    // 8. Sugestões Práticas ("O que você pode fazer")
    const sugestoes = this.gerarSugestoes({
      species: speciesKey,
      age,
      semaforo,
      isInferior,
      cinzasAlerta: cinzasStatus === "alerta",
      observation,
      contemCorantes
    });

    // 9. Montagem do Veredito Estruturado
    return {
      avisoLegal: "Aviso Legal: Esta é uma análise informativa de rotulagem. Não substitui a consulta com um médico-veterinário. A resposta do seu pet à ração só pode ser avaliada observando o animal por pelo menos 30 dias.",
      declaracaoHonestidade: "Compromisso de Transparência Nutricional: Não é possível garantir a nutrição integral exclusivamente pelos dados do rótulo. A avaliação definitiva depende da resposta biológica do animal ao longo do tempo.",
      petInfo: {
        especie: speciesRules.nome,
        icone: speciesRules.icone,
        idade: age,
        porte: input.size || "Não especificado"
      },
      semaforo: {
        cor: semaforo, // "verde" | "amarelo" | "vermelho"
        titulo: semaforoTitulo,
        descricao: semaforoDescricao,
        score: Math.max(10, Math.min(100, pontos))
      },
      oQueORotuloDiz: {
        proteina: {
          valor: proteina > 0 ? `${proteina}%` : "Não detectado",
          status: proteinaStatus,
          explicacao: proteinaMensagem
        },
        gordura: {
          valor: gordura > 0 ? `${gordura}%` : "Não detectado",
          status: gorduraStatus,
          explicacao: gorduraMensagem
        },
        cinzas: {
          valor: cinzas > 0 ? `${cinzas}%` : "Não detectado",
          status: cinzasStatus,
          explicacao: cinzasMensagem
        },
        primeiroIngrediente: {
          valor: labelData.primeiroIngrediente || "Não informado",
          status: ingredienteClassificacao,
          explicacao: ingredienteMensagem
        },
        aditivos: {
          contemCorantes,
          contemBhaBht,
          explicacao: contemCorantes 
            ? "Presença de corantes artificiais identificada: Grãos com coloração artificial atendem unicamente a apelo visual comercial para o tutor, sem valor nutricional ao pet e com potencial de hipersensibilidade."
            : "Ausência de corantes artificiais declarados na amostragem."
        }
      },
      oQueObservarNoSeuPet: {
        tipo: observacaoTipo,
        titulo: observacaoTitulo,
        mensagem: observacaoMensagem,
        guiaObservacao30Dias: [
          "Consistência Fecal: Fezes cilíndricas, firmes, sem muco, sangue ou odor desproporcional.",
          "Qualidade da Pelagem: Brilho uniforme, redução de descamação e ausência de áreas alopécicas.",
          "Nível de Disposição: Manutenção de energia habitual para caminhadas e interações.",
          "Condição Corporal: Costelas palpáveis sem pressão excessiva e sem acúmulo adiposo visível."
        ]
      },
      oQueVocePodeFazer: sugestoes
    };
  }

  gerarSugestoes(ctx) {
    const lista = [];

    // Sugestão de custo-benefício
    if (ctx.semaforo === "vermelho" || ctx.isInferior) {
      lista.push({
        titulo: "Critérios de Seleção por Custo-Benefício",
        texto: "Priorize formulações das categorias Premium Especial ou Super Premium em que a carne ou farinha de vísceras conste como primeiro item da composição, evitando produtos com milho moído ou subprodutos no topo."
      });
    } else {
      lista.push({
        titulo: "Armazenamento Técnico para Preservação",
        texto: "Mantenha a ração em sua embalagem original hermeticamente fechada ou em recipiente com vedação de silicone. O contato com oxigênio e umidade degrada vitaminas e oxida ácidos graxos essenciais."
      });
    }

    // Sugestão sobre troca de ração (regra dos 7 dias)
    lista.push({
      titulo: "Protocolo Gradual de Transição Alimentar (7 Dias)",
      texto: "Evite substituições repentinas para prevenir distúrbios digestivos. Aplique a proporção: Dias 1-2 (75% ração habitual / 25% nova); Dias 3-4 (50% / 50%); Dias 5-6 (25% / 75%); Dia 7 (100% nova formulação)."
    });

    // Dica para corantes
    if (ctx.contemCorantes) {
      lista.push({
        titulo: "Prevenção Contra Aditivos e Corantes Sintéticos",
        texto: "Prefira linhas alimentares livres de corantes artificiais (Tartrazina, Vermelho 40). O animal se orienta pelo olfato, tornando corantes dispensáveis e potencialmente reativos."
      });
    }

    // Sugestão para espécie
    if (ctx.species === "gato") {
      lista.push({
        titulo: "Estímulo Hídrico e Saúde Urinária Felina",
        texto: "Felinos possuem fisiologia com baixa sensação espontânea de sede. Combine o fornecimento de ração seca com alimentos úmidos diários (sachês de alta qualidade) e bebedouros de água corrente para preservar a filtração renal."
      });
    } else {
      lista.push({
        titulo: "Adequação de Dosagem por Escore Corporal",
        texto: "Siga estritamente a tabela gramatical do fabricante de acordo com a meta de peso do animal. Alimentos de maior densidade nutricional demandam volumes menores por porção diária."
      });
    }

    // Consulta veterinária
    lista.push({
      titulo: "Validação com Médico-Veterinário",
      texto: "Apresente os parâmetros deste relatório na próxima consulta de rotina do seu animal para individualização do manejo dietético de acordo com o histórico clínico."
    });

    return lista;
  }

  /**
   * Utilitário para parsear texto de rótulo (ex: copiado, digitado ou de OCR)
   * @param {string} text - Texto do rótulo
   * @returns {Object} Dados extraídos
   */
  extrairDadosDeTexto(text) {
    if (!text) return {};
    const clean = text.toLowerCase().replace(/\s+/g, ' ');

    const extrairPorcento = (regex) => {
      const match = clean.match(regex);
      if (match && match[1]) {
        let val = match[1].replace(',', '.');
        return parseFloat(val);
      }
      return null;
    };

    // Proteína Bruta: "proteina bruta (min) 26%" ou "proteína 260g/kg"
    let proteina = extrairPorcento(/prote[íi]na(?:\s+bruta)?(?:\s*\(?m[íi]n\.?\)?|\s*m[íi]nimo)?\s*[:=]?\s*(\d+[.,]?\d*)\s*%/i);
    if (!proteina) {
      const gKg = clean.match(/prote[íi]na.*?(\d+)\s*g\/kg/i);
      if (gKg) proteina = parseFloat(gKg[1]) / 10;
    }

    // Gordura / Extrato Etéreo: "extrato etéreo (min) 14%"
    let gordura = extrairPorcento(/(?:extrato\s+et[ée]reo|gordura|lip[íi]dios)(?:\s*\(?m[íi]n\.?\)?|\s*m[íi]nimo)?\s*[:=]?\s*(\d+[.,]?\d*)\s*%/i);
    if (!gordura) {
      const gKg = clean.match(/(?:extrato\s+et[ée]reo|gordura).*?(\d+)\s*g\/kg/i);
      if (gKg) gordura = parseFloat(gKg[1]) / 10;
    }

    // Matéria Mineral / Cinzas: "matéria mineral (max) 8.5%"
    let cinzas = extrairPorcento(/(?:mat[ée]ria\s+mineral|cinzas)(?:\s*\(?m[áa]x\.?\)?|\s*m[áa]ximo)?\s*[:=]?\s*(\d+[.,]?\d*)\s*%/i);
    if (!cinzas) {
      const gKg = clean.match(/(?:mat[ée]ria\s+mineral|cinzas).*?(\d+)\s*g\/kg/i);
      if (gKg) cinzas = parseFloat(gKg[1]) / 10;
    }

    // Fibra
    let fibra = extrairPorcento(/(?:mat[ée]ria\s+fibrosa|fibra\s+bruta)(?:\s*\(?m[áa]x\.?\)?|\s*m[áa]ximo)?\s*[:=]?\s*(\d+[.,]?\d*)\s*%/i);

    // Primeiro ingrediente
    let primeiroIngrediente = "";
    const composicaoMatch = clean.match(/(?:composi[çc][ãa]o\s+b[áa]sica|ingredientes|ingredientes\s+principais)\s*[:=]?\s*([^\,\;\.]+)/i);
    if (composicaoMatch && composicaoMatch[1]) {
      primeiroIngrediente = composicaoMatch[1].trim();
    }

    return {
      proteina: proteina || 0,
      gordura: gordura || 0,
      cinzas: cinzas || 0,
      fibra: fibra || 0,
      primeiroIngrediente,
      ingredientesTexto: text
    };
  }
}

// Exemplos Prontos de Rótulos para o Tutor testar com 1 clique
const EXEMPLOS_ROTULOS = {
  super_premium_cao: {
    nome: "Ração Super Premium Cão Adulto (Exemplo Excelente)",
    species: "cao",
    size: "medio",
    age: "adulto",
    observation: "normais",
    rotulo: {
      proteina: 28,
      gordura: 16,
      cinzas: 7.0,
      fibra: 3.0,
      primeiroIngrediente: "Farinha de vísceras de aves e salmão fresco",
      ingredientesTexto: "Farinha de vísceras de aves, carne de salmão, arroz integral, polpa de beterraba, óleo de peixe refinado, tocoferóis naturais (extrato de alecrim), prebióticos MOS e FOS. Sem corantes artificiais."
    }
  },
  standard_carne_ossos_cao: {
    nome: "Ração Econômica Manutenção Cão (Exemplo Alerta Vermelho)",
    species: "cao",
    size: "medio",
    age: "adulto",
    observation: "pouco_opaco_fezes_moles",
    rotulo: {
      proteina: 18,
      gordura: 8,
      cinzas: 12.0,
      fibra: 4.8,
      primeiroIngrediente: "Farinha de carne e ossos de bovino",
      ingredientesTexto: "Farinha de carne e ossos de bovino, milho moído, farelo de trigo, quirera de arroz, gordura de frango, corante artificial vermelho 40 e tartrazina, antioxidantes BHA e BHT."
    }
  },
  premium_gato: {
    nome: "Ração Premium Especial Gato Castrado (Exemplo Equilibrado)",
    species: "gato",
    size: "pequeno",
    age: "adulto",
    observation: "normais",
    rotulo: {
      proteina: 34,
      gordura: 12,
      cinzas: 7.5,
      fibra: 3.5,
      primeiroIngrediente: "Farinha de vísceras de frango",
      ingredientesTexto: "Farinha de vísceras de frango, proteína isolada de suíno, quirera de arroz, óleo de salmão, taurina (0.15%), extrato de yucca, polpa de beterraba. Sem corantes artificiais."
    }
  },
  subprodutos_gato: {
    nome: "Ração Econômica Gato (Exemplo com Subprodutos)",
    species: "gato",
    size: "pequeno",
    age: "adulto",
    observation: "muito_ruim_coceira",
    rotulo: {
      proteina: 26,
      gordura: 9,
      cinzas: 11.5,
      fibra: 4.0,
      primeiroIngrediente: "Subprodutos de aves e farinha de ossos",
      ingredientesTexto: "Subprodutos de aves, farinha de carne e ossos, milho integral, glúten de milho, corante dióxido de titânio, antioxidante BHT."
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { TradutorRacaoAnalyzer, EXEMPLOS_ROTULOS };
}
