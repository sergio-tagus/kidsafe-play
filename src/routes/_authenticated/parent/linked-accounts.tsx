import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ParentShell } from "@/components/parent-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { addLinkedAccount, listLinkedAccounts, removeLinkedAccount } from "@/lib/linked-accounts.functions";

export const Route = createFileRoute("/_authenticated/parent/linked-accounts")({
  head: () => ({ meta: [{ title: "Cuentas vinculadas — SafeTube Kids" }] }),
  component: LinkedAccountsPage,
});

const TXT = {
  es: { title: "Cuentas vinculadas", desc: "Añade otro email de Google. Al iniciar sesión con él entrarás directamente en esta cuenta.", add: "Vincular", pending: "Pendiente", active: "Activa", added: "Cuenta vinculada", removed: "Desvinculada",
    err: { invalid: "Email no válido", own: "Es el email de esta misma cuenta", duplicate: "Ya está vinculado", limit: "Máximo 3 cuentas vinculadas", taken: "Ese email ya está vinculado a otra cuenta", hasData: "Esa cuenta ya tiene hijos o canales propios" } },
  en: { title: "Linked accounts", desc: "Add another Google email. Signing in with it takes you straight into this account.", add: "Link", pending: "Pending", active: "Active", added: "Account linked", removed: "Unlinked",
    err: { invalid: "Invalid email", own: "That's this account's own email", duplicate: "Already linked", limit: "Maximum 3 linked accounts", taken: "That email is linked to another account", hasData: "That account already has its own kids or channels" } },
  pt: { title: "Contas vinculadas", desc: "Adicione outro email Google. Ao entrar com ele, acede diretamente a esta conta.", add: "Vincular", pending: "Pendente", active: "Ativa", added: "Conta vinculada", removed: "Desvinculada",
    err: { invalid: "Email inválido", own: "É o email desta conta", duplicate: "Já está vinculado", limit: "Máximo 3 contas vinculadas", taken: "Esse email está vinculado a outra conta", hasData: "Essa conta já tem filhos ou canais próprios" } },
};

function LinkedAccountsPage() {
  const { lang } = useI18n();
  const T = TXT[(lang as keyof typeof TXT)] ?? TXT.es;
  const qc = useQueryClient();
  const listFn = useServerFn(listLinkedAccounts);
  const addFn = useServerFn(addLinkedAccount);
  const delFn = useServerFn(removeLinkedAccount);
  const [email, setEmail] = useState("");
  const { data = [] } = useQuery({ queryKey: ["linked-accounts"], queryFn: () => listFn() });
  const onErr = (e: Error) => toast.error((T.err as Record<string, string>)[e.message] ?? e.message);
  const add = useMutation({
    mutationFn: () => addFn({ data: { email } }),
    onSuccess: () => { setEmail(""); toast.success(T.added); qc.invalidateQueries({ queryKey: ["linked-accounts"] }); },
    onError: onErr,
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success(T.removed); qc.invalidateQueries({ queryKey: ["linked-accounts"] }); },
    onError: onErr,
  });

  return (
    <ParentShell>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">{T.title}</h1>
          <p className="text-muted-foreground mt-1">{T.desc}</p>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (email) add.mutate(); }}>
          <Input type="email" placeholder="email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" disabled={add.isPending || data.length >= 3}>{T.add}</Button>
        </form>
        <ul className="space-y-2">
          {data.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{a.email}</div>
                <div className="text-xs text-muted-foreground">{a.linked_user_id ? T.active : T.pending}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)} aria-label="remove">
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </ParentShell>
  );
}
