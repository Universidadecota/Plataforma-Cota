import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="bg-cota-green-dark text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link
            to="/seja-parceiro"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para cadastro
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-cota-gold flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-cota-green-dark" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-cota-gold font-bold">
                Universidade EPSA
              </p>
              <h1 className="text-3xl font-black">
                Política de Privacidade
              </h1>
            </div>
          </div>

          <p className="text-white/70 text-sm max-w-2xl">
            Esta política explica como a Universidade EPSA coleta, utiliza, armazena,
            compartilha e protege dados pessoais no contexto de sua plataforma educacional,
            comercial e patrimonial.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 space-y-8">
          <section>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">
              Última atualização: 23/05/2026
            </p>
            <p className="text-sm leading-7 text-gray-600">
              A Universidade EPSA valoriza a privacidade, a segurança e a transparência no
              tratamento de dados pessoais. Esta Política de Privacidade descreve como os dados
              são tratados em nossa plataforma, incluindo páginas públicas, cadastro de parceiros,
              cadastro de leads, trilhas educacionais, CRM e canais de atendimento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Quem somos</h2>
            <p className="text-sm leading-7 text-gray-600">
              A Universidade EPSA é uma plataforma voltada à educação financeira, formação de
              parceiros comerciais, distribuição patrimonial, consórcios, CRM de leads e
              acompanhamento de oportunidades comerciais. Para fins desta política, a EPSA poderá
              atuar como controladora ou operadora de dados pessoais, conforme o contexto do
              tratamento realizado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Quais dados podemos coletar</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm leading-7 text-gray-600">
              <li>Dados de identificação: nome, razão social, e-mail, telefone e usuário.</li>
              <li>Dados profissionais: tipo de atuação, empresa, perfil comercial e vínculo com parceiros.</li>
              <li>Dados de leads: nome, telefone, e-mail, interesse, motivo do encaminhamento e observações.</li>
              <li>Dados comerciais: origem do lead, status do atendimento, histórico de tratativas e comissões projetadas.</li>
              <li>Dados educacionais: cursos acessados, progresso em trilhas, certificados, quizzes e pontuação.</li>
              <li>Dados técnicos: IP, dispositivo, registros de acesso, logs, cookies e informações de navegação.</li>
              <li>Dados de compliance: aceite de termos, política de privacidade, origem do lead e declarações LGPD.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Como os dados são coletados</h2>
            <p className="text-sm leading-7 text-gray-600">
              Os dados podem ser coletados diretamente pelo titular, por formulários da EPSA,
              por parceiros comerciais autorizados, por interações em canais digitais, pelo uso
              da plataforma educacional ou pelo cadastro de leads no CRM.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Para quais finalidades usamos os dados</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm leading-7 text-gray-600">
              <li>Criar e gerenciar contas de parceiros, alunos e usuários.</li>
              <li>Qualificar leads e realizar atendimento comercial.</li>
              <li>Apresentar alternativas de consórcio, crédito, aquisição patrimonial ou soluções relacionadas.</li>
              <li>Acompanhar status de atendimento, propostas, conversões e comissões.</li>
              <li>Oferecer cursos, trilhas, certificados, mentorias e conteúdos educacionais.</li>
              <li>Comunicar atualizações, oportunidades, notificações e informações relevantes.</li>
              <li>Cumprir obrigações legais, regulatórias, contratuais e de prevenção a fraudes.</li>
              <li>Melhorar a plataforma, gerar estatísticas, relatórios e inteligência operacional.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Bases legais de tratamento</h2>
            <p className="text-sm leading-7 text-gray-600">
              O tratamento de dados poderá ocorrer com fundamento em bases legais previstas na
              LGPD, incluindo consentimento, execução de contrato ou medidas pré-contratuais,
              cumprimento de obrigação legal ou regulatória, proteção do crédito, exercício
              regular de direitos e legítimo interesse, conforme o caso concreto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Compartilhamento de dados</h2>
            <p className="text-sm leading-7 text-gray-600">
              A EPSA poderá compartilhar dados pessoais com parceiros, consultores, administradoras
              de consórcio, fornecedores de tecnologia, prestadores de serviço, canais de atendimento,
              meios de pagamento, autoridades públicas ou terceiros necessários à execução das
              finalidades descritas nesta política.
            </p>
            <p className="text-sm leading-7 text-gray-600 mt-3">
              O compartilhamento será limitado ao necessário para viabilizar atendimento,
              qualificação, operação comercial, segurança, auditoria, cumprimento legal ou execução
              da jornada patrimonial do titular.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Leads enviados por parceiros</h2>
            <p className="text-sm leading-7 text-gray-600">
              Quando um parceiro cadastra um lead na plataforma, ele declara que o titular foi
              informado sobre o compartilhamento de seus dados com a EPSA e que existe base legal
              adequada para o tratamento. A EPSA registra a origem do lead, base legal informada,
              canal autorizado e data da declaração para fins de transparência, auditoria e
              segurança.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Armazenamento e segurança</h2>
            <p className="text-sm leading-7 text-gray-600">
              A EPSA adota medidas técnicas e organizacionais para proteger os dados pessoais
              contra acessos não autorizados, perda, alteração, divulgação indevida ou tratamento
              inadequado. O acesso aos dados deve ser restrito a pessoas autorizadas e necessário
              à execução de suas atividades.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Retenção dos dados</h2>
            <p className="text-sm leading-7 text-gray-600">
              Os dados pessoais serão mantidos pelo período necessário ao cumprimento das
              finalidades descritas nesta política, execução de contratos, cumprimento de obrigações
              legais, exercício regular de direitos, prevenção a fraudes e auditoria operacional.
              Quando não forem mais necessários, poderão ser excluídos, anonimizados ou mantidos
              quando houver base legal aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Direitos dos titulares</h2>
            <p className="text-sm leading-7 text-gray-600">
              Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso,
              correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre
              compartilhamento, revogação de consentimento e oposição ao tratamento, quando
              aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Comunicações comerciais</h2>
            <p className="text-sm leading-7 text-gray-600">
              A EPSA poderá enviar comunicações relacionadas a atendimento, cursos, oportunidades,
              conteúdos, propostas, status de leads e soluções patrimoniais. O titular poderá
              solicitar a interrupção de comunicações comerciais quando aplicável, sem prejuízo
              de comunicações operacionais ou obrigatórias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Cookies e tecnologias similares</h2>
            <p className="text-sm leading-7 text-gray-600">
              A plataforma poderá utilizar cookies, pixels, identificadores ou tecnologias
              similares para autenticação, segurança, análise de uso, melhoria da experiência,
              mensuração de campanhas e personalização de conteúdo. O usuário poderá gerenciar
              preferências no navegador, quando disponível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Alterações desta política</h2>
            <p className="text-sm leading-7 text-gray-600">
              Esta Política de Privacidade poderá ser atualizada periodicamente para refletir
              alterações legais, regulatórias, operacionais, tecnológicas ou comerciais. Quando
              houver mudanças relevantes, a EPSA poderá solicitar novo aceite ou comunicar os
              usuários pelos canais disponíveis na plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">14. Canal de atendimento sobre privacidade</h2>
            <p className="text-sm leading-7 text-gray-600">
              Para dúvidas, solicitações de acesso, correção, exclusão, revogação de consentimento
              ou demais direitos relacionados à proteção de dados pessoais, entre em contato com
              a Universidade EPSA pelo canal oficial informado na plataforma.
            </p>
            <p className="text-sm leading-7 text-gray-600 mt-3">
              Recomenda-se que a EPSA defina um e-mail específico para privacidade, como:
              <strong className="text-gray-900"> privacidade@universidadeepsa.com.br</strong>.
            </p>
          </section>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400 leading-6">
              Este documento é uma minuta operacional inicial. Recomenda-se revisão por advogado
              especializado em LGPD, contratos, consórcios, crédito e intermediação imobiliária
              antes do uso definitivo em produção.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
