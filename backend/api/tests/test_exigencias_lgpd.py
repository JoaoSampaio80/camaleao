import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from rest_framework import status
from api.models import ExigenciasLGPD
from django.contrib.auth import get_user_model

@pytest.mark.django_db
def test_crud_exigencias_lgpd():
    client = APIClient()

    # Cria um usuário autenticado (admin ou DPO)
    User = get_user_model()
    user = User.objects.create_user(username='testeuser', password='senha123', is_staff=True)
    client.force_authenticate(user=user)

    # CREATE
    url_create = reverse('exigenciaslgpd-list')
    data = {
        'titulo': 'Política de Segurança',
        'proxima_revisao': '2025-12-31'
    }
    response = client.post(url_create, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    exigencia_id = response.data['id']

    # READ
    url_detail = reverse('exigenciaslgpd-detail', args=[exigencia_id])
    response = client.get(url_detail)
    assert response.status_code == status.HTTP_200_OK
    assert response.data['titulo'] == 'Política de Segurança'

    # UPDATE
    data_update = {'titulo': 'Política Atualizada'}
    response = client.patch(url_detail, data_update, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['titulo'] == 'Política Atualizada'

    # DELETE
    response = client.delete(url_detail)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    response = client.get(url_detail)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert not ExigenciasLGPD.objects.filter(id=exigencia_id).exists()
