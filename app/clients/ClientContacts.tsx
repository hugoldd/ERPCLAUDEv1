'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Search, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ConfirmModal, SectionHeader } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { ClientContact } from '@/types/clients';

type EditState = {
  id: string;
  nom: string;
  prenom: string;
  fonction: string;
  email: string;
  telephone: string;
  principal: boolean;
  notes: string;
};

export default function ClientContacts(props: { clientId: string }) {
  const ui = useClientUi();
  const router = useRouter();

  const [items, setItems] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<EditState | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientContact | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('contacts_clients')
        .select('*')
        .eq('client_id', props.clientId)
        .order('principal', { ascending: false })
        .order('created_at', { ascending: false });

      if (e) throw e;
      setItems((data ?? []) as ClientContact[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.clientId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) => {
      const full = `${c.prenom ?? ''} ${c.nom ?? ''} ${c.fonction ?? ''} ${c.email ?? ''} ${c.telephone ?? ''}`.toLowerCase();
      return full.includes(s);
    });
  }, [items, q]);

  const startEdit = (c: ClientContact) => {
    setEdit({
      id: c.id,
      nom: c.nom ?? '',
      prenom: c.prenom ?? '',
      fonction: c.fonction ?? '',
      email: c.email ?? '',
      telephone: c.telephone ?? '',
      principal: !!c.principal,
      notes: c.notes ?? ''
    });
  };

  const validate = (e: EditState): string | null => {
    if (!e.nom.trim()) return 'Le nom est obligatoire.';
    if (e.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email.trim())) return 'Email invalide.';
    return null;
  };

  const save = async () => {
    if (!edit) return;
    setError(null);

    const v = validate(edit);
    if (v) {
      setError(v);
      return;
    }

    setSavingId(edit.id);
    try {
      if (edit.principal) {
        const { error: e0 } = await supabase
          .from('contacts_clients')
          .update({ principal: false })
          .eq('client_id', props.clientId);
        if (e0) throw e0;
      }

      const payload = {
        nom: edit.nom.trim(),
        prenom: edit.prenom.trim() || null,
        fonction: edit.fonction.trim() || null,
        email: edit.email.trim() || null,
        telephone: edit.telephone.trim() || null,
        principal: edit.principal,
        notes: edit.notes.trim() || null
      };

      const { error: e1 } = await supabase.from('contacts_clients').update(payload).eq('id', edit.id);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'contact',
        titre: 'Contact modifie',
        description: `${payload.prenom ? payload.prenom + ' ' : ''}${payload.nom}`,
        metadata: { contact_id: edit.id, ...payload }
      });

      setEdit(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setSavingId(null);
    }
  };

  const askDelete = (c: ClientContact) => {
    setDeleteTarget(c);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    setSavingId(deleteTarget.id);
    try {
      const { error: e1 } = await supabase.from('contacts_clients').delete().eq('id', deleteTarget.id);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'contact',
        titre: 'Contact supprime',
        description: `${deleteTarget.prenom ? deleteTarget.prenom + ' ' : ''}${deleteTarget.nom}`,
        metadata: { contact_id: deleteTarget.id }
      });

      setConfirmOpen(false);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-3 sm:p-0">
      <div className="p-4 sm:p-5" style={ui.cardStyle}>
        <SectionHeader
          title="Contacts"
          subtitle="Gestion des contacts client"
          right={
            <div className="flex gap-2">
              <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
                {loading ? 'Chargement...' : 'Rafraichir'}
              </button>
              <button
                type="button"
                className="px-3 py-2 text-sm font-semibold flex items-center gap-2"
                style={ui.btnPrimaryStyle}
                onClick={() => router.push(`/clients/${props.clientId}/nouveau-contact`)}
              >
                <UserPlus size={16} />
                Nouveau contact
              </button>
            </div>
          }
        />

        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

        <div className="mt-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: ui.c.bg, border: `1px solid ${ui.c.border}` }}>
            <Search size={16} style={{ color: ui.c.muted }} />
            <input
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: ui.c.text }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (nom, email, telephone...)"
              disabled={loading}
            />
          </div>
        </div>

        {loading ? <div className="mt-4 text-sm" style={{ color: ui.c.muted }}>Chargement...</div> : null}
        {!loading && filtered.length === 0 ? <div className="mt-4 text-sm" style={{ color: ui.c.muted }}>Aucun contact.</div> : null}

        <div className="mt-4 grid grid-cols-1 gap-3">
          {filtered.map((c) => {
            const initials = `${c.prenom ?? ''} ${c.nom ?? ''}`
              .trim()
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join('') || 'C';

            return (
              <div key={c.id} className="p-4 rounded-xl" style={{ border: `1px solid ${ui.c.border}` }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold" style={{ backgroundColor: ui.c.accent, color: 'white' }}>
                      {initials}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {c.prenom ? `${c.prenom} ` : ''}{c.nom}
                        {c.principal ? <span className="ml-2 text-xs" style={{ color: ui.c.success }}>(principal)</span> : null}
                      </div>
                      <div className="text-sm" style={{ color: ui.c.muted }}>
                        {c.fonction ?? 'Fonction non definie'}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: ui.c.muted }}>
                        <span className="flex items-center gap-1"><Mail size={12} /> {c.email ?? '-'}</span>
                        <span className="flex items-center gap-1"><Phone size={12} /> {c.telephone ?? '-'}</span>
                      </div>
                      {c.notes ? <div className="mt-2 text-sm" style={{ color: ui.c.muted }}>{c.notes}</div> : null}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => startEdit(c)} disabled={savingId === c.id}>
                      Modifier
                    </button>
                    <button type="button" className="px-3 py-2 text-sm" style={{ ...ui.btnStyle, border: `1px solid ${ui.c.danger}` }} onClick={() => askDelete(c)} disabled={savingId === c.id}>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {edit ? (
          <div className="mt-5 p-4 rounded-xl" style={{ border: `1px solid ${ui.c.border}` }}>
            <div className="font-semibold">Edition contact</div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Nom *</div>
                <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.nom} onChange={(e) => setEdit((s) => (s ? { ...s, nom: e.target.value } : s))} />
              </div>
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Prenom</div>
                <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.prenom} onChange={(e) => setEdit((s) => (s ? { ...s, prenom: e.target.value } : s))} />
              </div>
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Fonction</div>
                <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.fonction} onChange={(e) => setEdit((s) => (s ? { ...s, fonction: e.target.value } : s))} />
              </div>
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Telephone</div>
                <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.telephone} onChange={(e) => setEdit((s) => (s ? { ...s, telephone: e.target.value } : s))} />
              </div>
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Email</div>
                <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={edit.email} onChange={(e) => setEdit((s) => (s ? { ...s, email: e.target.value } : s))} />
              </div>
              <div className="flex items-center gap-2 mt-6 sm:mt-0">
                <input type="checkbox" checked={edit.principal} onChange={(e) => setEdit((s) => (s ? { ...s, principal: e.target.checked } : s))} />
                <span className="text-sm" style={{ color: ui.c.muted }}>Contact principal</span>
              </div>

              <div className="sm:col-span-2">
                <div className="text-sm" style={{ color: ui.c.muted }}>Notes</div>
                <textarea className="mt-1 w-full px-3 py-2 min-h-[100px]" style={ui.inputStyle} value={edit.notes} onChange={(e) => setEdit((s) => (s ? { ...s, notes: e.target.value } : s))} />
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" className="px-4 py-2 text-sm" style={ui.btnStyle} onClick={() => setEdit(null)} disabled={!!savingId}>
                Annuler
              </button>
              <button type="button" className="px-4 py-2 text-sm font-semibold" style={ui.btnPrimaryStyle} onClick={() => void save()} disabled={!!savingId}>
                {savingId ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirmer la suppression"
        message="Cette action est irreversible."
        destructive
        busy={!!savingId}
        onClose={() => {
          if (!savingId) setConfirmOpen(false);
        }}
        onConfirm={() => void doDelete()}
      />
    </div>
  );
}
