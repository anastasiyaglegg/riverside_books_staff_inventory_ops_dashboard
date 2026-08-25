import { INPUT_CLASSES, LABEL_CLASSES } from "@/components/form-classes";

export type GuestContact = {
  name: string;
  email: string;
  phone: string;
};

export function GuestContactFields({
  contact,
  onChange,
  idPrefix,
}: {
  contact: GuestContact;
  onChange: (next: GuestContact) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-name`} className={LABEL_CLASSES}>
          Name
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          className={INPUT_CLASSES}
          value={contact.name}
          onChange={(event) => onChange({ ...contact, name: event.target.value })}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-email`} className={LABEL_CLASSES}>
          Email
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          className={INPUT_CLASSES}
          value={contact.email}
          onChange={(event) => onChange({ ...contact, email: event.target.value })}
          placeholder="you@example.com"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-phone`} className={LABEL_CLASSES}>
          Phone
        </label>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          className={INPUT_CLASSES}
          value={contact.phone}
          onChange={(event) => onChange({ ...contact, phone: event.target.value })}
          placeholder="(555) 555-5555"
        />
      </div>
      <p className="text-xs text-stone-500">Email or phone — at least one, so we can reach you.</p>
    </div>
  );
}
