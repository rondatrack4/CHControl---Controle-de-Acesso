"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { residenceLabel } from "@/lib/utils";
import {
  registerEntrySchema,
  registerExitSchema,
  type RegisterEntryInput,
  type RegisterExitInput,
} from "@/lib/validations";
import type {
  CpfCnpjKind,
  DocumentType,
  Resident,
  VisitorCategory,
} from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface KnownPersonResult {
  id: string;
  person_type: "visitor" | "service_provider";
  full_name: string;
  cpf: string | null;
  cpf_type: CpfCnpjKind;
  document_type: DocumentType;
  document_number: string | null;
  phone: string | null;
  photo_url: string | null;
  company_name: string | null;
  service_type: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  category: VisitorCategory;
  residentName: string | null;
  residenceLabel: string | null;
  last_visit_at: string | null;
  last_destination_label: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toKnownPerson(row: any, personType: "visitor" | "service_provider"): Omit<KnownPersonResult, 'residentName' | 'residenceLabel' | 'last_visit_at' | 'last_destination_label'> {
  return {
    id: row.id,
    person_type: personType,
    full_name: row.full_name,
    cpf: row.cpf,
    cpf_type: row.cpf_type,
    document_type: row.document_type,
    document_number: row.document_number,
    phone: row.phone,
    photo_url: row.photo_url,
    company_name: row.company_name ?? null,
    service_type: row.service_type ?? null,
    vehicle_type: row.vehicle_type ?? null,
    vehicle_plate: row.vehicle_plate ?? null,
    vehicle_brand: row.vehicle_brand ?? null,
    vehicle_model: row.vehicle_model ?? null,
    vehicle_color: row.vehicle_color ?? null,
    category: row.category,
  };
}

/**
 * Busca pessoas já cadastradas (visitantes ou prestadores) por nome, CPF/CNPJ,
 * documento ou placa — usada para autopreencher o formulário de entrada
 * quando a pessoa já tem histórico no condomínio.
 */
export async function searchKnownPersons(query: string, personType?: "visitor" | "service_provider"): Promise<KnownPersonResult[]> {
  await requireSession();
  const supabase = await createClient();
  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = `%${q}%`;
  const shouldSearchVisitors = !personType || personType === "visitor";
  const shouldSearchProviders = !personType || personType === "service_provider";

  const [visitorsRes, providersRes] = await Promise.all([
    shouldSearchVisitors
      ? supabase
          .from("visitors")
          .select("*, resident:residents(*)")
          .eq("status", "active")
          .or(
            `full_name.ilike.${pattern},cpf.ilike.${pattern},document_number.ilike.${pattern},vehicle_plate.ilike.${pattern}`
          )
          .limit(20)
      : Promise.resolve({ data: null as never }),
    shouldSearchProviders
      ? supabase
          .from("service_providers")
          .select("*, resident:residents(*)")
          .eq("status", "active")
          .or(
            `full_name.ilike.${pattern},cpf.ilike.${pattern},document_number.ilike.${pattern},vehicle_plate.ilike.${pattern},company_name.ilike.${pattern}`
          )
          .limit(20)
      : Promise.resolve({ data: null as never }),
  ]);

  const visitorIds = shouldSearchVisitors ? (visitorsRes.data ?? []).map((v) => v.id) : [];
  const providerIds = shouldSearchProviders ? (providersRes.data ?? []).map((p) => p.id) : [];

  const [visitorLogs, providerLogs] = await Promise.all([
    visitorIds.length
      ? supabase
          .from("access_logs")
          .select("person_id, entry_at, residence_label")
          .eq("person_type", "visitor")
          .in("person_id", visitorIds)
          .order("entry_at", { ascending: false })
      : Promise.resolve({ data: [] as { person_id: string; entry_at: string; residence_label: string | null }[] }),
    providerIds.length
      ? supabase
          .from("access_logs")
          .select("person_id, entry_at, residence_label")
          .eq("person_type", "service_provider")
          .in("person_id", providerIds)
          .order("entry_at", { ascending: false })
      : Promise.resolve({ data: [] as { person_id: string; entry_at: string; residence_label: string | null }[] }),
  ]);

  const lastVisitMap = new Map<string, { entry_at: string; residence_label: string | null }>();
  for (const row of [...(visitorLogs.data ?? []), ...(providerLogs.data ?? [])]) {
    if (!lastVisitMap.has(row.person_id)) lastVisitMap.set(row.person_id, row);
  }

  const results: KnownPersonResult[] = [
    ...(shouldSearchVisitors && visitorsRes.data ? (visitorsRes.data ?? []).map((v: any) => {
      const last = lastVisitMap.get(v.id);
      const resident = v.resident;
      return {
        ...toKnownPerson(v, "visitor"),
        residentName: resident?.full_name ?? null,
        residenceLabel: resident ? residenceLabel(resident) : null,
        last_visit_at: last?.entry_at ?? null,
        last_destination_label: last?.residence_label ?? null,
      };
    }) : []),
    ...(shouldSearchProviders && providersRes.data ? (providersRes.data ?? []).map((p: any) => {
      const last = lastVisitMap.get(p.id);
      const resident = p.resident;
      return {
        ...toKnownPerson(p, "service_provider"),
        residentName: resident?.full_name ?? null,
        residenceLabel: resident ? residenceLabel(resident) : null,
        last_visit_at: last?.entry_at ?? null,
        last_destination_label: last?.residence_label ?? null,
      };
    }) : []),
  ];
  return results.slice(0, 25);
}

/**
 * Verifica se há uma autorização recorrente que bloqueia a entrada hoje.
 * Retorna uma mensagem de erro se hoje não for um dia permitido.
 */
export async function checkRecurringAuthToday(personId: string, personType: "visitor" | "service_provider"): Promise<{ blocked: boolean; reason?: string }> {
  const supabase = await createClient();

  const { data: recurringAuths } = await supabase
    .from("recurring_authorizations")
    .select("*")
    .eq("person_id", personId)
    .eq("person_type", personType)
    .eq("status", "active");

  if (!recurringAuths || recurringAuths.length === 0) {
    return { blocked: false };
  }

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = domingo ... 6 = sábado
  const now = today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  for (const auth of recurringAuths) {
    const schedule = auth.weekday_schedule as any[];
    if (!Array.isArray(schedule)) continue;

    const todayEntry = schedule.find(s => s.day === dayOfWeek);
    if (!todayEntry) continue;

    // Se o dia não está habilitado, bloqueie
    if (!todayEntry.enabled) {
      return { blocked: true, reason: "Entrada não permitida para este dia." };
    }

    // Se está habilitado, verificar se está dentro do horário
    if (todayEntry.start_time && todayEntry.end_time) {
      if (now < todayEntry.start_time || now > todayEntry.end_time) {
        return { blocked: true, reason: `Fora do horário permitido (${todayEntry.start_time} - ${todayEntry.end_time}).` };
      }
    }
  }

  return { blocked: false };
}

/**
 * Registra a ENTRADA de uma visita com múltiplos destinos. Reaproveita um
 * cadastro existente (existing_person_id) ou cria um novo — a pessoa não
 * fica mais presa a um único morador; o vínculo é feito por destino.
 */
export async function registerEntry(input: RegisterEntryInput): Promise<ActionResult> {
  const parsed = registerEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const { person, destinations, reason, service_description, notes, expected_exit_at, priority } = parsed.data;
  const session = await requireSession();
  if (!session.company) return { ok: false, error: "Empresa não identificada." };
  const supabase = await createClient();

  const table = person.person_type === "visitor" ? "visitors" : "service_providers";

  // Snapshot da pessoa no momento da entrada — qualquer ajuste feito aqui
  // (ex.: veículo diferente no dia) fica só neste registro de acesso, sem
  // sobrescrever o cadastro permanente de visitante/prestador.
  let personId: string;
  if (person.existing_person_id) {
    const { data, error } = await supabase.from(table).select("id").eq("id", person.existing_person_id).single();
    if (error || !data) return { ok: false, error: error?.message ?? "Cadastro não encontrado." };
    personId = data.id;
  } else {
    const personPayload = {
      full_name: person.full_name,
      cpf: person.cpf || null,
      cpf_type: person.cpf_type,
      document_type: person.document_type,
      document_number: person.document_number || null,
      phone: person.phone || null,
      photo_url: person.photo_url || null,
      category: person.category,
      vehicle_plate: person.vehicle_plate || null,
      vehicle_brand: person.vehicle_brand || null,
      vehicle_model: person.vehicle_model || null,
      vehicle_color: person.vehicle_color || null,
      company_name: person.company_name || null,
      ...(table === "service_providers" ? { service_type: person.service_type || null } : {}),
    };
    const { data, error } = await supabase
      .from(table)
      .insert({ ...personPayload, company_id: session.company.id, resident_id: null, status: "active" })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Erro ao cadastrar pessoa." };
    personId = data.id;
  }

  // Primeiro destino define os campos de compatibilidade (resident_responsible/residence_label)
  const firstDest = destinations[0];
  let firstResidentName: string | null = null;
  if (firstDest.resident_id) {
    const { data: r } = await supabase.from("residents").select("*").eq("id", firstDest.resident_id).single();
    if (r) firstResidentName = (r as Resident).full_name;
  }

  const { data: inserted, error: logError } = await supabase
    .from("access_logs")
    .insert({
      company_id: session.company.id,
      person_type: person.person_type,
      person_id: personId,
      person_name: person.full_name,
      person_cpf: person.cpf || null,
      person_category: person.category,
      person_document_type: person.document_type,
      person_document_number: person.document_number || null,
      person_phone: person.phone || null,
      person_company_name: person.company_name || null,
      person_service_type: person.service_type || null,
      vehicle_plate: person.vehicle_plate || null,
      vehicle_brand: person.vehicle_brand || null,
      vehicle_model: person.vehicle_model || null,
      vehicle_color: person.vehicle_color || null,
      resident_responsible: firstResidentName,
      residence_label: firstDest.location_label,
      entry_at: new Date().toISOString(),
      entry_porter_id: session.userId,
      entry_porter_name: session.profile.full_name || session.email,
      status: "inside",
      reason: reason || null,
      service_description: service_description || null,
      notes: notes || null,
      expected_exit_at: expected_exit_at || null,
      priority,
    })
    .select("id")
    .single();

  if (logError || !inserted) {
    if (logError?.code === "23505") {
      return { ok: false, error: `${person.full_name} já possui uma entrada em aberto.` };
    }
    return { ok: false, error: logError?.message ?? "Erro ao registrar entrada." };
  }

  const destinationRows = destinations.map((d, index) => ({
    access_log_id: inserted.id,
    company_id: session.company!.id,
    resident_id: d.resident_id || null,
    location_label: d.location_label,
    internal_location: d.internal_location || null,
    service_note: d.service_note || null,
    notes: d.notes || null,
    sequence: index,
  }));

  const { error: destError } = await supabase.from("access_log_destinations").insert(destinationRows);
  if (destError) {
    // Rollback: sem os destinos, a entrada fica órfã — desfaz o access_log criado.
    await supabase.from("access_logs").delete().eq("id", inserted.id);
    return { ok: false, error: destError.message };
  }

  await logAudit({
    action: "entry",
    entity: "access_log",
    entityId: inserted.id,
    details: { person_name: person.full_name, person_type: person.person_type, destinations: destinations.length },
    session,
  });
  revalidatePath("/acessos");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Registra a SAÍDA, fechando o registro em aberto e seus destinos pendentes. */
export async function registerExit(input: RegisterExitInput): Promise<ActionResult> {
  const parsed = registerExitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const { access_log_id, exit_notes, exit_photos, confirm_all_destinations, completed_destination_ids } = parsed.data;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: log } = await supabase.from("access_logs").select("*").eq("id", access_log_id).single();
  if (!log) return { ok: false, error: "Registro não encontrado." };
  if (log.status === "outside") return { ok: false, error: "Saída já registrada." };

  if (completed_destination_ids.length > 0) {
    await supabase
      .from("access_log_destinations")
      .update({ completed_at: new Date().toISOString() })
      .in("id", completed_destination_ids)
      .is("completed_at", null);
  } else if (confirm_all_destinations) {
    await supabase
      .from("access_log_destinations")
      .update({ completed_at: new Date().toISOString() })
      .eq("access_log_id", access_log_id)
      .is("completed_at", null);
  }

  const { error } = await supabase
    .from("access_logs")
    .update({
      exit_at: new Date().toISOString(),
      exit_porter_id: session.userId,
      exit_porter_name: session.profile.full_name || session.email,
      status: "outside",
      exit_notes: exit_notes || null,
      exit_photos,
    })
    .eq("id", access_log_id);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    action: "exit",
    entity: "access_log",
    entityId: access_log_id,
    details: { person_name: log.person_name },
    session,
  });
  revalidatePath("/acessos");
  revalidatePath("/dashboard");
  return { ok: true };
}
