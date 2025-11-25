from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from django.views.generic import RedirectView
from django.conf import settings  # Importe settings
from django.conf.urls.static import static  # Importe static
from django.views.static import serve as static_serve

from api.avatar_views import (
    serve_avatar_full,
    serve_avatar_thumb,
    serve_avatar_placeholder,
)


def health(_):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("", RedirectView.as_view(url="/api/v1/", permanent=False)),
    path("admin/", admin.site.urls),
    path("health/", health),
    path("api/v1/", include("api.urls")),
]

# ==== ROTAS DE AVATAR (fora do DRF) ====
urlpatterns += [
    path("avatar/<int:pk>/", serve_avatar_thumb, name="avatar-thumb"),
    path("avatar/full/<int:pk>/", serve_avatar_full, name="avatar-full"),
    path("avatar/placeholder/", serve_avatar_placeholder, name="avatar-placeholder"),
]

# === Servir mídia mesmo com DEBUG=False (modo produção local/túnel) ===
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(
            r"^media/(?P<path>.*)$",
            static_serve,
            {
                "document_root": settings.MEDIA_ROOT,
                "show_indexes": False,
            },
        ),
    ]

# === Servir estáticos em modo produção local, se necessário ===
if not settings.DEBUG:
    urlpatterns += [
        re_path(
            r"^static/(?P<path>.*)$",
            static_serve,
            {"document_root": settings.STATIC_ROOT},
        ),
    ]
