# Venza Assessoria CRM

## Visão geral
Sistema de gerenciamento de clientes e campanhas de tráfego pago.
React + Vite, sem backend — dados persistidos em `localStorage`.

## Stack
- React 18 + Vite
- Lucide React (ícones)
- uuid v4 (IDs)
- Meta Graph API v25.0

## Estrutura de arquivos chave
- `src/pages/Clientes.jsx` — workspace principal: projetos, tarefas, inbox de demandas
- `src/components/MetaAdCreator.jsx` — upload e criação de campanhas Meta Ads
- `src/components/ProjectTaskManager.jsx` — card de projeto com tarefas
- `src/data/mockData.js` — clientes, projetos e dados seed
- `src/pages/KanbanView.jsx` — visão kanban das demandas

## Clientes ativos (IDs fixos — não alterar)
client-1: INSTITUTO NTA | client-2: GRUPO TELLES | client-3: DR ROBERTO GASPAR
client-4: FABIO DE RICO | client-5: JOSI FARIAS | client-6: DASU KIDS
client-7: AKAZZO MODAS | client-8: ANNY E JESSIE

## Convenções de localStorage
| Chave | Conteúdo |
|---|---|
| `venza_clients` | Lista de clientes |
| `venza_projects` | Lista de projetos e tarefas |
| `meta_access_token` | Token Meta Graph API |
| `meta_defaults_${clientId}` | BM/conta/página padrão do cliente |
| `meta_defaults_proj_${projectId}` | BM/conta/página padrão do projeto (sobrepõe cliente) |
| `meta_uploaded_${adAccountId}` | Cache SHA-256 de uploads (deduplicação) |

## Meta Ad Creator — fluxo de publicação
1. Selecionar BM + Conta + Página (Tab 0) — carrega da localStorage pelo projeto/cliente
2. Selecionar/criar Campanha (Tab 1)
3. Selecionar/criar Conjunto de Anúncios (Tab 2) — detecta `destination_type` para WhatsApp
4. Configurar mídias e textos (Tab 3) — URL obrigatória apenas para WEBSITE
5. Publicação (Tab 4):
   - Upload paralelo com semáforo de 3 simultâneos
   - Deduplicação via SHA-256: reutiliza `video_id`/`image_hash` de uploads anteriores
   - Vídeos <30MB: upload direto (1 requisição); ≥30MB: chunked (start→transfer→finish)
   - Thumbnail gerada em paralelo com o upload do vídeo
   - Batch API: criativos e anúncios criados em 2 requisições (não N×2)
   - Retry automático em rate limit (erros 4, 17, 32, 80004): 15s→30s→60s→120s

## Regras importantes
- `destination_type` MESSENGER/WHATSAPP/INSTAGRAM_DIRECT → sem URL, sem `degrees_of_freedom_spec`
- `isMessagesDest` (render-time) é usado em TODOS os lugares — não recalcular do zero no publish
- `loadFromStorage` para CLIENTS_KEY: atualiza name/avatarUrl do seed, adiciona novos, preserva projetos
- Nunca usar `--no-verify` ou bypass de hooks git
- Não commitar `.env` ou tokens

## Dev
```bash
npm run dev    # inicia em localhost:5173
npm run build  # build de produção
```
