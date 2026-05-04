import {
  Tag, MessageCircle, Shield, Briefcase, Send, BookOpen, Sparkles, CheckCircle2,
  Lightbulb, Target, Flag, Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface StepTip {
  icon: LucideIcon
  text: string
}

export interface StepTeaching {
  icon: LucideIcon
  title: string
  description: string
  tips: StepTip[]
}

// Educational copy shown in the left tutor panel of the agent builder.
// Each entry corresponds to one wizard step (1..8).
export const STEP_TEACHINGS: StepTeaching[] = [
  {
    icon: Tag,
    title: 'Quem é o agente?',
    description: 'Nome, setor e objetivo dão a identidade do agente. É o ponto de partida que ancora todas as decisões seguintes.',
    tips: [
      { icon: Lightbulb, text: 'Use nomes humanos (Lia, Davi) ou funcionais (Atendimento, Suporte) — facilita a memória do cliente.' },
      { icon: Layers,    text: 'O setor define vocabulário, exemplos e estilo de resposta esperados pelo agente.' },
      { icon: Target,    text: 'Objetivo específico vence: "Tirar dúvidas sobre planos" é melhor que "Atender clientes".' },
    ],
  },
  {
    icon: MessageCircle,
    title: 'Como ele se comunica?',
    description: 'Tom + idioma + estilo definem o "jeito" das respostas. Pense em quem você gostaria que atendesse seu cliente.',
    tips: [
      { icon: Lightbulb, text: '"Casual" funciona melhor no WhatsApp; "Formal" em mercados premium, jurídico ou financeiro.' },
      { icon: Flag,      text: 'Combine 2-3 estilos no máximo — em excesso geram comportamento contraditório.' },
      { icon: Sparkles,  text: 'Persona_name dá voz humana ao agente: "Sou a Lia, do time de atendimento".' },
    ],
  },
  {
    icon: Shield,
    title: 'O que ele pode (e não pode) fazer?',
    description: 'Limites claros protegem o agente de inventar respostas e protegem você de retrabalho com conversas mal direcionadas.',
    tips: [
      { icon: Lightbulb, text: 'Comece pequeno: 3-4 capacidades focadas funcionam melhor que 10 vagas.' },
      { icon: Shield,    text: 'Restrições importam: "Não fala de preços fora da tabela" evita problemas reais.' },
      { icon: Target,    text: 'Itere depois de testar — adicionar capacidades é mais seguro que removê-las.' },
    ],
  },
  {
    icon: Briefcase,
    title: 'Sobre quem ele atende',
    description: 'Sem contexto da empresa, o agente fala genericamente. Esses dados aparecem como pano de fundo em cada resposta.',
    tips: [
      { icon: Lightbulb, text: 'Descreva o negócio como faria pra um amigo — concreto, direto, sem marketing.' },
      { icon: Layers,    text: 'Produtos principais com 1-2 linhas cada vencem catálogos longos.' },
      { icon: Sparkles,  text: 'Já preenchemos a partir do Centro de Conhecimento se você configurou antes.' },
    ],
  },
  {
    icon: Send,
    title: 'Onde ele vai atender?',
    description: 'Cada canal tem sua linguagem natural. Comece por um — expandir depois é fácil; recolher é caro.',
    tips: [
      { icon: Target,    text: 'WhatsApp é ponto de partida ideal: mensagens curtas, formato familiar a todos.' },
      { icon: Flag,      text: 'Você pode adicionar ou remover canais depois sem reconfigurar o agente.' },
      { icon: Lightbulb, text: 'Integrações precisam estar conectadas em Configurações antes de ativar aqui.' },
    ],
  },
  {
    icon: BookOpen,
    title: 'O que ele precisa saber',
    description: 'Documentos e links que o agente vai consultar antes de responder. Quanto mais rico, mais preciso e específico.',
    tips: [
      { icon: BookOpen,  text: 'PDFs de produto, scripts de venda e FAQs internos são os materiais mais úteis.' },
      { icon: Sparkles,  text: 'Links de redes sociais alimentam tom e estilo automaticamente — vale incluir.' },
      { icon: Flag,      text: 'Você pode editar e adicionar materiais a qualquer momento depois de publicar.' },
    ],
  },
  {
    icon: Sparkles,
    title: 'A IA monta o cérebro',
    description: 'Tudo que você forneceu vira um system prompt único, otimizado para o seu caso. É o coração do agente.',
    tips: [
      { icon: Target,    text: 'O prompt diferencia um agente ruim de um excelente — vale revisar com calma.' },
      { icon: Lightbulb, text: 'Use a opção "Editar" para refinar tom, exemplos ou instruções específicas.' },
      { icon: Sparkles,  text: 'Pode regerar quantas vezes quiser sem perder os dados das etapas anteriores.' },
    ],
  },
  {
    icon: CheckCircle2,
    title: 'Tudo pronto?',
    description: 'Última conferida antes de ativar. Você pode publicar direto ou salvar como rascunho para testar antes.',
    tips: [
      { icon: Lightbulb, text: 'Rascunho permite testar com a aba "Testar" sem expor ao cliente final.' },
      { icon: Flag,      text: 'Configurações podem ser ajustadas a qualquer momento depois — nada é permanente.' },
      { icon: Target,    text: 'Recomendamos 5-10 testes antes de ativar em produção, mesmo com prompt revisado.' },
    ],
  },
]
