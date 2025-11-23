import traceback
from django.http import HttpResponse


class DebugExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except Exception as e:
            print("🔥 ERRO DJANGO:", repr(e))
            traceback.print_exc()
            return HttpResponse(
                f"<h1>Erro interno</h1><pre>{traceback.format_exc()}</pre>",
                status=500,
                content_type="text/html",
            )
