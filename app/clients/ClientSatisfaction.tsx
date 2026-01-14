'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { ClientSatisfactionEvaluation } from '@/types/clients';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

type FormState = {
  score: number;
  categorie: string;
  commentaire: string;
  source: string;
  date_evaluation: string; // YYYY-MM-DD
};

type ScoreBucket = { label: string; count: number };

export default function ClientSatisfaction(props: { clientId: string }) {
  const ui = useClientUi();

  const [items, setItems] = useState<ClientSatisfactionEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(() => ({
    score: 5,
    categorie: 'general',
    commentaire: '',
    source: 'interne',
    date_evaluation: new Date().toISOString().slice(0, 10)
  }));

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('client_satisfaction_evaluations')
        .select('*')
        .eq('client_id', props.clientId)
        .order('date_evaluation', { ascending: false });

      if (e) throw e;
      setItems((data ?? []) as ClientSatisfactionEvaluation[]);
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

  const avg = useMemo(() => {
    if (items.length === 0) return null;
    const s = items.reduce((acc, x) => acc + (x.score ?? 0), 0);
    return s / items.length;
  }, [items]);

  const chartData = useMemo<ScoreBucket[]>(() => {
    const buckets: ScoreBucket[] = [
      { label: '1', count: 0 },
      { label: '2', count: 0 },
      { label: '3', count: 0 },
      { label: '4', count: 0 },
      { label: '5', count: 0 }
    ];
    for (const it of items) {
      const idx = Math.min(5, Math.max(1, it.score ?? 0)) - 1;
      if (buckets[idx]) buckets[idx].count += 1;
    }
    return buckets;
  }, [items]);

  const validate = (f: FormState): string | null => {
    if (!f.date_evaluation) return 'La date est obligatoire.';
    if (Number.isNaN(Number(f.score)) || f.score < 1 || f.score > 5) return 'Score invalide.';
    if (!f.categorie.trim()) return 'La catégorie est obligatoire.';
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
        date_evaluation: form.date_evaluation,
        score: form.score,
        categorie: form.categorie.trim(),
        commentaire: form.commentaire.trim() || null,
        source: form.source.trim() || 'interne'
      };

      const { error: e1 } = await supabase.from('client_satisfaction_evaluations').insert(payload);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'system',
        titre: 'Évaluation satisfaction ajoutée',
        description: `Score ${payload.score}/5 (${payload.categorie})`,
        metadata: payload
      });

      setForm((s) => ({ ...s, commentaire: '' }));
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
          title="Satisfaction"
          subtitle="Évaluations et distribution des scores"
          right={
            <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
              {loading ? 'Chargement...' : 'Rafraîchir'}
            </button>
          }
        />

        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Résumé</div>
            <div className="mt-2 text-sm opacity-80">
              Moyenne : <span className="font-semibold">{avg === null ? '—' : `${avg.toFixed(2)} / 5`}</span> · Total : {items.length}
            </div>

            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Ajouter une évaluation</div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm opacity-80">Date</div>
                <input
                  type="date"
                  className="mt-1 w-full px-3 py-2"
                  style={ui.inputStyle}
                  value={form.date_evaluation}
                  onChange={(e) => setForm((s) => ({ ...s, date_evaluation: e.target.value }))}
                  disabled={busy}
                />
              </div>
              <div>
                <div className="text-sm opacity-80">Score (1..5)</div>
                <select
                  className="mt-1 w-full px-3 py-2"
                  style={ui.inputStyle}
                  value={String(form.score)}
                  onChange={(e) => setForm((s) => ({ ...s, score: Number(e.target.value) }))}
                  disabled={busy}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>
              <div>
                <div className="text-sm opacity-80">Catégorie</div>
                <input
                  className="mt-1 w-full px-3 py-2"
                  style={ui.inputStyle}
                  value={form.categorie}
                  onChange={(e) => setForm((s) => ({ ...s, categorie: e.target.value }))}
                  disabled={busy}
                />
              </div>
              <div>
                <div className="text-sm opacity-80">Source</div>
                <input
                  className="mt-1 w-full px-3 py-2"
                  style={ui.inputStyle}
                  value={form.source}
                  onChange={(e) => setForm((s) => ({ ...s, source: e.target.value }))}
                  disabled={busy}
                />
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm opacity-80">Commentaire</div>
                <textarea
                  className="mt-1 w-full px-3 py-2 min-h-[110px]"
                  style={ui.inputStyle}
                  value={form.commentaire}
                  onChange={(e) => setForm((s) => ({ ...s, commentaire: e.target.value }))}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
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

        {loading ? <div className="mt-4 text-sm opacity-80">Chargement...</div> : null}
      </div>
    </div>
  );
}
