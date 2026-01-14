'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge, ConfirmModal, formatDateFR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { ClientAlerte, ClientAlerteNiveau } from '@/types/clients';

type FormState = {
  niveau: ClientAlerteNiveau;
  titre: string;
  message: string;
  date_echeance: string; // YYYY-MM-DD
  actif: boolean;
  resolved_at: string;
};

export default function ClientAlertes(props: { clientId: string }) {
  const ui = useClientUi();
  const toInputDate = (value: string | null | undefined) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value.slice(0, 10);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const toInputDateTime = (value: string | null | undefined) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const fromInputDateTime = (value: string) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const [items, setItems] = useState<ClientAlerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');

  const [form, setForm] = useState<FormState>(() => ({
    niveau: 'warning',
    titre: '',
    message: '',
    date_echeance: '',
    actif: true,
    resolved_at: ''
  }));

  const [editId, setEditId] = useState<string | null>(null);

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
    if (!s) return items;
    return items.filter((a) => `${a.titre ?? ''} ${a.message ?? ''} ${a.niveau ?? ''}`.toLowerCase().includes(s));
  }, [items, q]);

  const activeAlerts = useMemo(() => filtered.filter((a) => a.actif), [filtered]);
  const resolvedAlerts = useMemo(() => filtered.filter((a) => !a.actif), [filtered]);

  const levelConfig = (niveau: ClientAlerteNiveau) => {
    if (niveau === 'danger') return { icon: AlertTriangle, color: ui.c.danger };
    if (niveau === 'warning') return { icon: AlertCircle, color: ui.c.warning };
    return { icon: Info, color: ui.c.accent };
  };

  const validate = (f: FormState): string | null => {
    if (!f.titre.trim()) return 'Le titre est obligatoire.';
    return null;
  };

  const createOrUpdate = async () => {
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
        date_echeance: form.date_echeance || null
      };

      if (editId) {
        const resolvedAt =
          form.actif ? null : (fromInputDateTime(form.resolved_at) ?? new Date().toISOString());
        const { error: e1 } = await supabase.from('client_alertes').update({
          ...payload,
          actif: form.actif,
          resolved_at: resolvedAt,
          updated_at: new Date().toISOString()
        }).eq('id', editId);
        if (e1) throw e1;

        await supabase.from('client_activity_events').insert({
          client_id: props.clientId,
          type_event: 'alerte',
          titre: 'Alerte modifiee',
          description: payload.titre,
          metadata: { alerte_id: editId, ...payload }
        });
      } else {
        const { error: e1 } = await supabase.from('client_alertes').insert({ ...payload, actif: true });
        if (e1) throw e1;

        await supabase.from('client_activity_events').insert({
          client_id: props.clientId,
          type_event: 'alerte',
          titre: 'Alerte creee',
          description: payload.titre,
          metadata: payload
        });
      }

      setForm({ niveau: 'warning', titre: '', message: '', date_echeance: '', actif: true, resolved_at: '' });
      setEditId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (alert: ClientAlerte) => {
    setEditId(alert.id);
    setForm({
      niveau: alert.niveau,
      titre: alert.titre ?? '',
      message: alert.message ?? '',
      date_echeance: toInputDate(alert.date_echeance),
      actif: alert.actif,
      resolved_at: toInputDateTime(alert.resolved_at)
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ niveau: 'warning', titre: '', message: '', date_echeance: '', actif: true, resolved_at: '' });
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
        titre: a.actif ? 'Alerte resolue' : 'Alerte reactivee',
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
        titre: 'Alerte supprimee',
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-semibold">Alertes actives ({activeCount})</div>
            <div className="text-sm" style={{ color: ui.c.muted }}>Suivi des alertes et historiques</div>
          </div>
          <div className="flex gap-2">
            <input
              className="px-3 py-2 text-sm rounded-lg"
              style={{ backgroundColor: ui.c.bg, border: `1px solid ${ui.c.border}`, color: ui.c.text }}
              placeholder="Rechercher"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={loading}
            />
            <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
              {loading ? 'Chargement...' : 'Rafraichir'}
            </button>
          </div>
        </div>

        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {activeAlerts.map((alert) => {
            const config = levelConfig(alert.niveau);
            const Icon = config.icon;
            return (
              <div key={alert.id} className="p-4 rounded-xl" style={{ backgroundColor: ui.c.card, border: `2px solid ${config.color}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}22` }}>
                    <Icon size={18} style={{ color: config.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge label={alert.niveau} tone={alert.niveau === 'danger' ? 'danger' : alert.niveau === 'warning' ? 'warning' : 'accent'} />
                      <div className="text-xs" style={{ color: ui.c.muted }}>{formatDateFR(alert.created_at)}</div>
                    </div>
                    <div className="mt-2 font-semibold">{alert.titre}</div>
                    {alert.message ? <div className="mt-2 text-sm" style={{ color: ui.c.muted }}>{alert.message}</div> : null}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: config.color, color: 'white' }}
                    onClick={() => void toggleResolve(alert)}
                    disabled={busy}
                  >
                    Resoudre
                  </button>
                  <button
                    type="button"
                    className="py-2 px-3 rounded-lg text-sm"
                    style={ui.btnStyle}
                    onClick={() => startEdit(alert)}
                    disabled={busy}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="py-2 px-3 rounded-lg text-sm"
                    style={ui.btnStyle}
                    onClick={() => askDelete(alert)}
                    disabled={busy}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
          {!loading && activeAlerts.length === 0 ? (
            <div className="text-sm" style={{ color: ui.c.muted }}>Aucune alerte active.</div>
          ) : null}
        </div>

        <div className="mt-6">
          <div className="font-semibold">Historique des alertes resolues</div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `2px solid ${ui.c.border}` }}>
                  <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Niveau</th>
                  <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Titre</th>
                  <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Creation</th>
                  <th className="text-left py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Resolution</th>
                  <th className="text-right py-3 px-3 text-xs uppercase" style={{ color: ui.c.muted }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resolvedAlerts.map((alert) => (
                  <tr key={alert.id} style={{ borderBottom: `1px solid ${ui.c.border}` }}>
                    <td className="py-3 px-3">
                      <Badge label={alert.niveau} tone={alert.niveau === 'danger' ? 'danger' : alert.niveau === 'warning' ? 'warning' : 'accent'} />
                    </td>
                    <td className="py-3 px-3 text-sm">{alert.titre}</td>
                    <td className="py-3 px-3 text-sm" style={{ color: ui.c.muted }}>{formatDateFR(alert.created_at)}</td>
                    <td className="py-3 px-3 text-sm" style={{ color: ui.c.muted }}>{formatDateFR(alert.resolved_at)}</td>
                    <td className="py-3 px-3 text-right">
                      <button type="button" className="px-3 py-1 text-xs" style={ui.btnStyle} onClick={() => startEdit(alert)} disabled={busy}>
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && resolvedAlerts.length === 0 ? (
              <div className="mt-3 text-sm" style={{ color: ui.c.muted }}>Aucune alerte resolue.</div>
            ) : null}
          </div>
        </div>

        <div className="mt-6" style={{ borderTop: `1px solid ${ui.c.border}`, backgroundColor: editId ? ui.editBg : 'transparent' }}>
          <div className="mt-5 font-semibold">{editId ? 'Modifier une alerte' : 'Creer une alerte'}</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-sm" style={{ color: ui.c.muted }}>Niveau</div>
              <select
                className="mt-1 w-full px-3 py-2"
                style={{ ...ui.inputStyle, backgroundColor: ui.c.bg, color: ui.c.text }}
                value={form.niveau}
                onChange={(e) => setForm((s) => ({ ...s, niveau: e.target.value as ClientAlerteNiveau }))}
                disabled={busy}
              >
                <option value="info">info</option>
                <option value="warning">warning</option>
                <option value="danger">danger</option>
              </select>
            </div>
            <div>
              <div className="text-sm" style={{ color: ui.c.muted }}>Echeance</div>
              <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} type="date" value={form.date_echeance} onChange={(e) => setForm((s) => ({ ...s, date_echeance: e.target.value }))} disabled={busy} />
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm" style={{ color: ui.c.muted }}>Titre *</div>
              <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.titre} onChange={(e) => setForm((s) => ({ ...s, titre: e.target.value }))} disabled={busy} />
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm" style={{ color: ui.c.muted }}>Message</div>
              <textarea className="mt-1 w-full px-3 py-2 min-h-[120px]" style={ui.inputStyle} value={form.message} onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))} disabled={busy} />
            </div>
            {editId ? (
              <>
                <div>
                  <div className="text-sm" style={{ color: ui.c.muted }}>Statut</div>
                  <label className="mt-2 flex items-center gap-2 text-sm" style={{ color: ui.c.text }}>
                    <input
                      type="checkbox"
                      checked={form.actif}
                      onChange={(e) => setForm((s) => ({ ...s, actif: e.target.checked }))}
                      disabled={busy}
                    />
                    Alerte active
                  </label>
                </div>
                <div>
                  <div className="text-sm" style={{ color: ui.c.muted }}>Resolution</div>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full px-3 py-2"
                    style={ui.inputStyle}
                    value={form.resolved_at}
                    onChange={(e) => setForm((s) => ({ ...s, resolved_at: e.target.value }))}
                    disabled={busy || form.actif}
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            {editId ? (
              <button type="button" className="px-4 py-2 text-sm" style={ui.btnStyle} onClick={cancelEdit} disabled={busy}>
                Annuler
              </button>
            ) : null}
            <button type="button" className="px-4 py-2 text-sm font-semibold" style={ui.btnPrimaryStyle} onClick={() => void createOrUpdate()} disabled={busy}>
              {busy ? 'Creation...' : editId ? 'Mettre a jour' : 'Creer'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Supprimer l'alerte"
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
