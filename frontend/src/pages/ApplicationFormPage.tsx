import { startTransition, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { createApplication, getApplication, updateApplication } from "../api/applications";
import { ApiError } from "../api/client";
import ApplicationForm from "../components/ApplicationForm";
import {
  APPLICATION_TYPES,
  type ApplicationDetail,
  type ApplicationFormValues,
} from "../types/application";

const EMPTY_FORM: ApplicationFormValues = {
  applicant_name: "",
  applicant_email: "",
  company_name: "",
  application_type: APPLICATION_TYPES[0],
  description: "",
};

function toFormValues(application: ApplicationDetail): ApplicationFormValues {
  return {
    applicant_name: application.applicant_name,
    applicant_email: application.applicant_email,
    company_name: application.company_name,
    application_type: application.application_type as ApplicationFormValues["application_type"],
    description: application.description,
  };
}

export default function ApplicationFormPage() {
  const { trackingNumber } = useParams();
  const isEditMode = Boolean(trackingNumber);
  const navigate = useNavigate();

  const [formValues, setFormValues] = useState<ApplicationFormValues>(EMPTY_FORM);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingNumber) {
      setFormValues(EMPTY_FORM);
      setApplication(null);
      setIsLoading(false);
      return;
    }

    const trackingId = trackingNumber;
    let active = true;

    async function loadApplication() {
      setIsLoading(true);
      try {
        const data = await getApplication(trackingId);
        if (active) {
          setApplication(data);
          setFormValues(toFormValues(data));
          setErrorMessage(null);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof ApiError ? error.message : "Unable to load the application.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadApplication();

    return () => {
      active = false;
    };
  }, [trackingNumber]);

  async function handleSubmit(values: ApplicationFormValues) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const saved = trackingNumber
        ? await updateApplication(trackingNumber, values)
        : await createApplication(values);

      startTransition(() => {
        navigate(`/applications/${saved.tracking_number}`);
      });
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to save the application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canEdit = !application || application.allowed_actions.includes("edit");
  const showLoadError = !isLoading && isEditMode && !application && errorMessage;

  return (
    <section className="page-grid">
      <div className="page-heading">
        <div>
          <p className="folio">{isEditMode ? "03" : "02"}</p>
          <h2>{isEditMode ? "Edit application" : "Create application draft"}</h2>
        </div>
      </div>

      {isLoading ? <p className="panel">Loading application...</p> : null}
      {showLoadError ? <p className="panel error-panel">{errorMessage}</p> : null}

      {!isLoading && isEditMode && application && !canEdit ? (
        <div className="panel error-panel">
          <p>This application cannot be edited in its current status.</p>
          <Link to={`/applications/${application.tracking_number}`}>Back to application</Link>
        </div>
      ) : null}

      {!isLoading && (!isEditMode || application) && canEdit ? (
        <div className="panel form-panel">
          <ApplicationForm
            initialValues={formValues}
            submitLabel={isEditMode ? "Save changes" : "Save draft"}
            isSubmitting={isSubmitting}
            errorMessage={!isLoading ? errorMessage : null}
            onSubmit={handleSubmit}
          />
        </div>
      ) : null}
    </section>
  );
}
