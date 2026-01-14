'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge, SectionHeader, formatDateFR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { ClientActivityEvent, ClientActivityEventType } from '@/types/clients';

type FormState = {
  type_event: ClientActivityEventType;
  titre: string;
  description: string;
};

export default function ClientTimeline(props: { clientId: string }) {
  const ui = useClientUi();

  const [items, setItems] = useState<ClientActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [form, setForm] = useState<FormState>({
    type_event: 'system',
    titre: '',
    description: ''
  });

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('client_activity_events')
        .select('*')
        .eq('client_id', props.clientId)
        .order('created_at', { ascending: false });

      if (e) throw e;
      setItems((data ?? []) as ClientActivityEvent[]);
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
    return items.filter((ev) => {
      if (typeFilter !== 'all' && ev.type_event !== typeFilter) return false;
      if (!s) return true;
      const blob = `${ev.type_event ?? ''} ${ev.titre ?? ''} ${ev.description ?? ''}`.toLowerCase();
      return blob.includes(s);
    });
  }, [items, q, typeFilter]);

  const tone = (t: string) => {
    if (t === 'alerte') return 'danger';
    if (t === 'finance') return 'accent';
    if (t === 'document') return 'warning';
    if (t === 'projet' || t === 'commande') return 'success';
    return 'neutral';
  };

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
        type_event: form.type_event,
        titre: form.titre.trim(),
        description: form.description.trim() || null,
        metadata: {}
      };

      const { error: e1 } = await supabase.from('client_activity_events').insert(payload);
      if (e1) throw e1;

      setForm({ type_event: 'system', titre: '', description: '' });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-3 sm:p-0">
      <div className="p-4 sm:p-5" style={ui.cardStyle}>
        <SectionHeader
          title="Timeline"
          subtitle="Journal d’activité client (filtrable, ajout manuel possible)"
          right={
            <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
              {loading ? 'Chargement...' : 'Rafraîchir'}
            </button>
          }
        />

        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Filtrer</div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                className="px-3 py-2 sm:col-span-2"
                style={ui.inputStyle}
                placeholder="Recherche"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={loading}
              />
              <select
                className="px-3 py-2"
                style={ui.inputStyle}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                disabled={loading}
              >
                <option value="all">Tous</option>
                <option value="note">note</option>
                <option value="contact">contact</option>
                <option value="commande">commande</option>
                <option value="projet">projet</option>
                <option value="finance">finance</option>
                <option value="alerte">alerte</option>
                <option value="document">document</option>
                <option value="system">system</option>
              </select>
            </div>

            {loading ? <div className="mt-4 text-sm opacity-80">Chargement...</div> : null}
            {!loading && filtered.length === 0 ? <div className="mt-4 text-sm opacity-80">Aucun événement.</div> : null}

            <div className="mt-4 grid grid-cols-1 gap-3">
              {filtered.map((ev) => (
                <div key={ev.id} className="p-3" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 14 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge label={ev.type_event} tone={tone(ev.type_event)} />
                        <div className="text-xs opacity-70">{formatDateFR(ev.created_at)}</div>
                      </div>
                      <div className="mt-2 font-semibold text-sm">{ev.titre}</div>
                      {ev.description ? <div className="mt-1 text-sm opacity-85 whitespace-pre-wrap">{ev.description}</div> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Ajouter un événement</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <div className="text-sm opacity-80">Type</div>
                <select
                  className="mt-1 w-full px-3 py-2"
                  style={ui.inputStyle}
                  value={form.type_event}
                  onChange={(e) => setForm((s) => ({ ...s, type_event: e.target.value as ClientActivityEventType }))}
                  disabled={busy}
                >
                  <option value="system">system</option>
                  <option value="note">note</option>
                  <option value="contact">contact</option>
                  <option value="commande">commande</option>
                  <option value="projet">projet</option>
                  <option value="finance">finance</option>
                  <option value="alerte">alerte</option>
                  <option value="document">document</option>
                </select>
              </div>

              <div>
                <div className="text-sm opacity-80">Titre *</div>
                <input
                  className="mt-1 w-full px-3 py-2"
                  style={ui.inputStyle}
                  value={form.titre}
                  onChange={(e) => setForm((s) => ({ ...s, titre: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div>
                <div className="text-sm opacity-80">Description</div>
                <textarea
                  className="mt-1 w-full px-3 py-2 min-h-[140px]"
                  style={ui.inputStyle}
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-semibold"
                  style={ui.btnPrimaryStyle}
                  onClick={() => void add()}
                  disabled={busy}
                >
                  {busy ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
