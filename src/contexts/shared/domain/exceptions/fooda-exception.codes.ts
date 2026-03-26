export class FoodaExceptionInfo {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly service: string = 'config-service',
  ) {}
}

const SERVICE_PREFIX = 'CO';

export const FoodaExceptionCodes = {
  // Error Generico
  Ex0000: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-0000`,
    'Ha ocurrido un error desconocido en la solicitud.',
  ),
  Ex0001: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-0001`,
    'Ruta o recurso no encontrado',
  ),

  // Errores Generales (9000+)
  Ex9999: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-9999`,
    'Error interno del servidor.',
  ),

  // Errores de Configuración (1000-1999)
  Ex1000: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1000`,
    'Nombre de servicio invalido. Usa kebab-case (ej: identity-service)',
  ),

  Ex1001: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1001`,
    'Nombre de variable invalido. Usa UPPER_SNAKE_CASE (ej: JWT_SECRET)',
  ),

  Ex1002: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1002`,
    'Microservicio no encontrado en configuraciones',
  ),

  Ex1003: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1003`,
    'El microservicio ya tiene configuración registrada',
  ),

  Ex1004: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1004`,
    'Cada variable de configuración debe ser string',
  ),

  Ex1005: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1005`,
    'La variable solicitada no existe en el microservicio',
  ),

  Ex1006: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1006`,
    'variables no puede estar vacío para crear configuración',
  ),

  Ex1007: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1007`,
    'variables no puede estar vacío para actualizar configuración',
  ),

  Ex1008: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1008`,
    'No existe historial suficiente para ejecutar rollback',
  ),

  Ex1009: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1009`,
    'No se encontró el archivo semilla de configuración',
  ),

  Ex1010: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1010`,
    'El archivo semilla no contiene JSON válido',
  ),

  Ex1011: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1011`,
    'La estructura del archivo semilla es inválida',
  ),

  Ex1012: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1012`,
    'Cada servicio del archivo semilla debe contener un objeto key-value',
  ),

  Ex1013: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1013`,
    'variables debe ser un objeto',
  ),

  Ex1014: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1014`,
    'variables no puede estar vacío',
  ),

  Ex1015: new FoodaExceptionInfo(
    `${SERVICE_PREFIX}-1015`,
    'variables no puede estar vacío para PATCH',
  ),
};
