from datetime import timedelta
from django.utils import timezone

from api.models import UserActivityLog, LoginActivity
from api.utils.request_utils import get_client_ip, get_user_agent


def log_login_activity(request, user):
    """
    Registra um login bem-sucedido conforme CDU14.
    """

    try:
        ip = get_client_ip(request)
        ua = get_user_agent(request)

        LoginActivity.objects.create(
            usuario=user,
            email=user.email,
            ip_address=ip,
            user_agent=ua,
            data_login=timezone.now(),
        )

    except Exception as e:
        print(">>> ERRO LOGIN LOG:", repr(e))


class AuditLogMixin:
    """
    Mixin de auditoria seguro para DRF.
    Registra exatamente 1 log por operação (ACCESS, CREATE, UPDATE, DELETE).
    """

    audit_module = None  # Ex: "riscos", "documentos"

    def get_audit_module(self):
        return self.audit_module or self.__class__.__name__.lower()

    def _log(self, request, operacao, obj=None, detalhe="", resultado="SUCCESS"):
        user = request.user if request.user.is_authenticated else None
        email = getattr(user, "email", None)

        UserActivityLog.objects.create(
            usuario=user,
            email=email,
            modulo=self.get_audit_module(),
            view_name=self.__class__.__name__,
            operacao=operacao,
            registro_id=str(getattr(obj, "pk", "")) if obj else None,
            ip=get_client_ip(request),
            resultado=resultado,
            detalhe=str(detalhe)[:5000],
        )

    # ---------- CORRETO E DEFINITIVO ----------
    def _log_access(self, request, obj=None, detalhe=""):
        """
        Registra ACCESS apenas 1 vez por acesso real.
        - Se a view tiver paginação -> só loga na página 1
        - Se a view NÃO tiver paginação -> SEMPRE loga
        """
        qs = request.GET or {}
        page = qs.get("page")

        # View com paginação → loga só na primeira página
        if page is not None:
            if page in ("", "1"):
                self._log(request, "ACCESS", obj=obj, detalhe=detalhe)
            return

        # View SEM paginação (Dashboard, Heatmap, Ranking, etc.)
        self._log(request, "ACCESS", obj=obj, detalhe=detalhe)

    # -----------------------------
    # CREATE / UPDATE / DELETE
    # -----------------------------
    def perform_create(self, serializer):
        instance = serializer.save()
        self._log(self.request, "CREATE", obj=instance)
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log(self.request, "UPDATE", obj=instance)
        return instance

    def perform_destroy(self, instance):
        self._log(self.request, "DELETE", obj=instance)
        return super().perform_destroy(instance)

    # -----------------------------
    # LIST / RETRIEVE (ACCESS)
    # -----------------------------
    def list(self, request, *args, **kwargs):
        qs = request.GET
        page = qs.get("page")

        # Registra acesso sempre que estiver na primeira página
        # ou quando nem tiver parâmetro de página (acesso "limpo").
        if page in (None, "", "1"):
            self._log(request, "ACCESS")

        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        self._log(request, "ACCESS", obj=self.get_object())  # 🔹 Uma vez só
        return response
