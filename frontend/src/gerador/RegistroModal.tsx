import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RegistroModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (registro: any) => void;
}

export default function RegistroModal({ open, onClose, onSave }: RegistroModalProps) {
  const [form, setForm] = useState({
    pan: '',
    expiry_date: '',
    cardholder_name: '',
    amount: '',
    merchant_name: '',
    currency: '986',
    user_auditoria: 'CLRGUSR',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: Date.now(),
      pan: form.pan,
      expiry_date: form.expiry_date,
      cardholder_name: form.cardholder_name,
      amount: parseFloat(form.amount) || 0,
      merchant_name: form.merchant_name,
    });
    setForm({ pan: '', expiry_date: '', cardholder_name: '', amount: '', merchant_name: '', currency: '986', user_auditoria: 'CLRGUSR' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Transação</DialogTitle>
          <DialogDescription>Preencha os dados da autorização</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pan">PAN</Label>
            <Input id="pan" value={form.pan} onChange={(e) => setForm({...form, pan: e.target.value})} placeholder="4111111111111111" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiry">Validade (MMYY)</Label>
              <Input id="expiry" value={form.expiry_date} onChange={(e) => setForm({...form, expiry_date: e.target.value})} placeholder="1227" required />
            </div>
            <div>
              <Label htmlFor="amount">Valor</Label>
              <Input id="amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} placeholder="150.00" required />
            </div>
          </div>

          <div>
            <Label htmlFor="name">Nome do Portador</Label>
            <Input id="name" value={form.cardholder_name} onChange={(e) => setForm({...form, cardholder_name: e.target.value})} placeholder="ADRIANO D ALMEIDA" required />
          </div>

          <div>
            <Label htmlFor="merchant">Merchant Name</Label>
            <Input id="merchant" value={form.merchant_name} onChange={(e) => setForm({...form, merchant_name: e.target.value})} placeholder="Loja Teste" required />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}