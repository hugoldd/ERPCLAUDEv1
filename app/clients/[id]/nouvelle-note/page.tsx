'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  const [tagsInput, setTagsInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
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

  useEffect(() => {
    if (!clientId) return;

    const loadSuggestedTags = async () => {
      try {
        const { data: notes, error: e1 } = await supabase
          .from('notes_clients')
          .select('id')
          .eq('client_id', clientId);
        if (e1) throw e1;
        const ids = (notes ?? []).map((n: { id?: string }) => n.id).filter(Boolean) as string[];
        if (ids.length === 0) {
          setSuggestedTags([]);
          return;
        }
        const { data: tags, error: e2 } = await supabase
          .from('notes_clients_tags')
          .select('tag')
          .in('note_id', ids);
        if (e2) throw e2;
        const counts: Record<string, number> = {};
        for (const row of tags ?? []) {
          const tag = String((row as { tag?: string }).tag ?? '').trim();
          if (!tag) continue;
          counts[tag] = (counts[tag] ?? 0) + 1;
        }
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([tag]) => tag)
          .slice(0, 8);
        setSuggestedTags(sorted);
      } catch {
        setSuggestedTags([]);
      }
    };

    void loadSuggestedTags();
  }, [clientId]);

  const addSuggestedTag = (tag: string) => {
    setTagsInput((prev) => {
      const parts = prev
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const exists = parts.some((part) => part.toLowerCase() === tag.toLowerCase());
      if (exists) return prev;
      return parts.length > 0 ? `${parts.join(', ')}, ${tag}` : tag;
    });
  };

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
      const { data: inserted, error: e1 } = await supabase
        .from('notes_clients')
        .insert(payload)
        .select('id')
        .single();
      if (e1) throw e1;

      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      if (tags.length > 0 && inserted?.id) {
        const rows = tags.map((tag) => ({ note_id: inserted.id, tag }));
        const { error: e2 } = await supabase.from('notes_clients_tags').insert(rows);
        if (e2) throw e2;
      }

      await supabase.from('client_activity_events').insert({
        client_id: clientId,
        type_event: 'note',
        titre: 'Note ajoutee',
        description: contenu.trim().slice(0, 120),
        metadata: { ...payload, tags }
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
              Retour
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

          <div className="mt-4">
            <div className="text-sm opacity-80">Tags (separes par des virgules)</div>
            <input
              className="mt-1 w-full px-3 py-2"
              style={styles.input}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={loading}
            />
            {suggestedTags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="px-2 py-1 text-xs rounded-full"
                    style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
                    onClick={() => addSuggestedTag(tag)}
                    disabled={loading}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            ) : null}
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
              {loading ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
