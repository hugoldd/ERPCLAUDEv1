'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

type ReservationStatut = 'prevue' | 'confirmee' | 'en_cours' | 'terminee' | 'annulee';

type ClientRow = {
  id: string;
  nom: string;
};

type ConsultantRow = {
  id: string;
  nom: string;
  prenom: string;
  statut: string;
};

type CompetenceReq = {
  competence_id: string;
  nom: string;
  code: string;
  niveau_requis: string;
  obligatoire: boolean;
};

type PlanifiableRow = {
  prestation_id: string;
  commande_id: string | null;
  code_prestation: string;
  type_prestation: string;
  libelle: string;
  quantite: number;
  prix_unitaire: number | null;
  montant_total: number | null;

  competences: CompetenceReq[];

  numero_commande: string | null;
  statut_commande: string | null;

  projet_id: string;
  numero_projet: string;
  projet_titre: string;
  statut_projet: string;
  date_debut_prevue: string | null;
  date_fin_prevue: string | null;
  priorite: string;
  dp_affecte_id: string | null;
  date_affectation: string | null;

  complexite?: string | null;
  type_intervention?: string | null;

  client_id: string;
  client_nom: string;
};

type ProjetItem = {
  projet_id: string;
  numero_projet: string;
  projet_titre: string;
  statut_projet: string;
  date_debut_prevue: string | null;
  date_fin_prevue: string | null;
  priorite: string;
  date_affectation: string | null;

  complexite?: string | null;
  type_intervention?: string | null;

  prestations: PlanifiableRow[];
};

type ReservationRow = {
  id: string;
  projet_id: string;
  prestation_id: string | null;
  consultant_id: string;
  date_debut: string;
  date_fin: string;
  charge_pct: number;
  statut: ReservationStatut;
  role_projet: string | null;
  notes: string | null;

  temps_trajet_heures?: number | null;
  categorie_trajet?: string | null;

  consultant: { prenom: string; nom: string } | null;
};

type ConsultantCompetenceRow = {
  competence_id: string;
  niveau_maitrise: string;
};

type PeriodeEviterRow = {
  id: string;
  consultant_id: string;
  date_debut: string;
  date_fin: string;
  type: string; // conges | formation | preference
  motif: string | null;
};

function parseDateOnly(d: string) {
  return new Date(`${d}T00:00:00`);
}

function formatDateFR(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('fr-FR');
}

function formatMoneyEUR(n?: number | null) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

function formatQty(n?: number | null) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
}

function countBusinessDaysInclusive(startISO: string, endISO: string) {
  const start = parseDateOnly(startISO);
  const end = parseDateOnly(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (start.getTime() > end.getTime()) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function reservationUnits(r: { date_debut: string; date_fin: string; charge_pct: number; statut: ReservationStatut }) {
  if (!r.date_debut || !r.date_fin) return 0;
  if (r.statut === 'annulee') return 0;
  const days = countBusinessDaysInclusive(r.date_debut, r.date_fin);
  const units = days * (Number(r.charge_pct ?? 0) / 100);
  return Math.max(0, units);
}

type PrestationStats = {
  planned: number;
  done: number;
  remaining: number;
  sessionsCount: number;
  minStart: string | null;
  maxEnd: string | null;
  statutLabel: 'Non planifié' | 'Partiellement planifié' | 'Entièrement planifié' | 'Réalisé';
};

type ProjetSortMode = 'recent_first' | 'old_first';

type PrestaSortKey =
  | 'commande'
  | 'prestation'
  | 'competences'
  | 'vendu'
  | 'planifie'
  | 'realise'
  | 'reste'
  | 'dates'
  | 'statut';

type SortDir = 'asc' | 'desc';

type ResizeState = {
  table: 'presta' | 'resa';
  index: number;
  startX: number;
  startWidth: number;
  startNextWidth: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toTs(d?: string | null) {
  if (!d) return 0;
  const dt = new Date(d);
  const t = dt.getTime();
  return Number.isNaN(t) ? 0 : t;
}

function normalizeLevel(s?: string | null) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[éèê]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[îï]/g, 'i')
    .replace(/[ô]/g, 'o')
    .replace(/[ûü]/g, 'u');
}

function levelRank(level?: string | null) {
  const x = normalizeLevel(level);
  if (!x) return 0;

  if (x.includes('debut')) return 1;
  if (x.includes('junior')) return 1;
  if (x.includes('apprenti')) return 1;

  if (x.includes('maitr')) return 2;
  if (x.includes('inter')) return 2;

  if (x.includes('confirm')) return 3;
  if (x.includes('senior')) return 4;

  if (x.includes('expert')) return 5;

  return 2;
}

function isBlockingPeriodeType(t?: string | null) {
  const x = normalizeLevel(t);
  return x === 'conges' || x === 'formation';
}

function isPreferencePeriodeType(t?: string | null) {
  const x = normalizeLevel(t);
  return x === 'preference';
}

export default function ReservationsPage() {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [q, setQ] = useState('');

  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const [reservationHasPrestationId, setReservationHasPrestationId] = useState<boolean | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjetId, setSelectedProjetId] = useState<string | null>(null);

  const [selectedPrestationId, setSelectedPrestationId] = useState<string | null>(null);

  const [consultants, setConsultants] = useState<ConsultantRow[]>([]);
  const [projets, setProjets] = useState<ProjetItem[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);

  const [form, setForm] = useState({
    projet_id: '',
    prestation_id: '',
    consultant_id: '',
    date_debut: '',
    date_fin: '',
    charge_pct: 100,
    statut: 'prevue' as ReservationStatut,
    role_projet: '',
    notes: '',
  });

  const [selectionCollapsed, setSelectionCollapsed] = useState(false);

  const [projetSortMode, setProjetSortMode] = useState<ProjetSortMode>('recent_first');

  const [prestaSortKey, setPrestaSortKey] = useState<PrestaSortKey>('prestation');
  const [prestaSortDir, setPrestaSortDir] = useState<SortDir>('asc');

  function togglePrestaSort(key: PrestaSortKey) {
    setPrestaSortKey((cur) => {
      if (cur === key) {
        setPrestaSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return cur;
      }
      setPrestaSortDir('asc');
      return key;
    });
  }

  const PRESTA_DEFAULT_WIDTHS = useMemo(() => [160, 260, 260, 80, 80, 80, 80, 170, 150, 120], []);
  const RESA_DEFAULT_WIDTHS = useMemo(() => [260, 180, 230, 90, 110, 160, 220], []);
  const MIN_COL_WIDTH = 60;

  const [prestaColWidths, setPrestaColWidths] = useState<number[]>(PRESTA_DEFAULT_WIDTHS);
  const [resaColWidths, setResaColWidths] = useState<number[]>(RESA_DEFAULT_WIDTHS);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  const prestaWidthsRef = useRef(prestaColWidths);
  const resaWidthsRef = useRef(resaColWidths);

  useEffect(() => {
    prestaWidthsRef.current = prestaColWidths;
  }, [prestaColWidths]);

  useEffect(() => {
    resaWidthsRef.current = resaColWidths;
  }, [resaColWidths]);

  useEffect(() => {
    try {
      const p = localStorage.getItem('pp_presta_col_widths');
      const r = localStorage.getItem('pp_resa_col_widths');
      if (p) {
        const arr = JSON.parse(p);
        if (Array.isArray(arr) && arr.length === PRESTA_DEFAULT_WIDTHS.length && arr.every((x) => typeof x === 'number')) {
          setPrestaColWidths(arr as number[]);
        }
      }
      if (r) {
        const arr = JSON.parse(r);
        if (Array.isArray(arr) && arr.length === RESA_DEFAULT_WIDTHS.length && arr.every((x) => typeof x === 'number')) {
          setResaColWidths(arr as number[]);
        }
      }
    } catch {
      // silence
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('pp_presta_col_widths', JSON.stringify(prestaColWidths));
    } catch {
      // silence
    }
  }, [prestaColWidths]);

  useEffect(() => {
    try {
      localStorage.setItem('pp_resa_col_widths', JSON.stringify(resaColWidths));
    } catch {
      // silence
    }
  }, [resaColWidths]);

  // ✅ FIX TS : capture non-null resizeState
  useEffect(() => {
    if (!resizeState) return;

    const rs = resizeState;

    function onMove(e: MouseEvent) {
      const delta = e.clientX - rs.startX;

      const currentWidths = rs.table === 'presta' ? [...prestaWidthsRef.current] : [...resaWidthsRef.current];

      const i = rs.index;
      const w1 = rs.startWidth;
      const w2 = rs.startNextWidth;

      let newW1 = w1 + delta;
      let newW2 = w2 - delta;

      const total = w1 + w2;

      newW1 = clamp(newW1, MIN_COL_WIDTH, total - MIN_COL_WIDTH);
      newW2 = total - newW1;

      currentWidths[i] = newW1;
      currentWidths[i + 1] = newW2;

      if (rs.table === 'presta') setPrestaColWidths(currentWidths);
      else setResaColWidths(currentWidths);
    }

    function onUp() {
      setResizeState(null);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizeState]);

  function startResize(table: 'presta' | 'resa', index: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const widths = table === 'presta' ? prestaColWidths : resaColWidths;
    if (index < 0 || index >= widths.length - 1) return;

    setResizeState({
      table,
      index,
      startX: e.clientX,
      startWidth: widths[index],
      startNextWidth: widths[index + 1],
    });
  }

  function resetColumnWidths() {
    setPrestaColWidths(PRESTA_DEFAULT_WIDTHS);
    setResaColWidths(RESA_DEFAULT_WIDTHS);
  }

  function colgroupFrom(widths: number[]) {
    return (
      <colgroup>
        {widths.map((w, idx) => (
          <col key={idx} style={{ width: `${Math.round(w)}px` }} />
        ))}
      </colgroup>
    );
  }

  function sortIndicator(key: PrestaSortKey) {
    if (prestaSortKey !== key) return '↕';
    return prestaSortDir === 'asc' ? '▲' : '▼';
  }

  function headerCell(
    label: string,
    table: 'presta' | 'resa',
    colIndex: number,
    isLast: boolean,
    opts?: { sortable?: boolean; onClick?: () => void; indicator?: string }
  ) {
    const sortable = Boolean(opts?.sortable);
    const indicator = opts?.indicator || '';

    return (
      <div className="relative flex items-center">
        {sortable ? (
          <button
            type="button"
            onClick={opts?.onClick}
            className="inline-flex items-center gap-2 text-left"
            style={{ color: colors.text, cursor: 'pointer' }}
            title="Cliquer pour trier"
          >
            <span className="pr-0">{label}</span>
            <span className="text-xs" style={{ color: colors.textSecondary }}>
              {indicator}
            </span>
          </button>
        ) : (
          <span className="pr-2">{label}</span>
        )}

        {!isLast ? (
          <>
            <div
              className="absolute top-0 right-0 h-full"
              style={{
                width: 1,
                backgroundColor: colors.border,
                opacity: 0.7,
              }}
            />
            <div
              className="absolute top-0 right-0 h-full cursor-col-resize"
              style={{
                width: 10,
                transform: 'translateX(50%)',
              }}
              onMouseDown={(e) => startResize(table, colIndex, e)}
              title="Redimensionner la colonne"
            />
          </>
        ) : null}
      </div>
    );
  }

  async function detectReservationSchema() {
    const test = await supabase.from('reservations').select('prestation_id').limit(1);
    if (test.error) {
      const msg = String(test.error.message || '').toLowerCase();
      if (msg.includes('prestation_id') && (msg.includes('does not exist') || msg.includes('column'))) {
        setReservationHasPrestationId(false);
      } else {
        setReservationHasPrestationId(null);
      }
      return;
    }
    setReservationHasPrestationId(true);
  }

  async function loadConsultants() {
    const cRes = await supabase.from('consultants').select('id, nom, prenom, statut').order('nom', { ascending: true });
    if (cRes.error) throw cRes.error;
    setConsultants((cRes.data || []) as ConsultantRow[]);
  }

  async function loadClients(searchValue: string) {
    setClientsLoading(true);
    try {
      const s = searchValue.trim();

      let query = supabase.from('clients').select('id, nom').order('nom', { ascending: true }).range(0, 999);
      if (s.length > 0) query = query.ilike('nom', `%${s}%`);

      const res = await query;
      if (res.error) throw res.error;

      const data = (res.data || []).map((x: any) => ({ id: String(x.id), nom: String(x.nom) })) as ClientRow[];

      setClients(data);

      if (!selectedClientId && data.length > 0) {
        setSelectedClientId(data[0].id);
      }

      if (selectedClientId && !data.some((c) => c.id === selectedClientId)) {
        setSelectedClientId(data[0]?.id || null);
        setSelectedProjetId(null);
        setSelectedPrestationId(null);
        setProjets([]);
        setReservations([]);
      }
    } finally {
      setClientsLoading(false);
    }
  }

  async function loadProjetsForClient(clientId: string) {
    setError(null);

    const pRes = await supabase
      .from('projets')
      .select(
        `
        *,
        commande:commandes!projets_commande_id_fkey(numero_commande, statut),
        projet_prestations(
          id,
          prestation:prestations(
            *,
            prestation_competences(
              id, niveau_requis, obligatoire,
              competence:competences(id, nom, code)
            )
          )
        )
      `
      )
      .eq('client_id', clientId)
      .in('statut', ['affecte', 'en_cours'])
      .order('date_affectation', { ascending: false });

    if (pRes.error) throw pRes.error;

    const rows = (pRes.data || []) as any[];

    const built: ProjetItem[] = rows.map((p: any) => {
      const ppList: any[] = Array.isArray(p.projet_prestations) ? p.projet_prestations : [];

      const prestations: PlanifiableRow[] = ppList
        .map((pp: any) => pp?.prestation)
        .filter(Boolean)
        .map((pr: any) => {
          const pcList: any[] = Array.isArray(pr.prestation_competences) ? pr.prestation_competences : [];
          const competences: CompetenceReq[] = pcList
            .map((pc: any) => ({
              competence_id: pc?.competence?.id ? String(pc.competence.id) : '',
              nom: String(pc?.competence?.nom ?? ''),
              code: String(pc?.competence?.code ?? ''),
              niveau_requis: String(pc?.niveau_requis ?? ''),
              obligatoire: Boolean(pc?.obligatoire ?? false),
            }))
            .filter((x) => x.competence_id && x.nom);

          return {
            prestation_id: String(pr.id),
            commande_id: pr.commande_id ? String(pr.commande_id) : null,
            code_prestation: String(pr.code_prestation ?? ''),
            type_prestation: String(pr.type_prestation ?? ''),
            libelle: String(pr.libelle ?? ''),
            quantite: Number(pr.quantite ?? 1),
            prix_unitaire: pr.prix_unitaire !== null && pr.prix_unitaire !== undefined ? Number(pr.prix_unitaire) : null,
            montant_total: pr.montant_total !== null && pr.montant_total !== undefined ? Number(pr.montant_total) : null,

            competences,

            numero_commande: p?.commande?.numero_commande ? String(p.commande.numero_commande) : null,
            statut_commande: p?.commande?.statut ? String(p.commande.statut) : null,

            projet_id: String(p.id),
            numero_projet: String(p.numero_projet ?? ''),
            projet_titre: String(p.titre ?? ''),
            statut_projet: String(p.statut ?? ''),
            date_debut_prevue: p.date_debut_prevue ?? null,
            date_fin_prevue: p.date_fin_prevue ?? null,
            priorite: String(p.priorite ?? 'normale'),
            dp_affecte_id: p.dp_affecte_id ? String(p.dp_affecte_id) : null,
            date_affectation: p.date_affectation ?? null,

            complexite: p.complexite ?? null,
            type_intervention: p.type_intervention ?? null,

            client_id: String(p.client_id ?? ''),
            client_nom: '',
          };
        });

      return {
        projet_id: String(p.id),
        numero_projet: String(p.numero_projet ?? ''),
        projet_titre: String(p.titre ?? ''),
        statut_projet: String(p.statut ?? ''),
        date_debut_prevue: p.date_debut_prevue ?? null,
        date_fin_prevue: p.date_fin_prevue ?? null,
        priorite: String(p.priorite ?? 'normale'),
        date_affectation: p.date_affectation ?? null,

        complexite: p.complexite ?? null,
        type_intervention: p.type_intervention ?? null,

        prestations,
      };
    });

    const clientNom = clients.find((c) => c.id === clientId)?.nom || 'Client';
    const builtWithClientName: ProjetItem[] = built.map((proj) => ({
      ...proj,
      prestations: proj.prestations.map((r) => ({ ...r, client_nom: clientNom })),
    }));

    setProjets(builtWithClientName);

    if (!selectedProjetId || !builtWithClientName.some((p) => p.projet_id === selectedProjetId)) {
      setSelectedProjetId(builtWithClientName[0]?.projet_id || null);
    }
  }

  async function loadReservationsForProjet(projetId: string) {
    setError(null);

    const rRes = await supabase
      .from('reservations')
      .select(
        `
        *,
        consultant:consultants!reservations_consultant_id_fkey(prenom,nom)
      `
      )
      .eq('projet_id', projetId)
      .order('date_debut', { ascending: true });

    if (rRes.error) throw rRes.error;

    const data: ReservationRow[] = (rRes.data || []).map((r: any) => ({
      id: String(r.id),
      projet_id: String(r.projet_id),
      prestation_id: r.prestation_id ? String(r.prestation_id) : null,
      consultant_id: String(r.consultant_id),
      date_debut: String(r.date_debut),
      date_fin: String(r.date_fin),
      charge_pct: Number(r.charge_pct ?? 0),
      statut: r.statut as ReservationStatut,
      role_projet: r.role_projet ?? null,
      notes: r.notes ?? null,
      temps_trajet_heures: r.temps_trajet_heures !== undefined && r.temps_trajet_heures !== null ? Number(r.temps_trajet_heures) : null,
      categorie_trajet: r.categorie_trajet ?? null,
      consultant: r.consultant ? { prenom: String(r.consultant.prenom), nom: String(r.consultant.nom) } : null,
    }));

    setReservations(data);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([loadConsultants(), loadClients(''), detectReservationSchema()]);
      } catch (e: any) {
        setError(e?.message || 'Erreur de chargement initial');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadClients(clientSearch);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearch]);

  useEffect(() => {
    if (!selectedClientId) {
      setProjets([]);
      setSelectedProjetId(null);
      setSelectedPrestationId(null);
      setReservations([]);
      setSelectionCollapsed(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadProjetsForClient(selectedClientId);
      } catch (e: any) {
        setError(e?.message || 'Erreur chargement projets du client');
        setProjets([]);
        setSelectedProjetId(null);
        setSelectedPrestationId(null);
        setReservations([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  useEffect(() => {
    setSelectedPrestationId(null);
  }, [selectedProjetId]);

  useEffect(() => {
    if (!selectedProjetId) {
      setReservations([]);
      return;
    }

    (async () => {
      try {
        await loadReservationsForProjet(selectedProjetId);
      } catch (e: any) {
        setError(e?.message || 'Erreur chargement réservations');
        setReservations([]);
      }
    })();
  }, [selectedProjetId]);

  useEffect(() => {
    if (!selectedClientId || !selectedProjetId) return;

    try {
      const mq = window.matchMedia('(max-width: 1024px)');
      if (mq.matches) setSelectionCollapsed(true);
    } catch {
      // silence
    }
  }, [selectedClientId, selectedProjetId]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const filteredProjets = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projets;

    return projets.filter((p) => {
      const hay = [
        p.numero_projet,
        p.projet_titre,
        p.statut_projet,
        p.priorite,
        ...p.prestations.flatMap((x) => [
          x.libelle,
          x.code_prestation,
          x.type_prestation,
          x.numero_commande || '',
          ...x.competences.map((c) => `${c.nom} ${c.code} ${c.niveau_requis}`),
        ]),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(s);
    });
  }, [projets, q]);

  const sortedFilteredProjets = useMemo(() => {
    const list = [...filteredProjets];
    list.sort((a, b) => {
      const ta = toTs(a.date_affectation);
      const tb = toTs(b.date_affectation);

      if (ta !== tb) {
        return projetSortMode === 'recent_first' ? tb - ta : ta - tb;
      }
      const na = (a.numero_projet || '').toLowerCase();
      const nb = (b.numero_projet || '').toLowerCase();
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    });
    return list;
  }, [filteredProjets, projetSortMode]);

  const selectedProjet = useMemo(() => {
    if (!selectedProjetId) return null;
    return sortedFilteredProjets.find((p) => p.projet_id === selectedProjetId) || null;
  }, [sortedFilteredProjets, selectedProjetId]);

  const prestationById = useMemo(() => {
    const map = new Map<string, PlanifiableRow>();
    for (const p of selectedProjet?.prestations || []) {
      map.set(p.prestation_id, p);
    }
    return map;
  }, [selectedProjet]);

  const statsByPrestationId = useMemo(() => {
    const map = new Map<string, PrestationStats>();
    if (!selectedProjet) return map;
    if (reservationHasPrestationId !== true) return map;

    const prestaIds = selectedProjet.prestations.map((x) => x.prestation_id);
    for (const pid of prestaIds) {
      const vendue = Number(prestationById.get(pid)?.quantite ?? 0);

      const res = reservations.filter((r) => r.prestation_id === pid);
      const planned = res.reduce((sum, r) => sum + reservationUnits(r), 0);
      const done = res.filter((r) => r.statut === 'terminee').reduce((sum, r) => sum + reservationUnits(r), 0);

      const remaining = Math.max(0, vendue - planned);

      const activeRes = res.filter((r) => r.statut !== 'annulee');
      const sessionsCount = activeRes.length;

      const minStart = sessionsCount ? activeRes.map((r) => r.date_debut).sort()[0] : null;
      const maxEnd = sessionsCount ? activeRes.map((r) => r.date_fin).sort().slice(-1)[0] : null;

      let statutLabel: PrestationStats['statutLabel'] = 'Non planifié';
      if (vendue > 0 && done >= vendue) statutLabel = 'Réalisé';
      else if (vendue > 0 && planned >= vendue) statutLabel = 'Entièrement planifié';
      else if (planned > 0) statutLabel = 'Partiellement planifié';

      map.set(pid, { planned, done, remaining, sessionsCount, minStart, maxEnd, statutLabel });
    }

    return map;
  }, [reservationHasPrestationId, prestationById, reservations, selectedProjet]);

  function statutRank(label: PrestationStats['statutLabel']) {
    if (label === 'Non planifié') return 0;
    if (label === 'Partiellement planifié') return 1;
    if (label === 'Entièrement planifié') return 2;
    return 3;
  }

  const sortedPrestations = useMemo(() => {
    if (!selectedProjet) return [];

    const list = [...selectedProjet.prestations];

    const getCompetencesKey = (x: PlanifiableRow) =>
      (x.competences || [])
        .map((c) => `${c.nom} ${c.niveau_requis}`.trim())
        .join(' • ')
        .toLowerCase();

    const getVendu = (x: PlanifiableRow) => Number(x.quantite ?? 0);

    const getPlanifie = (x: PlanifiableRow) => {
      if (reservationHasPrestationId === true) return Number(statsByPrestationId.get(x.prestation_id)?.planned ?? 0);
      return 0;
    };

    const getRealise = (x: PlanifiableRow) => {
      if (reservationHasPrestationId === true) return Number(statsByPrestationId.get(x.prestation_id)?.done ?? 0);
      return 0;
    };

    const getReste = (x: PlanifiableRow) => {
      if (reservationHasPrestationId === true) {
        const st = statsByPrestationId.get(x.prestation_id);
        if (st) return st.remaining;
      }
      return Number(x.quantite ?? 0);
    };

    const getDates = (x: PlanifiableRow) => {
      if (reservationHasPrestationId === true) {
        const st = statsByPrestationId.get(x.prestation_id);
        if (st?.minStart) return toTs(st.minStart);
      }
      return 0;
    };

    const getStatut = (x: PlanifiableRow) => {
      if (reservationHasPrestationId === true) {
        const st = statsByPrestationId.get(x.prestation_id);
        if (st) return statutRank(st.statutLabel);
      }
      return 0;
    };

    list.sort((a, b) => {
      let cmp = 0;

      if (prestaSortKey === 'commande') {
        const va = (a.numero_commande || '').toLowerCase();
        const vb = (b.numero_commande || '').toLowerCase();
        cmp = va.localeCompare(vb, 'fr', { sensitivity: 'base' });
      } else if (prestaSortKey === 'prestation') {
        const va = (a.libelle || '').toLowerCase();
        const vb = (b.libelle || '').toLowerCase();
        cmp = va.localeCompare(vb, 'fr', { sensitivity: 'base' });
      } else if (prestaSortKey === 'competences') {
        const va = getCompetencesKey(a);
        const vb = getCompetencesKey(b);
        cmp = va.localeCompare(vb, 'fr', { sensitivity: 'base' });
      } else if (prestaSortKey === 'vendu') {
        cmp = getVendu(a) - getVendu(b);
      } else if (prestaSortKey === 'planifie') {
        cmp = getPlanifie(a) - getPlanifie(b);
      } else if (prestaSortKey === 'realise') {
        cmp = getRealise(a) - getRealise(b);
      } else if (prestaSortKey === 'reste') {
        cmp = getReste(a) - getReste(b);
      } else if (prestaSortKey === 'dates') {
        cmp = getDates(a) - getDates(b);
      } else if (prestaSortKey === 'statut') {
        cmp = getStatut(a) - getStatut(b);
      }

      return prestaSortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [prestaSortDir, prestaSortKey, reservationHasPrestationId, selectedProjet, statsByPrestationId]);

  const visibleReservations = useMemo(() => {
    const base = reservations.filter((r) => r.statut !== 'annulee');

    if (reservationHasPrestationId !== true) return base;
    if (!selectedPrestationId) return base;

    return base.filter((r) => r.prestation_id === selectedPrestationId);
  }, [reservations, reservationHasPrestationId, selectedPrestationId]);

  const selectedPrestation = useMemo(() => {
    if (!selectedPrestationId) return null;
    return prestationById.get(selectedPrestationId) || null;
  }, [prestationById, selectedPrestationId]);

  function togglePrestationSelection(prestationId: string) {
    setSelectedPrestationId((cur) => (cur === prestationId ? null : prestationId));
  }

  function openPlanifier(prestationId?: string) {
    if (!selectedProjetId) return;
    setError(null);
    setWarning(null);
    setEditingReservationId(null);

    const pid = prestationId || selectedPrestationId || '';

    setForm({
      projet_id: selectedProjetId,
      prestation_id: pid,
      consultant_id: '',
      date_debut: '',
      date_fin: '',
      charge_pct: 100,
      statut: 'prevue',
      role_projet: '',
      notes: '',
    });

    setModalOpen(true);
  }

  function openEditReservation(r: ReservationRow) {
    if (!selectedProjetId) return;
    setError(null);
    setWarning(null);
    setEditingReservationId(r.id);

    setForm({
      projet_id: r.projet_id,
      prestation_id: r.prestation_id || '',
      consultant_id: r.consultant_id,
      date_debut: r.date_debut,
      date_fin: r.date_fin,
      charge_pct: r.charge_pct,
      statut: r.statut,
      role_projet: r.role_projet || '',
      notes: r.notes || '',
    });

    setModalOpen(true);
  }

  function validateFormSync() {
    if (!form.projet_id) return 'Projet requis';
    if (!form.consultant_id) return 'Consultant requis';
    if (!form.date_debut) return 'Date début requise';
    if (!form.date_fin) return 'Date fin requise';
    if (form.charge_pct < 0 || form.charge_pct > 100) return 'Charge invalide (0..100)';

    const d1 = parseDateOnly(form.date_debut);
    const d2 = parseDateOnly(form.date_fin);
    if (d1.getTime() > d2.getTime()) return 'La date de fin doit être ≥ date de début';

    if (reservationHasPrestationId === true && !form.prestation_id) {
      return 'Prestation requise (reservations.prestation_id)';
    }

    if (reservationHasPrestationId === true && form.prestation_id) {
      const presta = prestationById.get(form.prestation_id);
      if (!presta) return 'Prestation inconnue';

      const vendue = Number(presta.quantite ?? 0);

      const plannedWithoutCurrent = reservations
        .filter((r) => r.prestation_id === form.prestation_id)
        .filter((r) => r.id !== editingReservationId)
        .reduce((sum, r) => sum + reservationUnits(r), 0);

      const newUnits =
        form.statut === 'annulee'
          ? 0
          : reservationUnits({
              date_debut: form.date_debut,
              date_fin: form.date_fin,
              charge_pct: form.charge_pct,
              statut: form.statut,
            });

      const remaining = Math.max(0, vendue - plannedWithoutCurrent);

      if (newUnits > remaining + 1e-9) {
        return `Quantité planifiée (${formatQty(newUnits)}) > reste à planifier (${formatQty(remaining)}). Ajustez les dates et/ou la charge.`;
      }
    }

    return null;
  }

  function buildOverlapLabel(rows: Array<{ date_debut: string; date_fin: string; projet_id?: string | null }>) {
    return rows
      .slice(0, 3)
      .map((x) => `${formatDateFR(x.date_debut)} → ${formatDateFR(x.date_fin)}`)
      .join(' • ');
  }

  async function validateFormAsync(): Promise<{ blockingError: string | null; warnings: string[] }> {
    const warnings: string[] = [];

    if (reservationHasPrestationId === true && form.prestation_id) {
      const presta = prestationById.get(form.prestation_id);
      if (!presta) return { blockingError: 'Prestation inconnue', warnings };

      const reqs = presta.competences || [];
      if (reqs.length > 0) {
        const competenceIds = reqs.map((r) => r.competence_id).filter(Boolean);

        const ccRes = await supabase
          .from('consultant_competences')
          .select('competence_id, niveau_maitrise')
          .eq('consultant_id', form.consultant_id)
          .in('competence_id', competenceIds);

        if (ccRes.error) {
          return { blockingError: ccRes.error.message || 'Erreur lecture consultant_competences', warnings };
        }

        const map = new Map<string, ConsultantCompetenceRow>();
        for (const row of (ccRes.data || []) as any[]) {
          const cid = row?.competence_id ? String(row.competence_id) : '';
          if (!cid) continue;
          map.set(cid, {
            competence_id: cid,
            niveau_maitrise: String(row?.niveau_maitrise ?? ''),
          });
        }

        for (const req of reqs) {
          const cons = map.get(req.competence_id);

          const reqLabel = `${req.nom}${req.niveau_requis ? ` (${req.niveau_requis})` : ''}`;

          if (!cons) {
            if (req.obligatoire) {
              return { blockingError: `Compétence requise manquante pour le consultant : ${reqLabel}`, warnings };
            }
            warnings.push(`Compétence optionnelle non couverte : ${reqLabel}`);
            continue;
          }

          const rReq = levelRank(req.niveau_requis);
          const rCons = levelRank(cons.niveau_maitrise);

          if (rCons < rReq) {
            const msg = `Niveau insuffisant : ${req.nom} requis "${req.niveau_requis}", consultant "${cons.niveau_maitrise}"`;
            if (req.obligatoire) return { blockingError: msg, warnings };
            warnings.push(msg);
          }
        }
      }
    }

    if (form.consultant_id && form.date_debut && form.date_fin) {
      let rq = supabase
        .from('reservations')
        .select('id, projet_id, date_debut, date_fin, statut')
        .eq('consultant_id', form.consultant_id)
        .neq('statut', 'annulee')
        .lte('date_debut', form.date_fin)
        .gte('date_fin', form.date_debut);

      if (editingReservationId) rq = rq.neq('id', editingReservationId);

      const resOverlap = await rq;
      if (resOverlap.error) {
        return { blockingError: resOverlap.error.message || 'Erreur détection chevauchement réservations', warnings };
      }

      const overlaps = (resOverlap.data || []) as any[];
      if (overlaps.length > 0) {
        const label = buildOverlapLabel(overlaps.map((x) => ({ date_debut: String(x.date_debut), date_fin: String(x.date_fin) })));
        return {
          blockingError: `Indisponibilité : chevauchement avec une autre réservation (${label}${overlaps.length > 3 ? '…' : ''}).`,
          warnings,
        };
      }
    }

    if (form.consultant_id && form.date_debut && form.date_fin) {
      const peRes = await supabase
        .from('consultants_periodes_eviter')
        .select('id, consultant_id, date_debut, date_fin, type, motif')
        .eq('consultant_id', form.consultant_id)
        .lte('date_debut', form.date_fin)
        .gte('date_fin', form.date_debut);

      if (peRes.error) {
        const msg = String(peRes.error.message || '').toLowerCase();
        if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache')) {
          warnings.push('Table consultants_periodes_eviter indisponible : contrôle congés/préférences non appliqué.');
        } else {
          return { blockingError: peRes.error.message || 'Erreur lecture consultants_periodes_eviter', warnings };
        }
      } else {
        const rows = (peRes.data || []) as any[];

        const blocking = rows.filter((x) => isBlockingPeriodeType(x?.type));
        if (blocking.length > 0) {
          const label = blocking
            .slice(0, 3)
            .map(
              (x) =>
                `${String(x.type)} : ${formatDateFR(String(x.date_debut))} → ${formatDateFR(String(x.date_fin))}${
                  x.motif ? ` (${String(x.motif)})` : ''
                }`
            )
            .join(' • ');
          return {
            blockingError: `Indisponibilité (congés/formation) sur la période : ${label}${blocking.length > 3 ? '…' : ''}.`,
            warnings,
          };
        }

        const prefs = rows.filter((x) => isPreferencePeriodeType(x?.type));
        if (prefs.length > 0) {
          const label = prefs
            .slice(0, 3)
            .map((x) => `préférence : ${formatDateFR(String(x.date_debut))} → ${formatDateFR(String(x.date_fin))}${x.motif ? ` (${String(x.motif)})` : ''}`)
            .join(' • ');
          warnings.push(`Période “à éviter” (préférence) : ${label}${prefs.length > 3 ? '…' : ''}.`);
        }
      }
    }

    return { blockingError: null, warnings };
  }

  async function submitReservation() {
    setError(null);
    setWarning(null);

    const v = validateFormSync();
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);

    try {
      const asyncCheck = await validateFormAsync();
      if (asyncCheck.blockingError) {
        setError(asyncCheck.blockingError);
        setWarning(asyncCheck.warnings.length ? asyncCheck.warnings.join('\n') : null);
        return;
      }
      setWarning(asyncCheck.warnings.length ? asyncCheck.warnings.join('\n') : null);

      const payload: any = {
        projet_id: form.projet_id,
        consultant_id: form.consultant_id,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        charge_pct: form.charge_pct,
        statut: form.statut,
        role_projet: form.role_projet.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (reservationHasPrestationId === true) {
        payload.prestation_id = form.prestation_id || null;
      }

      if (editingReservationId) {
        const upd = await supabase.from('reservations').update(payload).eq('id', editingReservationId);
        if (upd.error) throw upd.error;
      } else {
        const ins = await supabase.from('reservations').insert(payload);
        if (ins.error) throw ins.error;
      }

      setModalOpen(false);

      if (selectedProjetId) {
        await loadReservationsForProjet(selectedProjetId);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur enregistrement réservation');
    } finally {
      setSaving(false);
    }
  }

  async function setReservationStatus(id: string, statut: ReservationStatut) {
    setError(null);
    setWarning(null);

    try {
      const ok = window.confirm(
        statut === 'annulee'
          ? 'Confirmez-vous l’annulation de cette réservation ? Elle ne sera plus affichée dans la liste.'
          : 'Confirmez-vous le passage de cette réservation au statut "terminee" ?'
      );
      if (!ok) return;

      const upd = await supabase.from('reservations').update({ statut }).eq('id', id);
      if (upd.error) throw upd.error;

      if (selectedProjetId) {
        await loadReservationsForProjet(selectedProjetId);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur mise à jour statut');
    }
  }

  const modalTitle = editingReservationId ? 'Modifier une réservation' : 'Planifier une réservation';

  const gridClass = selectionCollapsed ? 'grid gap-4' : 'grid gap-4 lg:grid-cols-12';
  const mainColClass = selectionCollapsed ? 'space-y-4' : 'lg:col-span-6 space-y-4';

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Réservations — Planification</h1>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                1) Sélection client → 2) Sélection projet → 3) Planification des réservations
              </p>
              <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                Projets affichés : statut = affecte / en_cours
              </p>

              {reservationHasPrestationId === false ? (
                <div className="mt-2 text-xs rounded-lg border px-3 py-2" style={{ borderColor: colors.warning, color: colors.warning }}>
                  Suivi par prestation désactivé : la colonne <b>reservations.prestation_id</b> n’existe pas encore.
                </div>
              ) : null}
            </div>

            <div className="w-full lg:w-[520px]">
              <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                Recherche (projet, prestation, commande…)
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                placeholder="Ex : CMD-001, PRJ-002, formation…"
              />
            </div>
          </div>

          {selectedClient && selectedProjet ? (
            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-lg border px-3 py-2">
              <div className="text-sm" style={{ color: colors.text }}>
                <span style={{ color: colors.textSecondary }}>Client :</span> {selectedClient.nom}{' '}
                <span className="mx-2" style={{ color: colors.textSecondary }}>
                  •
                </span>
                <span style={{ color: colors.textSecondary }}>Projet :</span> {selectedProjet.numero_projet} — {selectedProjet.projet_titre}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectionCollapsed((v) => !v)}
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  {selectionCollapsed ? 'Modifier la sélection' : 'Replier la sélection'}
                </button>

                <button
                  type="button"
                  onClick={resetColumnWidths}
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  Réinitialiser colonnes
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: colors.danger, color: colors.danger }}>
              {error}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary }}>
            Chargement…
          </div>
        ) : (
          <div className={gridClass}>
            {!selectionCollapsed ? (
              <div className="lg:col-span-3 rounded-xl border p-3" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold" style={{ color: colors.text }}>
                    Clients
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {clientsLoading ? '…' : clients.length}
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                    Rechercher un client
                  </label>
                  <input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                    placeholder="Nom du client…"
                  />
                </div>

                <div className="mt-3 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {clients.map((c) => {
                    const active = c.id === selectedClientId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(c.id);
                          setSelectedProjetId(null);
                        }}
                        className="w-full rounded-lg border p-3 text-left"
                        style={{
                          borderColor: active ? colors.accent : colors.border,
                          backgroundColor: active ? colors.sidebarHover : colors.card,
                          color: colors.text,
                        }}
                      >
                        <div className="text-sm font-semibold">{c.nom}</div>
                      </button>
                    );
                  })}

                  {clients.length === 0 && !clientsLoading ? (
                    <div className="text-sm py-8 text-center" style={{ color: colors.textSecondary }}>
                      Aucun client trouvé.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!selectionCollapsed ? (
              <div className="lg:col-span-3 rounded-xl border p-3" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold" style={{ color: colors.text }}>
                    Projets planifiables
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={projetSortMode}
                      onChange={(e) => setProjetSortMode(e.target.value as ProjetSortMode)}
                      className="rounded-lg border px-2 py-1 text-xs"
                      style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
                      title="Tri des projets"
                    >
                      <option value="recent_first">Plus récent → plus ancien</option>
                      <option value="old_first">Plus ancien → plus récent</option>
                    </select>

                    <div className="text-xs" style={{ color: colors.textSecondary }}>
                      {sortedFilteredProjets.length}
                    </div>
                  </div>
                </div>

                <div className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                  Client sélectionné : {selectedClient?.nom || '—'}
                </div>

                <div className="mt-3 space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                  {sortedFilteredProjets.map((p) => {
                    const active = p.projet_id === selectedProjetId;
                    const total = p.prestations.reduce((sum, x) => sum + (x.montant_total || 0), 0);

                    return (
                      <button
                        key={p.projet_id}
                        type="button"
                        onClick={() => setSelectedProjetId(p.projet_id)}
                        className="w-full rounded-lg border p-3 text-left"
                        style={{
                          borderColor: active ? colors.accent : colors.border,
                          backgroundColor: active ? colors.sidebarHover : colors.card,
                          color: colors.text,
                        }}
                      >
                        <div className="text-sm font-semibold">
                          {p.numero_projet} — {p.projet_titre}
                        </div>

                        <div className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                          Statut : {p.statut_projet} • Priorité : {p.priorite}
                        </div>

                        <div className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                          Affectation : {formatDateFR(p.date_affectation)}
                        </div>

                        <div className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                          {p.prestations.length} prest. • Total : {formatMoneyEUR(total)}
                        </div>
                      </button>
                    );
                  })}

                  {selectedClientId && sortedFilteredProjets.length === 0 ? (
                    <div className="text-sm py-8 text-center" style={{ color: colors.textSecondary }}>
                      Aucun projet “affecte/en_cours” pour ce client.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className={mainColClass}>
              <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                {!selectedProjet ? (
                  <div className="text-sm" style={{ color: colors.textSecondary }}>
                    Sélectionnez un client puis un projet.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-lg font-semibold" style={{ color: colors.text }}>
                          {selectedProjet.numero_projet} — {selectedProjet.projet_titre}
                        </div>

                        <div className="text-sm" style={{ color: colors.textSecondary }}>
                          Client : {selectedClient?.nom || '—'} • Période prévue : {formatDateFR(selectedProjet.date_debut_prevue)} →{' '}
                          {formatDateFR(selectedProjet.date_fin_prevue)} • Priorité : {selectedProjet.priorite}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openPlanifier()}
                        className="rounded-lg px-3 py-2 text-sm font-medium"
                        style={{ backgroundColor: colors.success, color: '#ffffff', opacity: selectedProjetId ? 1 : 0.6 }}
                        disabled={!selectedProjetId}
                      >
                        + Planifier une réservation
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm font-semibold" style={{ color: colors.text }}>
                        Prestations vendues (du projet)
                      </div>

                      <div className="text-xs" style={{ color: colors.textSecondary }}>
                        Tri : cliquez sur l’en-tête • {prestaSortKey} {prestaSortDir === 'asc' ? '▲' : '▼'}
                      </div>
                    </div>

                    <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: colors.border }}>
                      <table className="w-full table-fixed border-collapse text-sm">
                        {colgroupFrom(prestaColWidths)}

                        <thead>
                          <tr className="border-b" style={{ borderColor: colors.border }}>
                            <th className="px-3 py-2 text-left font-medium">
                              {headerCell('Commande', 'presta', 0, false, {
                                sortable: true,
                                onClick: () => togglePrestaSort('commande'),
                                indicator: sortIndicator('commande'),
                              })}
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              {headerCell('Prestation', 'presta', 1, false, {
                                sortable: true,
                                onClick: () => togglePrestaSort('prestation'),
                                indicator: sortIndicator('prestation'),
                              })}
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              {headerCell('Compétences', 'presta', 2, false, {
                                sortable: true,
                                onClick: () => togglePrestaSort('competences'),
                                indicator: sortIndicator('competences'),
                              })}
                            </th>
                            <th className="px-3 py-2 text-right font-medium">
                              {headerCell('Vendu', 'presta', 3, false, {
                                sortable: true,
                                onClick: () => togglePrestaSort('vendu'),
                                indicator: sortIndicator('vendu'),
                              })}
                            </th>
                            <th className="px-3 py-2 text-right font-medium">
                              {headerCell('Planifié', 'presta', 4, false, {
                                sortable: true,
                                onClick: () => togglePrestaSort('planifie'),
                                indicator: sortIndicator('planifie'),
                              })}
                            </th>
                            <th className="px-3 py-2 text-right font-medium">
                              {headerCell('Réalisé', 'presta', 5, false, {
                                sortable: true,
                                onClick: () => togglePrestaSort('realise'),
                                indicator: sortIndicator('realise'),
                              })}
                            </th>
                            <th className="px-3 py-2 text-right font-medium">
                              {headerCell('Reste', 'presta', 6, false, {
                                sortable: true,
                                onClick: () => togglePrestaSort('reste'),
                                indicator: sortIndicator('reste'),
                              })}
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              {headerCell('Dates prévues', 'presta', 7, false, {
                                sortable: true,
                                onClick: () => togglePrestaSort('dates'),
                                indicator: sortIndicator('dates'),
                              })}
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              {headerCell('Statut', 'presta', 8, false, {
                                sortable: true,
                                onClick: () => togglePrestaSort('statut'),
                                indicator: sortIndicator('statut'),
                              })}
                            </th>
                            <th className="px-3 py-2 text-right font-medium">{headerCell('Action', 'presta', 9, true)}</th>
                          </tr>
                        </thead>

                        <tbody>
                          {sortedPrestations.map((x) => {
                            const st = statsByPrestationId.get(x.prestation_id) || null;

                            const competencesTxt =
                              x.competences.length > 0
                                ? x.competences
                                    .map((c) => `${c.nom}${c.niveau_requis ? ` (${c.niveau_requis})` : ''}`)
                                    .join(' • ')
                                : '—';

                            const datesPrevues =
                              reservationHasPrestationId === true && st?.sessionsCount
                                ? st.sessionsCount === 1
                                  ? `${formatDateFR(st.minStart)} → ${formatDateFR(st.maxEnd)}`
                                  : `${formatDateFR(st.minStart)} → ${formatDateFR(st.maxEnd)} (${st.sessionsCount} sessions)`
                                : '—';

                            const isSelected = selectedPrestationId === x.prestation_id;

                            let dot = '🔴';
                            let label = 'Non planifié';
                            if (reservationHasPrestationId === true && st) {
                              label = st.statutLabel;
                              if (st.statutLabel === 'Non planifié') dot = '🔴';
                              else if (st.statutLabel === 'Partiellement planifié') dot = '🟡';
                              else if (st.statutLabel === 'Entièrement planifié') dot = '🟢';
                              else dot = '✅';
                            }

                            return (
                              <tr
                                key={x.prestation_id}
                                className="border-b"
                                style={{
                                  borderColor: colors.border,
                                  backgroundColor: isSelected ? colors.sidebarHover : 'transparent',
                                  cursor: reservationHasPrestationId === true ? 'pointer' : 'default',
                                }}
                                onClick={() => {
                                  if (reservationHasPrestationId === true) togglePrestationSelection(x.prestation_id);
                                }}
                              >
                                <td className="px-3 py-2">
                                  {x.numero_commande || '—'}
                                  {x.statut_commande ? (
                                    <div className="text-xs" style={{ color: colors.textSecondary }}>
                                      statut : {x.statut_commande}
                                    </div>
                                  ) : null}
                                </td>

                                <td className="px-3 py-2">
                                  <div className="font-medium" style={{ color: colors.text }}>
                                    {x.libelle}
                                  </div>
                                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                                    {x.type_prestation} • {x.code_prestation}
                                  </div>
                                </td>

                                <td className="px-3 py-2">
                                  <div className="text-xs" style={{ color: colors.text }}>
                                    {competencesTxt}
                                  </div>
                                </td>

                                <td className="px-3 py-2 text-right">{formatQty(x.quantite)}</td>
                                <td className="px-3 py-2 text-right">{reservationHasPrestationId === true ? formatQty(st?.planned ?? 0) : '—'}</td>
                                <td className="px-3 py-2 text-right">{reservationHasPrestationId === true ? formatQty(st?.done ?? 0) : '—'}</td>
                                <td className="px-3 py-2 text-right font-semibold">
                                  {reservationHasPrestationId === true ? formatQty(st?.remaining ?? x.quantite) : '—'}
                                </td>

                                <td className="px-3 py-2">{datesPrevues}</td>

                                <td className="px-3 py-2">
                                  {reservationHasPrestationId === true ? (
                                    <span className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: colors.border }}>
                                      <span>{dot}</span>
                                      <span>{label}</span>
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>

                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPlanifier(x.prestation_id);
                                    }}
                                    className="rounded-lg px-3 py-1.5 text-xs font-medium"
                                    style={{ backgroundColor: colors.accent, color: '#ffffff' }}
                                  >
                                    + Planifier
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {sortedPrestations.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }}>
                                Aucune prestation rattachée à ce projet.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    {reservationHasPrestationId === true ? (
                      <div className="mt-2 text-xs" style={{ color: colors.textSecondary }}>
                        Conseil : cliquez sur une prestation pour filtrer la liste des réservations ci-dessous.
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="rounded-xl border p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm font-semibold" style={{ color: colors.text }}>
                    Réservations du projet
                    {selectedPrestation ? (
                      <span className="ml-2 text-xs font-normal" style={{ color: colors.textSecondary }}>
                        (filtré : {selectedPrestation.libelle})
                      </span>
                    ) : null}
                  </div>

                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {visibleReservations.length} réservation(s)
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto rounded-lg border" style={{ borderColor: colors.border }}>
                  <table className="w-full table-fixed border-collapse text-sm">
                    {colgroupFrom(resaColWidths)}

                    <thead>
                      <tr className="border-b" style={{ borderColor: colors.border }}>
                        <th className="px-3 py-2 text-left font-medium">{headerCell('Prestation', 'resa', 0, false)}</th>
                        <th className="px-3 py-2 text-left font-medium">{headerCell('Consultant', 'resa', 1, false)}</th>
                        <th className="px-3 py-2 text-left font-medium">{headerCell('Période', 'resa', 2, false)}</th>
                        <th className="px-3 py-2 text-left font-medium">{headerCell('Charge', 'resa', 3, false)}</th>
                        <th className="px-3 py-2 text-left font-medium">{headerCell('Statut', 'resa', 4, false)}</th>
                        <th className="px-3 py-2 text-left font-medium">{headerCell('Rôle', 'resa', 5, false)}</th>
                        <th className="px-3 py-2 text-right font-medium">{headerCell('Actions', 'resa', 6, true)}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleReservations.map((r) => {
                        const c = r.consultant;
                        const presta = r.prestation_id ? prestationById.get(r.prestation_id) : null;

                        return (
                          <tr key={r.id} className="border-b" style={{ borderColor: colors.border }}>
                            <td className="px-3 py-2">
                              {r.prestation_id ? (
                                presta ? (
                                  <>
                                    <div className="font-medium" style={{ color: colors.text }}>
                                      {presta.libelle}
                                    </div>
                                    <div className="text-xs" style={{ color: colors.textSecondary }}>
                                      {presta.type_prestation}
                                    </div>
                                  </>
                                ) : (
                                  '—'
                                )
                              ) : (
                                <span style={{ color: colors.textSecondary }}>—</span>
                              )}
                            </td>

                            <td className="px-3 py-2">{c ? `${c.prenom} ${c.nom}` : '—'}</td>

                            <td className="px-3 py-2">
                              {formatDateFR(r.date_debut)} → {formatDateFR(r.date_fin)}
                              <div className="text-xs" style={{ color: colors.textSecondary }}>
                                unités (ouvrés) : {formatQty(reservationUnits(r))}
                              </div>
                            </td>

                            <td className="px-3 py-2">{r.charge_pct}%</td>
                            <td className="px-3 py-2">{r.statut}</td>
                            <td className="px-3 py-2">{r.role_projet || '—'}</td>

                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => openEditReservation(r)}
                                  className="rounded-lg border px-2.5 py-1 text-xs"
                                  style={{ borderColor: colors.border, color: colors.text }}
                                >
                                  Modifier
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void setReservationStatus(r.id, 'annulee')}
                                  className="rounded-lg px-2.5 py-1 text-xs font-medium"
                                  style={{ backgroundColor: colors.danger, color: '#ffffff' }}
                                  disabled={r.statut === 'annulee'}
                                >
                                  Annuler
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void setReservationStatus(r.id, 'terminee')}
                                  className="rounded-lg px-2.5 py-1 text-xs font-medium"
                                  style={{ backgroundColor: colors.success, color: '#ffffff' }}
                                  disabled={r.statut === 'terminee' || r.statut === 'annulee'}
                                >
                                  Réalisé
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {selectedProjetId && visibleReservations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }}>
                            Aucune réservation à afficher{selectedPrestation ? ' pour cette prestation' : ''}.
                          </td>
                        </tr>
                      ) : null}

                      {!selectedProjetId ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-sm" style={{ color: colors.textSecondary }}>
                            Sélectionnez un projet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-xs" style={{ color: colors.textSecondary }}>
                  Les réservations annulées sont conservées en base (historique) mais ne sont plus affichées ici.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: colors.border, color: colors.text }}
              disabled={saving}
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => void submitReservation()}
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{ backgroundColor: colors.success, color: '#ffffff', opacity: saving ? 0.8 : 1 }}
              disabled={saving}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: colors.border, color: colors.textSecondary }}>
            Contrôles : compétences/niveau, chevauchement réservations, congés/formation (bloquant), préférence (avertissement).
          </div>

          {warning ? (
            <div className="rounded-lg border px-3 py-2 text-sm whitespace-pre-line" style={{ borderColor: colors.warning, color: colors.warning }}>
              {warning}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: colors.danger, color: colors.danger }}>
              {error}
            </div>
          ) : null}

          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Prestation {reservationHasPrestationId === true ? '(requis)' : '(optionnel)'}
            </label>
            <select
              value={form.prestation_id}
              onChange={(e) => {
                setWarning(null);
                setError(null);
                setForm((f) => ({ ...f, prestation_id: e.target.value }));
              }}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
              disabled={!selectedProjet}
            >
              <option value="">— Sélectionner —</option>
              {(selectedProjet?.prestations || []).map((p) => {
                const st = statsByPrestationId.get(p.prestation_id) || null;
                const reste = reservationHasPrestationId === true ? st?.remaining ?? p.quantite : null;

                return (
                  <option key={p.prestation_id} value={p.prestation_id}>
                    {p.libelle} ({p.code_prestation}){reste !== null ? ` — reste : ${formatQty(reste)}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Consultant
            </label>
            <select
              value={form.consultant_id}
              onChange={(e) => {
                setWarning(null);
                setError(null);
                setForm((f) => ({ ...f, consultant_id: e.target.value }));
              }}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
            >
              <option value="">— Sélectionner —</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom} ({c.statut})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                Date début
              </label>
              <input
                type="date"
                value={form.date_debut}
                onChange={(e) => {
                  setWarning(null);
                  setError(null);
                  setForm((f) => ({ ...f, date_debut: e.target.value }));
                }}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
              />
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                Date fin
              </label>
              <input
                type="date"
                value={form.date_fin}
                onChange={(e) => {
                  setWarning(null);
                  setError(null);
                  setForm((f) => ({ ...f, date_fin: e.target.value }));
                }}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                Charge (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.charge_pct}
                onChange={(e) => {
                  setWarning(null);
                  setError(null);
                  setForm((f) => ({ ...f, charge_pct: Number(e.target.value) }));
                }}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
              />
              {form.date_debut && form.date_fin ? (
                <div className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                  unités (ouvrés) :{' '}
                  <b style={{ color: colors.text }}>
                    {formatQty(
                      reservationUnits({
                        date_debut: form.date_debut,
                        date_fin: form.date_fin,
                        charge_pct: form.charge_pct,
                        statut: form.statut,
                      })
                    )}
                  </b>
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                Statut
              </label>
              <select
                value={form.statut}
                onChange={(e) => {
                  setWarning(null);
                  setError(null);
                  setForm((f) => ({ ...f, statut: e.target.value as ReservationStatut }));
                }}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
              >
                <option value="prevue">prevue</option>
                <option value="confirmee">confirmee</option>
                <option value="en_cours">en_cours</option>
                <option value="terminee">terminee</option>
                <option value="annulee">annulee</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Rôle sur le projet
            </label>
            <input
              value={form.role_projet}
              onChange={(e) => setForm((f) => ({ ...f, role_projet: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
              placeholder="Ex : Chef de projet, Développeur…"
            />
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: colors.sidebarHover, borderColor: colors.border, color: colors.text }}
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
