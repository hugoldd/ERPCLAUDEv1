'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, FileText, MapPin, Phone, Mail, User, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
  const [baseForm, setBaseForm] = useState<FormState | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

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
      const nextForm = c ? hydrateForm(c) : null;
      setForm(nextForm);
      setBaseForm(nextForm);
      setDirty(false);
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
    if (f.siret.trim() && f.siret.trim().length < 9) return 'SIRET trop court.';
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
        titre: 'Informations client modifiees',
        description: 'Mise a jour des informations generales',
        metadata: payload
      });

      setOkMsg('Enregistre.');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  };

  const cardStyle = useMemo(() => ({ border: `1px solid ${ui.c.border}`, borderRadius: 16 } as React.CSSProperties), [ui.c.border]);

  if (loading) {
    return (
      <div className="p-3 sm:p-0">
        <div className="p-4 sm:p-5" style={ui.cardStyle}>
          <div className="text-sm" style={{ color: ui.c.muted }}>Chargement...</div>
        </div>
      </div>
    );
  }

  if (!client || !form) {
    return (
      <div className="p-3 sm:p-0">
        <div className="p-4 sm:p-5" style={ui.cardStyle}>
          <div className="text-sm" style={{ color: ui.c.muted }}>Client introuvable.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4" style={ui.cardStyle}>
          <div className="font-semibold">Identite</div>
          <div className="mt-4 space-y-4">
            <FormField label="Nom" icon={Building2} value={form.nom} onChange={(value) => setField('nom', value)} />
            <FormField label="Type structure" icon={Building2} value={form.type_structure} onChange={(value) => setField('type_structure', value)} />
            <FormField label="SIRET" icon={FileText} value={form.siret} onChange={(value) => setField('siret', value)} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Code postal" icon={MapPin} value={form.code_postal} onChange={(value) => setField('code_postal', value)} />
              <FormField label="Ville" icon={MapPin} value={form.ville} onChange={(value) => setField('ville', value)} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm" style={{ color: ui.c.muted }}>
                <FileText size={14} />
                Statut
              </label>
              <select
                className="mt-2 w-full px-4 py-3 rounded-lg"
                style={{ backgroundColor: ui.c.bg, border: `1px solid ${ui.c.border}`, color: ui.c.text }}
                value={form.statut}
                onChange={(e) => {
                  setForm((prev) => (prev ? { ...prev, statut: e.target.value as ClientStatut } : prev));
                  setDirty(true);
                }}
              >
                <option value="actif">actif</option>
                <option value="prospect">prospect</option>
                <option value="inactif">inactif</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4" style={ui.cardStyle}>
            <div className="font-semibold">Contact principal</div>
            <div className="mt-4 space-y-4">
              <FormField label="Nom" icon={User} value={form.contact_principal} onChange={(value) => setField('contact_principal', value)} />
              <FormField label="Email" icon={Mail} value={form.email_contact} onChange={(value) => setField('email_contact', value)} type="email" />
              <FormField label="Telephone" icon={Phone} value={form.telephone_contact} onChange={(value) => setField('telephone_contact', value)} />
            </div>
          </div>

          <div className="p-4" style={ui.cardStyle}>
            <div className="font-semibold">Notes libres</div>
            <div className="mt-3">
              <textarea
                className="w-full px-4 py-3 rounded-lg min-h-[140px]"
                style={{ backgroundColor: ui.c.bg, border: `1px solid ${ui.c.border}`, color: ui.c.text }}
                value={form.notes_libres}
                onChange={(e) => setField('notes_libres', e.target.value)}
              />
            </div>
          </div>

          {error ? <div className="text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}
          {okMsg ? <div className="text-sm" style={{ color: ui.c.success }}>{okMsg}</div> : null}
        </div>
      </div>

      {dirty ? (
        <div className="mt-4 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ backgroundColor: ui.c.card, border: `2px solid ${ui.c.accent}` }}>
          <div>
            <div className="font-medium">Modifications non sauvegardees</div>
            <div className="text-sm" style={{ color: ui.c.muted }}>Pensez a enregistrer vos changements.</div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 text-sm"
              style={ui.btnStyle}
              onClick={() => {
                setForm(baseForm);
                setDirty(false);
              }}
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-semibold flex items-center gap-2"
              style={ui.btnPrimaryStyle}
              onClick={save}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'number';
}

function FormField({ label, icon: Icon, value, onChange, type = 'text' }: FormFieldProps) {
  const ui = useClientUi();
  return (
    <div>
      <label className="flex items-center gap-2 text-sm" style={{ color: ui.c.muted }}>
        <Icon size={14} />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full px-4 py-3 rounded-lg"
        style={{ backgroundColor: ui.c.bg, border: `1px solid ${ui.c.border}`, color: ui.c.text }}
      />
    </div>
  );
}
