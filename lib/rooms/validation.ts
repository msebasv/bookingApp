export const ROOM_NAME_MAX = 100;
export const ROOM_CODE_MAX = 20;
export const ROOM_LOCATION_MAX = 120;
export const ROOM_DESCRIPTION_MAX = 500;

export const ROOM_ACTIVE = "ACTIVA";
export const ROOM_INACTIVE = "INACTIVA";

export const MSG_NAME_REQUIRED = "El nombre es obligatorio.";
export const MSG_NAME_MAX = "El nombre admite como máximo 100 caracteres.";
export const MSG_CODE_REQUIRED = "El código es obligatorio.";
export const MSG_CODE_MAX = "El código admite como máximo 20 caracteres.";
export const MSG_LOCATION_REQUIRED = "La ubicación es obligatoria.";
export const MSG_LOCATION_MAX = "La ubicación admite como máximo 120 caracteres.";
export const MSG_DESCRIPTION_MAX = "La descripción admite como máximo 500 caracteres.";
export const MSG_CAPACITY = "La capacidad debe ser un entero mayor o igual que 1.";
export const MSG_CODE_TAKEN = "Ese código ya está registrado.";
export const MSG_LOGIN = "Debes iniciar sesión.";
export const MSG_FORBIDDEN = "No autorizado.";
export const MSG_CREATED = "Sala creada.";
export const MSG_UPDATED = "Sala actualizada.";
export const MSG_ACTIVATED = "Sala activada.";
export const MSG_DEACTIVATED = "Sala desactivada.";
export const MSG_DEACTIVATION_BLOCKED = "No se puede desactivar la sala mientras tenga una reserva que no ha terminado.";
export const MSG_EMPTY = "No hay salas registradas.";
export const MSG_NOT_FOUND = "No se encontró la sala.";
export const MSG_STATE = "El estado no es válido.";

export type RoomFields = {
  nombre: string;
  codigo: string;
  ubicacion: string;
  capacidad: string;
  descripcion: string;
};

export type RoomData = {
  nombre: string;
  codigo: string;
  codigoNormalizado: string;
  ubicacion: string;
  capacidad: number;
  descripcion: string | null;
};

export type FieldError = { error: string };

export function textLength(value: string) {
  return Array.from(value).length;
}

export function normalizeCode(codigo: string) {
  return codigo.trim().toLowerCase();
}

export function readRoomForm(formData: FormData): RoomFields {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    nombre: text("nombre"),
    codigo: text("codigo"),
    ubicacion: text("ubicacion"),
    capacidad: text("capacidad"),
    descripcion: text("descripcion"),
  };
}

export function validateRoomFields(fields: RoomFields): FieldError | { data: RoomData } {
  const nombre = fields.nombre.trim();
  const codigo = fields.codigo.trim();
  const ubicacion = fields.ubicacion.trim();
  const descripcion = fields.descripcion.trim();
  const capacidad = fields.capacidad.trim();

  if (!nombre) {
    return { error: MSG_NAME_REQUIRED };
  }
  if (textLength(nombre) > ROOM_NAME_MAX) {
    return { error: MSG_NAME_MAX };
  }
  if (!codigo) {
    return { error: MSG_CODE_REQUIRED };
  }
  if (textLength(codigo) > ROOM_CODE_MAX) {
    return { error: MSG_CODE_MAX };
  }
  if (!ubicacion) {
    return { error: MSG_LOCATION_REQUIRED };
  }
  if (textLength(ubicacion) > ROOM_LOCATION_MAX) {
    return { error: MSG_LOCATION_MAX };
  }
  if (textLength(descripcion) > ROOM_DESCRIPTION_MAX) {
    return { error: MSG_DESCRIPTION_MAX };
  }
  if (!/^[0-9]+$/.test(capacidad) || String(Number(capacidad)) !== capacidad) {
    return { error: MSG_CAPACITY };
  }
  const capacidadNumero = Number(capacidad);
  if (!Number.isSafeInteger(capacidadNumero) || capacidadNumero < 1) {
    return { error: MSG_CAPACITY };
  }

  return {
    data: {
      nombre,
      codigo,
      codigoNormalizado: normalizeCode(codigo),
      ubicacion,
      capacidad: capacidadNumero,
      descripcion: descripcion ? descripcion : null,
    },
  };
}
