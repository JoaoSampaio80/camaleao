from django.shortcuts import render
from rest_framework import viewsets, permissions
from .serializers import *
from .models import *
from rest_framework.response import Response

class DPOViewSet(viewsets.ModelViewSet):
    queryset = DPO.objects.all()
    serializer_class = DPOSerializer