from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrSupervisor(BasePermission):
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and
                request.user.role in ['admin', 'supervisor'])


class IsFieldWorkerOrAbove(BasePermission):
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and
                request.user.role in ['admin', 'supervisor', 'field_worker'])
