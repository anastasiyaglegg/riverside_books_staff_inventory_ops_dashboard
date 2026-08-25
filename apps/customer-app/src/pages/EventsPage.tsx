import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useCustomer } from "@/lib/customer-context";
import { customerFullName, type EventTicket, type StoreEvent } from "@/types";
import { GuestContactFields, type GuestContact } from "@/components/GuestContactFields";

const EMPTY_CONTACT: GuestContact = { name: "", email: "", phone: "" };

function ReservationControl({ event }: { event: StoreEvent }) {
  const { customer, adopt } = useCustomer();
  const [formOpen, setFormOpen] = useState(false);
  const [contact, setContact] = useState<GuestContact>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reserved, setReserved] = useState(false);

  async function reserve(guest: { name: string; email?: string; phone?: string }) {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const ticket = await api.post<EventTicket>(`/events/${event.id}/tickets`, {
        customerName: guest.name,
        ...(guest.email && { customerEmail: guest.email }),
        ...(guest.phone && { customerPhone: guest.phone }),
      });
      if (ticket.customer) {
        adopt(ticket.customer);
      }
      setReserved(true);
      setFormOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Couldn't reserve a spot. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleReserveClick() {
    if (customer) {
      void reserve({
        name: customerFullName(customer),
        ...(customer.email && { email: customer.email }),
        ...(customer.phone && { phone: customer.phone }),
      });
      return;
    }
    setFormOpen(true);
  }

  function handleGuestSubmit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    if (!contact.email.trim() && !contact.phone.trim()) {
      setErrorMessage("Add an email or phone number so the store can reach you.");
      return;
    }
    void reserve({
      name: contact.name.trim(),
      ...(contact.email.trim() && { email: contact.email.trim() }),
      ...(contact.phone.trim() && { phone: contact.phone.trim() }),
    });
  }

  if (reserved) {
    return <p className="text-sm font-medium text-emerald-700">You're on the list for this one.</p>;
  }

  return (
    <div className="shrink-0">
      {!formOpen && (
        <button
          type="button"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-default disabled:opacity-50"
          onClick={handleReserveClick}
          disabled={submitting}
        >
          {submitting ? "Reserving…" : "Reserve a Spot"}
        </button>
      )}
      {formOpen && (
        <form className="flex w-64 flex-col gap-3" onSubmit={handleGuestSubmit}>
          <GuestContactFields contact={contact} onChange={setContact} idPrefix={`event-${event.id}`} />
          {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}
          <button
            type="submit"
            className="self-start rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-default disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Reserving…" : "Confirm Reservation"}
          </button>
        </form>
      )}
      {!formOpen && errorMessage && <p className="mt-2 text-sm text-rose-600">{errorMessage}</p>}
    </div>
  );
}

export function EventsPage() {
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    api
      .get<StoreEvent[]>("/events")
      .then((result) => {
        if (!cancelled) {
          setEvents(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : "Couldn't load upcoming events.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const now = Date.now();
  const upcomingEvents = events.filter((event) => new Date(event.eventDate).getTime() >= now);

  if (loading) {
    return <p className="py-12 text-center text-stone-500">Loading events…</p>;
  }
  if (errorMessage) {
    return <p className="py-12 text-center text-rose-600">{errorMessage}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">Upcoming Events</h1>

      {upcomingEvents.length === 0 && (
        <p className="py-12 text-center text-stone-500">
          No upcoming events right now — check back soon.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {upcomingEvents.map((event) => (
          <li
            key={event.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start"
          >
            <div>
              <p className="font-semibold text-stone-900">{event.title}</p>
              <p className="mt-1 text-sm text-stone-500">
                {new Date(event.eventDate).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {event.capacity != null && ` · ${event.capacity} seats`}
              </p>
              {event.description && <p className="mt-2 text-sm text-stone-700">{event.description}</p>}
            </div>
            <ReservationControl event={event} />
          </li>
        ))}
      </ul>
    </div>
  );
}
