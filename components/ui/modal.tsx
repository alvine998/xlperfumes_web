"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";

type ModalProps = ComponentPropsWithoutRef<"dialog"> & {
  closeOnBackdropClick?: boolean;
};

export const Modal = forwardRef<HTMLDialogElement, ModalProps>(
  function Modal(
    { closeOnBackdropClick = true, className, onClick, ...props },
    ref,
  ) {
    const classes = ["app-modal", className].filter(Boolean).join(" ");

    return (
      <dialog
        {...props}
        ref={ref}
        className={classes}
        onClick={(event) => {
          if (
            closeOnBackdropClick &&
            event.target === event.currentTarget &&
            event.currentTarget.open
          ) {
            event.currentTarget.close();
          }
          onClick?.(event);
        }}
      />
    );
  },
);
