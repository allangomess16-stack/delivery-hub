/**
 * Contrato mínimo de conectividade consumido pela sincronização.
 * A aplicação não conhece navigator, Android ou modo avião.
 */
export interface FonteConectividade {
  estaOnline(): boolean;
}
