import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { Event } from "@/types";

type EventFormState = {
  title: string;
  description: string;
  eventDate: string;
  capacity: string;
};

const EMPTY_FORM: EventFormState = {
  title: "",
  description: "",
  eventDate: "",
  capacity: "",
};

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<EventFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EventFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setEvents(await api.get<Event[]>("/events"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function toIso(localDatetime: string): string {
    return new Date(localDatetime).toISOString();
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await api.post<Event>("/events", {
        title: createForm.title,
        description: createForm.description || undefined,
        eventDate: toIso(createForm.eventDate),
        capacity: createForm.capacity ? Number(createForm.capacity) : undefined,
      });
      setEvents((prev) =>
        [...prev, created].sort((a, b) =>
          a.eventDate.localeCompare(b.eventDate),
        ),
      );
      setCreateForm(EMPTY_FORM);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create event",
      );
    } finally {
      setCreating(false);
    }
  }

  function startEdit(ev: Event) {
    setEditingId(ev.id);
    setEditForm({
      title: ev.title,
      description: ev.description ?? "",
      eventDate: ev.eventDate.slice(0, 16),
      capacity: ev.capacity ? String(ev.capacity) : "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<Event>(`/events/${id}`, {
        title: editForm.title,
        description: editForm.description || null,
        eventDate: toIso(editForm.eventDate),
        capacity: editForm.capacity ? Number(editForm.capacity) : null,
      });
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update event",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <h1>Events</h1>
      {error && <p className="form-error">{error}</p>}

      <form className="form form-inline" onSubmit={(e) => void handleCreate(e)}>
        <h2>New Event</h2>
        <label htmlFor="ev-title">Title</label>
        <input
          id="ev-title"
          required
          value={createForm.title}
          onChange={(e) =>
            setCreateForm((f) => ({ ...f, title: e.target.value }))
          }
        />
        <label htmlFor="ev-date">Date &amp; time</label>
        <input
          id="ev-date"
          type="datetime-local"
          required
          value={createForm.eventDate}
          onChange={(e) =>
            setCreateForm((f) => ({ ...f, eventDate: e.target.value }))
          }
        />
        <label htmlFor="ev-capacity">Capacity (optional)</label>
        <input
          id="ev-capacity"
          type="number"
          min={1}
          value={createForm.capacity}
          onChange={(e) =>
            setCreateForm((f) => ({ ...f, capacity: e.target.value }))
          }
        />
        <label htmlFor="ev-description">Description</label>
        <textarea
          id="ev-description"
          value={createForm.description}
          onChange={(e) =>
            setCreateForm((f) => ({ ...f, description: e.target.value }))
          }
        />
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? "Creating…" : "Create Event"}
        </button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul className="event-list">
          {events.map((ev) =>
            editingId === ev.id ? (
              <li key={ev.id} className="event-item">
                <div className="form">
                  <input
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                  <input
                    type="datetime-local"
                    value={editForm.eventDate}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, eventDate: e.target.value }))
                    }
                  />
                  <input
                    type="number"
                    min={1}
                    value={editForm.capacity}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, capacity: e.target.value }))
                    }
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                  <div className="action-buttons">
                    <button
                      className="btn btn-primary"
                      disabled={saving}
                      onClick={() => void saveEdit(ev.id)}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </li>
            ) : (
              <li key={ev.id} className="event-item">
                <div>
                  <strong>{ev.title}</strong> —{" "}
                  {new Date(ev.eventDate).toLocaleString()}
                  {ev.capacity && ` — capacity ${ev.capacity}`}
                  {ev.description && <p>{ev.description}</p>}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => startEdit(ev)}
                >
                  Edit
                </button>
              </li>
            ),
          )}
          {events.length === 0 && <li>No upcoming events.</li>}
        </ul>
      )}
    </div>
  );
}
