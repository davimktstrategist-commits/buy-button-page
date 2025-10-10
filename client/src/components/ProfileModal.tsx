import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, DollarSign, LogOut } from "lucide-react";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  balance: number;
  username: string;
  onWithdraw: () => void;
  onLogout: () => void;
}

export function ProfileModal({ 
  open, 
  onClose, 
  balance, 
  username, 
  onWithdraw, 
  onLogout 
}: ProfileModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[400px] w-[90%] bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border-2 border-[#ff9d2f]/30 p-8"
        data-testid="modal-profile"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-[#888] hover:text-[#ff6c2f] text-3xl"
          data-testid="button-close-profile"
        >
          <X />
        </button>

        <div className="text-center space-y-6">
          {/* Avatar */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[#ff6c2f] to-[#ff8c47] flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Username */}
          <div>
            <p className="text-[#888] text-sm mb-1">Usuário</p>
            <h2 className="text-2xl font-bold text-[#ffc83d]" data-testid="text-profile-username">
              {username}
            </h2>
          </div>

          {/* Balance */}
          <div className="bg-[#1a1a1a]/50 rounded-lg p-4 border border-[#ff9d2f]/20">
            <p className="text-[#888] text-sm mb-2">Saldo Disponível</p>
            <p className="text-3xl font-bold text-[#ffc83d]" data-testid="text-profile-balance">
              R$ {balance.toFixed(2).replace('.', ',')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                onWithdraw();
                onClose();
              }}
              className="w-[80%] mx-auto block py-4 bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border-2 border-[#ff9d2f]/50 text-[#ffc83d] font-bold rounded-xl hover:bg-gradient-to-br hover:from-[#78280f]/90 hover:to-[#501909]/90 hover:border-[#ffc83d] hover:-translate-y-0.5 transition-all shadow-lg hover:shadow-[#ffc83d]/30"
              data-testid="button-profile-withdraw"
            >
              <DollarSign className="inline-block w-5 h-5 mr-2" />
              Solicitar Saque
            </button>

            <button
              onClick={onLogout}
              className="w-[80%] mx-auto block py-4 bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border-2 border-[#ff9d2f]/50 text-[#ffc83d] font-bold rounded-xl hover:bg-gradient-to-br hover:from-[#78280f]/90 hover:to-[#501909]/90 hover:border-[#ffc83d] hover:-translate-y-0.5 transition-all shadow-lg hover:shadow-[#ffc83d]/30"
              data-testid="button-profile-logout"
            >
              <LogOut className="inline-block w-5 h-5 mr-2" />
              Sair
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
