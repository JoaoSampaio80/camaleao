from django.contrib import admin
from django.urls import path, include
from .views import *
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

# Crie um router para ViewSets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'checklists', ChecklistViewSet, basename='checklists')
router.register(r'inventarios', InventarioDadosViewSet, basename='inventarios')
router.register(r'riscos', MatrizRiscoViewSet, basename='riscos')
router.register(r'planos-acao', PlanoAcaoViewSet, basename='planos-acao')
router.register(r'exigencias', ExigenciaLGPDViewSet, basename='exigencias')

urlpatterns = [
    # URLs para autenticação JWT
    path('auth/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # URLs para as APIs criadas com ViewSets
    path('', include(router.urls)),
]