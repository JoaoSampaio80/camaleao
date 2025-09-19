// src/screens/CadastroUsuarioScreen.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert as RNAlert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { http } from "@/api/http";

/* === Paleta e tokens fiéis ao web === */
const Colors = {
  gradA: "#003366",
  gradB: "#005b96",
  white: "#ffffff",
  bgPage: "#f5f5f5",
  ink: "#071744",
  text: "#213547",
  border: "#E5E7EB",
  danger: "#dc3545",
  success: "#16a34a",
};
const Radius = { md: 12, lg: 20 };
const Space = { sm: 8, md: 14, lg: 20 };

const NameMax = 60;

const sanitizeName = (s) =>
  (s || "")
    .replace(/[^\p{L}\s\-'\u2019]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/-{2,}/g, "-")
    .replace(/['\u2019]{2,}/g, "'")
    .replace(/^[\s'\u2019-]+/, "")
    .slice(0, NameMax);

const digitsOnly = (s) => (s || "").replace(/\D/g, "");

const formatPhoneBR = (value) => {
  const d = digitsOnly(value).slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/* === AJUSTE 1: máscara dd/mm/aaaa + conversões === */
const maskDateBR = (v) => {
  const d = digitsOnly(v).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};
const brToISO = (br) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br || "");
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
};

const addYearsToISODate = (yyyy_mm_dd, years = 2) => {
  if (!yyyy_mm_dd) return "";
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  if (!y || !m || !d) return "";
  const base = new Date(Date.UTC(y, m - 1, d));
  const out = new Date(base);
  out.setUTCFullYear(base.getUTCFullYear() + years);
  if (out.getUTCMonth() !== base.getUTCMonth()) out.setUTCDate(0);
  const yy = out.getUTCFullYear();
  const mm = String(out.getUTCMonth() + 1).padStart(2, "0");
  const dd2 = String(out.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd2}`;
};

const formatISOToBR = (yyyy_mm_dd) => {
  if (!yyyy_mm_dd) return "";
  const [y, m, d] = yyyy_mm_dd.split("-");
  if (!y || !m || !d) return "";
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
};

const INITIAL = {
  email: "",
  first_name: "",
  last_name: "",
  phone_number: "",
  role: "gerente", // admin | dpo | gerente
  // AJUSTE 1: campo de entrada da data em BR
  appointment_date_br: "", // dd/mm/aaaa
  password: "",
  password2: "",
};

const ROLE_LABEL = { admin: "Administrador", dpo: "DPO", gerente: "Gerente" };

/* === Componente “pill” de seleção de Role (substitui <select>) === */
function RoleSelector({ value, onChange, disabled }) {
  return (
    <View style={s.rowWrap}>
      {["admin", "dpo", "gerente"].map((r) => {
        const active = value === r;
        return (
          <Pressable
            key={r}
            disabled={disabled}
            onPress={() => onChange(r)}
            style={[
              s.pill,
              active && {
                backgroundColor: Colors.white,
                borderColor: "transparent",
              },
            ]}
          >
            <Text
              style={[
                s.pillTxt,
                active && { color: Colors.ink, fontWeight: "800" },
              ]}
            >
              {ROLE_LABEL[r]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* === Badge “modo edição” === */
function EditBadge() {
  return (
    <View style={s.badgeWarn}>
      <Text style={s.badgeWarnTxt}>Modo edição ativo</Text>
    </View>
  );
}

/* === Linha de usuário (lista) === */
function UserRow({ u, onEdit, onDelete }) {
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return (
    <View style={s.userRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.userEmail}>{u.email}</Text>
        <Text style={s.userName}>{fullName || "-"}</Text>
        <Text style={s.userRole}>{u.role}</Text>
      </View>
      <View style={s.rowActions}>
        <Pressable
          onPress={() => onEdit(u.id)}
          style={[s.btnLite, { borderColor: Colors.gradB }]}
        >
          <Text style={[s.btnLiteTxt, { color: Colors.gradB }]}>Editar</Text>
        </Pressable>
        <Pressable
          onPress={() => onDelete(u.id)}
          style={[s.btnLite, { borderColor: Colors.danger }]}
        >
          <Text style={[s.btnLiteTxt, { color: Colors.danger }]}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CadastroUsuarioScreen() {
  const { top, bottom } = useSafeAreaInsets();

  const [formData, setFormData] = useState(INITIAL);
  const [mode, setMode] = useState("create"); // create | edit
  const [selectedId, setSelectedId] = useState(null);
  const [originalRole, setOriginalRole] = useState(null);

  const [errors, setErrors] = useState({});
  const [flashMsg, setFlashMsg] = useState("");
  const [flashKind, setFlashKind] = useState(""); // success | danger | info
  const [submitting, setSubmitting] = useState(false);

  // lista
  const [users, setUsers] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [query, setQuery] = useState("");
  // paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);

  const totalPages = useMemo(() => {
    const base = count || users.length || 0;
    return Math.max(1, Math.ceil(base / pageSize));
  }, [count, users.length, pageSize]);

  const isProdLike = false;

  const canPrev = Boolean(previous) || page > 1;
  const canNext = Boolean(next) || page < totalPages;

  const goTo = useCallback(
    (p) => {
      if (p < 1 || p > totalPages) return;
      setPage(p);
    },
    [totalPages]
  );

  const fetchUsers = useCallback(async () => {
    setListLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (query) params.q = query;

      const resp = await http.get("users/", { params });
      const data = resp?.data;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];
      setUsers(list);

      if (Array.isArray(data)) {
        setCount(data.length);
        setNext(null);
        setPrevious(null);
      } else {
        setCount(Number.isFinite(data?.count) ? data.count : list.length);
        setNext(data?.next ?? null);
        setPrevious(data?.previous ?? null);
      }
    } catch {
      setUsers([]);
      setFlashKind("danger");
      setFlashMsg("Falha ao carregar usuários.");
    } finally {
      setListLoading(false);
    }
  }, [page, pageSize, query]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* === AJUSTE 2: descobrir se já existe DPO para exibir aviso/validar === */
  const [dpoExists, setDpoExists] = useState(false);
  const [checkingDPO, setCheckingDPO] = useState(true);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setCheckingDPO(true);
        await http.get("users/dpo/"); // 200 => existe DPO
        if (mounted) setDpoExists(true);
      } catch (e) {
        // 404 => não existe DPO
        if (mounted) setDpoExists(!(e?.response?.status === 404));
      } finally {
        if (mounted) setCheckingDPO(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const resetForm = (clearFlash = true) => {
    setFormData(INITIAL);
    setMode("create");
    setSelectedId(null);
    setErrors({});
    setOriginalRole(null);
    if (clearFlash) {
      setFlashKind("");
      setFlashMsg("");
    }
  };

  const onChange = (name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value ?? "" };
      return next;
    });
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const validateClient = () => {
    const e = {};
    if (!formData.email.trim()) e.email = "E-mail é obrigatório.";
    if (!formData.role) e.role = "Selecione o tipo de usuário.";

    if (mode === "create") {
      if (!isProdLike) {
        if (!formData.password) e.password = "Senha é obrigatória.";
        if (formData.password && formData.password.length < 3)
          e.password = "A senha deve ter pelo menos 3 caracteres.";
        if (formData.password2 !== formData.password)
          e.password2 = "As senhas não coincidem.";
      }
    } else if (formData.password || formData.password2) {
      const minLen = isProdLike ? 8 : 3;
      if (!formData.password) e.password = "Informe a nova senha.";
      if (!formData.password2) e.password2 = "Confirme a nova senha.";
      if (formData.password && formData.password.length < minLen)
        e.password = `A senha deve ter pelo menos ${minLen} caracteres.`;
      if (formData.password2 !== formData.password)
        e.password2 = "As senhas não coincidem.";
    }

    if (
      formData.first_name &&
      /[^\p{L}\s\-'\u2019]/u.test(formData.first_name)
    ) {
      e.first_name = "Use apenas letras, espaços, hífen e apóstrofo.";
    }
    if (formData.last_name && /[^\p{L}\s\-'\u2019]/u.test(formData.last_name)) {
      e.last_name = "Use apenas letras, espaços, hífen e apóstrofo.";
    }

    if (formData.role === "dpo") {
      const len = digitsOnly(formData.phone_number).length;
      if (!len) e.phone_number = "Telefone é obrigatório para DPO.";
      else if (!(len === 10 || len === 11))
        e.phone_number = "Telefone deve ter 10 ou 11 dígitos.";

      // AJUSTE 1: validar formato dd/mm/aaaa
      if (
        !/^(\d{2})\/(\d{2})\/(\d{4})$/.test(formData.appointment_date_br || "")
      ) {
        e.appointment_date = "Informe a data no formato dd/mm/aaaa.";
      }

      // AJUSTE 2: bloquear cadastro de novo DPO
      if (dpoExists) {
        e.role = "Já existe um DPO nomeado. Edite o DPO atual para alterar.";
      }
    }

    return e;
  };

  const buildPayload = () => {
    const data = {
      email: formData.email.trim().toLowerCase(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      role: formData.role,
    };

    if (formData.phone_number)
      data.phone_number = digitsOnly(formData.phone_number);

    if (formData.role === "dpo") {
      // AJUSTE 1 e 3: converter BR -> ISO e calcular validade
      const iso = brToISO(formData.appointment_date_br);
      data.appointment_date = iso || null;
      data.appointment_validity = iso ? addYearsToISODate(iso, 2) : null;
    } else if (
      mode === "edit" &&
      originalRole === "dpo" &&
      formData.role !== "dpo"
    ) {
      data.appointment_date = null;
      data.appointment_validity = null;
    }

    if (mode === "create") {
      if (!isProdLike) data.password = formData.password;
    } else if (formData.password) {
      data.password = formData.password;
    }

    return data;
  };

  const onSubmit = async () => {
    if (submitting) return;
    setFlashKind("");
    setFlashMsg("");
    setErrors({});

    const clientErrs = validateClient();
    if (Object.keys(clientErrs).length) {
      setErrors(clientErrs);
      setFlashKind("danger");
      setFlashMsg("Corrija os campos destacados.");
      return;
    }

    const payload = buildPayload();
    setSubmitting(true);
    try {
      if (mode === "create") {
        const resp = await http.post("users/", payload);
        if (resp.status === 201) {
          setFlashKind("success");
          setFlashMsg("Usuário cadastrado com sucesso!");
          await fetchUsers();
          resetForm(false);
          setTimeout(() => {
            setFlashKind("");
            setFlashMsg("");
          }, 2500);
        }
      } else {
        const resp = await http.patch(`users/${selectedId}/`, payload);
        if ([200, 204].includes(resp.status)) {
          setFlashKind("success");
          setFlashMsg("Dados alterados com sucesso!");
          await fetchUsers();
          resetForm(false);
          setTimeout(() => {
            setFlashKind("");
            setFlashMsg("");
          }, 2500);
        }
      }
    } catch (err) {
      const st = err?.response?.status;
      const data = err?.response?.data;
      if (st === 400 && data && typeof data === "object") {
        const normalized = {};
        Object.entries(data).forEach(([k, v]) => {
          normalized[k] = Array.isArray(v) ? v.join(" ") : String(v);
        });
        setErrors(normalized);
        // se backend devolver msg específica do DPO, mantém sem alterar visual
        if (normalized.role && /DPO/i.test(normalized.role)) {
          setFlashKind("danger");
          setFlashMsg(normalized.role);
        } else {
          setFlashKind("danger");
          setFlashMsg("Corrija os campos destacados.");
        }
      } else if (st === 403) {
        setFlashKind("danger");
        setFlashMsg("Você não tem permissão para executar esta ação.");
      } else {
        setFlashKind("danger");
        setFlashMsg("Erro ao salvar. Verifique os dados e tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = async (id) => {
    try {
      const resp = await http.get(`users/${id}/`);
      const u = resp?.data || {};
      setFormData({
        email: u.email || "",
        first_name: u.first_name || "",
        last_name: u.last_name || "",
        phone_number: digitsOnly(u.phone_number) || "",
        role: u.role || "gerente",
        // AJUSTE 1: converter ISO -> BR no preenchimento do form
        appointment_date_br: u.appointment_date
          ? formatISOToBR(u.appointment_date)
          : "",
        password: "",
        password2: "",
      });
      setOriginalRole(u.role || null);
      setSelectedId(id);
      setMode("edit");
      setErrors({});
      setFlashKind("");
      setFlashMsg("");
    } catch {
      setFlashKind("danger");
      setFlashMsg("Falha ao carregar usuário para edição.");
    }
  };

  const onDelete = async (id) => {
    RNAlert.alert(
      "Confirmação",
      "Tem certeza que deseja excluir este usuário?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await http.delete(`users/${id}/`);
              if (selectedId === id) resetForm();
              await fetchUsers();
              setFlashKind("success");
              setFlashMsg("Usuário excluído com sucesso.");
              setTimeout(() => {
                setFlashKind("");
                setFlashMsg("");
              }, 2000);
            } catch (e) {
              const detail = e?.response?.data?.detail;
              setFlashKind("danger");
              setFlashMsg(detail || "Falha ao excluir o usuário.");
            }
          },
        },
      ]
    );
  };

  /* AJUSTE 3: validade calculada para exibição (sem mudar visual) */
  const validityBR =
    formData.role === "dpo" && formData.appointment_date_br
      ? (() => {
          const iso = brToISO(formData.appointment_date_br);
          return iso ? formatISOToBR(addYearsToISODate(iso, 2)) : "";
        })()
      : "";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bgPage }}
      contentContainerStyle={{ paddingBottom: bottom + 16 }}
    >
      {/* título igual web, com recuo do topo */}
      <Text style={[s.pageTitle, { paddingTop: top + 8 }]}>
        {mode === "create" ? "Cadastro de Usuário" : "Editar Usuário"}
      </Text>
      {mode === "edit" && <EditBadge />}

      {/* bloco em gradiente = container-gradient */}
      <LinearGradient
        colors={[Colors.gradA, Colors.gradB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradientCard}
      >
        {!!flashMsg && (
          <View
            style={[
              s.alert,
              flashKind === "danger" && {
                backgroundColor: "rgba(220,53,69,0.25)",
              },
              flashKind === "success" && {
                backgroundColor: "rgba(22,163,74,0.25)",
              },
              flashKind === "info" && {
                backgroundColor: "rgba(255,255,255,0.18)",
              },
            ]}
          >
            <Text style={s.alertTxt}>{flashMsg}</Text>
          </View>
        )}

        {/* Mostra aviso se tentar criar DPO quando já existe (sem alterar layout) */}
        {formData.role === "dpo" && dpoExists && !checkingDPO && (
          <View style={[s.alert, { backgroundColor: "rgba(255,193,7,0.25)" }]}>
            <Text style={s.alertTxt}>
              Já existe um DPO nomeado. Edite o DPO atual para alterar.
            </Text>
          </View>
        )}

        {/* Email */}
        <Text style={s.label}>E-mail</Text>
        <TextInput
          style={[s.input, errors.email && s.inputErr]}
          placeholder="Digite o e-mail"
          placeholderTextColor="#6b7280"
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.email}
          onChangeText={(v) => onChange("email", v)}
        />
        {!!errors.email && <Text style={s.errTxt}>{errors.email}</Text>}

        {/* Nome / Sobrenome */}
        <View style={s.row}>
          <View style={[s.col, { marginRight: Space.sm }]}>
            <Text style={s.label}>Nome</Text>
            <TextInput
              style={[s.input, errors.first_name && s.inputErr]}
              placeholder="Digite o nome"
              placeholderTextColor="#6b7280"
              value={formData.first_name}
              onChangeText={(v) => onChange("first_name", sanitizeName(v))}
              maxLength={NameMax}
            />
            {!!errors.first_name && (
              <Text style={s.errTxt}>{errors.first_name}</Text>
            )}
          </View>
          <View style={[s.col, { marginLeft: Space.sm }]}>
            <Text style={s.label}>Sobrenome</Text>
            <TextInput
              style={[s.input, errors.last_name && s.inputErr]}
              placeholder="Digite o sobrenome"
              placeholderTextColor="#6b7280"
              value={formData.last_name}
              onChangeText={(v) => onChange("last_name", sanitizeName(v))}
              maxLength={NameMax}
            />
            {!!errors.last_name && (
              <Text style={s.errTxt}>{errors.last_name}</Text>
            )}
          </View>
        </View>

        {/* Role */}
        <Text style={[s.label, { marginTop: Space.md }]}>Tipo Usuário</Text>
        <RoleSelector
          value={formData.role}
          onChange={(r) => onChange("role", r)}
          disabled={submitting}
        />
        {!!errors.role && <Text style={s.errTxt}>{errors.role}</Text>}

        {/* Campos específicos DPO */}
        {formData.role === "dpo" && (
          <>
            <Text style={[s.label, { marginTop: Space.md }]}>Telefone</Text>
            <TextInput
              style={[s.input, errors.phone_number && s.inputErr]}
              placeholder="(xx) xxxx-xxxx ou (xx) xxxxx-xxxx"
              placeholderTextColor="#6b7280"
              keyboardType="phone-pad"
              value={formatPhoneBR(formData.phone_number)}
              onChangeText={(v) =>
                onChange("phone_number", digitsOnly(v).slice(0, 11))
              }
            />
            {!!errors.phone_number && (
              <Text style={s.errTxt}>{errors.phone_number}</Text>
            )}

            <View style={s.row}>
              <View style={[s.col, { marginRight: Space.sm }]}>
                <Text style={s.label}>Data da Nomeação</Text>
                <TextInput
                  style={[
                    s.input,
                    (errors.appointment_date || errors.appointment_date_br) &&
                      s.inputErr,
                  ]}
                  placeholder="dd/mm/aaaa" /* AJUSTE 1: máscara BR */
                  placeholderTextColor="#6b7280"
                  autoCapitalize="none"
                  value={formData.appointment_date_br}
                  onChangeText={(v) =>
                    onChange("appointment_date_br", maskDateBR(v))
                  }
                  maxLength={10}
                  keyboardType="number-pad"
                />
                {!!(errors.appointment_date || errors.appointment_date_br) && (
                  <Text style={s.errTxt}>
                    {errors.appointment_date || errors.appointment_date_br}
                  </Text>
                )}
              </View>

              <View style={[s.col, { marginLeft: Space.sm }]}>
                <Text style={s.label}>Validade da Nomeação</Text>
                <TextInput
                  style={[s.input, { opacity: 0.9 }]}
                  editable={false}
                  /* AJUSTE 3: validade automática */
                  value={validityBR}
                />
              </View>
            </View>
          </>
        )}

        {/* Senhas */}
        {mode === "create" && isProdLike ? (
          <View style={[s.infoBox, { marginTop: Space.md }]}>
            <Text style={s.infoTxt}>
              A senha será definida pelo próprio usuário via e-mail de convite.
            </Text>
          </View>
        ) : (
          <View style={s.row}>
            <View
              style={[s.col, { marginRight: Space.sm, marginTop: Space.md }]}
            >
              <Text style={s.label}>
                {mode === "create" ? "Senha" : "Nova Senha (opcional)"}
              </Text>
              <TextInput
                style={[s.input, errors.password && s.inputErr]}
                placeholder={
                  mode === "create" ? "Digite a senha" : "Preencha para alterar"
                }
                placeholderTextColor="#6b7280"
                secureTextEntry
                autoCapitalize="none"
                value={formData.password}
                onChangeText={(v) => onChange("password", v)}
              />
              {!!errors.password && (
                <Text style={s.errTxt}>{errors.password}</Text>
              )}
            </View>

            <View
              style={[s.col, { marginLeft: Space.sm, marginTop: Space.md }]}
            >
              <Text style={s.label}>
                Confirmar {mode === "create" ? "Senha" : "Nova Senha"}
              </Text>
              <TextInput
                style={[s.input, errors.password2 && s.inputErr]}
                placeholder="Repita a senha"
                placeholderTextColor="#6b7280"
                secureTextEntry
                autoCapitalize="none"
                value={formData.password2}
                onChangeText={(v) => onChange("password2", v)}
              />
              {!!errors.password2 && (
                <Text style={s.errTxt}>{errors.password2}</Text>
              )}
            </View>
          </View>
        )}

        {/* Ações do formulário */}
        <View style={[s.actions, { marginTop: Space.lg }]}>
          {/* AJUSTE 4: sempre exibir “Cancelar” para limpar quando em create */}
          <Pressable
            onPress={() => resetForm()}
            style={[s.btnGhost, { borderColor: Colors.white }]}
            disabled={submitting}
          >
            <Text style={s.btnGhostTxt}>
              {mode === "edit" ? "Cancelar edição" : "Cancelar"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onSubmit}
            style={s.btnPrimary}
            disabled={submitting}
          >
            <Text style={s.btnPrimaryTxt}>
              {submitting
                ? "Salvando..."
                : mode === "create"
                ? "Cadastrar"
                : "Salvar alterações"}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Lista + filtro (card branco) */}
      <View style={s.listCard}>
        <Text style={s.listTitle}>Usuários</Text>

        {/* Filtro e controles */}
        <View style={[s.row, { marginBottom: Space.md }]}>
          <View style={[s.col, { flex: 1, marginRight: Space.sm }]}>
            <Text style={s.labelPlain}>Buscar usuários</Text>
            <TextInput
              style={s.inputPlain}
              placeholder="E-mail, nome ou sobrenome"
              placeholderTextColor="#6b7280"
              value={query}
              onChangeText={setQuery}
            />
          </View>
          <View style={{ justifyContent: "flex-end", gap: 8 }}>
            <Pressable
              onPress={() => {
                setPage(1);
                fetchUsers();
              }}
              style={s.btnWhite}
            >
              <Text style={s.btnWhiteTxt}>Filtrar</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setQuery("");
                setPage(1);
                fetchUsers();
              }}
              style={[s.btnWhite, { borderColor: Colors.border }]}
            >
              <Text style={[s.btnWhiteTxt, { color: Colors.ink }]}>Limpar</Text>
            </Pressable>
          </View>
        </View>

        <View style={[s.row, { marginBottom: Space.sm, alignItems: "center" }]}>
          <Text style={{ color: "#6b7280" }}>Tamanho da página:</Text>
          <View style={s.rowWrap}>
            {[5, 10, 20, 50].map((n) => {
              const active = pageSize === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => {
                    setPageSize(n);
                    setPage(1);
                  }}
                  style={[s.chip, active && s.chipActive]}
                >
                  <Text style={[s.chipTxt, active && s.chipTxtActive]}>
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Lista */}
        {listLoading ? (
          <View style={{ paddingVertical: 30, alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.gradB} />
          </View>
        ) : users.length ? (
          users.map((u) => (
            <UserRow key={u.id} u={u} onEdit={onEdit} onDelete={onDelete} />
          ))
        ) : (
          <View style={{ paddingVertical: 30, alignItems: "center" }}>
            <Text style={{ color: "#6b7280" }}>Nenhum usuário encontrado.</Text>
          </View>
        )}

        {/* Paginação */}
        <View style={s.pagination}>
          <Text style={{ color: "#6b7280" }}>
            Total:{" "}
            <Text style={{ fontWeight: "700", color: Colors.ink }}>
              {count || users.length}
            </Text>{" "}
            • Página{" "}
            <Text style={{ fontWeight: "700", color: Colors.ink }}>{page}</Text>{" "}
            de{" "}
            <Text style={{ fontWeight: "700", color: Colors.ink }}>
              {totalPages}
            </Text>
          </Text>

          <View style={s.rowWrap}>
            <Pressable
              disabled={!canPrev}
              onPress={() => goTo(1)}
              style={[s.btnLite, !canPrev && s.btnDisabled]}
            >
              <Text style={s.btnLiteTxt}>«</Text>
            </Pressable>
            <Pressable
              disabled={!canPrev}
              onPress={() => goTo(page - 1)}
              style={[s.btnLite, !canPrev && s.btnDisabled]}
            >
              <Text style={s.btnLiteTxt}>Anterior</Text>
            </Pressable>
            <Pressable
              disabled={!canNext}
              onPress={() => goTo(page + 1)}
              style={[s.btnLite, !canNext && s.btnDisabled]}
            >
              <Text style={s.btnLiteTxt}>Próxima</Text>
            </Pressable>
            <Pressable
              disabled={!canNext}
              onPress={() => goTo(totalPages)}
              style={[s.btnLite, !canNext && s.btnDisabled]}
            >
              <Text style={s.btnLiteTxt}>»</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/* === styles (inalterados, só referenciados pelos novos campos) === */
const s = StyleSheet.create({
  pageTitle: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: Space.lg,
  },

  gradientCard: {
    marginHorizontal: Space.lg,
    marginTop: Space.md,
    padding: Space.lg,
    borderRadius: Radius.lg,
    shadowColor: "rgba(0,0,0,0.12)",
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 6,
  },
  alert: {
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: Space.md,
  },
  alertTxt: { color: Colors.white },

  label: { color: "rgba(255,255,255,0.9)", marginBottom: 6, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    color: Colors.text, // texto escuro
    backgroundColor: Colors.white, // fundo claro
  },
  inputErr: { borderColor: "#ffd1d6", backgroundColor: "rgba(255,0,0,0.06)" },
  errTxt: { color: "#ffd1d6", marginTop: 6, marginBottom: 2 },

  row: { flexDirection: "row" },
  col: { flex: 1 },

  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginTop: 6,
  },

  pill: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  pillTxt: { color: Colors.white },

  infoBox: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: Radius.md,
    padding: 10,
  },
  infoTxt: { color: Colors.white },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  btnGhost: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
  },
  btnGhostTxt: { color: Colors.white, fontWeight: "700" },
  btnPrimary: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
  },
  btnPrimaryTxt: { color: Colors.ink, fontWeight: "800" },

  /* LISTA */
  listCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Space.lg,
    marginTop: Space.lg,
    borderRadius: Radius.lg,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "rgba(0,0,0,0.08)",
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4,
  },
  listTitle: {
    color: Colors.ink,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: Space.md,
  },

  labelPlain: { color: "#6b7280", marginBottom: 6 },
  inputPlain: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    backgroundColor: Colors.white,
    color: Colors.text,
  },

  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  chipActive: { backgroundColor: "#eef4ff", borderColor: "#bfd3ff" },
  chipTxt: { color: Colors.text },
  chipTxtActive: { color: Colors.ink, fontWeight: "700" },

  userRow: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
    backgroundColor: Colors.white,
  },
  userEmail: { color: Colors.ink, fontWeight: "700" },
  userName: { color: Colors.text, opacity: 0.95 },
  userRole: { color: Colors.text, opacity: 0.8 },
  rowActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  btnLite: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
  btnLiteTxt: { color: Colors.text, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },

  pagination: {
    marginTop: Space.md,
    paddingTop: Space.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  badgeWarn: {
    alignSelf: "center",
    backgroundColor: "#ffe082",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  badgeWarnTxt: { color: "#3a2f00", fontWeight: "800" },
});
