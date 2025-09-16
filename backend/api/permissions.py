# api/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

# --- Helpers ---------------------------------------------------------------


def _is_auth(request):
    return bool(request.user and request.user.is_authenticated)


def _role(user):
    # Retorna o papel em minúsculas a partir de user.role (ou '' se não houver)
    return (getattr(user, "role", "") or "").lower()


def _is_admin(user):
    # Superuser conta como admin
    return bool(user and (user.is_superuser or _role(user) == "admin"))


def _is_dpo(user):
    return bool(user and _role(user) == "dpo")


def user_role(user):
    """
    Normaliza o papel do usuário para um conjunto conhecido:
    - 'admin' para is_superuser=True OU role='admin'
    - 'dpo'   para role='dpo'
    - 'user'  para QUALQUER outro autenticado (inclui gerente, colaborador, etc.)
    - None    se não autenticado
    """
    if not user or not user.is_authenticated:
        return None
    if _is_admin(user):
        return "admin"
    if _is_dpo(user):
        return "dpo"
    return "user"


# --- Permissões básicas por papel -----------------------------------------


class IsRoleAdmin(BasePermission):
    """
    Acesso total (leitura e escrita) apenas para admin (ou superuser).
    """

    def has_permission(self, request, view):
        return _is_auth(request) and _is_admin(request.user)

    def has_object_permission(self, request, view, obj):
        return _is_auth(request) and _is_admin(request.user)


class IsRoleDPO(BasePermission):
    """
    Acesso total (leitura e escrita) apenas para DPO (não trata exceções de user management).
    Use IsRoleAdmin no UserViewSet para restringir criar/excluir usuários.
    """

    def has_permission(self, request, view):
        return _is_auth(request) and _is_dpo(request.user)

    def has_object_permission(self, request, view, obj):
        return _is_auth(request) and _is_dpo(request.user)


class IsAuthenticatedReadOnly(BasePermission):
    """
    Autenticado pode ler; escrita negada.
    """

    def has_permission(self, request, view):
        return _is_auth(request) and (request.method in SAFE_METHODS)

    def has_object_permission(self, request, view, obj):
        return _is_auth(request) and (request.method in SAFE_METHODS)


class IsAdminOrDPO(BasePermission):
    """
    Leitura: qualquer autenticado.
    Escrita: admin ou dpo.
    """

    def has_permission(self, request, view):
        if not _is_auth(request):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _is_admin(request.user) or _is_dpo(request.user)

    def has_object_permission(self, request, view, obj):
        if not _is_auth(request):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _is_admin(request.user) or _is_dpo(request.user)


# --- Permissão genérica dirigida por mapa (recomendado) --------------------


class SimpleRolePermission(BasePermission):
    """
    Permissão orientada por PAPEL + AÇÃO da ViewSet via ROLE_PERMS.
    Use em conjunto com OWN_FIELD para restringir escopo 'own'.

    Na ViewSet:
      ROLE_PERMS = {
        'list':            {'admin': 'any', 'dpo': 'any', 'user': 'any'},
        'retrieve':        {'admin': 'any', 'dpo': 'any', 'user': 'any'},
        'create':          {'admin': 'any', 'dpo': 'any', 'user': 'own'},
        'update':          {'admin': 'any', 'dpo': 'any', 'user': 'own'},
        'partial_update':  {'admin': 'any', 'dpo': 'any', 'user': 'own'},
        'destroy':         {'admin': 'any', 'dpo': 'any', 'user': None},
        # '*' pode ser usado como fallback
      }
      OWN_FIELD = 'criado_por'

    Escopos aceitos:
      - 'any'  -> acesso total naquela ação
      - 'own'  -> apenas sobre objetos do próprio usuário (compara OWN_FIELD)
      - True   -> sinônimo de 'any'
      - None/False -> negado
    """

    message = "Acesso negado pela política de papéis."

    def has_permission(self, request, view):
        role = user_role(request.user)
        if role is None:
            return False

        action = getattr(view, "action", None) or self._http_to_action(request)
        role_perms = getattr(view, "ROLE_PERMS", None)

        # Se não foi configurado um mapa, fallback conservador:
        if not role_perms:
            # Leitura p/ autenticados; escrita só admin/dpo
            return True if request.method in SAFE_METHODS else role in ("admin", "dpo")

        scope = self._scope_for(role_perms, action, role, request)
        return scope not in (None, False)

    def has_object_permission(self, request, view, obj):
        role = user_role(request.user)
        if role is None:
            return False

        action = getattr(view, "action", None) or self._http_to_action(request)
        role_perms = getattr(view, "ROLE_PERMS", None)
        scope = self._scope_for(role_perms, action, role, request)

        if scope in (True, "any"):
            return True
        if scope == "own":
            own_field = getattr(view, "OWN_FIELD", "criado_por")
            owner = getattr(obj, own_field, None)
            owner_id = getattr(owner, "pk", owner)  # aceita objeto FK ou id direto
            return owner_id == getattr(request.user, "pk", None)

        return False

    # Internals
    def _scope_for(self, role_perms, action, role, request):
        # 1) linha específica da ação
        if action and action in role_perms:
            scope = self._normalize_scope(role_perms[action].get(role))
            if scope is not None:
                return scope
        # 2) fallback '*'
        if "*" in role_perms:
            return self._normalize_scope(role_perms["*"].get(role))
        # 3) fallback final: permitir leitura
        return "any" if request.method in SAFE_METHODS else None

    def _http_to_action(self, request):
        m = request.method.upper()
        if m in ("GET", "HEAD", "OPTIONS"):
            return "retrieve"
        if m == "POST":
            return "create"
        if m == "PUT":
            return "update"
        if m == "PATCH":
            return "partial_update"
        if m == "DELETE":
            return "destroy"
        return None

    def _normalize_scope(self, scope):
        if scope is True:
            return "any"
        return scope
