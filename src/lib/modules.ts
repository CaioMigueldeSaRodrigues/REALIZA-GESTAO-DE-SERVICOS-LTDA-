export type FieldType='text'|'email'|'tel'|'number'|'date'|'datetime'|'select'|'textarea'|'ref'|'checkbox';
export type Field={key:string;label:string;type?:FieldType;required?:boolean;options?:string[];ref?:string;placeholder?:string;step?:string};
export type BusinessModule={key:string;title:string;singular:string;description:string;icon:string;readRoles:string[];writeRoles:string[];fields:Field[];table:string;};
const all=['admin','gestor','comercial','operacoes','financeiro','analista'];
const manage=['admin','gestor'];
const sell=['admin','gestor','comercial'];
const ops=['admin','gestor','operacoes'];
const money=['admin','gestor','financeiro'];
const basic={type:'text' as FieldType};
export const modules:BusinessModule[]=[
{key:'profiles',table:'profiles',title:'Usuários e acessos',singular:'Usuário',description:'Ative colaboradores e controle permissões internas.',icon:'♙',readRoles:['admin','gestor'],writeRoles:['admin'],fields:[
 {key:'name',label:'Nome',required:true},{key:'email',label:'E-mail',type:'email'},
 {key:'role',label:'Perfil de acesso',type:'select',options:['pendente','admin','gestor','comercial','operacoes','financeiro','analista','motorista']},
 {key:'active',label:'Conta ativa',type:'checkbox'}
]},
{key:'leads',table:'leads',title:'Oportunidades',singular:'Lead',description:'Solicitações, origem e qualificação comercial.',icon:'◎',readRoles:all,writeRoles:sell,fields:[
 {key:'name',label:'Nome / Empresa',required:true},{key:'phone',label:'Telefone',type:'tel',required:true},{key:'email',label:'E-mail',type:'email'},
 {key:'city',label:'Cidade'},{key:'address',label:'Local de entrega'},{key:'quantity_m3',label:'Volume solicitado (m³)',type:'number',step:'0.01'},
 {key:'water_use',label:'Finalidade da água'},{key:'source',label:'Canal de origem',type:'select',options:['site','telefone','indicacao','google','instagram','outro']},
 {key:'status',label:'Etapa',type:'select',options:['novo','contato','qualificado','proposta','convertido','perdido']},{key:'notes',label:'Observações',type:'textarea'}
]},
{key:'clients',table:'clients',title:'Clientes',singular:'Cliente',description:'Cadastro mestre e histórico do relacionamento.',icon:'◉',readRoles:all,writeRoles:sell,fields:[
 {key:'name',label:'Nome / Razão social',required:true},{key:'person_type',label:'Pessoa',type:'select',options:['juridica','fisica']},
 {key:'tax_id',label:'CPF/CNPJ (opcional)'},{key:'phone',label:'Telefone',type:'tel'},{key:'email',label:'E-mail',type:'email'},
 {key:'address',label:'Endereço de entrega'},{key:'city',label:'Cidade'},{key:'segment',label:'Segmento'},
 {key:'status',label:'Situação',type:'select',options:['ativo','inativo']},{key:'notes',label:'Observações',type:'textarea'}
]},
{key:'quotes',table:'quotes',title:'Propostas',singular:'Proposta',description:'Precificação e negociação por volume.',icon:'▤',readRoles:all,writeRoles:sell,fields:[
 {key:'client_id',label:'Cliente',type:'ref',ref:'clients',required:true},{key:'quantity_m3',label:'Volume (m³)',type:'number',step:'0.01',required:true},
 {key:'unit_price',label:'Preço por m³ (R$)',type:'number',step:'0.01',required:true},{key:'freight_fee',label:'Frete adicional (R$)',type:'number',step:'0.01'},
 {key:'water_use',label:'Finalidade da água'},{key:'valid_until',label:'Validade',type:'date'},
 {key:'status',label:'Etapa',type:'select',options:['rascunho','enviada','aprovada','rejeitada']},
 {key:'notes',label:'Condições comerciais',type:'textarea'}
]},
{key:'orders',table:'orders',title:'Ordens de serviço',singular:'Ordem de serviço',description:'Da programação ao comprovante de entrega.',icon:'▣',readRoles:[...all,'motorista'],writeRoles:ops,fields:[
 {key:'client_id',label:'Cliente',type:'ref',ref:'clients',required:true},{key:'quote_id',label:'Proposta vinculada',type:'ref',ref:'quotes'},
 {key:'vehicle_id',label:'Caminhão',type:'ref',ref:'vehicles'},{key:'driver_profile_id',label:'Motorista / usuário',type:'ref',ref:'profiles'},
 {key:'water_source_id',label:'Origem da água',type:'ref',ref:'water_sources'},
 {key:'scheduled_at',label:'Previsão de atendimento',type:'datetime'},
 {key:'address',label:'Local de entrega',required:true},{key:'city',label:'Cidade',required:true},
 {key:'latitude',label:'Latitude (opcional)',type:'number',step:'0.000001'},{key:'longitude',label:'Longitude (opcional)',type:'number',step:'0.000001'},
 {key:'water_use',label:'Finalidade da água'},{key:'water_category',label:'Categoria',type:'select',options:['nao_potavel','potavel_autorizada']},
 {key:'quantity_m3',label:'Volume programado (m³)',type:'number',required:true,step:'0.01'},
 {key:'unit_price',label:'Preço unitário (R$)',type:'number',step:'0.01'},
 {key:'freight_fee',label:'Frete (R$)',type:'number',step:'0.01'},
 {key:'status',label:'Situação',type:'select',options:['pendente','programada','em_rota','entregue','cancelada']},
 {key:'notes',label:'Instruções operacionais',type:'textarea'}
]},
{key:'vehicles',table:'vehicles',title:'Frota',singular:'Caminhão',description:'Capacidade, placas, manutenção e disponibilidade.',icon:'▰',readRoles:all,writeRoles:ops,fields:[
 {key:'label',label:'Identificação',required:true},{key:'plate',label:'Placa',required:true},
 {key:'capacity_m3',label:'Capacidade (m³)',type:'number',required:true,step:'0.01'},
 {key:'odometer_km',label:'Odômetro (km)',type:'number'},
 {key:'next_maintenance_at',label:'Próxima manutenção',type:'date'},
 {key:'status',label:'Disponibilidade',type:'select',options:['disponivel','em_rota','manutencao','inativo']},
 {key:'notes',label:'Observações',type:'textarea'}
]},
{key:'water_sources',table:'water_sources',title:'Origens da água',singular:'Ponto de captação',description:'Rastreabilidade documental e autorizações.',icon:'◈',readRoles:all,writeRoles:ops,fields:[
 {key:'name',label:'Ponto / fornecedor',required:true},{key:'address',label:'Localização'},
 {key:'authorization_ref',label:'Autorização / licença'},{key:'authorization_expires',label:'Vencimento',type:'date'},
 {key:'approved_for_potable',label:'Autorizada para distribuição potável (validar documentação)',type:'checkbox'},
 {key:'status',label:'Situação',type:'select',options:['pendente','aprovada','suspensa']},
 {key:'notes',label:'Ensaios, documentos, condições',type:'textarea'}
]},
{key:'receivables',table:'receivables',title:'Contas a receber',singular:'Recebível',description:'Faturamento previsto, cobrança e baixas manuais.',icon:'↗',readRoles:money,writeRoles:money,fields:[
 {key:'client_id',label:'Cliente',type:'ref',ref:'clients'},{key:'order_id',label:'Ordem de serviço',type:'ref',ref:'orders'},
 {key:'description',label:'Descrição',required:true},{key:'due_on',label:'Vencimento',type:'date',required:true},
 {key:'amount',label:'Valor (R$)',type:'number',step:'0.01',required:true},
 {key:'paid_amount',label:'Recebido (R$)',type:'number',step:'0.01'},
 {key:'status',label:'Situação',type:'select',options:['aberto','parcial','pago','cancelado']},{key:'notes',label:'Observações',type:'textarea'}
]},
{key:'payables',table:'payables',title:'Contas a pagar',singular:'Conta a pagar',description:'Compromissos e obrigações.',icon:'↙',readRoles:money,writeRoles:money,fields:[
 {key:'vendor',label:'Fornecedor',required:true},{key:'category',label:'Categoria'},{key:'due_on',label:'Vencimento',type:'date',required:true},
 {key:'amount',label:'Valor (R$)',type:'number',step:'0.01',required:true},{key:'paid_amount',label:'Pago (R$)',type:'number',step:'0.01'},
 {key:'status',label:'Situação',type:'select',options:['aberto','parcial','pago','cancelado']},{key:'notes',label:'Observações',type:'textarea'}
]},
{key:'expenses',table:'expenses',title:'Custos operacionais',singular:'Despesa',description:'Combustível, viagens, manutenção e custos.',icon:'≋',readRoles:money,writeRoles:money,fields:[
 {key:'description',label:'Descrição',required:true},{key:'category',label:'Categoria',type:'select',options:['combustivel','manutencao','pedagio','pessoal','administrativo','agua','outro']},
 {key:'vehicle_id',label:'Caminhão',type:'ref',ref:'vehicles'},{key:'incurred_on',label:'Data',type:'date'},
 {key:'amount',label:'Valor (R$)',type:'number',step:'0.01',required:true},{key:'notes',label:'Observações',type:'textarea'}
]},
{key:'tasks',table:'tasks',title:'Tarefas e follow-up',singular:'Tarefa',description:'Acompanhamento de prazos e clientes.',icon:'◇',readRoles:all,writeRoles:all,fields:[
 {key:'title',label:'Tarefa',required:true},{key:'client_id',label:'Cliente',type:'ref',ref:'clients'},
 {key:'lead_id',label:'Lead',type:'ref',ref:'leads'}, {key:'assigned_to',label:'Responsável',type:'ref',ref:'profiles'},
 {key:'due_on',label:'Prazo',type:'date'},{key:'status',label:'Etapa',type:'select',options:['aberta','em_andamento','concluida','cancelada']},
 {key:'notes',label:'Detalhes',type:'textarea'}
]},
{key:'campaigns',table:'campaigns',title:'Marketing',singular:'Campanha',description:'Atribuição, canais e orçamento.',icon:'✳',readRoles:sell,writeRoles:sell,fields:[
 {key:'name',label:'Campanha',required:true},{key:'channel',label:'Canal',type:'select',options:['google','instagram','facebook','indicacao','email','outro']},
 {key:'budget',label:'Orçamento (R$)',type:'number',step:'0.01'},
 {key:'starts_on',label:'Início',type:'date'},{key:'ends_on',label:'Fim',type:'date'},
 {key:'status',label:'Situação',type:'select',options:['planejada','ativa','pausada','encerrada']},
 {key:'notes',label:'Objetivos e resultados',type:'textarea'}
]},
{key:'documents',table:'documents',title:'Base de conhecimento',singular:'Documento',description:'Políticas, POPs e FAQs para o agente RAG.',icon:'▧',readRoles:all,writeRoles:manage,fields:[
 {key:'title',label:'Título',required:true},{key:'category',label:'Categoria',type:'select',options:['faq','comercial','operacao','qualidade','financeiro','juridico','outros']},
 {key:'visibility',label:'Acesso',type:'select',options:['equipe','gestao']},
 {key:'content',label:'Conteúdo textual / Markdown',type:'textarea',required:true}
]}
];
export function getModule(key:string){return modules.find(m=>m.key===key)}
export const REFS:{[key:string]:{table:string;label:string}}={
 clients:{table:'clients',label:'name'},quotes:{table:'quotes',label:'id'},vehicles:{table:'vehicles',label:'label'},
 water_sources:{table:'water_sources',label:'name'},profiles:{table:'profiles',label:'name'},orders:{table:'orders',label:'id'},leads:{table:'leads',label:'name'}
};
export function canAccess(role:string,access:string[]){return access.includes(role)}
