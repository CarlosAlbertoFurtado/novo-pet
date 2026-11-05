# 🥣 Tradutor de Ração - Documentação do Projeto

O **Tradutor de Ração** é uma plataforma desenvolvida para capacitar tutores de cães e gatos a compreenderem de forma clara, didática e imparcial a rotulagem nutricional dos alimentos para pets, eliminando o jargão técnico sem jamais substituir o papel soberano da medicina veterinária.

---

## 1. Escopo do MVP (Fase 1) & Conformidade dos Requisitos

| Requisito | Status | Implementação |
| :--- | :---: | :--- |
| **Espécies MVP** | Concluído | **Cão** e **Gato** (com seletores específicos e suporte a porte). |
| **Objetivo Não Clínico** | Concluído | Análise estritamente de rotulagem (níveis de garantia + 1º ingrediente), sem emitir diagnósticos patológicos. |
| **Aviso Legal em Destaque** | Concluído | Banner fixo dourado no topo: *"Esta é uma análise informativa de rotulagem. Não substitui a consulta com um médico-veterinário. A resposta do seu pet à ração só pode ser avaliada observando o animal por pelo menos 30 dias."* |
| **Landing Page** | Concluído | Título: *"Seu pet está comendo a ração certa? Descubra em 2 minutos."* com proposta de valor e presets de teste rápido com 1 clique. |
| **Upload da Foto** | Concluído | Drag-and-drop, câmera/arquivo, preview com efeito laser de scanner e validação obrigatória. |
| **Pergunta de Observação** | Concluído | *"Como está o pelo e as fezes do seu pet ultimamente?"* com 3 opções (Normais, Um pouco opaco / fezes moles, Muito ruim / coceira). |
| **Página de Resultado** | Concluído | Semáforo de Qualidade (Verde / Amarelo / Vermelho), "O que o rótulo diz", "O que observar no seu pet" e "O que você pode fazer". |
| **Estrutura Futura (Fase 2)** | Concluído | Arquivo separado `species_config.js` com suporte arquitetural a Aves, Coelhos e Répteis. |

---

## 2. Arquitetura Modular dos Arquivos

```
sistema pet/
├── species_config.js    # Base de conhecimento e limites nutricionais por espécie (Fase 1 e Fase 2)
├── analyzer.js          # Motor da IA e regras estritas de negócios (semáforo, observação do tutor)
├── index.html           # Landing page, formulário acessível e dashboard de resultado
├── style.css            # Design system refinado (Vanilla CSS), glassmorphism e responsividade
└── app.js               # Controlador de interface, scanner visual, presets e fluxo de interação
```

### 2.1. Arquivo de Configuração (`species_config.js`)
Isolado para facilitar a inclusão de novas espécies sem alterar a lógica visual:
- **Cão**: Proteína recomendada (`filhote > 28%`, `adulto > 22%`, `idoso > 24%`), gordura (`10% a 20%`), cinzas máximas (`10%`).
- **Gato**: Proteína recomendada (`filhote > 34%`, `adulto > 30%`, `idoso > 32%`), gordura (`15% a 25%`), cinzas máximas (`10%`), taurina obrigatória.
- **Aves / Coelhos / Répteis (Fase 2)**: Estruturas já tipadas e prontas para ativação.

### 2.2. Motor de Regras da IA (`analyzer.js`)
Implementa as 4 regras de ouro exigidas:
1. **NÃO diagnosticar:** Jamais afirma "esta ração está deixando seu pet doente".
2. **Tradução Técnica:** Proteína >22% (cão) / >30% (gato); Gordura 10-20% (cão) / 15-25% (gato); Cinzas >10% é alerta de baixa qualidade; se 1º ingrediente for "farinha de carne e ossos" ou "subprodutos", classifica como qualidade inferior.
3. **Integração com Observação do Tutor:**
   > *"Sua observação sobre o pelo/fezes é um sinal importante. Consulte um veterinário para descartar outras causas. A ração pode ser um fator, mas não é o único."*
4. **Honestidade Científica:**
   > *"Não é possível garantir que esta ração está nutrindo bem seu pet apenas pelo rótulo. O teste real é a observação do animal ao longo do tempo."*

---

## 3. Presets Embutidos para Demonstração Imediata

Tutores e avaliadores podem testar instantaneamente usando os 4 botões de teste rápido:
1. **🐶 Ração Super Premium (Cão):** Proteína 28%, Gordura 16%, Cinzas 7%, 1º Ingrediente: Salmão e frango → **Semáforo Verde**.
2. **⚠️ Ração Econômica (Cão Alerta):** Proteína 18%, Gordura 8%, Cinzas 12%, 1º Ingrediente: Farinha de carne e ossos → **Semáforo Vermelho/Amarelo**.
3. **🐱 Ração Premium (Gato Castrado):** Proteína 34%, Gordura 12%, Cinzas 7.5%, 1º Ingrediente: Farinha de vísceras → **Semáforo Verde**.
4. **🚨 Ração c/ Subprodutos (Gato):** Proteína 26%, Gordura 9%, Cinzas 11.5%, 1º Ingrediente: Subprodutos de aves → **Semáforo Vermelho**.

---

## 4. Como Executar Localmente

```powershell
# Opção 1: Servidor HTTP Python nativo
cd "c:\Users\junio\OneDrive\Área de Trabalho\sistema pet"
python -m http.server 3000

# Opção 2: Node.js (npx serve)
npx -y serve . -p 3000
```

Acesse em qualquer navegador: `http://localhost:3000`
