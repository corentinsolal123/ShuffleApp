import { Field as BaseField } from "@base-ui/react/field";
import { cn } from "@/lib/utils";

function Field({ className, ...props }: BaseField.Root.Props) {
  return <BaseField.Root data-slot="field" className={cn("flex flex-col gap-2", className)} {...props} />;
}

function FieldLabel({ className, ...props }: BaseField.Label.Props) {
  return <BaseField.Label data-slot="field-label" className={cn("label-caps", className)} {...props} />;
}

function FieldDescription({ className, ...props }: BaseField.Description.Props) {
  return (
    <BaseField.Description
      data-slot="field-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function FieldError({ className, ...props }: BaseField.Error.Props) {
  return <BaseField.Error data-slot="field-error" className={cn("text-sm text-destructive", className)} {...props} />;
}

export { Field, FieldLabel, FieldDescription, FieldError };
