import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  endAdornment?: ReactNode;
  id: string;
  label: string;
};

export function Input({ endAdornment, id, label, ...props }: InputProps) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap" data-has-adornment={Boolean(endAdornment)}>
        <input id={id} {...props} />
        {endAdornment && <div className="input-end-adornment">{endAdornment}</div>}
      </div>
    </div>
  );
}
