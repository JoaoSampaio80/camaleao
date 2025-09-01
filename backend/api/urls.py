from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    MyTokenObtainPairView,
    UserViewSet,
    ChecklistViewSet,
    InventarioDadosViewSet,
    MatrizRiscoViewSet,
    PlanoAcaoViewSet,
    ExigenciaLGPDViewSet,
)

app_name = "api"

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'checklists', ChecklistViewSet, basename='checklists')
router.register(r'inventarios', InventarioDadosViewSet, basename='inventarios')
router.register(r'riscos', MatrizRiscoViewSet, basename='riscos')
router.register(r'planos-acao', PlanoAcaoViewSet, basename='planos-acao')
router.register(r'exigencias', ExigenciaLGPDViewSet, basename='exigencias')

urlpatterns = [
    # JWT
    path('auth/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # ViewSets
    path('', include(router.urls)),
]