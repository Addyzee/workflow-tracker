import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import UserProfile, UserRole
from applications.models import Application, ApplicationReviewHistory, ApplicationStatus, ApplicationType

User = get_user_model()


class ApplicationApiTests(TestCase):
    password = "supersecret123"

    def setUp(self):
        self.applicant = self.create_user(
            email="ada@example.com",
            display_name="Ada Lovelace",
            role=UserRole.APPLICANT,
            company_name="Analytical Engines Ltd",
        )
        self.second_applicant = self.create_user(
            email="grace@example.com",
            display_name="Grace Hopper",
            role=UserRole.APPLICANT,
            company_name="Compiler Systems",
        )
        self.reviewer = self.create_user(
            email="reviewer@example.com",
            display_name="Registry Reviewer",
            role=UserRole.REVIEWER,
            company_name="Registry Company",
        )
        self.create_payload = {
            "applicant_name": "Ada Lovelace",
            "applicant_email": "ada@example.com",
            "company_name": "Analytical Engines Ltd",
            "application_type": ApplicationType.RECORDATION,
            "description": "Initial filing for recordation.",
        }

    def create_user(self, *, email: str, display_name: str, role: str, company_name: str):
        user = User.objects.create_user(username=email.lower(), email=email.lower(), password=self.password)
        UserProfile.objects.create(
            user=user,
            display_name=display_name,
            role=role,
            company_name=company_name,
        )
        return user

    def create_application(self, owner, status=ApplicationStatus.DRAFT, **overrides):
        payload = {
            "owner": owner,
            "applicant_name": owner.profile.display_name,
            "applicant_email": owner.email,
            "company_name": owner.profile.company_name or "Applicant Company",
            "application_type": ApplicationType.RENEWAL,
            "description": "Renewal request for the current record.",
            "status": status,
        }
        payload.update(overrides)
        return Application.objects.create(**payload)

    def post_json(self, path: str, payload: dict):
        return self.client.post(path, data=json.dumps(payload), content_type="application/json")

    def patch_json(self, path: str, payload: dict):
        return self.client.patch(path, data=json.dumps(payload), content_type="application/json")

    def login_as(self, user):
        self.client.force_login(user)

    def test_session_endpoint_returns_csrf_token_for_guests(self):
        response = self.client.get("/api/auth/session")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["authenticated"])
        self.assertIsInstance(body["csrf_token"], str)
        self.assertGreater(len(body["csrf_token"]), 0)

    def test_signup_login_and_logout_flow(self):
        signup_response = self.post_json(
            "/api/auth/signup",
            {
                "display_name": "New Applicant",
                "email": "new@example.com",
                "password": self.password,
                "password_confirm": self.password,
                "role": UserRole.APPLICANT,
                "company_name": "New Applicant Co",
            },
        )

        self.assertEqual(signup_response.status_code, 201)
        self.assertTrue(signup_response.json()["authenticated"])
        self.assertEqual(signup_response.json()["user"]["role"], UserRole.APPLICANT)

        logout_response = self.post_json("/api/auth/logout", {})

        self.assertEqual(logout_response.status_code, 200)
        self.assertFalse(logout_response.json()["authenticated"])

        login_response = self.post_json(
            "/api/auth/login",
            {"email": "new@example.com", "password": self.password},
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertTrue(login_response.json()["authenticated"])
        self.assertEqual(login_response.json()["user"]["email"], "new@example.com")

    def test_reviewer_signup_requires_company_name(self):
        response = self.post_json(
            "/api/auth/signup",
            {
                "display_name": "Reviewer",
                "email": "company@example.com",
                "password": self.password,
                "password_confirm": self.password,
                "role": UserRole.REVIEWER,
                "company_name": "",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "company_name is required for reviewer accounts.")

    def test_unauthenticated_requests_are_rejected(self):
        response = self.client.get("/api/applications")

        self.assertEqual(response.status_code, 401)

    def test_applicant_creates_draft_and_owns_it(self):
        self.login_as(self.applicant)

        response = self.post_json("/api/applications", self.create_payload)

        self.assertEqual(response.status_code, 201)
        body = response.json()
        application = Application.objects.get(tracking_number=body["tracking_number"])
        self.assertEqual(application.owner_id, self.applicant.id)
        self.assertEqual(body["allowed_actions"], ["edit", "submit"])

    def test_reviewer_cannot_create_applications(self):
        self.login_as(self.reviewer)

        response = self.post_json("/api/applications", self.create_payload)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Only applicants can create applications.")

    def test_applicant_list_is_scoped_to_owned_applications(self):
        owned = self.create_application(self.applicant)
        self.create_application(self.second_applicant, applicant_email="other@example.com")
        self.login_as(self.applicant)

        response = self.client.get("/api/applications")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["tracking_number"], owned.tracking_number)

    def test_reviewer_list_includes_all_applications(self):
        self.create_application(self.applicant)
        self.create_application(self.second_applicant, applicant_email="other@example.com")
        self.login_as(self.reviewer)

        response = self.client.get("/api/applications")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

    def test_list_filters_by_search_status_and_type(self):
        first = self.create_application(
            self.applicant,
            status=ApplicationStatus.SUBMITTED,
            application_type=ApplicationType.RECORDATION,
            company_name="Analytical Engines Ltd",
        )
        self.create_application(
            self.second_applicant,
            status=ApplicationStatus.DRAFT,
            application_type=ApplicationType.DISCONTINUATION,
            company_name="Compiler Systems",
            applicant_email="searchme@example.com",
        )
        self.login_as(self.reviewer)

        response = self.client.get(
            "/api/applications",
            {"search": "Analytical", "status": ApplicationStatus.SUBMITTED, "application_type": ApplicationType.RECORDATION},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["tracking_number"], first.tracking_number)

    def test_invalid_filter_value_returns_400(self):
        self.login_as(self.reviewer)

        response = self.client.get("/api/applications", {"status": "Unknown"})

        self.assertEqual(response.status_code, 400)

    def test_applicant_cannot_view_other_applicants_application(self):
        application = self.create_application(self.second_applicant)
        self.login_as(self.applicant)

        response = self.client.get(f"/api/applications/{application.tracking_number}")

        self.assertEqual(response.status_code, 404)

    def test_reviewer_sees_reviewer_actions_for_submitted_application(self):
        application = self.create_application(self.applicant, status=ApplicationStatus.SUBMITTED)
        self.login_as(self.reviewer)

        response = self.client.get(f"/api/applications/{application.tracking_number}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["allowed_actions"], ["start_review"])

    def test_applicant_can_edit_own_draft(self):
        application = self.create_application(self.applicant)
        self.login_as(self.applicant)

        response = self.patch_json(
            f"/api/applications/{application.tracking_number}",
            {"company_name": "Updated Company"},
        )

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.company_name, "Updated Company")

    def test_reviewer_cannot_edit_applicant_application(self):
        application = self.create_application(self.applicant)
        self.login_as(self.reviewer)

        response = self.patch_json(
            f"/api/applications/{application.tracking_number}",
            {"company_name": "Updated Company"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["detail"],
            "Only the owning applicant can edit this application.",
        )

    def test_applicant_can_submit_and_resubmit_need_more_information(self):
        application = self.create_application(self.applicant)
        self.login_as(self.applicant)

        first_response = self.post_json(f"/api/applications/{application.tracking_number}/submit", {})

        self.assertEqual(first_response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.SUBMITTED)
        self.assertIsNotNone(application.submitted_at)

        application.status = ApplicationStatus.NEED_MORE_INFORMATION
        application.save(update_fields=["status", "updated_at"])

        second_response = self.post_json(f"/api/applications/{application.tracking_number}/submit", {})

        self.assertEqual(second_response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.SUBMITTED)

    def test_applicant_cannot_start_review(self):
        application = self.create_application(self.applicant, status=ApplicationStatus.SUBMITTED)
        self.login_as(self.applicant)

        response = self.post_json(f"/api/applications/{application.tracking_number}/start-review", {})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Only reviewers can start review.")

    def test_reviewer_can_start_review(self):
        application = self.create_application(self.applicant, status=ApplicationStatus.SUBMITTED)
        self.login_as(self.reviewer)

        response = self.post_json(f"/api/applications/{application.tracking_number}/start-review", {})

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.UNDER_REVIEW)

    def test_applicant_cannot_record_decisions(self):
        application = self.create_application(self.applicant, status=ApplicationStatus.UNDER_REVIEW)
        self.login_as(self.applicant)

        response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {"status": ApplicationStatus.APPROVED},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Only reviewers can record decisions.")

    def test_decision_requires_comment_for_reject_and_need_more_information(self):
        application = self.create_application(self.applicant, status=ApplicationStatus.UNDER_REVIEW)
        self.login_as(self.reviewer)

        reject_response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {"status": ApplicationStatus.REJECTED},
        )
        nmi_response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {"status": ApplicationStatus.NEED_MORE_INFORMATION},
        )

        self.assertEqual(reject_response.status_code, 400)
        self.assertEqual(nmi_response.status_code, 400)

    def test_reviewer_decision_creates_history_entry_and_updates_detail(self):
        application = self.create_application(self.applicant, status=ApplicationStatus.UNDER_REVIEW)
        self.login_as(self.reviewer)

        decision_response = self.post_json(
            f"/api/applications/{application.tracking_number}/decision",
            {
                "status": ApplicationStatus.NEED_MORE_INFORMATION,
                "reviewer_comment": "Please attach the ownership transfer letter.",
            },
        )

        self.assertEqual(decision_response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.status, ApplicationStatus.NEED_MORE_INFORMATION)
        self.assertEqual(ApplicationReviewHistory.objects.filter(application=application).count(), 1)
        history_entry = ApplicationReviewHistory.objects.get(application=application)
        self.assertEqual(history_entry.reviewer_id, self.reviewer.id)
        self.assertEqual(history_entry.comment, "Please attach the ownership transfer letter.")

        detail_response = self.client.get(f"/api/applications/{application.tracking_number}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(len(detail_response.json()["review_history"]), 1)
        self.assertEqual(
            detail_response.json()["review_history"][0]["reviewer_name"],
            self.reviewer.profile.display_name,
        )

    def test_application_detail_returns_ordered_review_history(self):
        application = self.create_application(self.applicant, status=ApplicationStatus.UNDER_REVIEW)
        first = ApplicationReviewHistory.objects.create(
            application=application,
            reviewer=self.reviewer,
            decision_status=ApplicationStatus.NEED_MORE_INFORMATION,
            comment="First review note.",
        )
        second = ApplicationReviewHistory.objects.create(
            application=application,
            reviewer=self.reviewer,
            decision_status=ApplicationStatus.APPROVED,
            comment="Approved after update.",
        )
        self.login_as(self.reviewer)

        response = self.client.get(f"/api/applications/{application.tracking_number}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [entry["comment"] for entry in response.json()["review_history"]],
            [first.comment, second.comment],
        )

    def test_api_docs_page_renders(self):
        response = self.client.get("/api/docs")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Trendflow Workflow Tracker API")
