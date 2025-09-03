# api/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

def _is_auth(request):
    return bool(request.user and request.user.is_authenticated)

def _role(user):
    # retorna o papel em minúsculas ou '' se não houver
    return (getattr(user, 'role', '') or '').lower()

def _is_admin(user):
    # trata superuser como admin
    return user.is_superuser or _role(user) == 'admin'

class IsRoleAdmin(BasePermission):
    """
    Permite acesso apenas a administradores (ou superuser).
    Tanto para leitura quanto para escrita.
    """
    def has_permission(self, request, view):
        return _is_auth(request) and _is_admin(request.user)

    def has_object_permission(self, request, view, obj):
        return _is_auth(request) and _is_admin(request.user)


class IsAdminOrDPO(BasePermission):
    """
    Leitura: qualquer usuário autenticado.
    Escrita (POST/PUT/PATCH/DELETE): admin ou dpo.
    """
    def has_permission(self, request, view):
        if not _is_auth(request):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _is_admin(request.user) or _role(request.user) == 'dpo'

    def has_object_permission(self, request, view, obj):
        # mesma regra de has_permission
        if not _is_auth(request):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _is_admin(request.user) or _role(request.user) == 'dpo'


class IsDPOOrManager(BasePermission):
    """
    Leitura: qualquer usuário autenticado.
    Escrita: dpo ou gerente. (Incluo admin por conveniência; remova se não quiser.)
    """
    def has_permission(self, request, view):
        if not _is_auth(request):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _is_admin(request.user) or _role(request.user) in ('dpo', 'gerente')

    def has_object_permission(self, request, view, obj):
        if not _is_auth(request):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _is_admin(request.user) or _role(request.user) in ('dpo', 'gerente')
    
# --- Adições seguras: não alteram permissões existentes ---

def user_role(user):
    """
    Normaliza o papel: 'admin' (inclui superuser), 'dpo', 'gerente', etc.
    Retorna None se não autenticado.
    """
    if not user or not user.is_authenticated:
        return None
    if _is_admin(user):
        return 'admin'
    return _role(user)

class SimpleRolePermission(BasePermission):
    """
    Permissão genérica dirigida por mapa de regras declarado na ViewSet.

    Na view, defina:
      - ROLE_PERMS = {
          'list':            {'admin': 'any', 'dpo': 'any', 'gerente': 'any'},
          'retrieve':        {'admin': 'any', 'dpo': 'any', 'gerente': 'any'},
          'create':          {'admin': 'any', 'dpo': 'any', 'gerente': 'any'},
          'update':          {'admin': 'any', 'dpo': 'any', 'gerente': 'own'},
          'partial_update':  {'admin': 'any', 'dpo': 'any', 'gerente': 'own'},
          'destroy':         {'admin': 'any', 'dpo': 'any', 'gerente': None},
          # '*' opcional como fallback
        }

      - OWN_FIELD = 'criado_por'  # ou outro campo que identifica o "dono" do registro

    Escopos aceitos:
      - 'any'  -> acesso total naquela ação
      - 'own'  -> apenas sobre objetos do próprio usuário (compara OWN_FIELD)
      - True   -> sinônimo de 'any'
      - None/False -> negado

    Comportamento de fallback (se a View não declarar ROLE_PERMS):
      - leitura (SAFE_METHODS) para autenticados
      - escrita só para admin/dpo
    """
    message = 'Acesso negado pela política de papéis.'

    def has_permission(self, request, view):
        role = user_role(request.user)
        if not role:
            return False

        action = getattr(view, 'action', None) or self._http_to_action(request)
        role_perms = getattr(view, 'ROLE_PERMS', None)

        if not role_perms:
            # Fallback conservador
            return True if request.method in SAFE_METHODS else role in ('admin', 'dpo')

        scope = self._scope_for(role_perms, action, role)
        return scope not in (None, False)

    def has_object_permission(self, request, view, obj):
        role = user_role(request.user)
        if not role:
            return False

        action = getattr(view, 'action', None) or self._http_to_action(request)
        role_perms = getattr(view, 'ROLE_PERMS', None)
        scope = self._scope_for(role_perms, action, role)

        if scope in (True, 'any'):
            return True
        if scope == 'own':
            own_field = getattr(view, 'OWN_FIELD', 'criado_por')
            owner = getattr(obj, own_field, None)
            owner_id = getattr(owner, 'pk', owner)  # aceita FK ou id direto
            return owner_id == getattr(request.user, 'pk', None)

        return False

    # Utilidades internas
    def _scope_for(self, role_perms, action, role):
        if not role_perms:
            return None
        mapping = role_perms.get(action) or role_perms.get('*') or {}
        scope = mapping.get(role)
        if scope is True:
            scope = 'any'
        return scope

    def _http_to_action(self, request):
        m = request.method.upper()
        if m in ('GET', 'HEAD', 'OPTIONS'):
            return 'retrieve'
        if m == 'POST':   return 'create'
        if m == 'PUT':    return 'update'
        if m == 'PATCH':  return 'partial_update'
        if m == 'DELETE': return 'destroy'
        return None