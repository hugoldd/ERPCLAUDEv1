'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function NouvelleNotePage() {
  const params = useParams();
  const router = useRouter();
  const { colors } = useTheme() as unknown as { colors: Record<string, string> };

  const clientId = useMemo(() => {
    const raw = (params as unknown as { id?: string })?.id;
    return typeof raw === 'string' ? raw : '';
  }, [params]);

  const [contenu, setContenu] = useState('');
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

  const submit = async () => {
    setError(null);
    if (!clientId) {
      setError('Client invalide.');
      return;
    }
    if (!contenu.trim()) {
      setError('Le contenu est obligatoire.');
      return;
    }

    setLoading(true);
    try {
      const payload = { client_id: clientId, contenu: contenu.trim() };
      const { error: e1 } = await supabase.from('notes_clients').insert(payload);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: clientId,
        type_event: 'note',
        titre: 'Note ajoutée',
        description: contenu.trim().slice(0, 120),
        metadata: payload
      });

      router.push(`/clients/${clientId}?tab=notes`);
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
              <div className="text-xl font-semibold">Nouvelle note</div>
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

          <div className="mt-4">
            <div className="text-sm opacity-80">Contenu *</div>
            <textarea
              className="mt-1 w-full px-3 py-2 min-h-[160px]"
              style={styles.input}
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              disabled={loading}
            />
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
