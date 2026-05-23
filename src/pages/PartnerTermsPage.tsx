import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PartnerTermsPage() {
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
                Termos de Parceria
              </h1>
            </div>
          </div>

          <p className="text-white/70 text-sm max-w-2xl">
            Documento aplicável aos parceiros comerciais que desejam encaminhar leads,
            acompanhar tratativas e participar do ecossistema de conversão patrimonial da EPSA.
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
              Estes Termos de Parceria regulam a relação entre a Universidade EPSA,
              seus parceiros comerciais, corretores, imobiliárias, construtoras,
              correspondentes e demais profissionais autorizados a utilizar a plataforma.
              Ao solicitar acesso, o parceiro declara que leu, compreendeu e concorda
              com as condições abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Objeto da parceria</h2>
            <p className="text-sm leading-7 text-gray-600">
              A parceria tem como objetivo permitir que o parceiro cadastre clientes
              interessados em soluções patrimoniais, consórcios, crédito, aquisição de
              imóveis ou outras alternativas financeiras disponibilizadas pela EPSA.
              A EPSA poderá realizar a qualificação, atendimento, acompanhamento e
              encaminhamento comercial desses leads, conforme sua estratégia operacional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Natureza da relação</h2>
            <p className="text-sm leading-7 text-gray-600">
              A parceria não cria vínculo empregatício, sociedade, franquia, representação
              exclusiva ou relação de subordinação entre as partes. O parceiro atua de
              forma independente, sendo responsável pela origem, qualidade e licitude
              dos leads encaminhados à EPSA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Responsabilidades do parceiro</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm leading-7 text-gray-600">
              <li>Enviar apenas leads obtidos de forma lícita.</li>
              <li>Informar corretamente a origem e o contexto do lead.</li>
              <li>Garantir que o titular dos dados tenha ciência do compartilhamento com a EPSA.</li>
              <li>Não cadastrar dados comprados, extraídos, raspados ou obtidos sem autorização.</li>
              <li>Não utilizar a plataforma para fraude, spam, abuso, assédio ou contato indevido.</li>
              <li>Manter confidenciais informações comerciais, operacionais e financeiras da EPSA.</li>
              <li>Respeitar as regras da LGPD, da boa-fé comercial e das normas aplicáveis ao setor.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Cadastro e aprovação</h2>
            <p className="text-sm leading-7 text-gray-600">
              O cadastro do parceiro está sujeito à análise e aprovação da EPSA. A empresa
              poderá aprovar, recusar, suspender ou cancelar o acesso de parceiros que
              descumpram estes termos, enviem leads irregulares ou atuem de forma incompatível
              com os padrões éticos e operacionais da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Cadastro de leads</h2>
            <p className="text-sm leading-7 text-gray-600">
              Ao cadastrar um lead, o parceiro declara que o titular dos dados foi informado
              sobre o compartilhamento de suas informações com a EPSA para fins de atendimento,
              análise de alternativas patrimoniais, consórcio, crédito, acompanhamento comercial
              e eventual intermediação futura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Comissões e repasses</h2>
            <p className="text-sm leading-7 text-gray-600">
              A EPSA poderá repassar ao parceiro percentual das comissões efetivamente percebidas
              das administradoras ou demais fornecedores, conforme regra comercial vigente,
              elegibilidade do lead, rastreabilidade da origem, status da operação, adimplência
              e condições acordadas entre as partes.
            </p>
            <p className="text-sm leading-7 text-gray-600 mt-3">
              Salvo ajuste específico, o repasse ao parceiro será calculado sobre valores
              efetivamente recebidos pela EPSA, e não sobre valores apenas projetados.
              A EPSA poderá apresentar valores estimados ou projetados na plataforma, sem que
              isso represente obrigação de pagamento antes do efetivo recebimento e validação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Uso da plataforma</h2>
            <p className="text-sm leading-7 text-gray-600">
              O acesso à plataforma é pessoal e intransferível. O parceiro é responsável por
              manter suas credenciais em segurança e por todas as ações realizadas em sua conta.
              É proibido copiar, revender, explorar, modificar ou utilizar a plataforma para
              finalidade diversa daquela autorizada pela EPSA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Confidencialidade</h2>
            <p className="text-sm leading-7 text-gray-600">
              O parceiro compromete-se a manter sigilo sobre informações estratégicas,
              comerciais, operacionais, financeiras, tecnológicas e de clientes obtidas em razão
              da parceria, mesmo após o encerramento da relação com a EPSA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Proteção de dados e LGPD</h2>
            <p className="text-sm leading-7 text-gray-600">
              O parceiro reconhece que a EPSA trata dados pessoais de acordo com a Lei Geral
              de Proteção de Dados Pessoais — LGPD. O parceiro deve informar corretamente a
              origem do lead, a base legal aplicável e declarar que o titular foi informado
              sobre o compartilhamento dos dados.
            </p>
            <p className="text-sm leading-7 text-gray-600 mt-3">
              O envio de leads sem ciência do titular, sem base legal adequada ou com dados
              obtidos de forma ilícita poderá gerar suspensão da conta, bloqueio de comissões,
              encerramento da parceria e responsabilização do parceiro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Cancelamento e suspensão</h2>
            <p className="text-sm leading-7 text-gray-600">
              A EPSA poderá suspender ou encerrar a parceria em caso de descumprimento destes
              termos, uso indevido da plataforma, suspeita de fraude, envio irregular de dados,
              violação de confidencialidade ou prática que comprometa a reputação da EPSA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Alterações dos termos</h2>
            <p className="text-sm leading-7 text-gray-600">
              A EPSA poderá atualizar estes Termos de Parceria periodicamente. A continuidade
              do uso da plataforma após a publicação de nova versão representará ciência e
              concordância com as alterações, salvo quando a lei exigir novo aceite expresso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Canal de contato</h2>
            <p className="text-sm leading-7 text-gray-600">
              Para dúvidas sobre estes termos, parceria comercial, comissões ou proteção de
              dados, entre em contato com a EPSA pelo canal oficial informado na plataforma.
            </p>
          </section>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400 leading-6">
              Este documento é uma minuta operacional inicial. Recomenda-se revisão por advogado
              antes do uso definitivo em produção.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}