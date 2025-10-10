import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Info, DollarSign, Banknote, Users } from "lucide-react";

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

type TabType = "jogar" | "deposito" | "saque" | "afiliados";

export function RulesModal({ open, onClose }: RulesModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("jogar");

  const tabs = [
    { id: "jogar" as TabType, label: "Como Jogar", icon: Info },
    { id: "deposito" as TabType, label: "Depósito", icon: DollarSign },
    { id: "saque" as TabType, label: "Saque", icon: Banknote },
    { id: "afiliados" as TabType, label: "Afiliados", icon: Users },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[500px] w-[90%] bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border-2 border-[#ff9d2f]/30 p-0 max-h-[80vh] overflow-hidden"
        data-testid="modal-rules"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#888] hover:text-[#ff6c2f] text-2xl z-10"
          data-testid="button-close-rules"
        >
          <X />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-[#ffc83d] text-center mb-6">
            Informações
          </h2>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto" data-testid="rules-tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-br from-[#ff6c2f] to-[#ff8c47] text-white"
                      : "bg-[#252525] text-[#aaa] hover:bg-[#333]"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[50vh] pr-2">
            {activeTab === "jogar" && (
              <div className="space-y-4 text-[#d1d1d1]" data-testid="content-jogar">
                <h3 className="text-xl font-bold text-[#ffc83d]">Como Jogar</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-white mb-2">🎰 Objetivo do Jogo</h4>
                    <p className="text-sm">
                      A Roleta do Tigre é um jogo de sorte onde você gira uma roleta principal 
                      com multiplicadores que vão de 1x até 100x! Quanto maior o multiplicador, 
                      maior o prêmio!
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-white mb-2">🎯 Como Funciona</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Escolha o valor da sua aposta usando os botões + e -</li>
                      <li>Clique no botão START para girar a roleta</li>
                      <li>A seta dourada no topo indicará o resultado</li>
                      <li>Seu prêmio será o valor apostado × multiplicador</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-white mb-2">💰 Multiplicadores</h4>
                    <p className="text-sm">
                      A roleta possui os seguintes multiplicadores: 1x, 2x, 3x, 4x, 5x, 
                      10x, 15x, 20x, 30x, 50x e 100x (aparece 2 vezes).
                    </p>
                  </div>

                  <div className="bg-[#1a1a1a]/50 border border-[#ff9d2f]/20 rounded-lg p-3">
                    <p className="text-sm text-[#ffc83d]">
                      💡 <strong>Dica:</strong> Comece com apostas menores para conhecer o jogo!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "deposito" && (
              <div className="space-y-4 text-[#d1d1d1]" data-testid="content-deposito">
                <h3 className="text-xl font-bold text-[#ffc83d]">Como Depositar</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-white mb-2">📱 Passo a Passo</h4>
                    <ol className="text-sm space-y-2 list-decimal list-inside">
                      <li>Clique no botão "Depositar" no topo da tela</li>
                      <li>Digite o valor desejado (mínimo R$ 20,00)</li>
                      <li>Clique em "Gerar QR Code PIX"</li>
                      <li>Escaneie o QR Code com seu banco ou copie o código PIX</li>
                      <li>Confirme o pagamento no seu aplicativo bancário</li>
                      <li>Aguarde alguns segundos - o saldo será creditado automaticamente!</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-bold text-white mb-2">⚡ Vantagens</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Depósito instantâneo via PIX</li>
                      <li>Confirmação automática em segundos</li>
                      <li>Seguro e protegido</li>
                      <li>Disponível 24/7</li>
                    </ul>
                  </div>

                  <div className="bg-[#1a1a1a]/50 border border-[#ff9d2f]/20 rounded-lg p-3">
                    <p className="text-sm text-[#ffc83d]">
                      ⏱️ <strong>Tempo:</strong> Crédito em até 60 segundos após confirmação!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "saque" && (
              <div className="space-y-4 text-[#d1d1d1]" data-testid="content-saque">
                <h3 className="text-xl font-bold text-[#ffc83d]">Como Sacar</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-white mb-2">💸 Passo a Passo</h4>
                    <ol className="text-sm space-y-2 list-decimal list-inside">
                      <li>Clique no seu perfil no topo da tela</li>
                      <li>Clique em "Solicitar Saque"</li>
                      <li>Digite o valor que deseja sacar</li>
                      <li>Selecione o tipo de chave PIX (CPF, Email, etc)</li>
                      <li>Digite sua chave PIX</li>
                      <li>Preencha seu nome e CPF</li>
                      <li>Confirme a solicitação</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-bold text-white mb-2">📋 Regras Importantes</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Valor mínimo: R$ 1,00</li>
                      <li>Processamento em até 24h úteis</li>
                      <li>Verifique se a chave PIX está correta</li>
                      <li>O CPF deve ser do titular da chave PIX</li>
                    </ul>
                  </div>

                  <div className="bg-[#1a1a1a]/50 border border-[#ff9d2f]/20 rounded-lg p-3">
                    <p className="text-sm text-[#ffc83d]">
                      ⚠️ <strong>Atenção:</strong> Certifique-se de que todos os dados estão corretos 
                      antes de solicitar o saque!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "afiliados" && (
              <div className="space-y-4 text-[#d1d1d1]" data-testid="content-afiliados">
                <h3 className="text-xl font-bold text-[#ffc83d]">Programa de Afiliados</h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-white mb-2">🤝 Como Funciona</h4>
                    <p className="text-sm">
                      Indique amigos e ganhe comissões automáticas! Compartilhe seu link 
                      exclusivo e receba uma porcentagem de cada depósito que seus 
                      indicados realizarem.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-white mb-2">💎 Benefícios</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Ganhe comissão em cada depósito do indicado</li>
                      <li>Sem limite de indicações</li>
                      <li>Comissões creditadas automaticamente</li>
                      <li>Acompanhe suas estatísticas em tempo real</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-white mb-2">📊 Como Participar</h4>
                    <ol className="text-sm space-y-2 list-decimal list-inside">
                      <li>Acesse a seção "Afiliados" no menu</li>
                      <li>Copie seu link exclusivo</li>
                      <li>Compartilhe com seus amigos</li>
                      <li>Ganhe comissões automáticas!</li>
                    </ol>
                  </div>

                  <div className="bg-[#1a1a1a]/50 border border-[#ff9d2f]/20 rounded-lg p-3">
                    <p className="text-sm text-[#ffc83d]">
                      🎁 <strong>Bônus:</strong> Quanto mais indicados, maiores seus ganhos!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
