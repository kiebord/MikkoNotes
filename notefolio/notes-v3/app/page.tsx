'use client';

import { useEffect, useRef, useState } from 'react';
import NoteItem, { type Note } from '../components/NoteItem';

const STORAGE_KEY = 'notefolio-notes-neobrutal-v3';

function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== 'object') return false;
  const note = value as Record<string, unknown>;
  return typeof note.id === 'string' && typeof note.title === 'string'
    && typeof note.description === 'string' && typeof note.createdAt === 'string'
    && typeof note.updatedAt === 'string';
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const [validation, setValidation] = useState('');
  const [storageError, setStorageError] = useState('');
  const [feedback, setFeedback] = useState('');
  const titleInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (!Array.isArray(saved) || !saved.every(isNote)) throw new Error('Invalid notes');
        setNotes(saved);
      }
      setStorageReady(true);
    } catch {
      setStorageError('Saved notes could not be loaded. New changes will remain available for this session.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || !storageReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setStorageError('');
    } catch {
      setStorageError('Browser storage is unavailable. Your changes may not remain after a reload.');
      setStorageReady(false);
    }
  }, [notes, loaded, storageReady]);

  useEffect(() => {
    const normalized = normalizeTitle(title);
    setDuplicate(Boolean(normalized) && notes.some((note) =>
      note.id !== editingId && normalizeTitle(note.title) === normalized));
  }, [notes, title, editingId]);

  useEffect(() => {
    if (!editorOpen) return;
    titleInput.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEditor();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [editorOpen]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(''), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function openEditor(note?: Note) {
    setEditingId(note?.id ?? null);
    setTitle(note?.title ?? '');
    setDescription(note?.description ?? '');
    setValidation('');
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setValidation('');
  }

  function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      setValidation('A title and description are both required.');
      return;
    }
    if (duplicate) {
      setValidation('A note with this title already exists.');
      return;
    }

    const now = new Date().toISOString();
    if (editingId) {
      setNotes((current) => current.map((note) => note.id === editingId
        ? { ...note, title: title.trim(), description: description.trim(), updatedAt: now }
        : note));
      setFeedback('Note updated successfully.');
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(), title: title.trim(), description: description.trim(),
        createdAt: now, updatedAt: now,
      };
      setNotes((current) => [newNote, ...current]);
      setFeedback('Note added successfully.');
    }
    closeEditor();
  }

  function deleteNote(note: Note) {
    if (!window.confirm(`Delete “${note.title}”? This cannot be undone.`)) return;
    setNotes((current) => current.filter((item) => item.id !== note.id));
    setFeedback('Note deleted.');
  }

  return (
    <main className="siteShell">
      <header className="masthead">
        <div className="issueLine"><span>Personal edition</span><span>Stored on this device</span></div>
        <div className="brandRow">
          <p className="brandMark">N.</p>
          <h1>LOUD NOTES!</h1>
          <p className="noteCount"><strong>{notes.length}</strong><span>{notes.length === 1 ? 'entry' : 'entries'}</span></p>
        </div>
        <nav aria-label="Notebook actions">
          <span>Messy thoughts welcome</span>
          <button type="button" className="primaryButton" onClick={() => openEditor()} disabled={!loaded}>MAKE A NOTE +</button>
        </nav>
      </header>

      <section className="intro" aria-labelledby="page-heading">
        <p className="sectionLabel">YOUR BRAIN DUMP</p>
        <h2 id="page-heading">Big ideas live here.</h2>
        <p>Pin it down before it runs away.</p>
      </section>

      {storageError && <p className="storageError" role="alert">{storageError}</p>}

      <section className="notesSection" aria-label="All notes">
        {!loaded ? <p className="emptyState">Opening your notebook…</p> : notes.length === 0 ? (
          <div className="emptyState">
            <span aria-hidden="true">✦</span>
            <h2>WOW, SO EMPTY!</h2>
            <p>Smash the button and write something brilliant.</p>
            <button type="button" className="textButton" onClick={() => openEditor()}>START HERE →</button>
          </div>
        ) : notes.map((note, index) => (
          <NoteItem key={note.id} note={note} number={index + 1} onEdit={openEditor} onDelete={deleteNote} />
        ))}
      </section>

      {editorOpen && (
        <div className="editorLayer">
          <button className="editorBackdrop" type="button" onClick={closeEditor} aria-label="Close editor" />
          <section className="editorPanel" role="dialog" aria-modal="true" aria-labelledby="editor-heading">
            <div className="editorHeading">
              <div><span>{editingId ? 'Revision desk' : 'New story'}</span><h2 id="editor-heading">{editingId ? 'Edit your note' : 'Compose a note'}</h2></div>
              <button type="button" className="closeButton" onClick={closeEditor} aria-label="Close editor">×</button>
            </div>
            <form onSubmit={saveNote} noValidate>
              <label htmlFor="note-title">Title</label>
              <input ref={titleInput} id="note-title" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} aria-invalid={duplicate || Boolean(validation && !title.trim())} />
              {duplicate && <p className="fieldError" role="alert">That title is already in your notebook.</p>}
              <div className="labelRow"><label htmlFor="note-description">Description</label><span>{description.length}/5000</span></div>
              <textarea id="note-description" value={description} maxLength={5000} rows={8} onChange={(event) => setDescription(event.target.value)} aria-invalid={Boolean(validation && !description.trim())} />
              {validation && !duplicate && <p className="fieldError" role="alert">{validation}</p>}
              <div className="formActions">
                <button type="button" className="secondaryButton" onClick={closeEditor}>Cancel</button>
                <button type="submit" className="primaryButton" disabled={duplicate}>{editingId ? 'Update note' : 'Publish note'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      <div className={`feedback ${feedback ? 'show' : ''}`} role="status" aria-live="polite">{feedback}</div>
    </main>
  );
}
