import { useEffect, useState, type FormEvent } from "react";

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
    <form className="application-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          <span>Applicant name</span>
          <input
            type="text"
            value={values.applicant_name}
            onChange={(event) => handleChange("applicant_name", event.target.value)}
          />
          {fieldErrors.applicant_name ? <small>{fieldErrors.applicant_name}</small> : null}
        </label>

        <label>
          <span>Applicant email</span>
          <input
            type="email"
            value={values.applicant_email}
            onChange={(event) => handleChange("applicant_email", event.target.value)}
          />
          {fieldErrors.applicant_email ? <small>{fieldErrors.applicant_email}</small> : null}
        </label>

        <label>
          <span>Company name</span>
          <input
            type="text"
            value={values.company_name}
            onChange={(event) => handleChange("company_name", event.target.value)}
          />
          {fieldErrors.company_name ? <small>{fieldErrors.company_name}</small> : null}
        </label>

        <label>
          <span>Application type</span>
          <select
            value={values.application_type}
            onChange={(event) => handleChange("application_type", event.target.value as ApplicationFormValues["application_type"])}
          >
            {APPLICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {fieldErrors.application_type ? <small>{fieldErrors.application_type}</small> : null}
        </label>
      </div>

      <label className="form-textarea">
        <span>Description</span>
        <textarea
          rows={8}
          value={values.description}
          onChange={(event) => handleChange("description", event.target.value)}
        />
        {fieldErrors.description ? <small>{fieldErrors.description}</small> : null}
      </label>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="form-actions">
        <button type="submit" className="button-primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
