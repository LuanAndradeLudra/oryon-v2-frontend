import { Navigate } from 'react-router-dom'

/** SCRUM-1253 (PO, 07/10): a saúde de cada linha passou para o cartão do
 *  número em Números WhatsApp — o endereço antigo leva para lá. */
export function WhatsAppHealth() {
  return <Navigate to="/settings/numbers" replace />
}
