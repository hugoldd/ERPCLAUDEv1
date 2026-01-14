'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { Client, ClientStatut } from '@/types/clients';

type FormState = {
  nom: string;
  type_structure: string;
  siret: string;
  code_postal: string;
  ville: string;
  contact_principal: string;
  email_contact: string;
  telephone_contact: string;
  statut: ClientStatut;
  notes_libres: string;
};

export default function ClientInfos(props: { clientId: string }) {
  const ui = useClientUi();

  const [client, setClient] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const hydrateForm = (c: Client): FormState => ({
    nom: c.nom ?? '',
    type_structure: c.type_structure ?? '',
    siret: c.siret ?? '',
    code_postal: c.code_postal ?? '',
    ville: c.ville ?? '',
    contact_principal: c.contact_principal ?? '',
    email_contact: c.email_contact ?? '',
    telephone_contact: c.telephone_contact ?? '',
    statut: c.statut ?? 'actif',
    notes_libres: c.notes_libres ?? ''
  });

  const load = async () => {
    setError(null);
    setOkMsg(null);
    setLoading(true);
    try {
      const { data, error: e } = await supabase.from('clients').select('*').eq('id', props.clientId).maybeSingle();
      if (e) throw e;
      const c = (data ?? null) as Client | null;
      setClient(c);
      setForm(c ? hydrateForm(c) : null);
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

  const validate = (f: FormState): string | null => {
    if (!f.nom.trim()) return 'Le nom du client est obligatoire.';
    if (f.email_contact.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email_contact.trim())) return 'Email invalide.';
    if (f.siret.trim() && f.siret.trim().length < 9) return 'SIRET trop court (vérifier).';
    return null;
  };

  const save = async () => {
    if (!form) return;
    setError(null);
    setOkMsg(null);

    const v = validate(form);
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nom: form.nom.trim(),
        type_structure: form.type_structure.trim() || null,
        siret: form.siret.trim() || null,
        code_postal: form.code_postal.trim() || null,
        ville: form.ville.trim() || null,
        contact_principal: form.contact_principal.trim() || null,
        email_contact: form.email_contact.trim() || null,
        telephone_contact: form.telephone_contact.trim() || null,
        statut: form.statut,
        notes_libres: form.notes_libres.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { error: e1 } = await supabase.from('clients').update(payload).eq('id', props.clientId);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'system',
        titre: 'Informations client modifiées',
        description: 'Mise à jour des informations générales',
        metadata: payload
      });

      setOkMsg('Enregistré.');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setSaving(false);
    }
  };

  const styles = useMemo(() => {
    return {
      gridCard: { border: `1px solid ${ui.c.border}`, borderRadius: 16 } as React.CSSProperties,
      label: { opacity: 0.8 } as React.CSSProperties
    };
  }, [ui.c.border]);

  return (
    <div className="p-3 sm:p-0">
      <div className="p-4 sm:p-5" style={ui.cardStyle}>
        <SectionHeader
          title="Informations générales"
          subtitle="Edition des informations de la fiche client"
          right={
            <button type="button" className="px-3 py-2 text-sm font-semibold" style={ui.btnPrimaryStyle} onClick={save} disabled={loading || saving || !form}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          }
        />

        {loading ? <div className="mt-3 text-sm opacity-80">Chargement...</div> : null}
        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}
        {okMsg ? <div className="mt-3 text-sm" style={{ color: ui.c.success }}>{okMsg}</div> : null}

        {!loading && !client ? (
          <div className="mt-4 text-sm opacity-80">Client introuvable.</div>
        ) : null}

        {form ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="p-4" style={styles.gridCard}>
              <div className="text-sm" style={styles.label}>Nom *</div>
              <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.nom} onChange={(e) => setForm((s) => (s ? { ...s, nom: e.target.value } : s))} disabled={saving} />

              <div className="mt-3 text-sm" style={styles.label}>Type structure</div>
              <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.type_structure} onChange={(e) => setForm((s) => (s ? { ...s, type_structure: e.target.value } : s))} disabled={saving} />

              <div className="mt-3 text-sm" style={styles.label}>SIRET</div>
              <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.siret} onChange={(e) => setForm((s) => (s ? { ...s, siret: e.target.value } : s))} disabled={saving} />

              <div className="mt-3 text-sm" style={styles.label}>Statut</div>
              <select className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.statut} onChange={(e) => setForm((s) => (s ? { ...s, statut: e.target.value as any } : s))} disabled={saving}>
                <option value="actif">actif</option>
                <option value="prospect">prospect</option>
                <option value="inactif">inactif</option>
              </select>
            </div>

            <div className="p-4" style={styles.gridCard}>
              <div className="text-sm" style={styles.label}>Contact principal</div>
              <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.contact_principal} onChange={(e) => setForm((s) => (s ? { ...s, contact_principal: e.target.value } : s))} disabled={saving} />

              <div className="mt-3 text-sm" style={styles.label}>Email</div>
              <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.email_contact} onChange={(e) => setForm((s) => (s ? { ...s, email_contact: e.target.value } : s))} disabled={saving} />

              <div className="mt-3 text-sm" style={styles.label}>Téléphone</div>
              <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.telephone_contact} onChange={(e) => setForm((s) => (s ? { ...s, telephone_contact: e.target.value } : s))} disabled={saving} />

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm" style={styles.label}>Code postal</div>
                  <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.code_postal} onChange={(e) => setForm((s) => (s ? { ...s, code_postal: e.target.value } : s))} disabled={saving} />
                </div>
                <div>
                  <div className="text-sm" style={styles.label}>Ville</div>
                  <input className="mt-1 w-full px-3 py-2" style={ui.inputStyle} value={form.ville} onChange={(e) => setForm((s) => (s ? { ...s, ville: e.target.value } : s))} disabled={saving} />
                </div>
              </div>

              <div className="mt-3 text-sm" style={styles.label}>Notes libres</div>
              <textarea className="mt-1 w-full px-3 py-2 min-h-[120px]" style={ui.inputStyle} value={form.notes_libres} onChange={(e) => setForm((s) => (s ? { ...s, notes_libres: e.target.value } : s))} disabled={saving} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
