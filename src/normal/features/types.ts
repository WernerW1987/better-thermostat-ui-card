import { HomeAssistant } from "mushroom-cards/src/ha";

export interface LovelaceCardFeatureContext {
  entity_id?: string;
}

// Restrict the entity's modes to the ones the feature config selects.
// Like HA core's card features, the CONFIGURED order defines the display
// order (that is how users reorder the buttons); duplicates are dropped.
export const filterModes = (
  modes: string[] | undefined,
  configured?: string[],
): string[] => {
  if (!modes) {
    return [];
  }
  if (!configured) {
    return modes;
  }
  return [...new Set(configured)].filter((mode) => modes.includes(mode));
};

export type LovelaceCardFeaturePosition = "bottom" | "inline";

export interface LovelaceCardFeatureConfig {
  type: string;
  [key: string]: any;
}

export interface ClimateHvacModesCardFeatureConfig {
  type: "climate-hvac-modes";
  style?: "dropdown" | "icons";
  hvac_modes?: string[];
}

export interface ClimateFanModesCardFeatureConfig {
  type: "climate-fan-modes";
  style?: "dropdown" | "icons";
  fan_modes?: string[];
  // Optional extra icon toggles rendered beside the fan-speed buttons,
  // in the same row (e.g. display/beep switches for the same AC unit).
  extra_toggles?: EntityToggleItem[];
}

// Generic row of toggles for arbitrary entities (not the card's own climate
// entity) — e.g. display/beep switches that belong to the same device.
export interface EntityToggleItem {
  entity: string;
  name?: string;
  icon?: string;
  icon_on?: string;
  icon_off?: string;
}

export interface EntityToggleCardFeatureConfig {
  type: "entity-toggle";
  toggles: EntityToggleItem[];
}

export interface ClimatePresetModesCardFeatureConfig {
  type: "climate-preset-modes";
  style?: "dropdown" | "icons";
  preset_modes?: string[];
}

export interface LovelaceCardFeature extends HTMLElement {
  hass?: HomeAssistant;
  context?: LovelaceCardFeatureContext;
  color?: string;
  setConfig(config: LovelaceCardFeatureConfig): void;
}
