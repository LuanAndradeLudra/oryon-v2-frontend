/**
 * "UM DIA NO WHATSAPP" — os roteiros da seção "Por que a Oryon" (30/09, PO):
 * a mesma cliente, as mesmas perguntas, em dois WhatsApps lado a lado. À
 * esquerda sem a Oryon (a equipe está ocupada e responde horas depois); à
 * direita com a Oryon (o agente responde na hora e chama a pessoa certa).
 * Um setor por vez, em carrossel: clínica, imobiliária, loja, contabilidade
 * e jurídico. O título da seção muda com o setor (copy em landingCopy.ts).
 *
 * Dados fictícios, fora de `landingCopy.ts` de propósito: a copy da landing
 * não pode ter número (regra P14, testada) e uma conversa tem hora e valor. A seção avisa "Conversas de exemplo.".
 *
 * Regras de roteiro (as mesmas na página /solucoes, que mostra uma área por vez):
 *  • a IA responde com o que a empresa cadastrou e CHAMA a pessoa para o que é
 *    da pessoa (confirmar, combinar visita, concluir a venda);
 *  • nada de módulo desligado nem vocabulário banido no que vai para a tela
 *    (o checklist e o texto para leitor de tela passam pelo teste da home).
 *
 * Cada passo entra no tempo `t` (ms) do relógio do setor. O relógio pausa com
 * o botão de pausa e fora da tela.
 */
export type PassoDia =
  | { t: number; tipo: 'msg'; texto: string; hora: string; minha?: boolean }
  /** Um selo no meio da conversa: o que aconteceu com ela. `contador` corre
   *  os minutos sem resposta (de → até) logo depois de entrar. */
  | { t: number; tipo: 'selo'; texto: string; tom: 'ruim' | 'bom' | 'pessoa'; contador?: { de: number; ate: number } }
  | { t: number; tipo: 'dia'; texto: string }

/** Uma linha do checklist ao lado do aparelho: fica marcada no tempo `t`. */
export interface ItemChecklist {
  t: number
  texto: string
  /** A linha é da pessoa da equipe (âmbar), não do agente. */
  pessoa?: boolean
}

export interface Lado {
  passos: PassoDia[]
  checklist: ItemChecklist[]
  /** O desfecho, no pé do checklist, no tempo `resultado.t`. */
  resultado: { t: number; texto: string }
}

export interface Setor {
  id: string
  /** O nome na aba. */
  rotulo: string
  empresa: string
  iniciais: string
  corAvatar: string
  /** Quem escreve (para o texto do leitor de tela). */
  cliente: string
  sem: Lado
  com: Lado
}

/** Quanto o contador de minutos leva para correr (ms). */
export const DURACAO_CONTADOR = 1600
/** O ritmo da exibição (PO, 30/09): os tempos dos roteiros correm 1,7× mais
 *  devagar na tela, para dar tempo de ler cada mensagem com calma. */
export const RITMO = 1.7
/** Quanto o setor fica parado no fim, antes de deslizar para o próximo (ms). */
export const PAUSA_NO_FIM = 3800

/** Quando uma conversa termina (tempo de roteiro): o último passo, com o
 *  contador correndo, ou o resultado — o que vier por último. */
export function fimDoLado(l: Lado) {
  return Math.max(l.resultado.t, ...l.passos.map((p) => p.t + (p.tipo === 'selo' && p.contador ? DURACAO_CONTADOR : 0)))
}

/** O tempo total de um setor: a conversa mais longa e a pausa no fim. */
export function duracaoDoSetor(s: Setor) {
  return Math.max(fimDoLado(s.sem), fimDoLado(s.com)) + PAUSA_NO_FIM
}

export const SETORES: Setor[] = [
  {
    id: 'clinica',
    rotulo: 'Clínica',
    empresa: 'Clínica Vitalis',
    iniciais: 'VS',
    corAvatar: '#0F766E',
    cliente: 'Carla',
    sem: {
      passos: [
        { t: 0, tipo: 'msg', texto: 'Bom dia! Vocês atendem Unimed?', hora: '10:02', minha: true },
        { t: 600, tipo: 'msg', texto: 'E têm horário na segunda de manhã?', hora: '10:03', minha: true },
        { t: 1300, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 38 } },
        { t: 3100, tipo: 'msg', texto: 'Oi? Alguém aí?', hora: '10:41', minha: true },
        { t: 3800, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 52 } },
        { t: 5900, tipo: 'msg', texto: 'Oi! Atendemos, sim. Qual horário você prefere?', hora: '11:33' },
        { t: 6900, tipo: 'msg', texto: 'De manhã, se tiver.', hora: '11:35', minha: true },
        { t: 7600, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 47 } },
        { t: 9400, tipo: 'msg', texto: 'Só temos às 14h. Pode ser?', hora: '12:22' },
        { t: 10300, tipo: 'msg', texto: 'Já marquei em outro lugar. Obrigada!', hora: '12:25', minha: true },
      ],
      checklist: [
        { t: 1300, texto: 'Recepção ocupada com o telefone e o balcão' },
        { t: 3100, texto: 'Cliente cobrou uma resposta' },
        { t: 5900, texto: 'Primeira resposta uma hora e meia depois' },
        { t: 7600, texto: 'Conversa parada de novo' },
      ],
      resultado: { t: 10300, texto: 'Cliente marcou em outro lugar' },
    },
    com: {
      passos: [
        { t: 0, tipo: 'msg', texto: 'Bom dia! Vocês atendem Unimed?', hora: '10:02', minha: true },
        { t: 600, tipo: 'msg', texto: 'E têm horário na segunda de manhã?', hora: '10:03', minha: true },
        { t: 1300, tipo: 'msg', texto: 'Bom dia, Carla! Atendemos Unimed, é só trazer a guia autorizada.', hora: '10:03' },
        { t: 2000, tipo: 'msg', texto: 'Na segunda tenho 8h30 e 10h com a Dra. Helena. Qual prefere?', hora: '10:03' },
        { t: 2600, tipo: 'selo', texto: 'Respondida na hora', tom: 'bom' },
        { t: 3600, tipo: 'msg', texto: '8h30! E se eu for particular, quanto fica?', hora: '10:04', minha: true },
        { t: 4400, tipo: 'msg', texto: 'No particular, a consulta fica R$ 220. Pela Unimed, vale a guia.', hora: '10:04' },
        { t: 5300, tipo: 'msg', texto: 'Vou pela Unimed. Pode ser às 8h30!', hora: '10:05', minha: true },
        { t: 6100, tipo: 'msg', texto: 'Anotado: segunda às 8h30. A recepção confirma com você ainda hoje.', hora: '10:05' },
        { t: 6900, tipo: 'selo', texto: 'Recepção avisada', tom: 'pessoa' },
      ],
      checklist: [
        { t: 1300, texto: 'Respondida na hora, com a recepção cheia' },
        { t: 2000, texto: 'Convênio e horários do que a clínica cadastrou' },
        { t: 4400, texto: 'Valor da consulta informado sem fila' },
        { t: 6100, texto: 'Etapa da venda registrada na conversa' },
        { t: 6900, texto: 'Recepção chamada para confirmar', pessoa: true },
      ],
      resultado: { t: 6900, texto: 'Horário escolhido em três minutos' },
    },
  },
  {
    id: 'imobiliaria',
    rotulo: 'Imobiliária',
    empresa: 'Casa Nova Imóveis',
    iniciais: 'CN',
    corAvatar: '#1E40AF',
    cliente: 'Rafael',
    sem: {
      passos: [
        { t: 0, tipo: 'msg', texto: 'Oi! O apartamento de 2 quartos no Centro ainda está disponível?', hora: '13:02', minha: true },
        { t: 600, tipo: 'msg', texto: 'Aceita pet?', hora: '13:03', minha: true },
        { t: 1300, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 34 } },
        { t: 3100, tipo: 'msg', texto: 'Alguém consegue me passar o valor do condomínio?', hora: '13:37', minha: true },
        { t: 3800, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 55 } },
        { t: 5900, tipo: 'msg', texto: 'Olá, Rafael! Está disponível, sim. Vou ver o condomínio.', hora: '14:32' },
        { t: 6900, tipo: 'msg', texto: 'E o pet?', hora: '14:33', minha: true },
        { t: 7600, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 41 } },
        { t: 9400, tipo: 'msg', texto: 'Aceita, sim! Quer marcar uma visita?', hora: '15:14' },
        { t: 10300, tipo: 'msg', texto: 'Já fechei visita com outra imobiliária. Valeu!', hora: '15:18', minha: true },
      ],
      checklist: [
        { t: 1300, texto: 'Corretores na rua, ninguém no WhatsApp' },
        { t: 3100, texto: 'Cliente repetiu a pergunta' },
        { t: 5900, texto: 'Primeira resposta uma hora e meia depois' },
        { t: 7600, texto: 'Dúvida do pet ficou para depois' },
      ],
      resultado: { t: 10300, texto: 'Visita fechada com a concorrência' },
    },
    com: {
      passos: [
        { t: 0, tipo: 'msg', texto: 'Oi! O apartamento de 2 quartos no Centro ainda está disponível?', hora: '13:02', minha: true },
        { t: 600, tipo: 'msg', texto: 'Aceita pet?', hora: '13:03', minha: true },
        { t: 1300, tipo: 'msg', texto: 'Oi, Rafael! Está disponível, sim, e o prédio aceita pet.', hora: '13:03' },
        { t: 2000, tipo: 'msg', texto: 'O condomínio fica R$ 480. Quer visitar?', hora: '13:03' },
        { t: 2600, tipo: 'selo', texto: 'Respondida na hora', tom: 'bom' },
        { t: 3600, tipo: 'msg', texto: 'Quero! Pode ser amanhã à tarde?', hora: '13:04', minha: true },
        { t: 4400, tipo: 'msg', texto: 'Vou chamar o Marcos, corretor desse imóvel, para combinar com você.', hora: '13:04' },
        { t: 5200, tipo: 'selo', texto: 'Marcos entrou na conversa', tom: 'pessoa' },
        { t: 6000, tipo: 'msg', texto: 'Oi, Rafael! Amanhã às 15h te espero no prédio. Combinado?', hora: '13:09' },
        { t: 6800, tipo: 'msg', texto: 'Combinado!', hora: '13:10', minha: true },
      ],
      checklist: [
        { t: 1300, texto: 'Respondida na hora, no sábado' },
        { t: 2000, texto: 'Pet e condomínio do que você cadastrou' },
        { t: 3600, texto: 'Interesse registrado como venda em andamento' },
        { t: 5200, texto: 'Corretor chamado para combinar a visita', pessoa: true },
      ],
      resultado: { t: 6800, texto: 'Visita combinada no mesmo dia' },
    },
  },
  {
    id: 'loja',
    rotulo: 'Loja',
    empresa: 'Loja Aurora',
    iniciais: 'LA',
    corAvatar: '#9D174D',
    cliente: 'Bia',
    sem: {
      passos: [
        { t: 0, tipo: 'msg', texto: 'Oi! Tem o tênis Runner branco no 37?', hora: '10:14', minha: true },
        { t: 600, tipo: 'msg', texto: 'Se tiver, consigo retirar hoje?', hora: '10:14', minha: true },
        { t: 1300, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 26 } },
        { t: 3100, tipo: 'msg', texto: 'Oi? Tem ou não tem?', hora: '10:40', minha: true },
        { t: 3800, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 45 } },
        { t: 5900, tipo: 'msg', texto: 'Oi! Desculpa a demora, a loja estava cheia. Vou ver no estoque.', hora: '11:25' },
        { t: 6900, tipo: 'msg', texto: 'Ok, aguardo.', hora: '11:26', minha: true },
        { t: 7600, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 32 } },
        { t: 9400, tipo: 'msg', texto: 'Tem, sim! Quer que eu separe?', hora: '11:58' },
        { t: 10300, tipo: 'msg', texto: 'Já comprei em outro site. Obrigada!', hora: '12:03', minha: true },
      ],
      checklist: [
        { t: 1300, texto: 'Equipe no balcão, WhatsApp esperando' },
        { t: 3100, texto: 'Cliente cobrou uma resposta' },
        { t: 5900, texto: 'Primeira resposta mais de uma hora depois' },
        { t: 7600, texto: 'Estoque conferido à mão' },
      ],
      resultado: { t: 10300, texto: 'Venda feita em outro site' },
    },
    com: {
      passos: [
        { t: 0, tipo: 'msg', texto: 'Oi! Tem o tênis Runner branco no 37?', hora: '10:14', minha: true },
        { t: 600, tipo: 'msg', texto: 'Se tiver, consigo retirar hoje?', hora: '10:14', minha: true },
        { t: 1300, tipo: 'msg', texto: 'Oi, Bia! Tem, sim: Runner branco, 37, por R$ 349.', hora: '10:14' },
        { t: 2000, tipo: 'msg', texto: 'Dá para retirar hoje até as 20h. Quer que separe no seu nome?', hora: '10:14' },
        { t: 2600, tipo: 'selo', texto: 'Respondida na hora', tom: 'bom' },
        { t: 3600, tipo: 'msg', texto: 'Quero! Aceita Pix?', hora: '10:15', minha: true },
        { t: 4400, tipo: 'msg', texto: 'Aceita, sim. Vou chamar a Lu, da loja, para separar o seu.', hora: '10:15' },
        { t: 5200, tipo: 'selo', texto: 'Lu entrou na conversa', tom: 'pessoa' },
        { t: 6000, tipo: 'msg', texto: 'Separado no seu nome, Bia! Te espero mais tarde.', hora: '10:17' },
        { t: 6800, tipo: 'msg', texto: 'Obrigada!!', hora: '10:17', minha: true },
      ],
      checklist: [
        { t: 1300, texto: 'Respondida na hora, com a loja cheia' },
        { t: 2000, texto: 'Estoque e preço do que a loja cadastrou' },
        { t: 3600, texto: 'Interesse registrado para a equipe acompanhar' },
        { t: 5200, texto: 'Vendedora chamada para concluir a venda', pessoa: true },
      ],
      resultado: { t: 6800, texto: 'Produto separado em três minutos' },
    },
  },
  {
    id: 'contabilidade',
    rotulo: 'Contabilidade',
    empresa: 'Prisma Contábil',
    iniciais: 'PC',
    corAvatar: '#475569',
    cliente: 'Paulo',
    sem: {
      passos: [
        { t: 0, tipo: 'msg', texto: 'Bom dia! Até quando preciso mandar os documentos do imposto de renda?', hora: '09:10', minha: true },
        { t: 600, tipo: 'msg', texto: 'E quais documentos vocês precisam?', hora: '09:11', minha: true },
        { t: 1300, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 42 } },
        { t: 3100, tipo: 'msg', texto: 'Oi? Queria separar tudo hoje.', hora: '09:53', minha: true },
        { t: 3800, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 36 } },
        { t: 5900, tipo: 'msg', texto: 'Oi, Paulo! O Renato está em reunião. Vou ver com ele e te retorno.', hora: '10:29' },
        { t: 6900, tipo: 'msg', texto: 'Ok. E a nota que emiti errado ontem, como resolvo?', hora: '10:31', minha: true },
        { t: 7600, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 55 } },
        { t: 9400, tipo: 'msg', texto: 'O prazo é 15/05. A lista de documentos te mando por e-mail.', hora: '11:26' },
        { t: 10300, tipo: 'msg', texto: 'E a nota? Preciso resolver ainda hoje.', hora: '11:28', minha: true },
      ],
      checklist: [
        { t: 1300, texto: 'Dúvida de rotina esperando o contador' },
        { t: 3100, texto: 'Cliente cobrou uma resposta' },
        { t: 5900, texto: 'Recado anotado à mão para depois da reunião' },
        { t: 9400, texto: 'Caso urgente misturado às perguntas simples' },
      ],
      resultado: { t: 10300, texto: 'O que era urgente ficou para trás' },
    },
    com: {
      passos: [
        { t: 0, tipo: 'msg', texto: 'Bom dia! Até quando preciso mandar os documentos do imposto de renda?', hora: '09:10', minha: true },
        { t: 600, tipo: 'msg', texto: 'E quais documentos vocês precisam?', hora: '09:11', minha: true },
        { t: 1300, tipo: 'msg', texto: 'Bom dia, Paulo! O prazo do escritório para os documentos é 15/05.', hora: '09:11' },
        { t: 2000, tipo: 'msg', texto: 'Precisamos dos informes de rendimentos, recibos médicos e do extrato da previdência. Mando a lista completa?', hora: '09:11' },
        { t: 2600, tipo: 'selo', texto: 'Respondida na hora', tom: 'bom' },
        { t: 3600, tipo: 'msg', texto: 'Manda! E a nota que emiti errado ontem, como resolvo?', hora: '09:12', minha: true },
        { t: 4400, tipo: 'msg', texto: 'Lista enviada. A nota precisa da análise do contador: já passei sua conversa para o Renato.', hora: '09:12' },
        { t: 5200, tipo: 'selo', texto: 'Renato entrou na conversa', tom: 'pessoa' },
        { t: 6000, tipo: 'msg', texto: 'Oi, Paulo! Me manda o número da nota que eu vejo o cancelamento agora.', hora: '09:20' },
        { t: 6800, tipo: 'msg', texto: 'Mandando!', hora: '09:21', minha: true },
      ],
      checklist: [
        { t: 1300, texto: 'Prazo e documentos do conteúdo do escritório' },
        { t: 2000, texto: 'Dúvida de rotina resolvida sem o contador' },
        { t: 3600, texto: 'Conversa etiquetada por assunto' },
        { t: 5200, texto: 'Contador chamado só para o caso da nota', pessoa: true },
      ],
      resultado: { t: 6800, texto: 'Contador só no que pede análise' },
    },
  },
  {
    id: 'juridico',
    rotulo: 'Jurídico',
    empresa: 'Moura & Lima Advocacia',
    iniciais: 'ML',
    corAvatar: '#7C2D12',
    cliente: 'Fernanda',
    sem: {
      passos: [
        { t: 0, tipo: 'msg', texto: 'Boa tarde! Fui demitida e não recebi minhas verbas. Vocês atendem esse tipo de caso?', hora: '14:05', minha: true },
        { t: 600, tipo: 'msg', texto: 'Preciso levar algum documento?', hora: '14:06', minha: true },
        { t: 1300, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 47 } },
        { t: 3100, tipo: 'msg', texto: 'Alguém pode me ajudar?', hora: '14:53', minha: true },
        { t: 3800, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 38 } },
        { t: 5900, tipo: 'msg', texto: 'Boa tarde! A Dra. Lima está em audiência. Pode me contar o que aconteceu?', hora: '15:31' },
        { t: 6900, tipo: 'msg', texto: 'Contei ali em cima. Fui demitida semana passada.', hora: '15:34', minha: true },
        { t: 7600, tipo: 'selo', texto: 'sem resposta', tom: 'ruim', contador: { de: 0, ate: 44 } },
        { t: 9400, tipo: 'msg', texto: 'Entendi. Vou passar para a doutora e ela te liga.', hora: '16:18' },
        { t: 10300, tipo: 'msg', texto: 'Tá. Vou procurar outro escritório também.', hora: '16:20', minha: true },
      ],
      checklist: [
        { t: 1300, texto: 'Advogada em audiência, conversa parada' },
        { t: 3100, texto: 'Cliente cobrou uma resposta' },
        { t: 5900, texto: 'Equipe refez a triagem do zero' },
        { t: 9400, texto: 'Nenhum documento pedido até agora' },
      ],
      resultado: { t: 10300, texto: 'Cliente procurando outro escritório' },
    },
    com: {
      passos: [
        { t: 0, tipo: 'msg', texto: 'Boa tarde! Fui demitida e não recebi minhas verbas. Vocês atendem esse tipo de caso?', hora: '14:05', minha: true },
        { t: 600, tipo: 'msg', texto: 'Preciso levar algum documento?', hora: '14:06', minha: true },
        { t: 1300, tipo: 'msg', texto: 'Boa tarde, Fernanda! Atendemos causas trabalhistas, sim. Vou te fazer duas perguntas rápidas.', hora: '14:06' },
        { t: 2000, tipo: 'msg', texto: 'Quando foi a demissão? Você tinha carteira assinada?', hora: '14:06' },
        { t: 2600, tipo: 'selo', texto: 'Respondida na hora', tom: 'bom' },
        { t: 3600, tipo: 'msg', texto: 'Semana passada. Tinha, sim, há 4 anos.', hora: '14:07', minha: true },
        { t: 4400, tipo: 'msg', texto: 'Obrigada! Separe a carteira de trabalho, o termo de rescisão e os últimos holerites. Já passei tudo para a Dra. Lima.', hora: '14:07' },
        { t: 5200, tipo: 'selo', texto: 'Dra. Lima recebeu a triagem', tom: 'pessoa' },
        { t: 6000, tipo: 'msg', texto: 'Oi, Fernanda! Vi seu caso. Podemos conversar amanhã às 10h?', hora: '15:40' },
        { t: 6800, tipo: 'msg', texto: 'Pode, sim. Obrigada!', hora: '15:41', minha: true },
      ],
      checklist: [
        { t: 1300, texto: 'Perguntas de triagem definidas pelo escritório' },
        { t: 3600, texto: 'Respostas registradas na conversa' },
        { t: 4400, texto: 'Documentos pedidos antes da reunião' },
        { t: 5200, texto: 'Orientação sobre o caso fica com a advogada', pessoa: true },
      ],
      resultado: { t: 6800, texto: 'Reunião marcada com a triagem pronta' },
    },
  },
]
