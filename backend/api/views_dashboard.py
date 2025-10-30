from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from .models import (
    Risk,
    ActionPlan,
    DocumentosLGPD,
    Checklist,
    CalendarEvent,
    MonitoringAction,
    Incident,
    LikelihoodItem,
    ImpactItem,
)


class DashboardViewSet(viewsets.ViewSet):
    """
    GET /api/dashboard/
    Retorna os dados do dashboard. Protegido por IsAuthenticated.
    """

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        hoje = timezone.localdate()
        daqui_30 = hoje + timedelta(days=30)

        # ===== KPIs =====
        kpis = {
            "conformidade": 75,  # placeholder temporário
            "riscosAtivos": Risk.objects.count(),
            "acoesAtrasadas": ActionPlan.objects.filter(
                status__in=["nao_iniciado", "andamento"], prazo__lt=hoje
            ).count(),
            "docsVencendo30d": DocumentosLGPD.objects.filter(
                proxima_revisao__range=(hoje, daqui_30)
            ).count(),
            "alertas": 0,
        }

        # ===== Carrega parametrizações reais =====
        likelihoods = {str(l.id): l.value for l in LikelihoodItem.objects.all()}
        impacts = {str(i.id): i.value for i in ImpactItem.objects.all()}

        # ===== Distribuição de Riscos (usando a mesma lógica da Matriz) =====
        baixo = medio = alto = critico = 0

        for r in Risk.objects.all():
            score = r.pontuacao or 0

            if score == 0:
                continue
            elif score <= 6:
                baixo += 1
            elif score <= 12:
                medio += 1
            elif score <= 16:
                alto += 1
            else:
                critico += 1

        riscosDistribuicao = [
            {"name": "Baixo", "value": baixo},
            {"name": "Médio", "value": medio},
            {"name": "Alto", "value": alto},
            {"name": "Crítico", "value": critico},
        ]

        # ===== Monta resposta completa =====
        data = {
            "kpis": kpis,
            "riscosDistribuicao": riscosDistribuicao,
            "riscosPorSetor": [],
            "topRiscos": [],
            "acoesStatus": [],
            "acoesTimeline": [],
            "documentosVencimentos": [],
            "incidentesTimeline": [],
            "loginsRecentes": [],
            "rankingUsuarios": [],
        }

        return Response(data)
