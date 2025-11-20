# api/utils/request_utils.py


def get_client_ip(request):
    """
    Retorna o endereço IP real do cliente.
    Considera proxies e Cloudflare.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR")


def get_user_agent(request):
    """
    Retorna o User-Agent do navegador/dispositivo,
    limitando para evitar strings gigantes.
    """
    return request.META.get("HTTP_USER_AGENT", "")[:1000]
