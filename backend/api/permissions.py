from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    Permite acesso completo apenas para administradores (role 'admin' ou is_staff/superuser).
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or request.user.is_superuser or request.user.role == 'admin'
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)

class IsDPO(permissions.BasePermission):
    """
    Permite acesso completo para usuários com role 'dpo'.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'dpo'

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)

class IsAdminOrDPO(permissions.BasePermission):
    """
    Permite acesso total para Admins e DPOs.
    """
    def has_permission(self, request, view):
        return IsAdmin().has_permission(request, view) or IsDPO().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        return IsAdmin().has_object_permission(request, view, obj) or IsDPO().has_object_permission(request, view, obj)

class IsManagerLimited(permissions.BasePermission):
    """
    Permissões para gerentes:
    - Leitura (GET, HEAD, OPTIONS) para tudo.
    - Criar (POST).
    - Atualizar (PUT, PATCH) apenas se for o criador do objeto.
    - Proibido deletar (DELETE).
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated or request.user.role != 'manager':
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        if request.method == 'POST':
            return True

        if request.method in ['PUT', 'PATCH']:
            return True

        # DELETE bloqueado para gerentes
        if request.method == 'DELETE':
            return False

        return False

    def has_object_permission(self, request, view, obj):
        # Leitura para todos gerentes autenticados
        if request.method in permissions.SAFE_METHODS:
            return True

        # Atualização somente se o gerente criou o objeto
        if request.method in ['PUT', 'PATCH']:
            return hasattr(obj, 'criado_por') and obj.criado_por == request.user

        # DELETE proibido para gerentes
        if request.method == 'DELETE':
            return False

        return False

class IsAdminOrDPOOrManagerLimited(permissions.BasePermission):
    """
    Combina as permissões:
    - Admin e DPO têm acesso total.
    - Gerente tem permissões limitadas (IsManagerLimited).
    """
    def has_permission(self, request, view):
        if IsAdminOrDPO().has_permission(request, view):
            return True
        return IsManagerLimited().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        if IsAdminOrDPO().has_object_permission(request, view, obj):
            return True
        return IsManagerLimited().has_object_permission(request, view, obj)

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permite acesso de leitura a qualquer usuário autenticado
    e acesso de escrita apenas a administradores.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return IsAdmin().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return IsAdmin().has_object_permission(request, view, obj)