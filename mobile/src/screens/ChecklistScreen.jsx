// src/screens/ChecklistScreen.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";
import { http } from "@/api/http";
import { Space } from "@/theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * 🚫 NÃO ALTERAR A LÓGICA DO BACKEND
 * - Endpoints: GET/POST/PATCH/PUT/DELETE em "checklists/"
 * - Params: page, page_size
 * - Toggle otimista com rollback
 * - Criação/edição SEM campo de concluído (is_completed default false ao criar)
 */

export default function ChecklistScreen() {
  const { user } = useAuth();
  const canToggle = user?.role === "admin" || user?.role === "dpo";
  const readOnly = !canToggle;

  const [rows, setRows] = useState([]); // sempre array
  const [loading, setLoading] = useState(true);

  // mensagens globais (3s)
  const [msg, setMsg] = useState("");
  const [variant, setVariant] = useState("warning");
  const showFlash = useCallback((v, t) => {
    setVariant(v);
    setMsg(String(t || ""));
    setTimeout(() => setMsg(""), 3000);
  }, []);

  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);

  // Modal criação/edição
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ atividade: "", descricao: "" });

  // Modal confirmação de exclusão
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Menu de ações por item
  const [actionOpen, setActionOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionPos, setActionPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [actionMenuH, setActionMenuH] = useState(0);
  const buttonRefs = React.useRef({});

  const api = http;
  const insets = useSafeAreaInsets();

  const openActions = (item) => {
    setActionTarget(item);
    const ref = buttonRefs.current[item.id];
    if (ref && ref.measureInWindow) {
      ref.measureInWindow((x, y, w, h) => {
        setActionPos({ x, y, w, h });
        setActionOpen(true);
      });
    } else {
      setActionPos({ x: 20, y: 120, w: 0, h: 0 });
      setActionOpen(true);
    }
  };

  // ===== FETCH com normalização segura =====
  const loadList = useCallback(
    async (targetPage = page, targetPageSize = pageSize) => {
      setLoading(true);
      try {
        const params = { page: targetPage, page_size: targetPageSize };
        const resp = await api.get("checklists/", { params });
        const data = resp?.data;

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : [];

        setRows(list || []);

        if (Array.isArray(data)) {
          setCount(data.length);
          setNext(null);
          setPrevious(null);
        } else {
          setCount(
            Number.isFinite(data?.count) ? data.count : list?.length ?? 0
          );
          setNext(data?.next ?? null);
          setPrevious(data?.previous ?? null);
        }
      } catch (error) {
        console.error(
          "Erro ao buscar o checklist:",
          error?.response?.data || error.message
        );
        setRows([]);
        setCount(0);
        setNext(null);
        setPrevious(null);
        showFlash(
          "danger",
          "Falha ao carregar itens do checklist. Se o problema persistir, contate o administrador."
        );
      } finally {
        setLoading(false);
      }
    },
    [api, page, pageSize, showFlash]
  );

  useEffect(() => {
    loadList(page, pageSize);
  }, [loadList, page, pageSize]);

  const totalPages = useMemo(() => {
    const total = count || rows.length || 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [count, rows.length, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const canPrev = Boolean(previous) || page > 1;
  const canNext = Boolean(next) || page < totalPages;

  // ===== Toggle com permissão e rollback =====
  const handleCheckChange = async (id, is_completed) => {
    if (!canToggle) return;

    const snapshot = rows;
    setRows((curr) =>
      (Array.isArray(curr) ? curr : []).map((it) =>
        it.id === id ? { ...it, is_completed: !is_completed } : it
      )
    );

    try {
      await api.patch(`checklists/${id}/`, { is_completed: !is_completed });
    } catch (error) {
      console.error(
        "Erro ao atualizar o checklist:",
        error?.response?.data || error.message
      );
      setRows(snapshot); // reverte UI
      const st = error?.response?.status;
      showFlash(
        st === 403 ? "warning" : "danger",
        st === 403
          ? "Você não tem permissão para alterar este item."
          : "Não foi possível atualizar o item. Se o problema persistir, contate o administrador."
      );
    }
  };

  // ===== Novo / Editar =====
  const openCreate = () => {
    if (!canToggle) return;
    setEditing(null);
    setForm({ atividade: "", descricao: "" });
    setShowModal(true);
  };

  const openEdit = (row) => {
    if (!canToggle) return;
    setEditing(row);
    setForm({
      atividade: row.atividade || "",
      descricao: row.descricao || "",
    });
    setShowModal(true);
  };

  const parseErrorMsg = (e) => {
    let base = "Erro ao salvar. Verifique os dados e a conexão.";
    if (e?.response) {
      const { status, data } = e.response;
      if (status === 403)
        base = "Sem permissão. (Apenas Admin/DPO podem salvar aqui.)";
      else if (typeof data === "string") base = data;
      else if (data && typeof data === "object") {
        try {
          const parts = Object.entries(data).map(([k, v]) => {
            const val = Array.isArray(v) ? v.join("; ") : String(v);
            return `${k}: ${val}`;
          });
          base = parts.join(" | ");
        } catch {
          base = "Erro ao salvar (validação).";
        }
      }
    }
    return `${base} Se o problema persistir, contate o administrador.`;
  };

  const handleSave = async (ev) => {
    ev?.preventDefault?.();
    if (!canToggle || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`checklists/${editing.id}/`, form);
        showFlash("success", "Item atualizado com sucesso!");
      } else {
        await api.post("checklists/", { ...form, is_completed: false });
        showFlash("success", "Item criado com sucesso!");
      }
      setShowModal(false);
      await loadList(page, pageSize);
    } catch (e) {
      console.error(e);
      showFlash("danger", parseErrorMsg(e));
    } finally {
      setSaving(false);
    }
  };

  // ===== Excluir com confirmação =====
  const askDelete = (row) => {
    if (!canToggle) return;
    setConfirmTarget(row);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await api.delete(`checklists/${confirmTarget.id}/`);
      showFlash("success", "Excluído com sucesso!");
      setConfirmOpen(false);
      setConfirmTarget(null);
      await loadList(page, pageSize);
    } catch (e) {
      console.error(e);
      showFlash(
        "danger",
        "Falha ao excluir o item. Se o problema persistir, contate o administrador."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ===== Render =====
  if (loading) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabeçalho gradiente (identidade visual) */}
      <LinearGradient
        colors={["#003366", "#005b96"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Checklist Itens da LGPD</Text>
      </LinearGradient>
      {/* Mensagem global (sucesso/erro/aviso) */}
      {!!msg && (
        <View
          style={[
            styles.flash,
            variant === "success"
              ? styles.flashSuccess
              : variant === "danger"
              ? styles.flashDanger
              : styles.flashWarning,
          ]}
        >
          <Text style={styles.flashText}>{msg}</Text>
        </View>
      )}
      {/* Controles superiores */}
      <View style={styles.topBar}>
        <View style={styles.pageSizeBox}>
          <Text style={styles.pageSizeLabel}>Tamanho da página</Text>
          <View style={styles.pageSizePicker}>
            {[5, 10, 20, 50].map((n) => (
              <Pressable
                key={n}
                style={[
                  styles.pageSizeItem,
                  pageSize === n && styles.pageSizeItemActive,
                ]}
                onPress={() => {
                  setPageSize(n);
                  setPage(1);
                }}
              >
                <Text
                  style={[
                    styles.pageSizeItemText,
                    pageSize === n && styles.pageSizeItemTextActive,
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, readOnly && styles.disabledBtn]}
          onPress={openCreate}
          disabled={readOnly}
        >
          <Text style={styles.primaryBtnText}>+ Novo</Text>
        </TouchableOpacity>
      </View>
      {/* Lista */}
      <FlatList
        contentContainerStyle={{ padding: Space.md }}
        data={Array.isArray(rows) ? rows : []}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhum item encontrado.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isEven = index % 2 === 1; // pares = “azul” como no web
          return (
            <View style={[styles.card, isEven && styles.cardEven]}>
              <Text style={[styles.cardTitle, isEven && styles.cardTitleEven]}>
                {item.atividade}
              </Text>
              <Text style={[styles.cardDesc, isEven && styles.cardDescEven]}>
                {item.descricao}
              </Text>

              <View style={styles.cardActions}>
                <View style={styles.switchLine}>
                  <Text
                    style={[
                      styles.switchLabel,
                      isEven && styles.switchLabelEven,
                    ]}
                  >
                    Situação
                  </Text>
                  <Switch
                    value={!!item.is_completed}
                    onValueChange={() =>
                      handleCheckChange(item.id, !!item.is_completed)
                    }
                    disabled={readOnly}
                  />
                </View>

                <TouchableOpacity
                  ref={(ref) => ref && (buttonRefs.current[item.id] = ref)}
                  style={[styles.outlineBtn, readOnly && styles.disabledBtn]}
                  onPress={() => openActions(item)}
                  disabled={readOnly}
                >
                  <Text style={styles.outlineBtnText}>Ações</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
      {/* Paginação */}
      <View style={styles.pagination}>
        <Text style={styles.paginationInfo}>
          Total:{" "}
          <Text style={styles.bold}>
            {count || (Array.isArray(rows) ? rows.length : 0)}
          </Text>{" "}
          • Página <Text style={styles.bold}>{page}</Text> de{" "}
          <Text style={styles.bold}>{totalPages}</Text>
        </Text>

        <View style={styles.paginationBtns}>
          <TouchableOpacity
            style={[styles.pageBtn, !canPrev && styles.disabledBtn]}
            onPress={() => setPage(1)}
            disabled={!canPrev}
          >
            <Text style={styles.pageBtnText}>«</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pageBtn, !canPrev && styles.disabledBtn]}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
          >
            <Text style={styles.pageBtnText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pageBtn, !canNext && styles.disabledBtn]}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={!canNext}
          >
            <Text style={styles.pageBtnText}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pageBtn, !canNext && styles.disabledBtn]}
            onPress={() => setPage(totalPages)}
            disabled={!canNext}
          >
            <Text style={styles.pageBtnText}>»</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Modal Criar/Editar — full screen + ScrollView (estilo igual ao web) */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
        onRequestClose={() => setShowModal(false)}
      >
        <ScrollView
          style={styles.modalPage}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 16,
          }}
        >
          <View style={styles.modalCardFS}>
            <LinearGradient
              colors={["#063a6b", "#063a6b"]}
              style={[styles.modalHeader, styles.modalHeaderLine]}
            >
              <Text style={styles.modalTitle}>
                {editing
                  ? "Editar Item do Checklist"
                  : "Novo Item do Checklist"}
              </Text>
            </LinearGradient>

            <View style={styles.modalBody}>
              {/* Atividade */}
              <Text style={styles.inputLabel}>Atividade</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputField}
                  value={form.atividade}
                  onChangeText={(t) => setForm((f) => ({ ...f, atividade: t }))}
                  placeholder="Ex.: Nomear o DPO e divulgar seu contato"
                  placeholderTextColor="#6b7280"
                  returnKeyType="next"
                />
              </View>

              {/* Descrição */}
              <Text style={styles.inputLabel}>Descrição</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.inputField, styles.textareaField]}
                  value={form.descricao}
                  onChangeText={(t) => setForm((f) => ({ ...f, descricao: t }))}
                  placeholder="Detalhes da exigência, responsáveis, links, etc."
                  placeholderTextColor="#6b7280"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.whiteBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.whiteBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (saving || readOnly) && styles.disabledBtn,
                ]}
                onPress={handleSave}
                disabled={saving || readOnly}
              >
                <Text style={styles.primaryBtnText}>
                  {saving
                    ? "Salvando…"
                    : editing
                    ? "Salvar alterações"
                    : "Criar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>
      {/* Modal Confirmação Exclusão */}
      <Modal
        visible={confirmOpen}
        animationType="fade"
        transparent
        onRequestClose={() => !deleting && setConfirmOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <LinearGradient
              colors={["#0b2e59", "#0b2e59"]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Confirmar exclusão</Text>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={styles.confirmText}>
                Tem certeza de que deseja{" "}
                <Text style={styles.bold}>excluir</Text> este item do checklist?
              </Text>

              {confirmTarget && (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmItem}>
                    <Text style={styles.bold}>Atividade: </Text>
                    {confirmTarget.atividade}
                  </Text>
                  <Text style={[styles.confirmItem, { opacity: 0.8 }]}>
                    <Text style={styles.bold}>Descrição: </Text>
                    {confirmTarget.descricao}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.whiteBtn}
                onPress={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                <Text style={styles.whiteBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, deleting && styles.disabledBtn]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <Text style={styles.deleteBtnText}>
                  {deleting ? "Excluindo…" : "Excluir"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Dropdown Ações ancorado (com flip automático) */}
      <Modal
        visible={actionOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setActionOpen(false)}
      >
        <Pressable
          style={styles.popoverBackdrop}
          onPress={() => setActionOpen(false)}
        >
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {(() => {
              const { width: W, height: H } = Dimensions.get("window");
              const MARGIN = 12;
              const MENU_W = 200;

              // posição padrão: abaixo do botão, alinhado à direita do botão
              let top = actionPos.y + actionPos.h + 6;
              let left = Math.min(
                Math.max(MARGIN, actionPos.x + actionPos.w - MENU_W),
                W - MARGIN - MENU_W
              );

              // se não couber para baixo, abre para cima (drop-up)
              if (actionMenuH && top + actionMenuH + MARGIN > H) {
                top = Math.max(MARGIN, actionPos.y - 6 - actionMenuH);
              }

              return (
                <View
                  onLayout={(e) => setActionMenuH(e.nativeEvent.layout.height)}
                  style={[styles.popover, { top, left, width: MENU_W }]}
                >
                  <TouchableOpacity
                    style={styles.popItem}
                    onPress={() => {
                      setActionOpen(false);
                      if (actionTarget) openEdit(actionTarget);
                    }}
                    disabled={readOnly}
                  >
                    <Text style={styles.popText}>Editar</Text>
                  </TouchableOpacity>

                  <View style={styles.popDivider} />

                  <TouchableOpacity
                    style={styles.popItem}
                    onPress={() => {
                      setActionOpen(false);
                      if (actionTarget) askDelete(actionTarget);
                    }}
                    disabled={readOnly}
                  >
                    <Text style={[styles.popText, { color: "#c82333" }]}>
                      Excluir
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* =========================
 * Estilos
 * ========================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  fullCenter: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { paddingTop: 18, paddingBottom: 16, paddingHorizontal: 16 },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  flash: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  flashText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  flashSuccess: { backgroundColor: "#2e7d32" },
  flashDanger: { backgroundColor: "#c62828" },
  flashWarning: { backgroundColor: "#f9a825" },

  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pageSizeBox: { flex: 1, marginRight: 12 },
  pageSizeLabel: { color: "#071744", fontWeight: "700", marginBottom: 6 },
  pageSizePicker: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pageSizeItem: {
    borderWidth: 1,
    borderColor: "#d9e1e8",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  pageSizeItemActive: { backgroundColor: "#005b96", borderColor: "#00528a" },
  pageSizeItemText: { color: "#071744", fontWeight: "600" },
  pageSizeItemTextActive: { color: "#ffffff" },

  primaryBtn: {
    backgroundColor: "#005b96",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  disabledBtn: { opacity: 0.5 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d9e1e8",
  },
  cardEven: { backgroundColor: "#005b96", borderColor: "#00528a" },
  cardTitle: {
    color: "#071744",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardTitleEven: { color: "#ffffff" },
  cardDesc: { color: "#333", opacity: 0.9, marginBottom: 12 },
  cardDescEven: { color: "#ffffff", opacity: 1 },

  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  switchLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  switchLabel: { color: "#071744", fontWeight: "700" },
  switchLabelEven: { color: "#ffffff" },

  outlineBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  outlineBtnText: { color: "#1f2937", fontWeight: "700" },

  // Vazio na lista
  emptyBox: { paddingVertical: 30, alignItems: "center" },
  emptyText: { color: "#6b7280" },

  // Paginação
  pagination: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    gap: 8,
  },
  paginationInfo: { color: "#6b7280" },
  bold: { fontWeight: "700" },
  paginationBtns: { flexDirection: "row", gap: 8 },
  pageBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9e1e8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageBtnText: { color: "#071744", fontWeight: "700" },

  // ===== Modal criação/edição (full screen, igual web) =====
  modalPage: { flex: 1, backgroundColor: "#f5f5f5" },
  modalCardFS: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#063a6b",
  },
  modalHeader: { paddingVertical: 12, paddingHorizontal: 16 },
  modalHeaderLine: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
    fontSize: 16,
  },

  modalBody: {
    backgroundColor: "#063a6b",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  inputLabel: { color: "#ffffff", fontWeight: "700", marginBottom: 6 },

  // Campo branco com borda (garante contraste, como no web)
  inputWrap: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  inputField: {
    color: "#212529",
    paddingVertical: 10,
  },
  textareaField: {
    minHeight: 96,
  },

  modalFooter: {
    backgroundColor: "#063a6b",
    padding: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  whiteBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  whiteBtnText: { color: "#0b2e59", fontWeight: "800" },
  deleteBtn: {
    backgroundColor: "#c82333",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  deleteBtnText: { color: "#fff", fontWeight: "800" },

  // ===== Modal de confirmação (mantém overlay) =====
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  confirmCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0b2e59",
  },
  confirmText: { color: "#fff", marginBottom: 10 },
  confirmBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  confirmItem: { color: "#0b2e59" },

  // ===== Dropdown (popover) ancorado =====
  popoverBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  popover: {
    position: "absolute",
    minWidth: 160,
    maxWidth: 220,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    paddingVertical: 6,
  },
  popItem: { paddingVertical: 10, paddingHorizontal: 14 },
  popText: { fontSize: 15, color: "#111827", fontWeight: "700" },
  popDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e7eb",
    marginVertical: 4,
  },
});
