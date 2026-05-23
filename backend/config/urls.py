from django.http import JsonResponse
from django.urls import path

from applications.api import api


def healthz(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("healthz", healthz),
    path("api/", api.urls),
]
