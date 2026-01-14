'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, File, FileText, Image, Video, Search, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ConfirmModal, formatDateFR } from '@/app/clients/_ui';
import { useClientUi } from '@/app/clients/_ui';
import type { ClientDocument, ClientNote, ClientActivityEvent, ClientNoteTag } from '@/types/clients';

type NoteEdit = {
  id: string;
  contenu: string;
  tagsInput: string;
};

export default function ClientNotes(props: { clientId: string }) {
  const ui = useClientUi();
  const router = useRouter();

  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [docs, setDocs] = useState<ClientDocument[]>([]);
  const [events, setEvents] = useState<ClientActivityEvent[]>([]);
  const [noteTags, setNoteTags] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<NoteEdit | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [{ data: n, error: e1 }, { data: d, error: e2 }, { data: ev, error: e3 }] = await Promise.all([
        supabase.from('notes_clients').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false }),
        supabase.from('client_documents').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false }),
        supabase.from('client_activity_events').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false })
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      const noteList = (n ?? []) as ClientNote[];
      setNotes(noteList);
      setDocs((d ?? []) as ClientDocument[]);
      setEvents((ev ?? []) as ClientActivityEvent[]);

      if (noteList.length > 0) {
        const noteIds = noteList.map((note) => note.id);
        const { data: tags, error: e4 } = await supabase
          .from('notes_clients_tags')
          .select('*')
          .in('note_id', noteIds)
          .order('created_at', { ascending: true });
        if (e4) throw e4;
        const tagRows = (tags ?? []) as ClientNoteTag[];
        const map: Record<string, string[]> = {};
        for (const row of tagRows) {
          if (!map[row.note_id]) map[row.note_id] = [];
          map[row.note_id].push(row.tag);
        }
        setNoteTags(map);
      } else {
        setNoteTags({});
      }
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

    const parts = s.split(/\s+/);
    const tagFilters = parts
      .filter((part) => part.startsWith('#'))
      .map((part) => part.replace(/^#+/, '').trim().toLowerCase())
      .filter(Boolean);
    const textQuery = parts.filter((part) => !part.startsWith('#')).join(' ').trim();

    return notes.filter((note) => {
      const matchesText = textQuery ? (note.contenu ?? '').toLowerCase().includes(textQuery) : true;
      if (!matchesText) return false;
      if (tagFilters.length === 0) return true;
      const tags = (noteTags[note.id] ?? []).map((tag) => tag.toLowerCase());
      return tagFilters.every((tag) => tags.some((t) => t.includes(tag)));
    });
  }, [notes, q, noteTags]);

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
        titre: 'Document ajoute (simule)',
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
        titre: 'Note supprimee',
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

  const startEdit = (note: ClientNote) => {
    const tags = noteTags[note.id] ?? [];
    setEdit({ id: note.id, contenu: note.contenu ?? '', tagsInput: tags.join(', ') });
  };

  const saveEdit = async () => {
    if (!edit) return;
    setError(null);
    setBusy(true);
    try {
      const payload = { contenu: edit.contenu.trim(), updated_at: new Date().toISOString() };
      const { error: e1 } = await supabase.from('notes_clients').update(payload).eq('id', edit.id);
      if (e1) throw e1;

      const nextTags = edit.tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const { error: e2 } = await supabase.from('notes_clients_tags').delete().eq('note_id', edit.id);
      if (e2) throw e2;

      if (nextTags.length > 0) {
        const inserts = nextTags.map((tag) => ({ note_id: edit.id, tag }));
        const { error: e3 } = await supabase.from('notes_clients_tags').insert(inserts);
        if (e3) throw e3;
      }

      await supabase.from('client_activity_events').insert({
        client_id: props.clientId,
        type_event: 'note',
        titre: 'Note modifiee',
        description: `note_id=${edit.id}`,
        metadata: payload
      });

      setEdit(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  };

  const getFileIcon = (name: string, type: string | null | undefined) => {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const mime = (type ?? '').toLowerCase();
    if (ext === 'pdf' || mime.includes('pdf')) return FileText;
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || mime.includes('image')) return Image;
    if (ext === 'mp4' || ext === 'mov' || mime.includes('video')) return Video;
    return File;
  };

  return (
    <div className="p-3 sm:p-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4" style={ui.cardStyle}>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Notes</div>
            <button
              type="button"
              className="px-3 py-2 text-sm font-semibold"
              style={ui.btnPrimaryStyle}
              onClick={() => router.push(`/clients/${props.clientId}/nouvelle-note`)}
            >
              <Plus size={14} />
              Nouvelle note
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: ui.c.bg, border: `1px solid ${ui.c.border}` }}>
            <Search size={16} style={{ color: ui.c.muted }} />
            <input
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: ui.c.text }}
              placeholder="Rechercher dans les notes (texte ou #tag)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={loading}
            />
          </div>

          {loading ? <div className="mt-3 text-sm" style={{ color: ui.c.muted }}>Chargement...</div> : null}
          {!loading && filteredNotes.length === 0 ? <div className="mt-3 text-sm" style={{ color: ui.c.muted }}>Aucune note.</div> : null}

          <div className="mt-4 space-y-3 max-h-[520px] overflow-y-auto">
            {filteredNotes.map((n) => (
              <div key={n.id} className="p-3 rounded-lg" style={{ backgroundColor: ui.c.bg }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs" style={{ color: ui.c.muted }}>{formatDateFR(n.created_at)}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 text-xs"
                      style={ui.btnStyle}
                      onClick={() => startEdit(n)}
                      disabled={busy}
                    >
                      Modifier
                    </button>
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
                </div>
                <div className="mt-2 text-sm whitespace-pre-wrap">{n.contenu}</div>
                {noteTags[n.id]?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {noteTags[n.id].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ backgroundColor: `${ui.c.accent}22`, color: ui.c.accent }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {edit ? (
            <div className="mt-4 p-3 rounded-lg" style={{ border: `1px solid ${ui.c.border}`, backgroundColor: ui.editBg }}>
              <div className="font-semibold">Modifier la note</div>
              <textarea
                className="mt-2 w-full px-3 py-2 min-h-[120px]"
                style={ui.inputStyle}
                value={edit.contenu}
                onChange={(e) => setEdit((s) => (s ? { ...s, contenu: e.target.value } : s))}
              />
              <div className="mt-3">
                <div className="text-sm" style={{ color: ui.c.muted }}>Tags (separes par des virgules)</div>
                <input
                  className="mt-1 w-full px-3 py-2"
                  style={ui.inputStyle}
                  value={edit.tagsInput}
                  onChange={(e) => setEdit((s) => (s ? { ...s, tagsInput: e.target.value } : s))}
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className="px-3 py-2 text-sm" style={ui.btnStyle} onClick={() => setEdit(null)} disabled={busy}>
                  Annuler
                </button>
                <button type="button" className="px-3 py-2 text-sm font-semibold" style={ui.btnPrimaryStyle} onClick={() => void saveEdit()} disabled={busy}>
                  {busy ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-4" style={ui.cardStyle}>
          <div className="flex items-center justify-between">
            <div className="font-semibold">Documents</div>
            <button
              type="button"
              className="px-3 py-2 text-sm font-semibold"
              style={ui.btnPrimaryStyle}
              onClick={() => void simulateUpload()}
              disabled={loading || busy}
            >
              <Plus size={14} />
              Ajouter document
            </button>
          </div>

          {loading ? <div className="mt-3 text-sm" style={{ color: ui.c.muted }}>Chargement...</div> : null}
          {!loading && docs.length === 0 ? <div className="mt-3 text-sm" style={{ color: ui.c.muted }}>Aucun document.</div> : null}

          <div className="mt-4 space-y-3 max-h-[520px] overflow-y-auto">
            {docs.map((d) => {
              const Icon = getFileIcon(d.nom, d.type_mime);
              return (
                <div key={d.id} className="p-3 rounded-lg" style={{ backgroundColor: ui.c.bg }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ui.c.accent}22` }}>
                      <Icon size={18} style={{ color: ui.c.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{d.nom}</div>
                      <div className="text-xs" style={{ color: ui.c.muted }}>
                        {d.type_mime ?? '-'} · {formatDateFR(d.created_at)} · {d.statut}
                      </div>
                      {Array.isArray(d.tags) && d.tags.length > 0 ? (
                        <div className="mt-1 text-xs" style={{ color: ui.c.muted }}>Tags: {d.tags.join(', ')}</div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${ui.c.accent}22`, color: ui.c.accent }}
                      disabled
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs" style={{ color: ui.c.muted }}>
            L'ouverture est desactivee tant que le stockage n'est pas branche.
          </div>
        </div>
      </div>

      <div className="mt-4 p-4" style={ui.cardStyle}>
        <div className="font-semibold">Timeline recente</div>
        <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto">
          {events.slice(0, 8).map((ev, index) => (
            <div key={ev.id} className="flex gap-3 relative">
              {index !== Math.min(events.length, 8) - 1 ? (
                <div className="absolute left-4 top-10 bottom-0 w-px" style={{ backgroundColor: ui.c.border }} />
              ) : null}
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${ui.c.accent}22` }}>
                <FileText size={14} style={{ color: ui.c.accent }} />
              </div>
              <div className="flex-1 p-3 rounded-lg" style={{ backgroundColor: ui.c.bg }}>
                <div className="text-sm font-medium">{ev.titre}</div>
                <div className="text-xs" style={{ color: ui.c.muted }}>
                  {ev.description ?? 'Aucun detail'} · {formatDateFR(ev.created_at)}
                </div>
              </div>
            </div>
          ))}
          {!loading && events.length === 0 ? <div className="text-sm" style={{ color: ui.c.muted }}>Aucun evenement.</div> : null}
        </div>
      </div>

      {error ? <div className="mt-3 text-sm" style={{ color: ui.c.danger }}>{error}</div> : null}

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
