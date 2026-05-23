import { useEffect, useState, type FormEvent } from "react";

import {
  errorPanelClass,
  inputClass,
  primaryButtonClass,
  selectClass,
  textareaClass,
} from "../lib/ui";
import { APPLICATION_TYPES, type ApplicationFormValues } from "../types/application";

interface ApplicationFormProps {
  initialValues: ApplicationFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: ApplicationFormValues) => Promise<void>;
}

type FieldErrors = Partial<Record<keyof ApplicationFormValues, string>>;

function validate(values: ApplicationFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.applicant_name.trim()) {
    errors.applicant_name = "Applicant name is required.";
  }
  if (!values.applicant_email.trim()) {
    errors.applicant_email = "Applicant email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.applicant_email)) {
    errors.applicant_email = "Applicant email must be valid.";
  }
  if (!values.company_name.trim()) {
    errors.company_name = "Company name is required.";
  }
  if (!values.application_type) {
    errors.application_type = "Application type is required.";
  }
  if (!values.description.trim()) {
    errors.description = "Description is required.";
  }

  return errors;
}

export default function ApplicationForm({
  initialValues,
  submitLabel,
  isSubmitting,
  errorMessage,
  onSubmit,
}: ApplicationFormProps) {
  const [values, setValues] = useState<ApplicationFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setValues(initialValues);
    setFieldErrors({});
  }, [initialValues]);

  const handleChange = <K extends keyof ApplicationFormValues>(field: K, value: ApplicationFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit({
      applicant_name: values.applicant_name.trim(),
      applicant_email: values.applicant_email.trim(),
      company_name: values.company_name.trim(),
      application_type: values.application_type,
      description: values.description.trim(),
    });
  };

  return (
    <form className="grid gap-5 p-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[#111111]">Applicant name</span>
          <input
            className={inputClass}
            type="text"
            value={values.applicant_name}
            onChange={(event) => handleChange("applicant_name", event.target.value)}
          />
          {fieldErrors.applicant_name ? <small className="text-sm text-[#9c1c25]">{fieldErrors.applicant_name}</small> : null}
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[#111111]">Applicant email</span>
          <input
            className={inputClass}
            type="email"
            value={values.applicant_email}
            onChange={(event) => handleChange("applicant_email", event.target.value)}
          />
          {fieldErrors.applicant_email ? <small className="text-sm text-[#9c1c25]">{fieldErrors.applicant_email}</small> : null}
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[#111111]">Company name</span>
          <input
            className={inputClass}
            type="text"
            value={values.company_name}
            onChange={(event) => handleChange("company_name", event.target.value)}
          />
          {fieldErrors.company_name ? <small className="text-sm text-[#9c1c25]">{fieldErrors.company_name}</small> : null}
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[#111111]">Application type</span>
          <select
            className={selectClass}
            value={values.application_type}
            onChange={(event) => handleChange("application_type", event.target.value as ApplicationFormValues["application_type"])}
          >
            {APPLICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {fieldErrors.application_type ? <small className="text-sm text-[#9c1c25]">{fieldErrors.application_type}</small> : null}
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-[#111111]">Description</span>
        <textarea
          className={textareaClass}
          rows={8}
          value={values.description}
          onChange={(event) => handleChange("description", event.target.value)}
        />
        {fieldErrors.description ? <small className="text-sm text-[#9c1c25]">{fieldErrors.description}</small> : null}
      </label>

      {errorMessage ? <p className={errorPanelClass}>{errorMessage}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
