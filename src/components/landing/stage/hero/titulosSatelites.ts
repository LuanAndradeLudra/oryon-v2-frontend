import { HERO } from './heroRealData'

/** Os títulos das janelas satélite do palco do Hero (fora do arquivo de
 *  componentes, para o fast refresh do Vite seguir funcionando). */
export const TITULOS_SATELITES = {
  celular: `WhatsApp · ${HERO.person}`,
  notificacoes: 'Notificações',
  linhaDoTempo: `${HERO.person} · atividade`,
  negocio: 'Negócio · Consultas',
}
