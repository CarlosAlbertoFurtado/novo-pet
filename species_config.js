/**
 * Tradutor de Ração - Configuração de Espécies (species_config.js)
 * 
 * Estrutura preparada para Fase 1 (Cão e Gato) e expansível para Fase 2
 * (Aves, Coelhos, Répteis) conforme item 3 dos requisitos.
 */

const SPECIES_CONFIG = {
  cao: {
    id: "cao",
    nome: "Cão",
    icone: "dog",
    ativoNoMvp: true,
    niveis_garantia: {
      proteina: {
        filhote: { min_recomendado: 28, ideal_str: "Ideal > 28%" },
        adulto: { min_recomendado: 22, ideal_str: "Ideal > 22%" },
        idoso: { min_recomendado: 24, ideal_str: "Ideal 24% a 28%" }
      },
      gordura: {
        min: 10,
        max: 20,
        ideal_str: "10% a 20%"
      },
      cinzas_max_alerta: 10, // Acima de 10% indica alta proporção de farinha de ossos moídos
      fibra_max_recomendada: 4.5,
      umidade_padrao_max: 12
    },
    ingredientes_inferiores: [
      "farinha de carne e ossos",
      "farinha de ossos",
      "subprodutos",
      "subproduto",
      "farinha de penas hidrolisada",
      "farinha de sangue",
      "glúten de milho 21",
      "farelo de soja",
      "casca de soja",
      "milho moído",
      "milho integral moído",
      "quirera de arroz"
    ],
    ingredientes_nobres: [
      "carne mecanicamente separada",
      "carne de frango",
      "carne fresca",
      "farinha de vísceras de frango",
      "farinha de vísceras de aves",
      "farinha de salmão",
      "salmão",
      "cordeiro",
      "carne bovina",
      "proteína hidrolisada de frango",
      "proteína isolada de suíno",
      "ovo integral desidratado",
      "ovo em pó",
      "óleo de peixe refinado"
    ],
    dicas_especificas: [
      "Cães de porte grande necessitam de controle calórico estrito e proporção adequada de Cálcio/Fósforo.",
      "Cães idosos se beneficiam de proteínas de alta digestibilidade e menor teor de gordura.",
      "Rações com tocoferóis naturais (vitamina E) e extrato de alecrim são preferíveis a BHA/BHT."
    ]
  },

  gato: {
    id: "gato",
    nome: "Gato",
    icone: "cat",
    ativoNoMvp: true,
    niveis_garantia: {
      proteina: {
        filhote: { min_recomendado: 34, ideal_str: "Ideal > 34%" },
        adulto: { min_recomendado: 30, ideal_str: "Ideal > 30%" },
        idoso: { min_recomendado: 32, ideal_str: "Ideal > 32%" }
      },
      gordura: {
        min: 12,
        max: 22,
        ideal_str: "12% a 22%"
      },
      cinzas_max_alerta: 8.5, // Em felinos, cinzas >8.5% representam risco elevado de urolitíase
      fibra_max_recomendada: 4.0,
      taurina_minima_recomendada: 0.1, // Nutriente vital obrigatório para felinos (prevenção de CMD e retinopatia)
      umidade_padrao_max: 12
    },
    ingredientes_inferiores: [
      "farinha de carne e ossos",
      "subprodutos",
      "subproduto",
      "farinha de penas",
      "farelo de glúten de milho 21",
      "farelo de soja",
      "milho integral moído",
      "quirera de arroz"
    ],
    ingredientes_nobres: [
      "farinha de vísceras de frango",
      "farinha de vísceras de aves",
      "carne de frango",
      "carne fresca",
      "salmão",
      "farinha de salmão",
      "carne de peru",
      "proteína isolada de suíno",
      "ovo em pó",
      "ovo integral desidratado",
      "proteína hidrolisada"
    ],
    dicas_especificas: [
      "Gatos são carnívoros estritos e dependem de proteína animal e taurina como nutrientes vitais.",
      "Cinzas altas (>10%) e excesso de minerais representam risco redobrado para o trato urinário felino.",
      "Mesmo com a melhor ração seca, incentive a ingestão de água e ração úmida (sachês)."
    ]
  },

  // ==========================================
  // ESTRUTURA PARA FUTURO (FASE 2)
  // Pronta para expansão
  // ==========================================
  aves: {
    id: "aves",
    nome: "Aves",
    icone: "bird",
    ativoNoMvp: false,
    fase: 2,
    mensagem_fase: "Suporte técnico completo para Aves na Fase 2.",
    niveis_garantia: {
      proteina: { adulto: { min_recomendado: 14, ideal_str: "14% a 18%" } },
      gordura: { min: 4, max: 8, ideal_str: "4% a 8%" },
      cinzas_max_alerta: 6
    }
  },

  coelhos: {
    id: "coelhos",
    nome: "Coelhos",
    icone: "rabbit",
    ativoNoMvp: false,
    fase: 2,
    mensagem_fase: "Suporte técnico completo para Coelhos na Fase 2.",
    niveis_garantia: {
      proteina: { adulto: { min_recomendado: 12, ideal_str: "12% a 16%" } },
      gordura: { min: 2, max: 4, ideal_str: "2% a 4%" },
      fibra_minima: 18, // Herbívoros necessitam de fibra bruta altíssima
      cinzas_max_alerta: 8
    }
  },

  repteis: {
    id: "repteis",
    nome: "Répteis",
    icone: "reptile",
    ativoNoMvp: false,
    fase: 2,
    mensagem_fase: "Suporte técnico completo para Répteis na Fase 2.",
    niveis_garantia: {
      proteina: { adulto: { min_recomendado: 35, ideal_str: "Variável por espécie" } },
      gordura: { min: 5, max: 15, ideal_str: "5% a 15%" },
      cinzas_max_alerta: 12
    }
  }
};

// Export para uso tanto em browser quanto em módulos Node (se necessário)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SPECIES_CONFIG };
}
