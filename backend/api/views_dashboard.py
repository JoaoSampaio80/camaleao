from collections import defaultdict
from datetime import timedelta, datetime
from django.utils import timezone
from django.db.models import Count
import re
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

SPLIT_RE = re.compile(r"[\n;,•\u2022]+")


# helper: mesma lógica de split da tela, mas tolerante a \r e bullets
def _split_acoes(texto):
    """Divide o campo resposta_risco em ações individuais."""
    if not texto:
        return []
    return [
        t.strip() for t in SPLIT_RE.split(texto) if t and t.strip() and t.strip() != "-"
    ]


class DashboardViewSet(viewsets.ViewSet):
    """
    GET /api/dashboard/
    Retorna os dados consolidados do Dashboard.
    Protegido por IsAuthenticated.
    """

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        hoje = timezone.localdate()
        daqui_30 = hoje + timedelta(days=30)

        # ===== KPIs =====
        kpis = {
            "conformidade": 75,
            "riscosAtivos": Risk.objects.count(),
            "acoesAtrasadas": ActionPlan.objects.filter(
                status__in=["nao_iniciado", "andamento"],
                prazo__lt=hoje,
            ).count(),
            "docsVencendo30d": DocumentosLGPD.objects.filter(
                proxima_revisao__range=(hoje, daqui_30)
            ).count(),
            "alertas": 0,
        }

        # ===== Distribuição de Riscos =====
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

        # ===== Riscos por Setor =====
        riscosPorSetor_qs = (
            Risk.objects.values("setor")
            .annotate(quantidade=Count("id"))
            .order_by("-quantidade")
        )
        riscosPorSetor = [
            {"setor": r["setor"] or "Não informado", "quantidade": r["quantidade"]}
            for r in riscosPorSetor_qs
        ]

        # ===== Top 5 Riscos =====
        top_riscos_qs = (
            Risk.objects.exclude(pontuacao=None)
            .order_by("-pontuacao")[:5]
            .values("id", "risco_fator", "pontuacao", "setor", "processo")
        )
        topRiscos = [
            {
                "id": r["id"],
                "titulo": r["risco_fator"],
                "score": r["pontuacao"],
                "setor": r["setor"],
                "owner": r["processo"],
            }
            for r in top_riscos_qs
        ]

        # ===== Ações Status =====
        status_data = defaultdict(int)
        riscos = Risk.objects.prefetch_related("planos").all()
        hoje = timezone.localdate()

        for risco in riscos:
            acoes = _split_acoes(risco.resposta_risco)
            total_acoes = len(acoes)
            planos = list(risco.planos.all().order_by("id"))

            if total_acoes == 0:
                continue

            for i in range(total_acoes):
                if i < len(planos):
                    plano = planos[i]
                    status = plano.status or "nao_iniciado"

                    # 🔹 Se prazo passou e não foi concluído, marca como atrasado
                    if (
                        plano.prazo
                        and plano.prazo < hoje
                        and status not in {"concluido", "atrasado"}
                    ):
                        status = "atrasado"
                else:
                    status = "nao_iniciado"

                status_data[status] += 1

        # 🔹 Ordem e rótulos fixos (humanizados só aqui)
        label_map = {
            "concluido": "Concluído",
            "andamento": "Em andamento",
            "nao_iniciado": "Não iniciado",
            "atrasado": "Atrasado",
        }

        acoesStatus = [
            {"name": label_map[k], "value": status_data.get(k, 0)} for k in label_map
        ]

        # ===== Timeline de Execução (Planejado × Concluído × Andamento × Atrasadas) =====
        timeline = defaultdict(
            lambda: {"planejadas": 0, "andamento": 0, "concluidas": 0, "atrasadas": 0}
        )
        hoje = timezone.localdate()

        for risco in Risk.objects.prefetch_related("planos"):
            # 1️⃣ Extrai todas as ações descritas no campo texto
            acoes_texto = _split_acoes(risco.resposta_risco)
            total_texto = len(acoes_texto)

            # 2️⃣ Obtém os planos cadastrados (ActionPlan)
            planos = list(risco.planos.all())

            # 3️⃣ Faz correspondência entre planos e ações
            #    se houver menos planos do que ações no texto, as demais viram "não iniciadas"
            for idx, acao in enumerate(acoes_texto):
                if idx < len(planos):
                    plano = planos[idx]
                    prazo = plano.prazo or hoje
                    status = (plano.status or "nao_iniciado").lower().strip()
                else:
                    prazo = hoje
                    status = "nao_iniciado"

                mes_label = prazo.strftime("%b/%y")
                bucket = timeline[mes_label]

                # Toda ação conta como planejada
                bucket["planejadas"] += 1

                # Normaliza status
                if status in {"concluido", "concluida", "concluídas", "concluidas"}:
                    bucket["concluidas"] += 1
                elif status in {"andamento", "em andamento"}:
                    bucket["andamento"] += 1
                elif status in {"atrasada", "atrasado"} or (
                    prazo < hoje
                    and status
                    not in {"concluido", "concluida", "concluídas", "concluidas"}
                ):
                    bucket["atrasadas"] += 1

        # 4) Converte para lista e ordena cronologicamente (formato "Oct/25")
        acoesTimeline = [
            {
                "mes": k,
                "planejadas": v["planejadas"],
                "andamento": v["andamento"],
                "concluidas": v["concluidas"],
                "atrasadas": v["atrasadas"],
            }
            for k, v in sorted(
                timeline.items(), key=lambda x: datetime.strptime(x[0], "%b/%y")
            )
        ]

        # ===== Monta resposta =====
        data = {
            "kpis": kpis,
            "riscosDistribuicao": riscosDistribuicao,
            "riscosPorSetor": riscosPorSetor,
            "topRiscos": topRiscos,
            "acoesStatus": acoesStatus,
            "acoesTimeline": acoesTimeline,
            "documentosVencimentos": [],
            "incidentesTimeline": [],
            "loginsRecentes": [],
            "rankingUsuarios": [],
        }

        return Response(data)
