from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    MyTokenObtainPairView,
    UserViewSet,
    ExigenciaLGPDViewSet,
    ChecklistViewSet,
    InventarioDadosViewSet,
    RiskViewSet,
    ActionPlanViewSet,
    RiskConfigView,
    MonitoringActionViewSet,
    IncidentViewSet,
    InviteSetPasswordView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    
    
)

app_name = "api"

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'exigencias', ExigenciaLGPDViewSet, basename='exigencias')
router.register(r'checklists', ChecklistViewSet, basename='checklists')
router.register(r'inventarios', InventarioDadosViewSet, basename='inventarios')
router.register(r'riscos', RiskViewSet, basename='riscos')
router.register(r'planos-acao', ActionPlanViewSet, basename='planos-acao')
router.register(r'monitoring', MonitoringActionViewSet, basename='monitoring')
router.register(r'incidentes', IncidentViewSet, basename='incidentes')

urlpatterns = [
    # JWT
    path('auth/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    path("auth/set-password/", InviteSetPasswordView.as_view(), name="auth-set-password"),
    path("auth/password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),

    path('risk-config/', RiskConfigView.as_view(), name='risk-config'),

    # ViewSets
    path('', include(router.urls)),
]