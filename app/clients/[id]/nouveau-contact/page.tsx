'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

type FormState = {
  nom: string;
  prenom: string;
  fonction: string;
  email: string;
  telephone: string;
  principal: boolean;
  notes: string;
};

export default function NouveauContactPage() {
  const params = useParams();
  const router = useRouter();
  const { colors } = useTheme() as unknown as { colors: Record<string, string> };

  const clientId = useMemo(() => {
    const raw = (params as unknown as { id?: string })?.id;
    return typeof raw === 'string' ? raw : '';
  }, [params]);

  const [form, setForm] = useState<FormState>({
    nom: '',
    prenom: '',
    fonction: '',
    email: '',
    telephone: '',
    principal: false,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => {
    const bg = colors.background ?? '#0b0f19';
    const card = colors.card ?? '#111827';
    const text = colors.text ?? '#e5e7eb';
    const border = colors.border ?? 'rgba(255,255,255,0.08)';
    const accent = colors.accent ?? '#6d28d9';
    const danger = colors.danger ?? '#ef4444';

    return {
      page: { backgroundColor: bg, color: text },
      card: { backgroundColor: card, border: `1px solid ${border}`, borderRadius: 16 },
      input: { border: `1px solid ${border}`, borderRadius: 12, backgroundColor: 'transparent' },
      btn: { border: `1px solid ${border}`, borderRadius: 12 },
      btnPrimary: { backgroundColor: `${accent}`, borderRadius: 12 },
      error: { color: danger }
    } as const;
  }, [colors]);

  const validate = (): string | null => {
    if (!clientId) return 'Client invalide.';
    if (!form.nom.trim()) return 'Le nom du contact est obligatoire.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return 'Email invalide.';
    }
    return null;
  };

  const submit = async () => {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      if (form.principal) {
        // si principal => désactiver les autres principaux
        const { error: e1 } = await supabase
          .from('contacts_clients')
          .update({ principal: false })
          .eq('client_id', clientId);

        if (e1) throw e1;
      }

      const payload = {
        client_id: clientId,
        nom: form.nom.trim(),
        prenom: form.prenom.trim() || null,
        fonction: form.fonction.trim() || null,
        email: form.email.trim() || null,
        telephone: form.telephone.trim() || null,
        principal: form.principal,
        notes: form.notes.trim() || null
      };

      const { error: e2 } = await supabase.from('contacts_clients').insert(payload);
      if (e2) throw e2;

      // Timeline
      await supabase.from('client_activity_events').insert({
        client_id: clientId,
        type_event: 'contact',
        titre: 'Contact ajouté',
        description: `${payload.prenom ? payload.prenom + ' ' : ''}${payload.nom}`,
        metadata: payload
      });

      router.push(`/clients/${clientId}?tab=contacts`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-3 sm:p-4" style={styles.page}>
        <div className="p-4 sm:p-5" style={styles.card}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold">Nouveau contact</div>
              <div className="mt-1 text-sm opacity-80">Client : {clientId}</div>
            </div>
            <button
              type="button"
              className="px-3 py-2 text-sm"
              style={styles.btn}
              onClick={() => router.push(`/clients/${clientId}`)}
            >
              ← Retour
            </button>
          </div>

          {error && (
            <div className="mt-4 text-sm" style={styles.error}>
              {error}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-sm opacity-80">Nom *</div>
              <input
                className="mt-1 w-full px-3 py-2"
                style={styles.input}
                value={form.nom}
                onChange={(e) => setForm((s) => ({ ...s, nom: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div>
              <div className="text-sm opacity-80">Prénom</div>
              <input
                className="mt-1 w-full px-3 py-2"
                style={styles.input}
                value={form.prenom}
                onChange={(e) => setForm((s) => ({ ...s, prenom: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div>
              <div className="text-sm opacity-80">Fonction</div>
              <input
                className="mt-1 w-full px-3 py-2"
                style={styles.input}
                value={form.fonction}
                onChange={(e) => setForm((s) => ({ ...s, fonction: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div>
              <div className="text-sm opacity-80">Téléphone</div>
              <input
                className="mt-1 w-full px-3 py-2"
                style={styles.input}
                value={form.telephone}
                onChange={(e) => setForm((s) => ({ ...s, telephone: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div>
              <div className="text-sm opacity-80">Email</div>
              <input
                className="mt-1 w-full px-3 py-2"
                style={styles.input}
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-2 mt-6 sm:mt-0">
              <input
                type="checkbox"
                checked={form.principal}
                onChange={(e) => setForm((s) => ({ ...s, principal: e.target.checked }))}
                disabled={loading}
              />
              <span className="text-sm opacity-80">Contact principal</span>
            </div>

            <div className="sm:col-span-2">
              <div className="text-sm opacity-80">Notes</div>
              <textarea
                className="mt-1 w-full px-3 py-2 min-h-[120px]"
                style={styles.input}
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                disabled={loading}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              className="px-4 py-2 text-sm"
              style={styles.btn}
              onClick={() => router.push(`/clients/${clientId}`)}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-semibold"
              style={styles.btnPrimary}
              onClick={submit}
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
