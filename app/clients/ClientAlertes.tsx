'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge, ConfirmModal, SectionHeader, formatDateFR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { ClientAlerte, ClientAlerteNiveau } from '@/types/clients';

type FormState = {
  niveau: ClientAlerteNiveau;
  titre: string;
  message: string;
  date_echeance: string; // YYYY-MM-DD
};

export default function ClientAlertes(props: { clientId: string }) {
  const ui = useClientUi();

  const [items, setItems] = useState<ClientAlerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);

  const [form, setForm] = useState<FormState>(() => ({
    niveau: 'warning',
    titre: '',
    message: '',
    date_echeance: ''
  }));

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientAlerte | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('client_alertes')
        .select('*')
        .eq('client_id', props.clientId)
        .order('actif', { ascending: false })
        .order('created_at', { ascending: false });

      if (e) throw e;
      setItems((data ?? []) as ClientAlerte[]);
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
    return items.filter((a) => {
      if (onlyActive && !a.actif) return false;
      if (!s) return true;
      return `${a.titre ?? ''} ${a.message ?? ''} ${a.niveau ?? ''}`.toLowerCase().includes(s);
    });
  }, [items, q, onlyActive]);

  const tone = (n: ClientAlerteNiveau) => (n === 'danger' ? 'danger' : n === 'warning' ? 'warning' : 'neutral');

  const validate = (f: FormState): string | null => {
    if (!f.titre.trim()) return 'Le titre est obligatoire.';
    return null;
  };

  const add = async () => {
    setError(null);
    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }

    setBusy(true);
    try {
      const payload = {
        client_id: props.clientId,
        niveau: form.niveau,
        titre: form.titre.trim(),
        message: form.message.trim() || null,
        date_echeance: form.date_echeance || null,
        actif: true
      };

      const { error: e1 } = await supabase.from('client_alertes').insert(payload);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'alerte',
        titre: 'Alerte créée',
        description: payload.titre,
        metadata: payload
      });

      setForm({ niveau: 'warning', titre: '', message: '', date_echeance: '' });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  const toggleResolve = async (a: ClientAlerte) => {
    setError(null);
    setBusy(true);
    try {
      const payload = a.actif
        ? { actif: false, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : { actif: true, resolved_at: null, updated_at: new Date().toISOString() };

      const { error: e1 } = await supabase.from('client_alertes').update(payload).eq('id', a.id);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'alerte',
        titre: a.actif ? 'Alerte résolue' : 'Alerte réactivée',
        description: a.titre,
        metadata: { alerte_id: a.id, ...payload }
      });

      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  const askDelete = (a: ClientAlerte) => {
    setDeleteTarget(a);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    setBusy(true);
    try {
      const { error: e1 } = await supabase.from('client_alertes').delete().eq('id', deleteTarget.id);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'alerte',
        titre: 'Alerte supprimée',
        description: deleteTarget.titre,
        metadata: { alerte_id: deleteTarget.id }
      });

      setConfirmOpen(false);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  const activeCount = useMemo(() => items.filter((x) => x.actif).length, [items]);

  return (
    <div className="p-3 sm:p-0">
      <div className="p-4 sm:p-5" style={ui.cardStyle}>
        <SectionHeader
          title="Alertes"
          subtitle="Alertes actives et historisées"
          right={
            <div className="flex items-center gap-2 flex-wrap">
              <Badge label={`${activeCount} active(s)`} tone={activeCount > 0 ? 'danger' : 'success'} />
              <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
                {loading ? 'Chargement...' : 'Rafraîchir'}
              </button>
            </div>
          }
        />

        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

        {/* Bandeau visuel type notification */}
        {activeCount > 0 ? (
          <div className="mt-4 p-3 text-sm" style={{ border: `1px solid ${ui.c.danger}`, borderRadius: 14, backgroundColor: `${ui.c.danger}22` }}>
            Attention : {activeCount} alerte(s) active(s) sur ce client.
          </div>
        ) : (
          <div className="mt-4 p-3 text-sm" style={{ border: `1px solid ${ui.c.success}`, borderRadius: 14, backgroundColor: `${ui.c.success}22` }}>
            Aucun signal critique actif.
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Liste</div>

            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                className="w-full px-3 py-2"
                style={ui.inputStyle}
                placeholder="Rechercher"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={loading}
              />
              <label className="flex items-center gap-2 text-sm opacity-80">
                <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
                Actives uniquement
              </label>
            </div>

            {loading ? <div className="mt-4 text-sm opacity-80">Chargement...</div> : null}
            {!loading && filtered.length === 0 ? <div className="mt-4 text-sm opacity-80">Aucune alerte.</div> : null}

            <div className="mt-4 grid grid-cols-1 gap-3">
              {filtered.map((a) => (
                <div key={a.id} className="p-3" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 14 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{a.titre}</div>
                      <div className="mt-1 text-xs opacity-70">
                        {a.actif ? 'Active' : 'Résolue'} · Niveau {a.niveau} · Créée {formatDateFR(a.created_at)}
                        {a.date_echeance ? ` · Échéance ${formatDateFR(a.date_echeance)}` : ''}
                      </div>
                      {a.message ? <div className="mt-2 text-sm opacity-85">{a.message}</div> : null}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Badge label={a.niveau} tone={tone(a.niveau)} />
                      <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void toggleResolve(a)} disabled={busy}>
                        {a.actif ? 'Résoudre' : 'Réactiver'}
                      </button>
                      <button type="button" className="px-3 py-2 text-sm" style={{ ...ui.btnStyle, border: `1px solid ${ui.c.danger}` }} onClick={() => askDelete(a)} disabled={busy}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Créer une alerte</div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm opacity-80">Niveau</div>
                <select className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.niveau} onChange={(e) => setForm((s) => ({ ...s, niveau: e.target.value as ClientAlerteNiveau }))} disabled={busy}>
                  <option value="info">info</option>
                  <option value="warning">warning</option>
                  <option value="danger">danger</option>
                </select>
              </div>
              <div>
                <div className="text-sm opacity-80">Échéance</div>
                <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} type="date" value={form.date_echeance} onChange={(e) => setForm((s) => ({ ...s, date_echeance: e.target.value }))} disabled={busy} />
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm opacity-80">Titre *</div>
                <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.titre} onChange={(e) => setForm((s) => ({ ...s, titre: e.target.value }))} disabled={busy} />
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm opacity-80">Message</div>
                <textarea className="mt-1 w-full px-3 py-2 min-h-[120px]" style={ui.inputStyle} value={form.message} onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))} disabled={busy} />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button type="button" className="px-4 py-2 text-sm font-semibold" style={ui.btnPrimaryStyle} onClick={() => void add()} disabled={busy}>
                {busy ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Supprimer l’alerte"
        message="Confirmez la suppression de cette alerte."
        destructive
        busy={busy}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        onConfirm={() => void doDelete()}
      />
    </div>
  );
}
