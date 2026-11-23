# Aprovação segura de ADM temporário

**Não há conta ADMIN ou senha fixa publicada no GitHub.** A conta preexistente é autorizada pelo administrador do banco (uma operação única, nunca por autoinscrição).

O convite exige confirmação do e-mail pelo Supabase Auth. Quando o proprietário entra no painel, o app chama `activate_preapproved_admin`, que verifica o e-mail no servidor e converte apenas uma conta marcada pelo operador com `admin_invitation_pending=true`. O acesso dura 48 horas a partir da ativação e expira nas regras de permissão do banco.

## Para o usuário convidado
1. Abra o link de verificação recebido no e-mail. Se não recebeu, use `Reenviar confirmação de e-mail` na página de login.
2. Entre com o mesmo e-mail e a senha cadastrada anteriormente.
3. O sistema ativará a conta se o convite tiver sido pré-autorizado no banco; nenhuma chave secreta é necessária no navegador.

**Segurança:** jamais definir `role=admin` pela tela de cadastro, por user_metadata ou por variável pública. Não usar esta conta como administrador definitivo. Revogue após a homologação.
