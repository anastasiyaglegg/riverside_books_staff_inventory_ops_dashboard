import { useId, useState } from "react";
import { INPUT_CLASSES, LABEL_CLASSES } from "@/components/form-classes";

type PasswordInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  // "new-password" on signup/confirm, "current-password" on login -- lets password
  // managers offer the right thing.
  autoComplete: "new-password" | "current-password";
  id?: string;
  name?: string;
  required?: boolean;
  describedById?: string;
  onBlur?: () => void;
};

export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  id,
  name,
  required,
  describedById,
  onBlur,
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className={LABEL_CLASSES}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          className={`${INPUT_CLASSES} pr-12`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required={required}
          aria-describedby={describedById}
        />
        <button
          // type="button" is load-bearing: without it this button submits the form.
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-stone-500 hover:text-brand-700"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
