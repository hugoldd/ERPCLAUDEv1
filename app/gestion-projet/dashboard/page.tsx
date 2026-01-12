'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { supabase, VDisponibiliteTempsReel, VConflitSuroccupation, VConflitBudget, Consultant, Projet } from '@/lib/supabase';

export default function DashboardGestionProjetPage() {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dispo, setDispo] = useState<VDisponibiliteTempsReel[]>([]);
  const [conflitsCharge, setConflitsCharge] = useState<VConflitSuroccupation[]>([]);
  const [conflitsBudget, setConflitsBudget] = useState<VConflitBudget[]>([]);

  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);

  const consultantsById = useMemo(() => {
    const m = new Map<string, string>();
    consultants.forEach((c) => m.set(c.id, `${c.nom} ${c.prenom}`));
    return m;
  }, [consultants]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [cRes, pRes, dispoRes, confChargeRes, confBudgetRes] = await Promise.all([
        supabase
          .from('consultants')
          .select('id, nom, prenom, email, telephone, statut, type_contrat, date_entree, date_sortie, tjm, disponibilite_pct, photo_url, cv_url, notes, created_at, updated_at')
          .order('nom', { ascending: true }),
        supabase
          .from('projets')
          .select('id, numero_projet, commande_id, client_id, titre, statut, date_creation, date_affectation, date_debut_prevue, date_fin_prevue, priorite, budget_total, notes_affectation, charge_totale_estimee_jours')
          .order('date_creation', { ascending: false }),
        supabase.from('v_disponibilite_temps_reel').select('*'),
        supabase
          .from('v_conflits_suroccupation')
          .select('consultant_id, jour, total_charge_pct, niveau_alerte')
          .order('jour', { ascending: false })
          .limit(50),
        supabase
          .from('v_conflits_budget')
          .select('projet_id, numero_projet, titre, budget_total, cout_reserve, depassement')
          .order('depassement', { ascending: false })
          .limit(50),
      ]);

      if (cRes.error) throw cRes.error;
      if (pRes.error) throw pRes.error;

      setConsultants((cRes.data || []) as Consultant[]);
      setProjets((pRes.data || []) as Projet[]);

      if (!dispoRes.error) setDispo((dispoRes.data || []) as VDisponibiliteTempsReel[]);
      if (!confChargeRes.error) setConflitsCharge((confChargeRes.data || []) as VConflitSuroccupation[]);
      if (!confBudgetRes.error) setConflitsBudget((confBudgetRes.data || []) as VConflitBudget[]);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const tauxOccupationMoyen = useMemo(() => {
    if (dispo.length === 0) return null;
    const sum = dispo.reduce((acc, r) => acc + (r.reserved_pct || 0), 0);
    return Math.round((sum / dispo.length) * 10) / 10;
  }, [dispo]);

  const Card = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
      <div className="text-sm" style={{ color: colors.textSecondary }}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              KPIs + conflits (README) : sur-allocation et dépassement budget.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            Rafraîchir
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: colors.danger, color: colors.danger }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card label="Consultants suivis" value={consultants.length} />
        <Card label="Projets" value={projets.length} />
        <Card label="Sur-allocations" value={conflitsCharge.length} />
        <Card label="Occupation moyenne (réservé %)" value={tauxOccupationMoyen === null ? '—' : `${tauxOccupationMoyen}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
          <h2 className="text-base font-semibold">Disponibilité temps réel</h2>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Base - réservations actives - indisponibilités.
          </p>

          {loading ? (
            <div className="mt-3 text-sm" style={{ color: colors.textSecondary }}>
              Chargement…
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: colors.border }}>
                    <th className="px-3 py-2 text-left font-medium">Consultant</th>
                    <th className="px-3 py-2 text-left font-medium">Base</th>
                    <th className="px-3 py-2 text-left font-medium">Réservé</th>
                    <th className="px-3 py-2 text-left font-medium">Indispo</th>
                    <th className="px-3 py-2 text-left font-medium">Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {dispo.map((r) => (
                    <tr key={r.consultant_id} className="border-b" style={{ borderColor: colors.border }}>
                      <td className="px-3 py-2">{consultantsById.get(r.consultant_id) || r.consultant_id}</td>
                      <td className="px-3 py-2">{r.base_pct}%</td>
                      <td className="px-3 py-2">{r.reserved_pct}%</td>
                      <td className="px-3 py-2">{r.indispo_pct}%</td>
                      <td className="px-3 py-2 font-medium">{r.disponible_pct}%</td>
                    </tr>
                  ))}
                  {dispo.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }} colSpan={5}>
                        Aucune donnée.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
          <h2 className="text-base font-semibold">Conflits</h2>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Sur-allocation et dépassement budget.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm font-medium">Sur-allocations (derniers 50)</div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: colors.border }}>
                      <th className="px-3 py-2 text-left font-medium">Consultant</th>
                      <th className="px-3 py-2 text-left font-medium">Jour</th>
                      <th className="px-3 py-2 text-left font-medium">Charge</th>
                      <th className="px-3 py-2 text-left font-medium">Niveau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflitsCharge.map((c, idx) => (
                      <tr key={`${c.consultant_id}-${c.jour}-${idx}`} className="border-b" style={{ borderColor: colors.border }}>
                        <td className="px-3 py-2">{consultantsById.get(c.consultant_id) || c.consultant_id}</td>
                        <td className="px-3 py-2">{c.jour}</td>
                        <td className="px-3 py-2">{c.total_charge_pct}%</td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex rounded-full border px-2 py-1 text-xs"
                            style={{
                              borderColor: c.niveau_alerte === 'rouge' ? colors.danger : colors.warning,
                              color: c.niveau_alerte === 'rouge' ? colors.danger : colors.warning,
                            }}
                          >
                            {c.niveau_alerte}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {conflitsCharge.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }} colSpan={4}>
                          Aucun conflit.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Dépassements budget (top 50)</div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: colors.border }}>
                      <th className="px-3 py-2 text-left font-medium">Projet</th>
                      <th className="px-3 py-2 text-left font-medium">Budget</th>
                      <th className="px-3 py-2 text-left font-medium">Coût réservé</th>
                      <th className="px-3 py-2 text-left font-medium">Dépassement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflitsBudget.map((b) => (
                      <tr key={b.projet_id} className="border-b" style={{ borderColor: colors.border }}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{b.numero_projet}</div>
                          <div className="text-xs" style={{ color: colors.textSecondary }}>
                            {b.titre}
                          </div>
                        </td>
                        <td className="px-3 py-2">{b.budget_total}</td>
                        <td className="px-3 py-2">{b.cout_reserve}</td>
                        <td className="px-3 py-2 font-medium" style={{ color: colors.danger }}>
                          {b.depassement}
                        </td>
                      </tr>
                    ))}
                    {conflitsBudget.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }} colSpan={4}>
                          Aucun dépassement.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
