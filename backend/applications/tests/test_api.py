import json

from django.test import TestCase

from applications.models import Application, ApplicationStatus, ApplicationType


class ApplicationApiTests(TestCase):
    def setUp(self):
        self.create_payload = {
            "applicant_name": "Ada Lovelace",
            "applicant_email": "ada@example.com",
            "company_name": "Analytical Engines Ltd",
            "application_type": ApplicationType.RECORDATION,
            "description": "Initial filing for recordation.",
        }

    def post_json(self, path: str, payload: dict):
        return self.client.post(path, data=json.dumps(payload), content_type="application/json")

    def patch_json(self, path: str, payload: dict):
        return self.client.patch(path, data=json.dumps(payload), content_type="application/json")

    def create_application(self, status=ApplicationStatus.DRAFT, **overrides):
        payload = {
            "applicant_name": "Grace Hopper",
            "applicant_email": "grace@example.com",
            "company_name": "Compiler Systems",
            "application_type": ApplicationType.RENEWAL,
            "description": "Renewal request for the current record.",
            "status": status,
        }
        payload.update(overrides)
        return Application.objects.create(**payload)

    def test_create_draft_generates_tracking_number(self):
        response = self.post_json("/api/applications", self.create_payload)

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(body["tracking_number"].startswith("APP-"))
        self.assertEqual(body["status"], ApplicationStatus.DRAFT)
        self.assertEqual(body["allowed_actions"], ["edit", "submit"])

    def test_list_returns_summary_fields(self):
        application = self.create_application()

        response = self.client.get("/api/applications")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["tracking_number"], application.tracking_number)
        self.assertEqual(
            sorted(body[0].keys()),
            sorted(
                [
                    "allowed_actions",
                    "applicant_name",
                    "application_type",
                    "company_name",
                    "created_at",
                    "status",
                    "tracking_number",
                ]
            ),
        )

    def test_detail_returns_allowed_actions(self):
        application = self.create_application(status=ApplicationStatus.SUBMITTED)

        response = self.client.get(f"/api/applications/{application.tracking_number}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["allowed_actions"], ["start_review"])

    def test_api_docs_page_renders(self):
        response = self.client.get("/api/docs")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Trendflow Workflow Tracker API")

    def test_draft_can_be_edited(self):
        application = self.create_application()

        response = self.patch_json(
            f"/api/applications/{application.tracking_number}",
            {"company_name": "Updated Company"},
        )

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.company_name, "Updated Company")

    def test_need_more_information_can_be_edited(self):
        application = self.create_application(status=ApplicationStatus.NEED_MORE_INFORMATION)

        response = self.patch_json(
            f"/api/applications/{application.tracking_number}",
            {"description": "Updated description after reviewer feedback."},
        )

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.description, "Updated description after reviewer feedback.")

    def test_submitted_cannot_be_edited(self):
        application = self.create_application(status=ApplicationStatus.SUBMITTED)

        response = self.patch_json(
            f"/api/applications/{application.tracking_number}",
            {"description": "This update should fail."},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "Only Draft and Need More Information applications can be edited.",
        )

    def test_under_review_cannot_be_edited(self):
        application = self.create_application(status=ApplicationStatus.UNDER_REVIEW)

        response = self.patch_json(
            f"/api/applications/{application.tracking_number}",
            {"description": "This update should fail."},
        )

        self.assertEqual(response.status_code, 400)

    def test_approved_cannot_be_edited(self):
        application = self.create_application(status=ApplicationStatus.APPROVED)

        response = self.patch_json(
            f"/api/applications/{application.tracking_number}",
            {"description": "This update should fail."},
        )

        self.assertEqual(response.status_code, 400)

    def test_rejected_cannot_be_edited(self):
        application = self.create_application(status=ApplicationStatus.REJECTED)

        response = self.patch_json(
            f"/api/applications/{application.tracking_number}",
            {"description": "This update should fail."},
        )

        self.assertEqual(response.status_code, 400)

    def test_draft_can_be_submitted(self):
        application = self.create_application()

        response = self.post_json(f"/api/applications/{application.tracking_number}/submit", {})

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.SUBMITTED)
        self.assertIsNotNone(application.submitted_at)

    def test_need_more_information_can_be_resubmitted(self):
        application = self.create_application(status=ApplicationStatus.NEED_MORE_INFORMATION)

        response = self.post_json(f"/api/applications/{application.tracking_number}/submit", {})

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.SUBMITTED)
        self.assertIsNotNone(application.submitted_at)

    def test_submitted_cannot_be_submitted_again(self):
        application = self.create_application(status=ApplicationStatus.SUBMITTED)

        response = self.post_json(f"/api/applications/{application.tracking_number}/submit", {})

        self.assertEqual(response.status_code, 400)

    def test_only_submitted_can_start_review(self):
        draft = self.create_application(status=ApplicationStatus.DRAFT)
        submitted = self.create_application(
            status=ApplicationStatus.SUBMITTED,
            applicant_email="submitted@example.com",
        )

        draft_response = self.post_json(f"/api/applications/{draft.tracking_number}/start-review", {})
        submitted_response = self.post_json(
            f"/api/applications/{submitted.tracking_number}/start-review",
            {},
        )

        self.assertEqual(draft_response.status_code, 400)
        self.assertEqual(submitted_response.status_code, 200)
        submitted.refresh_from_db()
        self.assertEqual(submitted.status, ApplicationStatus.UNDER_REVIEW)

    def test_only_under_review_can_receive_decisions(self):
        application = self.create_application(status=ApplicationStatus.SUBMITTED)

        response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {"status": ApplicationStatus.APPROVED},
        )

        self.assertEqual(response.status_code, 400)

    def test_approve_works_without_comment(self):
        application = self.create_application(status=ApplicationStatus.UNDER_REVIEW)

        response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {"status": ApplicationStatus.APPROVED},
        )

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.APPROVED)
        self.assertEqual(application.reviewer_comment, "")
        self.assertIsNotNone(application.reviewed_at)

    def test_reject_requires_comment(self):
        application = self.create_application(status=ApplicationStatus.UNDER_REVIEW)

        response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {"status": ApplicationStatus.REJECTED},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "reviewer_comment is required for Need More Information or Rejected.",
        )

    def test_reject_succeeds_with_comment(self):
        application = self.create_application(status=ApplicationStatus.UNDER_REVIEW)

        response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {
                "status": ApplicationStatus.REJECTED,
                "reviewer_comment": "The filing package is incomplete.",
            },
        )

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.REJECTED)

    def test_need_more_information_requires_comment(self):
        application = self.create_application(status=ApplicationStatus.UNDER_REVIEW)

        response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {"status": ApplicationStatus.NEED_MORE_INFORMATION},
        )

        self.assertEqual(response.status_code, 400)

    def test_need_more_information_succeeds_with_comment(self):
        application = self.create_application(status=ApplicationStatus.UNDER_REVIEW)

        response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {
                "status": ApplicationStatus.NEED_MORE_INFORMATION,
                "reviewer_comment": "Please attach the ownership transfer letter.",
            },
        )

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.NEED_MORE_INFORMATION)
        self.assertEqual(
            application.reviewer_comment,
            "Please attach the ownership transfer letter.",
        )

    def test_invalid_decision_status_is_rejected(self):
        application = self.create_application(status=ApplicationStatus.UNDER_REVIEW)

        response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {"status": ApplicationStatus.SUBMITTED},
        )

        self.assertEqual(response.status_code, 400)

    def test_review_timestamps_are_set_on_decision(self):
        application = self.create_application(status=ApplicationStatus.UNDER_REVIEW)

        response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {"status": ApplicationStatus.APPROVED},
        )

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertIsNotNone(application.reviewed_at)
