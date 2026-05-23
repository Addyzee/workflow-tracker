from django.conf import settings
from django.db import models


class UserRole(models.TextChoices):
    APPLICANT = "applicant", "Applicant"
    REVIEWER = "reviewer", "Reviewer"


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=255)
    role = models.CharField(max_length=24, choices=UserRole.choices, default=UserRole.APPLICANT)
    company_name = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return f"{self.display_name} ({self.role})"

