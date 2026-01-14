'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useClientUi } from '@/app/clients/_ui';
import type { ClientSatisfactionEvaluation } from '@/types/clients';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

type FormState = {
  score: number;
  categorie: string;
  commentaire: string;
  source: string;
  date_evaluation: string; // YYYY-MM-DD
};

type MonthPoint = { month: string; score: number };

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

  const [editId, setEditId] = useState<string | null>(null);

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

  const last = items[0];

  const chartData = useMemo<MonthPoint[]>(() => {
    const map = new Map<string, { sum: number; count: number }>();
    const monthKey = (d: string) => {
      const dt = new Date(d);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    };

    for (const it of items) {
      const k = monthKey(it.date_evaluation);
      const prev = map.get(k) ?? { sum: 0, count: 0 };
      prev.sum += it.score ?? 0;
      prev.count += 1;
      map.set(k, prev);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, score: v.count ? v.sum / v.count : 0 }));
  }, [items]);

  const validate = (f: FormState): string | null => {
    if (!f.date_evaluation) return 'La date est obligatoire.';
    if (Number.isNaN(Number(f.score)) || f.score < 1 || f.score > 5) return 'Score invalide.';
    if (!f.categorie.trim()) return 'La categorie est obligatoire.';
    return null;
  };

  const addOrUpdate = async () => {
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

      if (editId) {
        const { error: e1 } = await supabase.from('client_satisfaction_evaluations').update(payload).eq('id', editId);
        if (e1) throw e1;

        await supabase.from('client_activity_events').insert({
          client_id: props.clientId,
          type_event: 'system',
          titre: 'Evaluation satisfaction modifiee',
          description: `Score ${payload.score}/5 (${payload.categorie})`,
          metadata: payload
        });
      } else {
        const { error: e1 } = await supabase.from('client_satisfaction_evaluations').insert(payload);
        if (e1) throw e1;

        await supabase.from('client_activity_events').insert({
          client_id: props.clientId,
          type_event: 'system',
          titre: 'Evaluation satisfaction ajoutee',
          description: `Score ${payload.score}/5 (${payload.categorie})`,
          metadata: payload
        });
      }

      setForm((s) => ({ ...s, commentaire: '' }));
      setEditId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (evaluation: ClientSatisfactionEvaluation) => {
    setEditId(evaluation.id);
    setForm({
      score: evaluation.score ?? 5,
      categorie: evaluation.categorie ?? 'general',
      commentaire: evaluation.commentaire ?? '',
      source: evaluation.source ?? 'interne',
      date_evaluation: evaluation.date_evaluation ?? new Date().toISOString().slice(0, 10)
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({
      score: 5,
      categorie: 'general',
      commentaire: '',
      source: 'interne',
      date_evaluation: new Date().toISOString().slice(0, 10)
    });
  };

  const remove = async (evaluation: ClientSatisfactionEvaluation) => {
    setError(null);
    setBusy(true);
    try {
      const { error: e1 } = await supabase.from('client_satisfaction_evaluations').delete().eq('id', evaluation.id);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'system',
        titre: 'Evaluation satisfaction supprimee',
        description: `evaluation_id=${evaluation.id}`,
        metadata: { evaluation_id: evaluation.id }
      });

      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  const renderStars = (score: number) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          fill={star <= score ? ui.c.warning : 'none'}
          stroke={star <= score ? ui.c.warning : ui.c.border}
        />
      ))}
    </div>
  );

  return (
    <div className="p-3 sm:p-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard title="Score moyen" value={avg === null ? '-' : avg.toFixed(2)} accent={ui.c.warning} />
            <KpiCard title="Evaluations" value={String(items.length)} accent={ui.c.accent} />
            <KpiCard title="Dernier score" value={last ? `${last.score}/5` : '-'} accent={ui.c.success} />
            <KpiCard title="Derniere date" value={last ? last.date_evaluation : '-'} accent={ui.c.text} />
          </div>

          <div className="p-4" style={{ ...ui.cardStyle, backgroundColor: editId ? ui.editBg : ui.c.card }}>
            <div className="font-semibold">Evolution du score</div>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={220} minWidth={0}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ui.c.border} />
                  <XAxis dataKey="month" stroke={ui.c.muted} />
                  <YAxis stroke={ui.c.muted} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                  <Tooltip contentStyle={{ backgroundColor: ui.c.card, border: `1px solid ${ui.c.border}` }} />
                  <Line type="monotone" dataKey="score" stroke={ui.c.warning} strokeWidth={2} dot={{ fill: ui.c.warning, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className="font-semibold">Evaluations detaillees</div>
            <div className="mt-3 space-y-3">
              {items.map((evaluation) => (
                <div key={evaluation.id} className="p-4 rounded-xl" style={{ backgroundColor: ui.c.card, border: `1px solid ${ui.c.border}` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{evaluation.categorie ?? 'Categorie'}</div>
                      <div className="text-xs" style={{ color: ui.c.muted }}>
                        {evaluation.date_evaluation} · {evaluation.source ?? 'interne'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{evaluation.score}/5</span>
                      <button type="button" className="px-2 py-1 text-xs" style={ui.btnStyle} onClick={() => startEdit(evaluation)} disabled={busy}>
                        Modifier
                      </button>
                      <button type="button" className="px-2 py-1 text-xs" style={{ ...ui.btnStyle, border: `1px solid ${ui.c.danger}` }} onClick={() => void remove(evaluation)} disabled={busy}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {renderStars(Math.round(evaluation.score ?? 0))}
                    <span className="text-xs" style={{ color: ui.c.muted }}>Score</span>
                  </div>
                  {evaluation.commentaire ? (
                    <div className="mt-3 text-sm" style={{ color: ui.c.text }}>
                      {evaluation.commentaire}
                    </div>
                  ) : null}
                </div>
              ))}
              {!loading && items.length === 0 ? <div className="text-sm" style={{ color: ui.c.muted }}>Aucune evaluation.</div> : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4" style={ui.cardStyle}>
            <div className="font-semibold">{editId ? 'Modifier une evaluation' : 'Ajouter une evaluation'}</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Date</div>
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
                <div className="text-sm" style={{ color: ui.c.muted }}>Score (1..5)</div>
                <select
                  className="mt-1 w-full px-3 py-2"
                  style={{ ...ui.inputStyle, backgroundColor: ui.c.bg, color: ui.c.text }}
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
                <div className="text-sm" style={{ color: ui.c.muted }}>Categorie</div>
                <input
                  className="mt-1 w-full px-3 py-2"
                  style={ui.inputStyle}
                  value={form.categorie}
                  onChange={(e) => setForm((s) => ({ ...s, categorie: e.target.value }))}
                  disabled={busy}
                />
              </div>
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Source</div>
                <input
                  className="mt-1 w-full px-3 py-2"
                  style={ui.inputStyle}
                  value={form.source}
                  onChange={(e) => setForm((s) => ({ ...s, source: e.target.value }))}
                  disabled={busy}
                />
              </div>
              <div>
                <div className="text-sm" style={{ color: ui.c.muted }}>Commentaire</div>
                <textarea
                  className="mt-1 w-full px-3 py-2 min-h-[110px]"
                  style={ui.inputStyle}
                  value={form.commentaire}
                  onChange={(e) => setForm((s) => ({ ...s, commentaire: e.target.value }))}
                  disabled={busy}
                />
              </div>
              <div className="flex justify-end gap-2">
                {editId ? (
                  <button type="button" className="px-4 py-2 text-sm" style={ui.btnStyle} onClick={cancelEdit} disabled={busy}>
                    Annuler
                  </button>
                ) : null}
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-semibold"
                  style={ui.btnPrimaryStyle}
                  onClick={() => void addOrUpdate()}
                  disabled={busy}
                >
                  {busy ? 'Enregistrement...' : editId ? 'Mettre a jour' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>

          {error ? <div className="text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}
        </div>
      </div>

      {loading ? <div className="mt-3 text-sm" style={{ color: ui.c.muted }}>Chargement...</div> : null}
    </div>
  );
}

function KpiCard({ title, value, accent }: { title: string; value: string; accent: string }) {
  const ui = useClientUi();
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: ui.c.card, border: `1px solid ${ui.c.border}` }}>
      <div className="text-xs" style={{ color: ui.c.muted }}>{title}</div>
      <div className="mt-2 text-2xl font-semibold" style={{ color: accent }}>{value}</div>
    </div>
  );
}
