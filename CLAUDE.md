# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Venza Assessoria CRM

Sistema de gerenciamento de clientes e campanhas de tráfego pago para uma agência de marketing digital.
React + Vite, **sem backend** — todo o estado é persistido em `localStorage`.

## Dev

```bash
npm run dev      # localhost:5173
npm run build    # build de produção (sempre verificar antes de commitar)
npm run lint     # ESLint
npm run preview  # serve o build gerado
```

Não há testes automatizados. Valide com `npm run build` após cada alteração.

## Stack

- React 19 + Vite 7
- `react-router-dom` v7 — roteamento SPA
- `@hello-pangea/dnd` — drag-and-drop Kanban
- `recharts` — gráficos no Dashboard/Métricas
- `lucide-react` — ícones (usar sempre este, não @phosphor-icons)
- `uuid` v4 — geração de IDs
- Meta Graph API v25.0 — anúncios, criativos, métricas

## Arquitetura geral

### Fluxo de dados principal

```
App.jsx  ←──── estado global: demandas[] + kanbanCards[]
   │                persistido em localStorage (DEMANDAS_KEY / KANBAN_KEY)
   ├── /portal/:clientId  →  PortalCliente  →  handleSubmitDemanda()
   ├── /demandas          →  Demandas       →  handleApproveDemanda() → cria KanbanCard
   └── /kanban            →  KanbanView     →  KanbanBoard → fireAutomation() ao mover card
```

`App.jsx` é o único lugar onde `demandas` e `kanbanCards` são armazenados e modificados. Todas as páginas recebem dados e handlers via props.

### Ciclo de vida de uma demanda

1. **Criação**: cliente envia pelo `/portal/:clientId` (flag `fromPortal: true`) **ou** agência cria em `/demandas` (flag `fromPortal: false`)
2. **Aprovação**: `handleApproveDemanda` em App.jsx — muda `status` para `'andamento'`, cria um `KanbanCard` com checklist automático baseado na plataforma (`CHECKLIST_META_ADS`, `CHECKLIST_GOOGLE_ADS`, ou `CHECKLIST_GENERICO`) e dispara `fireAutomation('demanda_aprovada', ...)`
3. **Execução**: card movido entre colunas no Kanban dispara `fireAutomation(destination.droppableId, ...)`

### Automações WhatsApp (Evolution API)

Arquivo central: `src/utils/automations.js`

- `fireAutomation(trigger, context)` — chamado em KanbanBoard (ao mover card) e em App.jsx (eventos de demanda)
- Triggers disponíveis: `demanda_recebida`, `demanda_interna`, `demanda_aprovada`, `saldo_baixo`, `pendente`, `andamento`, `aprovacao`, `concluido`
- Template variables: `{{cliente}}`, `{{card}}`, `{{projeto}}`, `{{coluna}}`, `{{saldo}}`, `{{limite}}`, `{{data}}`, `{{hora}}`
- A lista de triggers é a fonte da verdade em `TRIGGER_GROUPS` (exportado de `Automacoes.jsx`) — ao adicionar um trigger novo, adicionar em `TRIGGER_GROUPS`, `DEFAULT_MSG`, e chamar `fireAutomation` no ponto correto
- `seedAutomations()` garante um slot por trigger no localStorage ao inicializar

### Meta Ad Creator — fluxo de 5 tabs

`src/components/MetaAdCreator.jsx` — componente modal pesado:

| Tab | Conteúdo |
|-----|----------|
| 0 | BM + Conta + Página — carrega de `meta_defaults_${clientId}` ou `meta_defaults_proj_${projectId}` |
| 1 | Selecionar/criar Campanha |
| 2 | Selecionar/criar Conjunto de Anúncios — detecta `destination_type` para WhatsApp/Messenger/Instagram Direct |
| 3 | Mídias e textos — URL só obrigatória se `destination_type === 'WEBSITE'` |
| 4 | Publicação: upload paralelo (semáforo 3), deduplicação SHA-256, chunked upload ≥30MB, Batch API, retry em rate limit |

**Regra crítica**: `isMessagesDest` é calculado no render e reutilizado no publish. Nunca recalcular do zero na função de publicação.

`destination_type` MESSENGER/WHATSAPP/INSTAGRAM_DIRECT → omitir `link_url` e `degrees_of_freedom_spec` no criativo.

### Monitoramento de Saldo Meta Ads

`src/utils/metaBalance.js` — `checkAccountBalance(adAccountId, token)`:
- Consulta `funding_source_details.type` — apenas `type === 4` (FACEBOOK_PREPAY) é monitorável
- Contas com cartão de crédito são sinalizadas como não monitoráveis e não disparam alerta
- Saldo retornado em centavos → dividir por 100

## Clientes ativos (IDs fixos — não alterar)

```
client-1: INSTITUTO NTA    client-2: GRUPO TELLES      client-3: DR ROBERTO GASPAR
client-4: FABIO DE RICO    client-5: JOSI FARIAS        client-6: DASU KIDS
client-7: AKAZZO MODAS     client-8: ANNY E JESSIE
```

Definidos em `src/data/mockData.js`. A função `loadFromStorage` para `venza_clients` atualiza `name`/`avatarUrl` do seed, adiciona novos, mas **preserva projetos existentes** — nunca sobrescrever o array inteiro.

## Convenções de localStorage

| Chave | Conteúdo |
|---|---|
| `venza_auth` | `'true'` se autenticado |
| `venza_clients` | Lista de clientes (sobrepõe seed) |
| `venza_projects` | Lista de projetos e tarefas |
| `venza_demandas` | Array de demandas |
| `venza_kanban_cards` | Array de cards do Kanban |
| `meta_access_token` | Token Meta Graph API |
| `meta_defaults_${clientId}` | `{ bmId, adAccountId, pageId }` do cliente |
| `meta_defaults_proj_${projectId}` | Sobrepõe o do cliente para um projeto específico |
| `meta_uploaded_${adAccountId}` | Cache SHA-256 para deduplicação de uploads |
| `venza_evo_config` | `{ baseUrl, instance, apiKey }` Evolution API |
| `venza_evo_groups` | `{ [clientId]: { jid, name } }` grupos WhatsApp |
| `venza_automations_v2` | Array de regras de automação |
| `venza_meta_balance_alerts` | Array de configurações de alerta de saldo |

## Rota pública

`/portal/:clientId` é detectada **antes** da checagem de autenticação em `App.jsx` via `window.location.pathname`. Essa rota não exige login e é o canal pelo qual clientes enviam demandas.

## Kanban

Colunas definidas em `BOARD_COLUMNS` em `mockData.js`: `pendente → andamento → aprovacao → concluido`. O `id` de cada coluna é usado diretamente como trigger de automação — manter sincronizados.
