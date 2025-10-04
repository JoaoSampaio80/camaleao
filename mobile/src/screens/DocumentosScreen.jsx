// src/screens/DocumentosScreen.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert as RNAlert,
  Modal,
  FlatList,
  Linking,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Se você já tem um axios configurado, mantenha isso:
import { http } from "@/api/http"; // mesmo cliente usado no web (com baseURL e auth)
// Se tiver AuthContext e quiser restringir botões por papel:
// import { useAuth } from "@/context/AuthContext";

// Paleta idêntica ao web
const Colors = {
  gradA: "#003366",
  gradB: "#005b96",
  white: "#ffffff",
  ink: "#071744",
  text: "#213547",
  bgPage: "#f5f5f5",
  cardBlue: "#005b96",
  cardWhite: "#ffffff",
  muted: "#6b7280",
  line: "#d9e1e8",
};

// Fallbacks caso /documentos/choices/ falhe
const FALLBACK_CHOICES = {
  dimensao: [
    ["GPV", "Gestão de privacidade"],
    ["GSI", "Gestão de SI"],
    ["PRC", "Processos"],
  ],
  criticidade: [
    ["NA", "Não aplicável"],
    ["BP", "Boas práticas"],
    ["BX", "Baixa"],
    ["MD", "Média"],
    ["AL", "Alta"],
  ],
  status: [
    ["NA", "Não aplicável"],
    ["NI", "Não Iniciado"],
    ["EA", "Em andamento"],
    ["FI", "Finalizado"],
  ],
};

// Util: data dd/mm/yyyy (não mexe em backend)
const fmtBR = (value) => {
  if (!value) return "-";
  const s = String(value).trim();
  const hit = (s.match(/\d{4}-\d{2}-\d{2}/) || [])[0];
  if (hit) {
    const [y, m, d] = hit.split("-");
    return `${d}/${m}/${y}`;
  }
  const br = (s.match(/\d{2}\/\d{2}\/\d{4}/) || [])[0];
  return br || "-";
};

const SelectLine = ({ label, value, onPress }) => (
  <View>
    <Text style={styles.label}>{label}</Text>
    <Pressable onPress={onPress} style={styles.selectLine}>
      <Text style={styles.selectValue}>{value || "Selecione…"}</Text>
    </Pressable>
  </View>
);

// ===== Datas (BR <-> ISO) =====
const maskDateBR = (v) => {
  const d = String(v || "")
    .replace(/\D/g, "")
    .slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};
const brToIso = (v) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v || ""));
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
};
const isoToBr = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  const hit = (s.match(/\d{4}-\d{2}-\d{2}/) || [])[0];
  if (!hit) return "";
  const [y, m, d] = hit.split("-");
  return `${d}/${m}/${y}`;
};

export default function DocumentosScreen() {
  const insets = useSafeAreaInsets();
  const isStaffOrDPO = true;

  // Listagem
  const [rows, setRows] = useState([]);
  const [choices, setChoices] = useState(FALLBACK_CHOICES);
  const [loading, setLoading] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  // Mensagem toast simples
  const [notice, setNotice] = useState(null); // { type: "success" | "danger", text: string }
  const showMsg = (type, text, ms = 3000) => {
    setNotice({ type, text });
    if (ms) setTimeout(() => setNotice(null), ms);
  };

  // Modal Novo/Editar
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dimensao: "",
    atividade: "",
    base_legal: "",
    evidencia: "",
    proxima_revisao: "",
    comentarios: "",
    criticidade: "NA",
    status: "NI",
  });

  // Modal de seleção (para "selects" mobile sem dependências extras)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerItems, setPickerItems] = useState([]);
  const [onPick, setOnPick] = useState(() => {});

  const safeMergeChoices = (data) => ({
    dimensao: data?.dimensao?.length
      ? data.dimensao
      : FALLBACK_CHOICES.dimensao,
    criticidade: data?.criticidade?.length
      ? data.criticidade
      : FALLBACK_CHOICES.criticidade,
    status: data?.status?.length ? data.status : FALLBACK_CHOICES.status,
  });

  const parseErrorMsg = (e) => {
    const res = e?.response;
    if (res) {
      const { status, data } = res;
      if (status === 403)
        return "Sem permissão. (Apenas Admin/DPO podem salvar aqui.)";
      if (typeof data === "string") return data;
      if (data && typeof data === "object") {
        try {
          const parts = Object.entries(data).map(([k, v]) => {
            const val = Array.isArray(v) ? v.join("; ") : String(v);
            return `${k}: ${val}`;
          });
          return parts.join(" | ");
        } catch {
          return "Erro ao salvar (validação).";
        }
      }
    }
    return "Erro de rede. Verifique sua conexão.";
  };

  const loadChoices = useCallback(async () => {
    try {
      const { data } = await http.get("/documentos/choices/");
      setChoices(safeMergeChoices(data));
    } catch {
      setChoices(FALLBACK_CHOICES);
    }
  }, []);

  const loadRows = useCallback(
    async (targetPage = page, targetPageSize = pageSize) => {
      setLoading(true);
      try {
        const { data } = await http.get("/documentos/", {
          params: { page: targetPage, page_size: targetPageSize },
        });
        const results = Array.isArray(data) ? data : data.results || [];
        const total = Array.isArray(data)
          ? results.length
          : data.count ?? results.length;

        setRows(results);
        setCount(total);
        if (targetPage !== page) setPage(targetPage);
        if (targetPageSize !== pageSize) setPageSize(targetPageSize);

        if (!Array.isArray(data) && results.length === 0 && targetPage > 1) {
          const prev = targetPage - 1;
          const retry = await http.get("/documentos/", {
            params: { page: prev, page_size: targetPageSize },
          });
          const r2 = retry.data.results || [];
          setRows(r2);
          setCount(retry.data.count ?? 0);
          if (prev !== page) setPage(prev);
        }
      } catch (e) {
        console.error(e);
        showMsg("danger", "Falha ao carregar a listagem.");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  useEffect(() => {
    loadChoices();
  }, [loadChoices]);

  useEffect(() => {
    // ao trocar pageSize volta pra 1
    loadRows(1, pageSize);
  }, [pageSize]);

  useEffect(() => {
    loadRows(page, pageSize);
  }, [page]);

  // Ações
  const openCreate = () => {
    setEditing(null);
    setForm({
      dimensao: "",
      atividade: "",
      base_legal: "",
      evidencia: "",
      proxima_revisao: "",
      comentarios: "",
      criticidade: "NA",
      status: "NI",
    });
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      dimensao: row.dimensao || "",
      atividade: row.atividade || "",
      base_legal: row.base_legal || "",
      evidencia: row.evidencia || "",
      proxima_revisao: isoToBr(row.proxima_revisao) || "",
      comentarios: row.comentarios || "",
      criticidade: row.criticidade || "NA",
      status: row.status || "NI",
    });
    setShowForm(true);
  };

  const normalizePayload = (f) => ({
    ...f,
    proxima_revisao: f.proxima_revisao ? brToIso(f.proxima_revisao) : null,
  });

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = normalizePayload(form);
      if (editing) {
        await http.put(`/documentos/${editing.id}/`, payload);
        showMsg("success", "Atividade atualizada com sucesso!");
      } else {
        await http.post("/documentos/", payload);
        showMsg("success", "Atividade criada com sucesso!");
      }
      setShowForm(false);
      await loadRows(page, pageSize);
    } catch (e) {
      console.error(e);
      showMsg("danger", parseErrorMsg(e), 6000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    RNAlert.alert("Confirmar exclusão", "Deseja excluir este item?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await http.delete(`/documentos/${row.id}/`);
            showMsg("success", "Excluído com sucesso.");
            loadRows(page, pageSize);
          } catch (e) {
            console.error(e);
            showMsg("danger", parseErrorMsg(e), 6000);
          }
        },
      },
    ]);
  };

  // ===== DOWNLOAD (Expo Go fallback abre no navegador) =====
  const absoluteFileUrl = (maybeUrl) => {
    if (!maybeUrl) return null;
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    const base = (http?.defaults?.baseURL || "").replace(/\/+$/, "");
    return `${base}${maybeUrl}`;
  };

  const handleDownload = async (row) => {
    try {
      if (!row.arquivo_url) return;
      const url = absoluteFileUrl(row.arquivo_url);
      // Expo Go: abrir no navegador
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        showMsg("success", "Abrindo arquivo…");
        return;
      }
      showMsg("danger", "Não foi possível abrir o arquivo.");
    } catch (e) {
      console.error(e);
      showMsg("danger", "Falha no download/abertura do arquivo.");
    }
  };

  // ===== UPLOAD (DocumentPicker + multipart) =====
  const handleUpload = async (rowId) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      const uri = asset.uri;
      const filename = asset.name || uri.split("/").pop() || "arquivo";
      const mime = asset.mimeType || "application/octet-stream";

      const fd = new FormData();
      // RN fetch multipart: { uri, name, type }
      fd.append("arquivo", { uri, name: filename, type: mime });

      await http.post(`/documentos/${rowId}/upload/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showMsg("success", "Arquivo enviado.");
      await loadRows(page, pageSize);
    } catch (e) {
      console.error(e);
      showMsg("danger", parseErrorMsg(e), 6000);
    }
  };

  // ===== Helpers de UI =====
  const openPicker = (title, items, onPickItem) => {
    setPickerTitle(title);
    setPickerItems(items);
    setOnPick(() => onPickItem);
    setPickerOpen(true);
  };

  const RowCard = ({ item, index }) => {
    const blue = index % 2 === 1;
    const DropdownAcoes = ({
      hasFile,
      onDownload,
      onUpload,
      onEdit,
      onDelete,
      canManage,
    }) => {
      const [menuOpen, setMenuOpen] = useState(false);
      const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });
      const [menuH, setMenuH] = useState(0);
      const btnRef = useRef(null);

      const openMenu = () => {
        // mede posição do botão na janela e abre o menu logo abaixo
        btnRef.current?.measureInWindow?.((x, y, w, h) => {
          setAnchor({ x, y, w, h });
          setMenuOpen(true);
        });
      };

      const { width: W, height: H } = Dimensions.get("window");
      const MARGIN = 12;
      const MENU_W = 220;

      let top = anchor.y + anchor.h + 6;
      let left = Math.min(
        Math.max(MARGIN, anchor.x + anchor.w - MENU_W),
        W - MARGIN - MENU_W
      );

      //Se não couber embaixo, abre para cima (drop-up)
      if (menuOpen && menuH && top + menuH + MARGIN > H) {
        top = Math.max(MARGIN, anchor.y - 6 - menuH);
      }

      return (
        <View style={styles.actions}>
          <Pressable
            ref={btnRef}
            style={[styles.btn, styles.btnGhost]}
            onPress={openMenu}
          >
            <Text style={styles.btnGhostText}>Ações ▾</Text>
          </Pressable>

          <Modal
            visible={menuOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setMenuOpen(false)}
          >
            {/* backdrop: fecha ao tocar fora */}
            <Pressable
              style={styles.backdrop}
              onPress={() => setMenuOpen(false)}
            >
              <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                <View
                  onLayout={(e) => setMenuH(e.nativeEvent.layout.height)}
                  style={[styles.menu, { top, left, width: MENU_W }]}
                >
                  {hasFile && (
                    <Pressable
                      style={styles.menuItem}
                      onPress={() => {
                        setMenuOpen(false);
                        onDownload();
                      }}
                    >
                      <Text style={styles.menuItemText}>Download</Text>
                    </Pressable>
                  )}

                  {canManage && (
                    <>
                      <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                          setMenuOpen(false);
                          onUpload();
                        }}
                      >
                        <Text style={styles.menuItemText}>Upload</Text>
                      </Pressable>

                      <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                          setMenuOpen(false);
                          onEdit();
                        }}
                      >
                        <Text style={styles.menuItemText}>Editar</Text>
                      </Pressable>

                      <View style={styles.menuDivider} />

                      <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                          setMenuOpen(false);
                          onDelete();
                        }}
                      >
                        <Text
                          style={[styles.menuItemText, styles.menuItemDanger]}
                        >
                          Excluir
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            </Pressable>
          </Modal>
        </View>
      );
    };
    return (
      <View style={[styles.card, blue ? styles.cardBlue : styles.cardWhite]}>
        <View style={styles.rowLine}>
          <Text style={[styles.cellLabel, blue && styles.cellLabelBlue]}>
            Dimensão
          </Text>
          <Text
            style={[styles.cellValue, blue && styles.cellValueBlue]}
            numberOfLines={2}
          >
            {item.dimensao_display}
          </Text>
        </View>

        <View style={styles.rowLine}>
          <Text style={[styles.cellLabel, blue && styles.cellLabelBlue]}>
            Atividade / Documento
          </Text>
          <Text
            style={[styles.cellValue, blue && styles.cellValueBlue]}
            numberOfLines={4}
          >
            {item.atividade}
          </Text>
        </View>

        <View style={styles.rowLine}>
          <Text style={[styles.cellLabel, blue && styles.cellLabelBlue]}>
            Base Legal
          </Text>
          <Text
            style={[styles.cellValue, blue && styles.cellValueBlue]}
            numberOfLines={2}
          >
            {item.base_legal || "-"}
          </Text>
        </View>

        <View style={styles.rowLine}>
          <Text style={[styles.cellLabel, blue && styles.cellLabelBlue]}>
            Evidência
          </Text>
          <Text
            style={[styles.cellValue, blue && styles.cellValueBlue]}
            numberOfLines={2}
          >
            {item.evidencia || "-"}
          </Text>
        </View>

        <View style={styles.rowLine}>
          <Text style={[styles.cellLabel, blue && styles.cellLabelBlue]}>
            Próxima Revisão
          </Text>
          <Text style={[styles.cellValue, blue && styles.cellValueBlue]}>
            {fmtBR(item.proxima_revisao)}
          </Text>
        </View>

        <View style={styles.rowLine}>
          <Text style={[styles.cellLabel, blue && styles.cellLabelBlue]}>
            Comentários
          </Text>
          <Text
            style={[styles.cellValue, blue && styles.cellValueBlue]}
            numberOfLines={4}
          >
            {item.comentarios || "-"}
          </Text>
        </View>

        <View style={styles.rowGrid}>
          <View style={styles.rowGridCol}>
            <Text style={[styles.cellLabel, blue && styles.cellLabelBlue]}>
              Criticidade
            </Text>
            <Text style={[styles.badge, styles.badgeOutline]}>
              {item.criticidade_display}
            </Text>
          </View>
          <View style={styles.rowGridCol}>
            <Text style={[styles.cellLabel, blue && styles.cellLabelBlue]}>
              Status
            </Text>
            <Text style={[styles.badge, styles.badgeOutline]}>
              {item.status_display}
            </Text>
          </View>
        </View>
        <DropdownAcoes
          hasFile={!!item.arquivo_url}
          onDownload={() => handleDownload(item)}
          onUpload={() => handleUpload(item.id)}
          onEdit={() => openEdit(item)}
          onDelete={() => handleDelete(item)}
          canManage={isStaffOrDPO}
        />
      </View>
    );
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top + 8 }]}>
      {/* Header gradiente */}
      <LinearGradient
        colors={[Colors.gradA, Colors.gradB]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Atividades da LGPD</Text>
      </LinearGradient>

      {/* Barra superior: itens por página + Novo */}
      <View style={styles.toolbar}>
        <Pressable
          style={styles.pageSizeBtn}
          onPress={() =>
            openPicker(
              "Itens por página",
              [
                { v: 5, label: "5" },
                { v: 10, label: "10" },
                { v: 20, label: "20" },
                { v: 50, label: "50" },
              ],
              (opt) => setPageSize(opt.v)
            )
          }
        >
          <Text style={styles.pageSizeLabel}>Itens por página</Text>
          <Text style={styles.pageSizeValue}>{pageSize}</Text>
        </Pressable>

        <Pressable style={styles.newBtn} onPress={openCreate}>
          <Text style={styles.newBtnText}>+ Novo</Text>
        </Pressable>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ color: Colors.muted, marginTop: 8 }}>Carregando…</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: Colors.muted }}>
            Nenhum documento encontrado.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 12, paddingBottom: 96 }}
          data={rows}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item, index }) => (
            <RowCard item={item} index={index} />
          )}
        />
      )}

      {/* Rodapé fixo com paginação */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          <Text style={{ fontWeight: "700" }}>Total:</Text> {count} • Página{" "}
          {page} de {totalPages}
        </Text>
        <View style={styles.footerNav}>
          <Pressable
            style={[styles.pagerBtn, page === 1 && styles.pagerBtnDisabled]}
            disabled={page === 1}
            onPress={() => setPage(1)}
          >
            <Text style={styles.pagerText}>«</Text>
          </Pressable>
          <Pressable
            style={[styles.pagerBtn, page === 1 && styles.pagerBtnDisabled]}
            disabled={page === 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          >
            <Text style={styles.pagerText}>‹</Text>
          </Pressable>
          <Pressable
            style={[
              styles.pagerBtn,
              page === totalPages && styles.pagerBtnDisabled,
            ]}
            disabled={page === totalPages}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <Text style={styles.pagerText}>›</Text>
          </Pressable>
          <Pressable
            style={[
              styles.pagerBtn,
              page === totalPages && styles.pagerBtnDisabled,
            ]}
            disabled={page === totalPages}
            onPress={() => setPage(totalPages)}
          >
            <Text style={styles.pagerText}>»</Text>
          </Pressable>
        </View>
      </View>

      {/* Toast simples */}
      {notice && (
        <View
          style={[
            styles.toast,
            notice.type === "success"
              ? styles.toastSuccess
              : styles.toastDanger,
          ]}
        >
          <Text style={styles.toastText}>{notice.text}</Text>
        </View>
      )}

      {/* Modal Form (Criar/Editar) */}
      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowForm(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <LinearGradient
                colors={[Colors.gradA, Colors.gradB]}
                style={styles.modalHeader}
              >
                <Text style={styles.modalTitle}>
                  {editing ? "Editar Atividade" : "Nova Atividade"}
                </Text>
              </LinearGradient>

              <ScrollView
                style={{ maxHeight: "70%" }}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  padding: 12,
                  gap: 12,
                  paddingBottom: 200,
                }}
              >
                {/* Dimensão / Criticidade / Status */}
                <SelectLine
                  label="Dimensão"
                  value={
                    choices.dimensao.find(([v]) => v === form.dimensao)?.[1] ||
                    ""
                  }
                  onPress={() =>
                    openPicker(
                      "Dimensão",
                      choices.dimensao.map(([v, l]) => ({ v, label: l })),
                      (opt) => setForm((f) => ({ ...f, dimensao: opt.v }))
                    )
                  }
                />
                <SelectLine
                  label="Criticidade"
                  value={
                    choices.criticidade.find(
                      ([v]) => v === form.criticidade
                    )?.[1] || ""
                  }
                  onPress={() =>
                    openPicker(
                      "Criticidade",
                      choices.criticidade.map(([v, l]) => ({ v, label: l })),
                      (opt) => setForm((f) => ({ ...f, criticidade: opt.v }))
                    )
                  }
                />
                <SelectLine
                  label="Status"
                  value={
                    choices.status.find(([v]) => v === form.status)?.[1] || ""
                  }
                  onPress={() =>
                    openPicker(
                      "Status",
                      choices.status.map(([v, l]) => ({ v, label: l })),
                      (opt) => setForm((f) => ({ ...f, status: opt.v }))
                    )
                  }
                />

                {/* Atividade */}
                <View>
                  <Text style={styles.label}>
                    Atividade / Documento (descrição)
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    multiline
                    numberOfLines={4}
                    value={form.atividade}
                    onChangeText={(t) =>
                      setForm((f) => ({ ...f, atividade: t }))
                    }
                    placeholder="Descreva a atividade/documento…"
                  />
                </View>

                {/* Base Legal & Evidência */}
                <View style={styles.rowCols}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Base Legal</Text>
                    <TextInput
                      style={styles.input}
                      value={form.base_legal}
                      onChangeText={(t) =>
                        setForm((f) => ({ ...f, base_legal: t }))
                      }
                      placeholder="Ex.: Art. 41 da Lei 13.709/2018"
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Evidência</Text>
                    <TextInput
                      style={styles.input}
                      value={form.evidencia}
                      onChangeText={(t) =>
                        setForm((f) => ({ ...f, evidencia: t }))
                      }
                      placeholder="Ex.: NI Nº 123-AB"
                    />
                  </View>
                </View>

                {/* Próxima Revisão & Comentários */}
                <View style={styles.rowCols}>
                  <View style={[styles.col, { flex: 0.9 }]}>
                    <Text style={styles.label}>Próxima Revisão</Text>
                    {/* Usa input text yyyy-mm-dd para manter compatibilidade com backend */}
                    <TextInput
                      style={styles.input}
                      placeholder="dd/mm/aaaa"
                      keyboardType="number-pad"
                      maxLength={10}
                      value={form.proxima_revisao || ""}
                      onChangeText={(t) =>
                        setForm((f) => ({
                          ...f,
                          proxima_revisao: maskDateBR(t),
                        }))
                      }
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Comentários</Text>
                    <TextInput
                      style={[styles.input, styles.textareaSmall]}
                      multiline
                      numberOfLines={2}
                      value={form.comentarios}
                      onChangeText={(t) =>
                        setForm((f) => ({ ...f, comentarios: t }))
                      }
                      placeholder="Observações gerais, responsáveis, links…"
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <Pressable
                  style={[styles.btn, styles.btnGhost]}
                  onPress={() => setShowForm(false)}
                >
                  <Text style={styles.btnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.btnPrimaryText}>
                    {saving
                      ? "Salvando…"
                      : editing
                      ? "Salvar alterações"
                      : "Criar"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Picker genérico */}
      <Modal visible={pickerOpen} transparent animationType="fade">
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>{pickerTitle}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {pickerItems.map((opt, i) => (
                <Pressable
                  key={`${pickerTitle}-${i}-${opt.v}`}
                  style={styles.pickerOption}
                  onPress={() => {
                    setPickerOpen(false);
                    onPick?.(opt);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              onPress={() => setPickerOpen(false)}
            >
              <Text style={styles.btnGhostText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.bgPage,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTitle: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 18,
    textAlign: "center",
  },
  toolbar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  pageSizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef5fb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  pageSizeLabel: { color: Colors.text, fontSize: 13 },
  pageSizeValue: {
    color: Colors.white,
    backgroundColor: Colors.gradB,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: "700",
    overflow: "hidden",
  },
  newBtn: {
    backgroundColor: Colors.gradB,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newBtnText: { color: Colors.white, fontWeight: "700" },

  center: { alignItems: "center", justifyContent: "center", marginTop: 40 },

  card: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  cardWhite: { backgroundColor: Colors.cardWhite },
  cardBlue: { backgroundColor: Colors.cardBlue },

  rowLine: { marginBottom: 8 },
  cellLabel: { color: Colors.muted, fontSize: 12, fontWeight: "600" },
  cellLabelBlue: { color: "#e6eef6" },
  cellValue: { color: Colors.text, fontSize: 14 },
  cellValueBlue: { color: Colors.white },

  rowGrid: { flexDirection: "row", gap: 12, marginTop: 4 },
  rowGridCol: { flex: 1 },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    overflow: "hidden",
    color: Colors.text,
  },
  badgeOutline: {
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: "#fff",
  },

  actions: {
    marginTop: 12,
    alignSelf: "flex-start",
    position: "relative",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menu: {
    position: "absolute",
    top: 46,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 12,
    minWidth: 160,
    paddingVertical: 6,
    // sombra
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 20,
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 10 },
  menuItemText: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  menuItemDanger: { color: "#991b1b" },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.line,
    marginVertical: 4,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  btnGhost: { backgroundColor: "#fff" },
  btnGhostText: { color: Colors.text, fontWeight: "700" },
  btnPrimary: { backgroundColor: Colors.gradB, borderColor: Colors.gradB },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },
  btnDanger: { backgroundColor: "#fee2e2", borderColor: "#fecaca" },
  btnDangerText: { color: "#991b1b", fontWeight: "700" },

  footer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "#eef5fb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  footerText: { color: Colors.text, fontSize: 12 },
  footerNav: { flexDirection: "row", gap: 6 },
  pagerBtn: {
    minWidth: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerText: { color: Colors.text, fontWeight: "800", fontSize: 16 },

  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 70,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  toastSuccess: {
    backgroundColor: "#e6ffed",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  toastDanger: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  toastText: { color: Colors.text, textAlign: "center" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#063a6b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  modalHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
    fontSize: 16,
  },
  modalFooter: {
    backgroundColor: "#063a6b",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    padding: 12,
  },

  label: { color: "#ffffff", fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderColor: "#ced4da",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  textareaSmall: { minHeight: 60, textAlignVertical: "top" },
  rowCols: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  pickerCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
  },
  pickerTitle: {
    fontWeight: "800",
    fontSize: 16,
    color: Colors.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  pickerOptionText: { color: Colors.text },
  selectLine: {
    backgroundColor: "#ffffff",
    borderColor: "#ced4da",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectValue: { color: Colors.text, fontWeight: "600" },
});
