from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("display_name", models.CharField(max_length=255)),
                (
                    "role",
                    models.CharField(
                        choices=[("applicant", "Applicant"), ("reviewer", "Reviewer")],
                        default="applicant",
                        max_length=24,
                    ),
                ),
                ("company_name", models.CharField(blank=True, max_length=255)),
                (
                    "user",
                    models.OneToOneField(on_delete=models.CASCADE, related_name="profile", to=settings.AUTH_USER_MODEL),
                ),
            ],
        ),
    ]

