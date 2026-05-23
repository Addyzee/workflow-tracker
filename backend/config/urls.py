from django.urls import path

from applications.api import api

urlpatterns = [
    path("api/", api.urls),
]

