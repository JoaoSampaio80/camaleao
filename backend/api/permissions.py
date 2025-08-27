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