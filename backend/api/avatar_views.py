from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from django.conf import settings

from api.models import User

from io import BytesIO
from PIL import Image
import os


def _get_avatar_bytes(user):
    """
    Garante que vamos trabalhar sempre com bytes,
    mesmo que o avatar_data venha como memoryview (BinaryField).
    """
    if not user.avatar_data:
        raise Http404("Avatar não encontrado.")

    data = user.avatar_data

    # Se vier como memoryview (caso comum em BinaryField)
    if isinstance(data, memoryview):
        data = data.tobytes()

    return data


def serve_avatar_full(request, pk):
    user = get_object_or_404(User, pk=pk)
    data = _get_avatar_bytes(user)

    content_type = user.avatar_mime or "image/jpeg"

    response = HttpResponse(data, content_type=content_type)

    # HEADERS PROFISSIONAIS
    response["Cache-Control"] = "public, max-age=86400"
    response["Access-Control-Allow-Origin"] = "*"
    response["Cross-Origin-Resource-Policy"] = "cross-origin"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Length"] = str(len(data))
    response["Content-Disposition"] = "inline"

    return response


def serve_avatar_thumb(request, pk):
    user = get_object_or_404(User, pk=pk)
    original_bytes = _get_avatar_bytes(user)

    try:
        img = Image.open(BytesIO(original_bytes))

        # Garante formato compatível com JPEG (sem canal alpha)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # thumbnail profissional (mantém proporção)
        img.thumbnail((256, 256))

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        thumb_bytes = buffer.getvalue()
    except Exception:
        # fallback: usa o original se der problema
        thumb_bytes = original_bytes

    response = HttpResponse(thumb_bytes, content_type="image/jpeg")
    response["Cache-Control"] = "public, max-age=86400"
    response["Access-Control-Allow-Origin"] = "*"
    response["Cross-Origin-Resource-Policy"] = "cross-origin"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Disposition"] = "inline"
    response["Content-Length"] = str(len(thumb_bytes))

    return response


def serve_avatar_placeholder(request):
    """
    Serve um avatar padrão da pasta:
    <BASE_DIR>/static/img/avatar_placeholder.png
    """
    placeholder_path = os.path.join(
        settings.BASE_DIR,
        "static",
        "img",
        "avatar_placeholder.png",
    )

    if not os.path.exists(placeholder_path):
        raise Http404("Placeholder não encontrado.")

    with open(placeholder_path, "rb") as f:
        data = f.read()

    response = HttpResponse(data, content_type="image/png")
    response["Cache-Control"] = "public, max-age=86400"
    response["Access-Control-Allow-Origin"] = "*"
    response["Cross-Origin-Resource-Policy"] = "cross-origin"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Disposition"] = "inline"
    response["Content-Length"] = str(len(data))

    return response
