import secrets

from django.db import models
from django.utils import timezone


def build_tracking_number() -> str:
    return f"APP-{timezone.now():%Y%m%d}-{secrets.token_hex(3).upper()}"


class ApplicationType(models.TextChoices):
    RECORDATION = "Recordation", "Recordation"
    RENEWAL = "Renewal", "Renewal"
    CHANGE_OF_OWNERSHIP = "Change of Ownership", "Change of Ownership"
    CHANGE_OF_NAME = "Change of Name", "Change of Name"
    DISCONTINUATION = "Discontinuation", "Discontinuation"


class ApplicationStatus(models.TextChoices):
    DRAFT = "Draft", "Draft"
    SUBMITTED = "Submitted", "Submitted"
    UNDER_REVIEW = "Under Review", "Under Review"
    NEED_MORE_INFORMATION = "Need More Information", "Need More Information"
    APPROVED = "Approved", "Approved"
    REJECTED = "Rejected", "Rejected"


class Application(models.Model):
    tracking_number = models.CharField(max_length=32, unique=True, editable=False)
    applicant_name = models.CharField(max_length=255)
    applicant_email = models.EmailField()
    company_name = models.CharField(max_length=255)
    application_type = models.CharField(max_length=64, choices=ApplicationType.choices)
    description = models.TextField()
    status = models.CharField(
        max_length=32,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.DRAFT,
    )
    reviewer_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.tracking_number} - {self.applicant_name}"

    def save(self, *args, **kwargs):
        if not self.tracking_number:
            for _ in range(10):
                candidate = build_tracking_number()
                if not Application.objects.filter(tracking_number=candidate).exists():
                    self.tracking_number = candidate
                    break
            else:
                raise ValueError("Unable to generate a unique tracking number.")
        super().save(*args, **kwargs)

