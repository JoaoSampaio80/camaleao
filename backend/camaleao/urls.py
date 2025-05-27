from django.contrib import admin
from django.urls import path, include
from django.conf import settings # Importe settings
from django.conf.urls.static import static # Importe static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('api.urls')),
]

# Servir arquivos de mídia em desenvolvimento (para uploads de arquivos)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Se você também precisar servir static files em dev:
    # urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

