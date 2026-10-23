import { OTPField as BaseOTPField } from "@base-ui/react/otp-field";
import { cn } from "@/lib/utils";

type OTPFieldProps = BaseOTPField.Root.Props & { autoFocus?: boolean };

/** One box per character, auto-advancing, with paste and SMS/email autofill support. */
function OTPField({ className, length, autoFocus, ...props }: OTPFieldProps) {
  return (
    <BaseOTPField.Root data-slot="otp-field" length={length} className={cn("flex gap-2", className)} {...props}>
      {Array.from({ length }, (_, index) => (
        <BaseOTPField.Input
          key={index}
          autoFocus={autoFocus && index === 0}
          aria-label={index === 0 ? undefined : `Caractère ${index + 1} sur ${length}`}
          className="h-14 w-full min-w-0 border border-input bg-transparent text-center text-xl tabular-nums outline-none focus-visible:border-2 aria-invalid:border-destructive"
        />
      ))}
    </BaseOTPField.Root>
  );
}

export { OTPField };
