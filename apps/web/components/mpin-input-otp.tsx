"use client";

import { Description, InputOTP, Label, REGEXP_ONLY_DIGITS } from "@heroui/react";
import { cn } from "@/lib/utils";

const MPIN_LENGTH = 4;

type MpinInputOtpProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string | null;
  /** Hide label (e.g. modal already has a heading/description). */
  hideLabel?: boolean;
  /** Center the digit row (recommended in modals). */
  centered?: boolean;
  className?: string;
};

export function MpinInputOtp({
  id,
  label = "MPIN",
  value,
  onChange,
  onComplete,
  autoFocus,
  isDisabled,
  isInvalid,
  errorMessage,
  hideLabel = false,
  centered = false,
  className,
}: MpinInputOtpProps) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {!hideLabel && label ? (
        <Label htmlFor={id}>{label}</Label>
      ) : null}
      <div className={cn("flex w-full", centered && "justify-center")}>
        <InputOTP
          id={id}
          autoFocus={autoFocus}
          containerClassName={cn(centered && "justify-center")}
          inputMode="numeric"
          isDisabled={isDisabled}
          isInvalid={isInvalid}
          maxLength={MPIN_LENGTH}
          pattern={REGEXP_ONLY_DIGITS}
          value={value}
          variant="secondary"
          onChange={onChange}
          onComplete={onComplete}
        >
          <InputOTP.Group className="gap-2">
            {Array.from({ length: MPIN_LENGTH }, (_, index) => (
              <InputOTP.Slot key={index} index={index} />
            ))}
          </InputOTP.Group>
        </InputOTP>
      </div>
      {isInvalid && errorMessage ? (
        <Description
          className={cn("text-sm text-danger", centered && "text-center")}
        >
          {errorMessage}
        </Description>
      ) : null}
    </div>
  );
}
