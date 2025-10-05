import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import AxiosInstance from '../components/Axios';

const CTX = createContext(null);
const LS_KEY = 'inventario.form.v1';

const isFileLike = (v) =>
  (typeof File !== 'undefined' && v instanceof File) ||
  (typeof Blob !== 'undefined' && v instanceof Blob);

function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      out[k] = obj[k];
    }
  });
  return out;
}

/** Form padrão com TODOS os campos das três páginas */
const DEFAULT_FORM = {
  // Página 1
  unidade: '',
  setor: '',
  responsavel_email: '',
  processo_negocio: '',
  finalidade: '',
  dados_pessoais: '',
  tipo_dado: '',
  origem: '',
  formato: '',
  impresso: '',
  titulares: '',
  dados_menores: '',
  base_legal: '',
  // Página 2
  pessoas_acesso: '',
  atualizacoes: '',
  transmissao_interna: '',
  transmissao_externa: '',
  local_armazenamento_digital: '',
  controlador_operador: '',
  motivo_retencao: '',
  periodo_retencao: '',
  exclusao: '',
  forma_exclusao: '',
  transferencia_terceiros: '',
  quais_dados_transferidos: '',
  transferencia_internacional: '',
  empresa_terceira: '',
  // Página 3
  adequado_contratualmente: '',
  paises_tratamento: '',
  medidas_seguranca: '',
  consentimentos: '',
  observacao: '', // único OPCIONAL
};

/** Campos obrigatórios + rótulo para feedback */
const REQUIRED_FIELDS = [
  // Pág. 1
  ['unidade', 'Unidade (Matriz/Filial)'],
  ['setor', 'Setor'],
  ['responsavel_email', 'Responsável (E-mail)'],
  ['processo_negocio', 'Processo de Negócio'],
  ['finalidade', 'Finalidade'],
  ['dados_pessoais', 'Dados pessoais coletados / tratados'],
  ['tipo_dado', 'Tipo de dado'],
  ['origem', 'Origem'],
  ['formato', 'Formato'],
  ['impresso', 'Impresso'],
  ['titulares', 'Titulares dos dados'],
  ['dados_menores', 'Dados de menores'],
  ['base_legal', 'Base Legal'],
  // Pág. 2
  ['pessoas_acesso', 'Pessoas com acesso'],
  ['atualizacoes', 'Atualizações (Quando ocorrem?)'],
  ['transmissao_interna', 'Transmissão Interna'],
  ['transmissao_externa', 'Transmissão Externa'],
  ['local_armazenamento_digital', 'Local de Armazenamento (Digital)'],
  ['controlador_operador', 'Controlador / Operador'],
  ['motivo_retencao', 'Motivo de Retenção'],
  ['periodo_retencao', 'Período de Retenção'],
  ['exclusao', 'Exclusão'],
  ['forma_exclusao', 'Forma de exclusão'],
  ['transferencia_terceiros', 'Ocorre transferência para terceiros?'],
  ['quais_dados_transferidos', 'Quais dados são transferidos?'],
  ['transferencia_internacional', 'Ocorre Transferência Internacional?'],
  ['empresa_terceira', 'Empresa terceira'],
  // Pág. 3
  ['adequado_contratualmente', 'Adequado Contratualmente?'],
  ['paises_tratamento', 'Países Envolvidos no Tratamento'],
  ['medidas_seguranca', 'Medidas de Segurança Envolvidas'],
  ['consentimentos', 'Consentimentos'],
  // observacao -> opcional
];

export function InventarioProvider({ children }) {
  // Carrega LS em formato antigo (apenas form) ou novo ({form, recordId})
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { ...DEFAULT_FORM };
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if ('form' in parsed) return { ...DEFAULT_FORM, ...parsed.form };
        return { ...DEFAULT_FORM, ...parsed }; // compat: se salvou só o objeto do form
      }
      return { ...DEFAULT_FORM };
    } catch {
      return { ...DEFAULT_FORM };
    }
  });

  const [recordId, setRecordId] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'recordId' in parsed) {
        return parsed.recordId || null;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [allowedFields, setAllowedFields] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Persiste (form + recordId) no LS
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ form, recordId }));
    } catch {}
  }, [form, recordId]);

  // OPTIONS do DRF para descobrir campos permitidos (se disponível)
  const ensureAllowedFields = useCallback(async () => {
    if (allowedFields && Array.isArray(allowedFields) && allowedFields.length > 0) {
      return allowedFields;
    }
    try {
      setLoadingMeta(true);
      const resp = await AxiosInstance.options('inventarios/');
      const postSchema = resp?.data?.actions?.POST;
      // Fallback: se não houver schema de POST ou vier vazio, usa TODOS os campos do form
      const fields =
        postSchema && typeof postSchema === 'object' && Object.keys(postSchema).length > 0
          ? Object.keys(postSchema)
          : Object.keys(DEFAULT_FORM);
      setAllowedFields(fields);
      return fields;
    } catch {
      const fields = Object.keys(DEFAULT_FORM);
      setAllowedFields(fields);
      return fields;
    } finally {
      setLoadingMeta(false);
    }
  }, [allowedFields]);

  // Atualiza um campo do form (usado nas páginas 1/2/3)
  const setField = useCallback((name, value) => {
    setForm((prev) => ({ ...prev, [name]: value ?? '' }));
  }, []);

  // Validação completa (somente chamada na página 3)
  const validateAll = useCallback((f) => {
    const missing = [];
    for (const [key, label] of REQUIRED_FIELDS) {
      const val = (f[key] ?? '').toString().trim();
      if (!val) missing.push({ key, label });
    }
    return { ok: missing.length === 0, missing };
  }, []);

  // Carrega um inventário existente e mapeia para o form
  const loadInventario = useCallback(async (id) => {
    const resp = await AxiosInstance.get(`inventarios/${id}/`);
    const data = resp?.data || {};

    // Garante apenas as chaves que usamos no form
    const loaded = { ...DEFAULT_FORM };
    Object.keys(loaded).forEach((k) => {
      if (data[k] != null) loaded[k] = String(data[k]);
    });

    setForm(loaded);
    setRecordId(data.id || id);
    return data;
  }, []);

  // Recarrega o registro atual (edição)
  const reload = useCallback(async () => {
    if (!recordId) return null;
    return loadInventario(recordId);
  }, [recordId, loadInventario]);

  // Monta o payload final (caso precise adaptar nomes, faça aqui)
  const buildPayload = useCallback((f) => {
    // Mapeamento 1:1 explícito como “guarda de segurança”
    const out = {};
    for (const k of Object.keys(DEFAULT_FORM)) {
      out[k] = f[k];
    }
    return out;
  }, []);

  // ===== Salvar por ETAPA (edição) -> PATCH APENAS dos campos do step =====
  const saveStep = useCallback(
    async (fieldsThisStep) => {
      if (!recordId) {
        const err = new Error(
          'Não é possível salvar etapa sem estar editando um registro.'
        );
        err.type = 'not_editing';
        throw err;
      }

      const allowed = await ensureAllowedFields();
      // apenas campos válidos e pertencentes ao step; se allowed vier vazio, não filtre
      const base =
        Array.isArray(allowed) && allowed.length > 0
          ? allowed
          : Object.keys(DEFAULT_FORM);
      const whitelist = fieldsThisStep.filter((f) => base.includes(f));

      // payload apenas do step, com nomes garantidos pelo buildPayload
      const payloadAll = buildPayload(form);
      const payload = pick(payloadAll, whitelist);

      // detecta multipart (se algum campo for arquivo)
      const hasFile = Object.values(payload).some(isFileLike);
      let resp;
      if (hasFile) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(payload)) {
          if (Array.isArray(v)) v.forEach((item) => fd.append(k, item));
          else if (v !== undefined && v !== null) fd.append(k, v);
        }
        resp = await AxiosInstance.patch(`inventarios/${recordId}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        resp = await AxiosInstance.patch(`inventarios/${recordId}/`, payload);
      }

      // Sincroniza com retorno (apenas chaves conhecidas)
      const saved = resp?.data || {};
      const synced = { ...form };
      whitelist.forEach((k) => {
        if (saved[k] != null) synced[k] = String(saved[k]);
        // se o backend não devolveu, mantemos o valor que acabamos de enviar
      });
      setForm(synced);

      return saved;
    },
    [recordId, form, ensureAllowedFields, buildPayload]
  );

  // Salvar ao backend (só na página 3)
  const saveInventario = useCallback(async () => {
    // 1) Valida tudo antes de enviar
    const { ok, missing } = validateAll(form);
    if (!ok) {
      const err = new Error('Campos obrigatórios ausentes.');
      err.type = 'validation';
      err.missing = missing;
      throw err;
    }

    // 2) Determina campos permitidos
    let fields = await ensureAllowedFields();
    if (!Array.isArray(fields) || fields.length === 0) {
      // Fallback duro: nunca mande {} — use todas as chaves do form
      fields = Object.keys(DEFAULT_FORM);
    }

    // 3) Prepara payload
    const payloadObj = pick(buildPayload(form), fields);
    const hasFile = Object.values(payloadObj).some(isFileLike);

    // 4) POST (create) ou PATCH (update)
    let resp;
    if (hasFile) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(payloadObj)) {
        if (Array.isArray(v)) {
          v.forEach((item) => fd.append(k, item));
        } else if (v !== undefined && v !== null) {
          fd.append(k, v);
        }
      }
      if (recordId) {
        resp = await AxiosInstance.patch(`inventarios/${recordId}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        resp = await AxiosInstance.post('inventarios/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
    } else {
      if (recordId) {
        resp = await AxiosInstance.patch(`inventarios/${recordId}/`, payloadObj);
      } else {
        resp = await AxiosInstance.post('inventarios/', payloadObj);
      }
    }

    // 5) Sincroniza com retorno do backend
    const saved = resp?.data || {};
    if (saved?.id) setRecordId(saved.id);

    // Atualiza apenas campos conhecidos do form para evitar chaves estranhas
    const synced = { ...DEFAULT_FORM };
    Object.keys(synced).forEach((k) => {
      if (saved[k] != null) synced[k] = String(saved[k]);
      else synced[k] = form[k]; // mantém o que já estava, se backend não retornou
    });
    setForm(synced);

    return saved;
  }, [form, recordId, ensureAllowedFields, buildPayload, validateAll]);

  // Limpa apenas os campos de uma etapa (útil para “Cancelar” na criação)
  const clearStep = useCallback((fieldsThisStep) => {
    setForm((prev) => {
      const next = { ...prev };
      fieldsThisStep.forEach((k) => (next[k] = DEFAULT_FORM[k] ?? ''));
      return next;
    });
  }, []);

  // Reset total (ex.: após “Salvar e novo” ou “Salvar e ir para a lista”)
  const reset = useCallback(() => {
    setForm({ ...DEFAULT_FORM });
    setRecordId(null);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  }, []);

  const value = useMemo(
    () => ({
      form,
      setField,
      setForm,
      recordId,
      setRecordId,
      saveInventario, // envia ao backend (só use na página 3)
      saveStep, // salva apenas os campos de uma etapa (edição)
      loadInventario, // carrega para edição
      reload, // recarrega o registro atual
      clearStep, // limpa somente os campos do step (criação)
      reset,
      loadingMeta,
      validateAll, // disponível caso queira validar por etapa
    }),
    [
      form,
      recordId,
      loadingMeta,
      saveInventario,
      saveStep,
      loadInventario,
      reload,
      clearStep,
      reset,
      setField,
      validateAll,
    ]
  );

  return <CTX.Provider value={value}>{children}</CTX.Provider>;
}

export function useInventario() {
  const ctx = useContext(CTX);
  if (!ctx)
    throw new Error('useInventario deve ser usado dentro de <InventarioProvider>');
  return ctx;
}
