import { v4 as uuidv4 } from 'uuid';

export const BOARD_COLUMNS = [
  { id: 'pendente', title: 'Pendente' },
  { id: 'andamento', title: 'Em Andamento' },
  { id: 'aprovacao', title: 'Aguardando Aprovação' },
  { id: 'concluido', title: 'Concluído' },
];

export const CLIENTS = [
  { id: 'client-1', name: 'MIGUEL DO GRAU', avatarUrl: 'https://i.pravatar.cc/150?u=miguel' },
  { id: 'client-2', name: 'REI DA PREMIAÇÃO', avatarUrl: 'https://i.pravatar.cc/150?u=rei' },
  { id: 'client-3', name: 'PEDOKA', avatarUrl: 'https://i.pravatar.cc/150?u=pedoka' },
  { id: 'client-4', name: 'FIOTE DE SORTE', avatarUrl: 'https://i.pravatar.cc/150?u=fiote' },
  { id: 'client-5', name: 'GIRO DE PREMIOS', avatarUrl: 'https://i.pravatar.cc/150?u=giro' },
];

export const CHECKLIST_TEMPLATE = [
  { id: 'chk-1', text: 'Configurar campanha', completed: true },
  { id: 'chk-2', text: 'Aprovar copy', completed: true },
  { id: 'chk-3', text: 'Subir criativos', completed: true },
  { id: 'chk-4', text: 'Configurar WABA', completed: true },
  { id: 'chk-5', text: 'Testar links', completed: false },
  { id: 'chk-6', text: 'Aprovação final', completed: false },
  { id: 'chk-7', text: 'Início dos disparos', completed: false },
];

export const MOCK_CARDS = [
  {
    id: uuidv4(),
    title: 'MIGUEL DO GRAU 1103',
    time: '12:00',
    clientId: 'client-1',
    columnId: 'pendente',
    type: 'subir', // 'subir' ou 'revisar'
    wabas: [
      { id: uuidv4(), name: 'WABA 1', identity: 'GF I', numbers: ['866962272979220', '5521923671317'] }
    ],
    contactsList: '45416',
    tag: 'MIGUEL DO GRAU 1103',
    linkComplete: 'https://mgpremios.me/campanha/honda-sahara-0km',
    linkShort: 'https://loja.redirecionaja.com.br/0si67',
    checklist: CHECKLIST_TEMPLATE.map(item => ({ ...item })),
    messageLabel: 'Defina cliente para gerar disparo',
  },
  {
    id: uuidv4(),
    title: 'REI DA PREM 1103',
    time: '18:00',
    clientId: 'client-2',
    columnId: 'andamento',
    type: 'revisar',
    wabas: [
      { id: uuidv4(), name: 'WABA 1', identity: 'GF II', numbers: ['5513954754782'] }
    ],
    contactsList: '12400',
    tag: 'REI DA PREM 1103',
    linkComplete: 'https://reidapremiacao.me/campanha/iphone-15',
    linkShort: 'https://loja.redirecionaja.com.br/123ab',
    checklist: CHECKLIST_TEMPLATE.map(item => ({ ...item, completed: true })).slice(0, 5).concat([
      { id: 'chk-6', text: 'Aprovação final', completed: false },
      { id: 'chk-7', text: 'Início dos disparos', completed: false }
    ]),
    messageLabel: 'Defina cliente para gerar disparo',
  },
  {
    id: uuidv4(),
    title: 'PEDOKA 1103',
    time: '17:30',
    clientId: 'client-3',
    columnId: 'pendente',
    type: 'subir',
    wabas: [
      { id: uuidv4(), name: 'WABA 1', identity: 'GF III', numbers: ['5561947560681', '5561947560388'] }
    ],
    contactsList: '8900',
    tag: 'PEDOKA 1103',
    linkComplete: 'https://pedoka.me/campanha/pix',
    linkShort: 'https://loja.redirecionaja.com.br/xpto0',
    checklist: CHECKLIST_TEMPLATE.map(item => ({ ...item, completed: true })).slice(0, 6).concat([
      { id: 'chk-7', text: 'Início dos disparos', completed: false }
    ]),
    messageLabel: 'Defina cliente para gerar disparo',
  },
  {
    id: uuidv4(),
    title: '[ALERTA] Revisar Criativos',
    time: 'Automático',
    clientId: 'client-2',
    columnId: 'pendente',
    type: 'revisar',
    wabas: [],
    contactsList: '-',
    tag: 'SISTEMA - CTR BAIXO',
    linkComplete: '',
    linkShort: '',
    checklist: [
      { id: 'auto-1', text: 'Analisar CTR da campanha iPhone 15', completed: false },
      { id: 'auto-2', text: 'Subir 3 novos criativos de teste', completed: false }
    ],
    messageLabel: 'Regra disparou: CTR caiu p/ 2.1%',
  }
];

export const ACCOUNTS = [
  { id: 'acc-1', projectId: 'proj-1', name: 'MG Premium Ads - Meta', platform: 'meta', status: 'active', spendLimit: 5000 },
  { id: 'acc-2', projectId: 'proj-2', name: 'MG Premium Ads - Google', platform: 'google', status: 'active', spendLimit: 2000 },
  { id: 'acc-3', projectId: 'proj-4', name: 'Rei da Prem BM 1', platform: 'meta', status: 'active', spendLimit: 10000 },
];

export const CAMPAIGNS = [
  { id: 'camp-1', accountId: 'acc-1', name: '[Conv] Lançamento Sahara 0km', status: 'active', budget: 500, spend: 350.50, conversions: 12, revenue: 1200, roas: 3.42, cpa: 29.20, ctr: 1.8 },
  { id: 'camp-2', accountId: 'acc-1', name: '[Engaj] Warmup Público', status: 'paused', budget: 50, spend: 50, conversions: 0, revenue: 0, roas: 0, cpa: 0, ctr: 2.1 },
  { id: 'camp-3', accountId: 'acc-3', name: '[Conv] iPhone 15 Pro Max', status: 'active', budget: 1000, spend: 850.00, conversions: 45, revenue: 3600, roas: 4.23, cpa: 18.88, ctr: 2.5 },
  { id: 'camp-4', accountId: 'acc-3', name: '[Conv] Remarketing 7D', status: 'active', budget: 200, spend: 180.00, conversions: 15, revenue: 1500, roas: 8.33, cpa: 12.00, ctr: 3.2 },
];

export const RULES = [
  { id: 'rule-1', name: 'Pausar CPA Alto', condition: 'CPA > 35', action: 'PAUSE_CAMPAIGN', status: 'active' },
  { id: 'rule-2', name: 'Escalar ROAS Bom', condition: 'ROAS > 4.0', action: 'INCREASE_BUDGET_20', status: 'active' },
];

export const BASE_SUBTASKS = [
  { id: uuidv4(), text: 'Pixel instalado e os eventos de conversão (Lead/Purchase) estão disparando sem erros duplos?', phase: 'Criação', done: false },
  { id: uuidv4(), text: 'Público-alvo revisado: exclusões de compradores/visitantes recentes aplicadas?', phase: 'Criação', done: false },
  { id: uuidv4(), text: 'Orçamentos diários escalonados conforme a meta (CBO/ABO check)?', phase: 'Otimização', done: false },
  { id: uuidv4(), text: 'Anúncios com CTR baixo (< 1%) ou CPA acima do limite pausados?', phase: 'Otimização', done: false },
  { id: uuidv4(), text: 'Testou todos os links de destino manualmente (sem erro 404)?', phase: 'Verificação', done: false },
  { id: uuidv4(), text: 'Parâmetros de rastreio (UTMs internas ou externas) configurados?', phase: 'Verificação', done: false },
];

export const PROJECTS = [
  {
    id: 'proj-1', clientId: 'client-1', name: 'Lançamento Sahara 0km', color: '#f97316',
    dailyLeadGoal: 300,
    leadHistory: [ { date: 'Ontem', leads: 320 }, { date: 'Anteontem', leads: 405 } ],
    tasks: [
      { id: 'pt-1', text: 'Subir criativos do Conjunto A', completed: true, type: 'new' },
      { id: 'pt-2', text: 'Aprovar copy do anúncio principal', completed: true, type: 'new' },
      { id: 'pt-3', text: 'Ativar Campanha de Conversão', completed: false, type: 'new' },
      { id: 'pt-4', text: 'Monitorar CPA nas primeiras 24h', completed: false, type: 'recurrent', subtasks: [...BASE_SUBTASKS] },
    ]
  },
  {
    id: 'proj-2', clientId: 'client-1', name: 'Perpétuo Google Ads', color: '#3b82f6',
    dailyLeadGoal: 50,
    leadHistory: [ { date: 'Ontem', leads: 30 }, { date: 'Anteontem', leads: 25 } ], // Failing goal
    tasks: [
      { id: 'pt-5', text: 'Otimização diária de palavras-chave', completed: false, type: 'recurrent', subtasks: [...BASE_SUBTASKS] },
      { id: 'pt-6', text: 'Relatório semanal de CPA', completed: false, type: 'recurrent', subtasks: [...BASE_SUBTASKS] },
      { id: 'pt-7', text: 'Testar extensão de sitelink', completed: true, type: 'new' },
    ]
  },
  {
    id: 'proj-3', clientId: 'client-1', name: 'Captação Leads (WhatsApp)', color: '#10b981',
    dailyLeadGoal: 100,
    leadHistory: [ { date: 'Ontem', leads: 110 }, { date: 'Anteontem', leads: 60 } ],
    tasks: [
      { id: 'pt-8', text: 'Checar taxa de leitura dos disparos', completed: false, type: 'recurrent', subtasks: [...BASE_SUBTASKS] },
      { id: 'pt-9', text: 'Atualizar lista de contatos', completed: false, type: 'new' },
    ]
  },
  {
    id: 'proj-4', clientId: 'client-2', name: 'Lançamento iPhone 15 Pro', color: '#8b5cf6',
    dailyLeadGoal: 200,
    leadHistory: [ { date: 'Ontem', leads: 150 }, { date: 'Anteontem', leads: 120 } ], // Failing goal
    tasks: [
      { id: 'pt-10', text: 'Checar CTR dos criativos', completed: false, type: 'recurrent', subtasks: [...BASE_SUBTASKS] },
      { id: 'pt-11', text: 'Pausar anúncios com CPA > R$35', completed: false, type: 'new' },
      { id: 'pt-12', text: 'Subir batch de criativos novos', completed: false, type: 'new' },
    ]
  },
  {
    id: 'proj-5', clientId: 'client-2', name: 'Remarketing 7 Dias', color: '#ec4899',
    dailyLeadGoal: 20,
    leadHistory: [ { date: 'Ontem', leads: 22 }, { date: 'Anteontem', leads: 25 } ],
    tasks: [
      { id: 'pt-13', text: 'Manter ROAS > 4.0x', completed: false, type: 'recurrent', subtasks: [...BASE_SUBTASKS] },
      { id: 'pt-14', text: 'Escalar orçamento se ROAS > 6x', completed: true, type: 'new' },
    ]
  },
];
