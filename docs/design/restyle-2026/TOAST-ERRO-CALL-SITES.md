# Call sites de Toast que anunciam ERRO (23/09, por leitura)

Insumo pra decidir a live region do `Toast` (ver `AUDITORIA-A11Y-CAMADAS.md`, achado 4).
API: `toast(mensagem, 'error')` (`hooks/useToast.ts`, store singleton; some sozinho em 3,5 s — 6 s com ação).
Levantamento por regex de chamadas `toast(..., 'error')` **em uma linha**; chamadas quebradas em várias linhas ou via helper
podem não aparecer. Total: **125 chamadas em 43 arquivos**.

Relevância pra `role="alert"`: um erro anunciado em 3,5 s some antes de o leitor de tela terminar de ler mensagens longas — vale considerar `role="alert"` (assertive) só para `type:'error'` e `polite` para o resto, e não auto-fechar erro que tenha ação.

| Arquivo | # | Linhas (mensagem) |
|---|---|---|
| `src/components/contacts/ContactDetailPanel.tsx` | 7 | `:53` 'Erro ao carregar contato.'<br>`:77` 'Resumo gerado, mas falhou ao recarregar os dados.'<br>`:81` 'Não foi possível gerar o resumo por IA.'<br>`:108` 'Erro ao excluir contato.'<br>`:124` 'Erro ao salvar alterações.'<br>`:140` 'Erro ao adicionar etiqueta.'<br>`:154` 'Erro ao remover etiqueta.' |
| `src/components/settings/sections/WhatsAppNumbers.tsx` | 7 | `:88` 'URL de OAuth não retornada pelo servidor.'<br>`:91` 'Erro ao iniciar conexão com WhatsApp. Verifique as configurações do Meta App.'<br>`:102` 'Erro ao atribuir agente.'<br>`:118` 'Falha ao definir linha principal.'<br>`:133` 'Falha ao reinscrever nos webhooks da Meta.'<br>`:152` `Erro na conexão: ${params.get('error')}`<br>`:180` 'Erro ao desconectar. Tente novamente.' |
| `src/pages/ConversationsPage.tsx` | 7 | `:267` 'Não foi possível abrir essa conversa.'<br>`:365` 'Não foi possível desfazer.'<br>`:388` msg \|\| 'Não foi possível atribuir a conversa'<br>`:477` msg \|\| 'Não foi possível transferir a conversa'<br>`:520` 'Não foi possível atualizar a IA — tente de novo'<br>`:534` 'Não foi possível atualizar a IA — tente de novo'<br>`:546` msg \|\| 'Não foi possível enviar a mensagem. Tente de novo.' |
| `src/components/settings/sections/crm/PipelineCloseReasonsManager.tsx` | 5 | `:61` 'Erro ao reordenar. Recarregando...'<br>`:78` getApiErrorMessage(err, 'Erro ao criar motivo.')<br>`:98` getApiErrorMessage(err, 'Erro ao atualizar motivo.')<br>`:108` getApiErrorMessage(err, 'Erro ao atualizar motivo.')<br>`:120` getApiErrorMessage(err, 'Erro ao atualizar o interruptor do motivo livre.') |
| `src/hooks/useAddToPipeline.tsx` | 5 | `:111` 'Nenhum funil disponível.'<br>`:173` getApiErrorMessage(e, 'Não foi possível abrir outro registro.')<br>`:197` getApiErrorMessage(e, 'Não foi possível mover o registro.')<br>`:205` 'Este funil não tem etapa de cancelamento configurada.'<br>`:219` getApiErrorMessage(e, 'Registro anterior fechado, mas não foi possível abrir o novo.') |
| `src/hooks/useContactProfile.ts` | 5 | `:103` 'Resumo gerado, mas falhou ao recarregar os dados.'<br>`:108` 'Não foi possível gerar o resumo por IA.'<br>`:130` 'Erro ao salvar alterações.'<br>`:145` 'Erro ao adicionar etiqueta.'<br>`:158` 'Erro ao remover etiqueta.' |
| `src/pages/ContactsPage.tsx` | 5 | `:114` 'Não foi possível carregar os pipelines.'<br>`:270` 'Falha ao mover contatos.'<br>`:281` 'Falha ao adicionar tag.'<br>`:292` 'Falha ao remover tag.'<br>`:324` 'Falha ao excluir contatos.' |
| `src/components/deals/DealDetailPanel.tsx` | 4 | `:140` getApiErrorMessage(err, 'Não foi possível salvar.')<br>`:170` getApiErrorMessage(err, `Não foi possível mover o ${noun}.`)<br>`:191` getApiErrorMessage(err, `Não foi possível transferir o ${noun}.`)<br>`:198` getApiErrorMessage(err, `Não foi possível excluir o ${noun}.`) |
| `src/components/deals/PipelineBoardTab.tsx` | 4 | `:185` 'Não foi possível desfazer.'<br>`:189` `Não foi possível mover o ${pipelineNoun(pipeline)}.`<br>`:216` getApiErrorMessage(e, 'Não foi possível mover o negócio para o funil.')<br>`:325` 'Este contato já tem um negócio aberto neste funil.' |
| `src/components/settings/sections/CompanyBrain.tsx` | 4 | `:177` `"${raw.name}" excede o limite de ${MAX_FILE_MB} MB.`<br>`:181` `Tipo de arquivo não suportado: ${raw.type \|\| raw.name}`<br>`:405` 'Erro ao salvar. Tente novamente.'<br>`:574` 'Erro ao sincronizar com a base de conhecimento.' |
| `src/components/settings/sections/MyAccount.tsx` | 4 | `:60` 'Erro ao salvar.'<br>`:68` 'As senhas não coincidem.'<br>`:72` 'A senha deve ter no mínimo 8 caracteres.'<br>`:81` 'Senha atual incorreta.' |
| `src/components/settings/sections/crm/PipelineRoutingSettings.tsx` | 4 | `:90` 'Selecione um pipeline antes de salvar.'<br>`:94` 'Selecione o usuário fixo antes de salvar.'<br>`:110` typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar roteamento.'<br>`:125` 'Erro ao remover roteamento.' |
| `src/contexts/InternalChatContext.tsx` | 4 | `:216` getApiErrorMessage(err, 'Não foi possível iniciar a conversa.')<br>`:283` getApiErrorMessage(err, 'Não foi possível enviar a mensagem.')<br>`:305` getApiErrorMessage(err, 'Não foi possível reagir à mensagem.')<br>`:337` getApiErrorMessage(err, 'Não foi possível excluir a mensagem.') |
| `src/pages/AutomationsPage.tsx` | 4 | `:315` 'Não foi possível alterar o status da automação'<br>`:327` 'Não foi possível excluir'<br>`:342` 'Não foi possível duplicar'<br>`:358` 'Não foi possível duplicar' |
| `src/components/admin/SkillTemplateForm.tsx` | 3 | `:234` validation.error<br>`:253` `Não consegui checar instâncias antes de salvar: ${err instanceof Error ? err.message : St<br>`:301` err instanceof Error ? err.message : String(err) |
| `src/components/conversations/ConversionAnalysisPanel.tsx` | 3 | `:410` getApiErrorMessage(err, 'Não foi possível analisar a conversa.')<br>`:427` getApiErrorMessage(err, 'Não foi possível confirmar a análise.')<br>`:440` getApiErrorMessage(err, 'Não foi possível rejeitar a análise.') |
| `src/components/settings/sections/Departments.tsx` | 3 | `:346` 'Erro ao criar setor.'<br>`:357` 'Erro ao atualizar.'<br>`:366` 'Erro ao excluir.' |
| `src/components/settings/sections/TagsSettings.tsx` | 3 | `:129` typeof msg === 'string' ? msg : 'Erro ao criar tag.'<br>`:150` typeof msg === 'string' ? msg : 'Erro ao atualizar tag.'<br>`:163` typeof msg === 'string' ? msg : 'Erro ao excluir tag.' |
| `src/components/settings/sections/crm/FunnelsSettings.tsx` | 3 | `:126` getApiErrorMessage(e, 'Erro ao excluir funil.')<br>`:140` getApiErrorMessage(e, 'Erro ao alterar arquivamento do funil.')<br>`:154` getApiErrorMessage(e, 'Erro ao definir funil padrão.') |
| `src/components/settings/sections/crm/PipelineStagesManager.tsx` | 3 | `:83` getApiErrorMessage(err, 'Erro ao salvar estágio.')<br>`:98` getApiErrorMessage(err, 'Erro ao excluir estágio.')<br>`:116` 'Erro ao reordenar. Recarregando...' |
| `src/components/settings/sections/crm/StagesManager.tsx` | 3 | `:51` getApiErrorMessage(err, 'Erro ao salvar estágio.')<br>`:65` getApiErrorMessage(err, 'Erro ao excluir estágio.')<br>`:82` 'Erro ao reordenar. Recarregando...' |
| `src/hooks/useContactPipelines.ts` | 3 | `:113` getApiErrorMessage(e, 'Não foi possível mover.')<br>`:159` getApiErrorMessage(e, 'Não foi possível reabrir.')<br>`:176` 'Não foi possível carregar o histórico.' |
| `src/components/agents/SkillsTab.tsx` | 2 | `:100` err instanceof Error ? err.message : String(err)<br>`:115` err instanceof Error ? err.message : String(err) |
| `src/components/contacts/ContactRow.tsx` | 2 | `:84` 'Este negócio não está mais aberto — atualize a página.'<br>`:86` getApiErrorMessage(err, 'Não foi possível abrir o negócio.') |
| `src/components/conversations/ChatWindow/ChatHeader.tsx` | 2 | `:111` 'Nenhum negócio vinculado a esta conversa ainda.'<br>`:113` getApiErrorMessage(err, 'Não foi possível abrir o negócio.') |
| `src/components/onboarding/SetupWizard.tsx` | 2 | `:68` `"${raw.name}" excede ${MAX_FILE_MB} MB.`<br>`:69` `Tipo não suportado: ${raw.type \|\| raw.name}` |
| `src/components/settings/sections/QuickReplies.tsx` | 2 | `:150` errorMessage(e, 'Não foi possível salvar a resposta.')<br>`:163` errorMessage(e, 'Não foi possível excluir a resposta.') |
| `src/components/settings/sections/WhatsAppBusinessProfile.tsx` | 2 | `:107` 'Erro ao carregar o perfil do WhatsApp.'<br>`:131` extractErrorMessage(err, 'Erro ao salvar o perfil.') |
| `src/components/settings/sections/crm/CustomFieldsManager.tsx` | 2 | `:48` typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar campo.'<br>`:63` axiosMsg ?? msg |
| `src/components/settings/sections/crm/PipelineAccessManager.tsx` | 2 | `:45` getApiErrorMessage(err, 'Erro ao carregar acesso do funil.')<br>`:72` getApiErrorMessage(err, 'Erro ao atualizar acesso do funil.') |
| `src/components/settings/sections/crm/PipelineSalesSettings.tsx` | 2 | `:48` getApiErrorMessage(err, 'Erro ao atualizar dono padrão.')<br>`:61` getApiErrorMessage(err, 'Erro ao atualizar multiplicidade.') |
| `src/components/settings/sections/crm/PractitionersManager.tsx` | 2 | `:75` typeof msg === 'string' ? msg : 'Erro ao excluir profissional.'<br>`:94` 'Erro ao alterar status.' |
| `src/components/settings/sections/crm/ProductsManager.tsx` | 2 | `:84` typeof msg === 'string' ? msg : 'Erro ao excluir produto.'<br>`:103` 'Erro ao alterar status.' |
| `src/components/contacts/NewContactDrawer.tsx` | 1 | `:304` errorText |
| `src/components/contacts/tabs/DealsTab.tsx` | 1 | `:114` 'Erro ao excluir.' |
| `src/components/contacts/tabs/QualificationCard.tsx` | 1 | `:69` getApiErrorMessage(err, 'Não foi possível salvar a qualificação.') |
| `src/components/conversations/ContactPanel/ContactPanelDeals.tsx` | 1 | `:110` getApiErrorMessage(e, 'Não foi possível vincular o negócio a esta conversa.') |
| `src/components/settings/sections/AgentManagement.tsx` | 1 | `:357` 'Erro ao reenviar convite.' |
| `src/components/settings/sections/CompanyProfile.tsx` | 1 | `:78` 'Erro ao salvar. Tente novamente.' |
| `src/lib/dealClose.ts` | 1 | `:43` getApiErrorMessage(e, 'Não foi possível desfazer o fechamento.') |
| `src/pages/AgentsPage.tsx` | 1 | `:200` typeof msg === 'string' ? msg : 'Não foi possível alterar o status do agente.' |
| `src/pages/ContactProfilePage.tsx` | 1 | `:237` 'Erro ao excluir contato.' |
| `src/pages/admin/SkillTemplatesPage.tsx` | 1 | `:107` err instanceof Error ? err.message : String(err) |
