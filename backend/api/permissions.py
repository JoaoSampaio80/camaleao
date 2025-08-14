from rest_framework import permissions

class IsAdminOrDPO(permissions.BasePermission):
    """
    Permissão personalizada para permitir acesso apenas a usuários Admin ou DPO.
    """
    def has_permission(self, request, view):
        # Permite acesso de leitura a todos os usuários autenticados
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        # Permite acesso de escrita (POST, PUT, PATCH, DELETE) apenas para Admin ou DPO
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.role == 'admin' or 
            request.user.role == 'dpo')

    def has_object_permission(self, request, view, obj):
        # Permite acesso de leitura (GET, HEAD, OPTIONS) a todos os autenticados
        if request.method in permissions.SAFE_METHODS:
            return True
        # Permite acesso de escrita (POST, PUT, PATCH, DELETE) apenas para Admin ou DPO
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.role == 'admin' or 
            request.user.role == 'dpo')


class IsDPOOrManager(permissions.BasePermission):
    """
    Permissão personalizada para permitir acesso apenas a usuários DPO ou Gerente.
    """
    def has_permission(self, request, view):
        # Permite acesso de leitura a todos os usuários autenticados
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        # Permite acesso de escrita (POST, PUT, PATCH, DELETE) apenas para DPO ou Gerente
        return request.user.is_authenticated and (request.user.role == 'dpo' or request.user.role == 'manager')

    def has_object_permission(self, request, view, obj):
        # Permite acesso de leitura (GET, HEAD, OPTIONS) a todos os autenticados
        if request.method in permissions.SAFE_METHODS:
            return True
        # Permite acesso de escrita (POST, PUT, PATCH, DELETE) apenas para DPO ou Gerente
        return request.user.is_authenticated and (request.user.role == 'dpo' or request.user.role == 'manager')


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permissão personalizada para permitir acesso de leitura a qualquer um
    e acesso de escrita apenas a administradores.
    """
    def has_permission(self, request, view):
        # Permite acesso de leitura (GET, HEAD, OPTIONS) para qualquer request autenticado
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        # Permite acesso de escrita (POST, PUT, PATCH, DELETE) apenas para administradores
        return request.user.is_authenticated and request.user.role == 'admin'

    def has_object_permission(self, request, view, obj):
        # Permite acesso de leitura (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True
        # Permite acesso de escrita (POST, PUT, PATCH, DELETE) apenas para administradores
        return request.user.is_authenticated and request.user.role == 'admin'