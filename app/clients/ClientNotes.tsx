'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ConfirmModal, SectionHeader, formatDateFR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { ClientDocument, ClientNote } from '@/types/clients';

export default function ClientNotes(props: { clientId: string }) {
  const ui = useClientUi();

  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [docs, setDocs] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [{ data: n, error: e1 }, { data: d, error: e2 }] = await Promise.all([
        supabase.from('notes_clients').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false }),
        supabase.from('client_documents').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false })
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      setNotes((n ?? []) as ClientNote[]);
      setDocs((d ?? []) as ClientDocument[]);
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

  const filteredNotes = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return notes;
    return notes.filter((x) => (x.contenu ?? '').toLowerCase().includes(s));
  }, [notes, q]);

  const simulateUpload = async () => {
    setError(null);
    setBusy(true);
    try {
      const fakeName = `Document_${new Date().toISOString().slice(0, 10)}.pdf`;
      const payload = {
        client_id: props.clientId,
        nom: fakeName,
        type_mime: 'application/pdf',
        taille_octets: 123456,
        url: null,
        statut: 'simule',
        tags: ['simule']
      };

      const { error: e1 } = await supabase.from('client_documents').insert(payload);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'document',
        titre: 'Document ajouté (simulé)',
        description: fakeName,
        metadata: payload
      });

      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  const askDeleteNote = (id: string) => {
    setDeleteNoteId(id);
    setConfirmOpen(true);
  };

  const deleteNote = async () => {
    if (!deleteNoteId) return;
    setError(null);
    setBusy(true);
    try {
      const { error: e1 } = await supabase.from('notes_clients').delete().eq('id', deleteNoteId);
      if (e1) throw e1;

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'note',
        titre: 'Note supprimée',
        description: `note_id=${deleteNoteId}`,
        metadata: { note_id: deleteNoteId }
      });

      setConfirmOpen(false);
      setDeleteNoteId(null);
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
          title="Notes & Documents"
          subtitle="Notes internes + documents (upload simulé)"
          right={
            <>
              <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => void load()} disabled={loading}>
                {loading ? 'Chargement...' : 'Rafraîchir'}
              </button>
              <button type="button" className="px-3 py-2 text-sm font-semibold" style={ui.btnPrimaryStyle} onClick={() => void simulateUpload()} disabled={loading || busy}>
                {busy ? '...' : 'Uploader (simulé)'}
              </button>
            </>
          }
        />

        {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

        <div className="mt-4">
          <input
            className="w-full px-3 py-2"
            style={ui.inputStyle}
            placeholder="Rechercher dans les notes"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Notes</div>
            {loading ? <div className="mt-3 text-sm opacity-80">Chargement...</div> : null}
            {!loading && filteredNotes.length === 0 ? <div className="mt-3 text-sm opacity-80">Aucune note.</div> : null}

            <div className="mt-3 grid grid-cols-1 gap-3">
              {filteredNotes.map((n) => (
                <div key={n.id} className="p-3" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 14 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm opacity-70">{formatDateFR(n.created_at)}</div>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs"
                      style={{ ...ui.btnStyle, border: `1px solid ${ui.c.danger}` }}
                      onClick={() => askDeleteNote(n.id)}
                      disabled={busy}
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="mt-2 text-sm whitespace-pre-wrap">{n.contenu}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 16 }}>
            <div className="font-semibold">Documents</div>
            {loading ? <div className="mt-3 text-sm opacity-80">Chargement...</div> : null}
            {!loading && docs.length === 0 ? <div className="mt-3 text-sm opacity-80">Aucun document.</div> : null}

            <div className="mt-3 grid grid-cols-1 gap-3">
              {docs.map((d) => (
                <div key={d.id} className="p-3" style={{ border: `1px solid ${ui.c.border}`, borderRadius: 14 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{d.nom}</div>
                      <div className="mt-1 text-xs opacity-70">
                        {d.type_mime ?? '—'} · {formatDateFR(d.created_at)} · {d.statut}
                      </div>
                      {Array.isArray(d.tags) && d.tags.length > 0 ? (
                        <div className="mt-2 text-xs opacity-70">Tags : {d.tags.join(', ')}</div>
                      ) : null}
                    </div>
                    <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} disabled>
                      Ouvrir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs opacity-70">
              “Ouvrir” est volontairement désactivé tant que l’upload réel n’est pas branché (Storage Supabase).
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Supprimer la note"
        message="Confirmez la suppression de cette note."
        destructive
        busy={busy}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        onConfirm={() => void deleteNote()}
      />
    </div>
  );
}
