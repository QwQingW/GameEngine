import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ----------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------

export interface PlayerInfo {
  id: string;
  username: string;
}

export interface SaveSlot {
  id: string;
  player_id: string;
  slot_index: number;        // 1 | 2 | 3
  variant_name: string;
  level: number;
  player_data: Record<string, unknown>;
  saved_at: string;
}

// ----------------------------------------------------------------
// 玩家账户 API
// ----------------------------------------------------------------

/** 注册：检查用户名是否已被占用 → 未占用就创建玩家 */
export async function registerPlayer(username: string): Promise<{
  ok: boolean;
  player?: PlayerInfo;
  reason?: "taken" | "error";
}> {
  // 查重
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) return { ok: false, reason: "taken" };

  // 新建
  const { data: created, error } = await supabase
    .from("players")
    .insert({ username })
    .select("id")
    .single();

  if (error) {
    console.error("[registerPlayer] insert error:", error);
    return { ok: false, reason: "error" };
  }

  return { ok: true, player: { id: created.id, username } };
}

/** 登录：查找已有玩家 */
export async function loginPlayer(username: string): Promise<{
  ok: boolean;
  player?: PlayerInfo;
  reason?: "not_found" | "error";
}> {
  const { data, error } = await supabase
    .from("players")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("[loginPlayer] select error:", error);
    return { ok: false, reason: "error" };
  }

  if (!data) return { ok: false, reason: "not_found" };

  return { ok: true, player: { id: data.id, username: data.username } };
}

// ----------------------------------------------------------------
// 存档槽位 API
// ----------------------------------------------------------------

/** 获取某玩家的全部存档槽位（返回 3 项数组，未占用的为 null） */
export async function getSaveSlots(playerId: string): Promise<(SaveSlot | null)[]> {
  const { data, error } = await supabase
    .from("save_slots")
    .select("*")
    .eq("player_id", playerId)
    .order("slot_index", { ascending: true });

  if (error) {
    console.error("[getSaveSlots] error:", error);
    return [null, null, null];
  }

  // map 到 slot_index 1/2/3
  const slots: (SaveSlot | null)[] = [null, null, null];
  for (const row of data) {
    slots[row.slot_index - 1] = row as SaveSlot;
  }
  return slots;
}

/** 在空槽位创建新存档 */
export async function createSaveSlot(
  playerId: string,
  slotIndex: number,
  variantName: string,
): Promise<{
  ok: boolean;
  slot?: SaveSlot;
  reason?: "occupied" | "error";
}> {
  // 检查槽位是否已被占用
  const { data: existing } = await supabase
    .from("save_slots")
    .select("id")
    .eq("player_id", playerId)
    .eq("slot_index", slotIndex)
    .maybeSingle();

  if (existing) return { ok: false, reason: "occupied" };

  const { data: created, error } = await supabase
    .from("save_slots")
    .insert({
      player_id: playerId,
      slot_index: slotIndex,
      variant_name: variantName,
      level: 0,
      player_data: {},
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createSaveSlot] insert error:", error);
    return { ok: false, reason: "error" };
  }

  return { ok: true, slot: created as SaveSlot };
}

/** 保存/更新游戏存档 */
export async function saveGame(
  slotId: string,
  level: number,
  playerData: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("save_slots")
    .update({ level, player_data: playerData, saved_at: new Date().toISOString() })
    .eq("id", slotId);

  if (error) {
    console.error("[saveGame] update error:", error);
    throw error;
  }
}

/** 读取存档 */
export async function loadSave(slotId: string): Promise<SaveSlot | null> {
  const { data, error } = await supabase
    .from("save_slots")
    .select("*")
    .eq("id", slotId)
    .maybeSingle();

  if (error) {
    console.error("[loadSave] select error:", error);
    return null;
  }

  return data as SaveSlot | null;
}

/** 删除存档槽位 */
export async function deleteSlot(slotId: string): Promise<void> {
  const { error } = await supabase
    .from("save_slots")
    .delete()
    .eq("id", slotId);

  if (error) {
    console.error("[deleteSlot] delete error:", error);
    throw error;
  }
}
