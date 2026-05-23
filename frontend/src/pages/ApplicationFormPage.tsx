import { startTransition, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { createApplication, getApplication, updateApplication } from "../api/applications";
import { ApiError } from "../api/client";
import ApplicationForm from "../components/ApplicationForm";
import { useAuth } from "../context/AuthContext";
import {
  cardTitleClass,
  labelClass,
  panelClass,
  panelPaddingClass,
  sectionTitleClass,
} from "../lib/ui";
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
  const { user } = useAuth();

  const [formValues, setFormValues] = useState<ApplicationFormValues>(EMPTY_FORM);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingNumber) {
      setFormValues({
        applicant_name: user?.display_name ?? "",
        applicant_email: user?.email ?? "",
        company_name: user?.company_name ?? "",
        application_type: APPLICATION_TYPES[0],
        description: "",
      });
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
  }, [trackingNumber, user]);

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
    <section className="grid gap-5">
      <div>
        <p className={labelClass}>{isEditMode ? "Edit" : "Create"}</p>
        <h2 className={sectionTitleClass}>{isEditMode ? "Edit application" : "Create application draft"}</h2>
      </div>

      {isLoading ? <p className={panelPaddingClass}>Loading application...</p> : null}
      {showLoadError ? <p className="border border-[#efc9cf] bg-[#fff4f5] p-4 text-sm text-[#9c1c25]">{errorMessage}</p> : null}

      {!isLoading && isEditMode && application && !canEdit ? (
        <div className="border border-[#efc9cf] bg-[#fff4f5] p-4 text-sm text-[#9c1c25]">
          <p>This application cannot be edited in its current status.</p>
          <Link className="mt-2 inline-block border-b border-current" to={`/applications/${application.tracking_number}`}>
            Back to detail
          </Link>
        </div>
      ) : null}

      {!isLoading && (!isEditMode || application) && canEdit ? (
        <div className={panelClass}>
          <div className="border-b border-[#d7d7db] px-5 py-4">
            <h3 className={cardTitleClass}>{isEditMode ? "Edit" : "Create"}</h3>
          </div>
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
