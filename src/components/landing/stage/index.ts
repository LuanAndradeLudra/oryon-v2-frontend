// Ponto de entrada público do palco. Landing e login importam SÓ daqui.
// `StagePoster` no login deve ser carregado por `lazy(() => import('./StagePoster'))`
// (o LoginPage é import estático do App — o palco não pode entrar no chunk de entrada).
export { HeroStage } from './HeroStage'
export { StagePoster } from './StagePoster'
export { STAGE_DESIGN } from './types'
export { STAGE_DEMO_LABEL } from './demoLabel'
export type { StageScene, StageFrameKey, StageLayout, HeroStageProps, StagePosterProps } from './types'
