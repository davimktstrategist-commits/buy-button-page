import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
              <span className="text-6xl">🐯</span>
            </div>
          </div>
          <DialogTitle className="text-2xl font-display font-bold text-center">
            Bem-vindo à Roleta do Tigre!
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-4 space-y-3">
            <p>
              Bem-vindo ao nosso cassino online!
            </p>
            <p className="font-medium">
              🎰 Gire a roleta e ganhe prêmios incríveis!
            </p>
            <p className="font-medium">
              💰 Depósitos e saques rápidos via PIX
            </p>
            <p className="font-medium">
              🏆 Multiplicadores de até 100x!
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-3">
          <Button 
            className="w-full" 
            size="lg"
            onClick={onClose}
            data-testid="button-welcome-close"
          >
            Começar a Jogar
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Jogue com responsabilidade. Maiores de 18 anos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
