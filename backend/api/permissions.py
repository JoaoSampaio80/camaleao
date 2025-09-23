from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permite acesso completo apenas para administradores (role 'admin' ou is_staff/superuser).
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff
            or request.user.is_superuser
            or request.user.role == "admin"
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsDPO(permissions.BasePermission):
    """
    Permite acesso completo para usuários com role 'dpo'.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "dpo"

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsAdminOrDPO(permissions.BasePermission):
    """
    Permite acesso total para Admins e DPOs.
    """

    def has_permission(self, request, view):
        return IsAdmin().has_permission(request, view) or IsDPO().has_permission(
            request, view
        )

    def has_object_permission(self, request, view, obj):
        return IsAdmin().has_object_permission(
            request, view, obj
        ) or IsDPO().has_object_permission(request, view, obj)


class IsManagerLimited(permissions.BasePermission):
    """
    Permissões para gerentes:
    - Leitura (GET, HEAD, OPTIONS) para tudo.
    - Criar (POST).
    - Atualizar (PUT, PATCH) apenas se for o criador do objeto.
    - Proibido deletar (DELETE).
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated or request.user.role != "manager":
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        if request.method == "POST":
            return True

        if request.method in ["PUT", "PATCH"]:
            return True

        # DELETE bloqueado para gerentes
        if request.method == "DELETE":
            return False

        return False

    def has_object_permission(self, request, view, obj):
        # Leitura para todos gerentes autenticados
        if request.method in permissions.SAFE_METHODS:
            return True

        # Atualização somente se o gerente criou o objeto
        if request.method in ["PUT", "PATCH"]:
            return hasattr(obj, "criado_por") and obj.criado_por == request.user

        # DELETE proibido para gerentes
        if request.method == "DELETE":
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


# --- ADICIONAR AO FINAL DE backend/api/permissions.py ---

from rest_framework.permissions import BasePermission


class IsRoleAdmin(BasePermission):
    """
    Libera acesso para superuser, staff ou role='admin'.
    Mantém a semântica usada em UserViewSet.
    """

    def has_permission(self, request, view):
        u = request.user
        return bool(
            u
            and u.is_authenticated
            and (
                getattr(u, "is_superuser", False)
                or getattr(u, "is_staff", False)
                or getattr(u, "role", "") == "admin"
            )
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsDPOOrManager(BasePermission):
    """
    Permite DPO e Gerente (aceita tanto 'manager' quanto 'gerente'), além de superuser/staff.
    Usado nos viewsets de risco/planos/etc.
    """

    def has_permission(self, request, view):
        u = request.user
        role = (getattr(u, "role", "") or "").lower()
        return bool(
            u
            and u.is_authenticated
            and (
                role in {"dpo", "manager", "gerente"}
                or getattr(u, "is_superuser", False)
                or getattr(u, "is_staff", False)
            )
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class SimpleRolePermission(BasePermission):
    """
    Lê o mapeamento de permissões declarado no ViewSet (ROLE_PERMS) e aplica:
      - 'any'  -> permitido
      - 'own'  -> permitido, mas no nível do objeto só se obj.<OWN_FIELD> == request.user
      - None   -> bloqueado
    Requer autenticação para qualquer ação.
    """

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False

        # ação corrente (DRF define em view.action)
        action = getattr(view, "action", None) or request.method.lower()
        perms_map = getattr(view, "ROLE_PERMS", {}) or {}
        role = (getattr(u, "role", "") or "").lower()

        # tenta achar permissão específica por ação e papel
        allowed = (perms_map.get(action, {}) or {}).get(role, None)
        # fallback: se não houver entrada para o papel, tenta a de admin
        if allowed is None:
            allowed = (perms_map.get(action, {}) or {}).get("admin", None)

        # 'any' e 'own' passam em nível de permissão geral
        return allowed in {"any", "own"}

    def has_object_permission(self, request, view, obj):
        u = request.user
        action = getattr(view, "action", None) or request.method.lower()
        perms_map = getattr(view, "ROLE_PERMS", {}) or {}
        role = (getattr(u, "role", "") or "").lower()

        allowed = (perms_map.get(action, {}) or {}).get(role, None)
        if allowed is None:
            allowed = (perms_map.get(action, {}) or {}).get("admin", None)

        if allowed == "any":
            return True
        if allowed == "own":
            owner_field = getattr(view, "OWN_FIELD", None) or "user"
            return getattr(obj, owner_field, None) == u
        return False
