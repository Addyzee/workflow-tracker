from django.conf import settings
from django.db import migrations, models


def copy_existing_reviewer_comments(apps, schema_editor):
    Application = apps.get_model("applications", "Application")
    ApplicationReviewHistory = apps.get_model("applications", "ApplicationReviewHistory")

    for application in Application.objects.exclude(reviewer_comment="").iterator():
        ApplicationReviewHistory.objects.create(
            application=application,
            reviewer=None,
            decision_status=application.status,
            comment=application.reviewer_comment,
            created_at=application.reviewed_at or application.updated_at,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("applications", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="application",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="applications",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="ApplicationReviewHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "decision_status",
                    models.CharField(
                        choices=[
                            ("Draft", "Draft"),
                            ("Submitted", "Submitted"),
                            ("Under Review", "Under Review"),
                            ("Need More Information", "Need More Information"),
                            ("Approved", "Approved"),
                            ("Rejected", "Rejected"),
                        ],
                        max_length=32,
                    ),
                ),
                ("comment", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "application",
                    models.ForeignKey(on_delete=models.CASCADE, related_name="review_history", to="applications.application"),
                ),
                (
                    "reviewer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.SET_NULL,
                        related_name="review_history_entries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.RunPython(copy_existing_reviewer_comments, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="application",
            name="reviewer_comment",
        ),
    ]
