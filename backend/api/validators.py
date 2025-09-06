import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class ComplexityValidator:
    """
    Exige: 1 maiúscula, 1 minúscula, 1 dígito e 1 símbolo.
    """
    def validate(self, password, user=None):
        if (not re.search(r'[A-Z]', password) or
            not re.search(r'[a-z]', password) or
            not re.search(r'\d', password) or
            not re.search(r'[^\w\s]', password)):
            raise ValidationError(
                _("A senha deve conter maiúscula, minúscula, número e símbolo."),
                code='password_no_complexity',
            )

    def get_help_text(self):
        return _("Sua senha precisa ter maiúscula, minúscula, número e símbolo.")