import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import "../components/cts-ha-control-select";
import type { ControlSelectOption } from "../components/cts-ha-control-select";
import { BtClimateEntity, UNAVAILABLE } from "../../shared/climate";
import { HomeAssistant } from "mushroom-cards/src/ha";
import { climateStateColor } from "../../shared/climate-colors";
import { filterModes } from "./types";
import type {
  ClimateFanModesCardFeatureConfig,
  LovelaceCardFeature,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsClimateFanModesCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext,
): boolean => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) {
    return false;
  }
  return (
    stateObj.entity_id.startsWith("climate.") &&
    Array.isArray((stateObj.attributes as any).fan_modes) &&
    (stateObj.attributes as any).fan_modes.length > 0
  );
};

// Reasonable default icons for common fan mode names; falls back to a
// plain fan icon for anything not recognized (including numeric speeds
// like "1".."5" used by some custom climate components).
const FAN_MODE_ICONS: Record<string, string> = {
  auto: "mdi:fan-auto",
  automatic: "mdi:fan-auto",
  on: "mdi:fan",
  off: "mdi:fan-off",
  low: "mdi:fan-speed-1",
  medium: "mdi:fan-speed-2",
  middle: "mdi:fan-speed-2",
  high: "mdi:fan-speed-3",
  "1": "mdi:fan-speed-1",
  "2": "mdi:fan-speed-2",
  "3": "mdi:fan-speed-3",
  turbo: "mdi:rocket-launch",
  mute: "mdi:volume-mute",
  quiet: "mdi:volume-mute",
  silent: "mdi:volume-mute",
  diffuse: "mdi:weather-windy",
  focus: "mdi:target",
};

const getFanModeIcon = (mode: string): string =>
  FAN_MODE_ICONS[mode.toLowerCase()] ?? "mdi:fan";

@customElement("cts-hui-climate-fan-modes-card-feature")
export class HuiClimateFanModesCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state() private _config?: ClimateFanModesCardFeatureConfig;

  @state() private _currentFanMode?: string;

  static getStubConfig(): ClimateFanModesCardFeatureConfig {
    return { type: "climate-fan-modes" };
  }

  public setConfig(config: ClimateFanModesCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private get _stateObj(): BtClimateEntity | undefined {
    if (!this.hass || !this.context?.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id] as
      | BtClimateEntity
      | undefined;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if (
      (changedProps.has("hass") || changedProps.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      const oldStateObj = this.context?.entity_id
        ? (oldHass?.states[this.context.entity_id] as
            | BtClimateEntity
            | undefined)
        : undefined;
      if (oldStateObj !== this._stateObj) {
        this._currentFanMode = (this._stateObj.attributes as any).fan_mode;
      }
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const mode = (ev.detail as { value: string }).value;
    const stateObj = this._stateObj;
    if (
      !stateObj ||
      !this.hass ||
      mode === (stateObj.attributes as any).fan_mode
    ) {
      return;
    }
    const previous = this._currentFanMode;
    this._currentFanMode = mode; // optimistic update
    this.hass
      .callService("climate", "set_fan_mode", {
        entity_id: stateObj.entity_id,
        fan_mode: mode,
      })
      .catch(() => {
        this._currentFanMode = previous;
      });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsClimateFanModesCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const stateObj = this._stateObj;
    const allModes: string[] = (stateObj.attributes as any).fan_modes || [];

    const options: ControlSelectOption[] = filterModes(
      allModes,
      this._config.fan_modes,
    ).map((mode) => ({
      value: mode,
      label: mode,
      icon: html`<ha-icon .icon=${getFanModeIcon(mode)}></ha-icon>`,
    }));

    return html`
      <cts-ha-control-select
        .options=${options}
        .value=${this._currentFanMode}
        @value-changed=${this._valueChanged}
        hide-option-label
        .label=${"Fan mode"}
        style=${styleMap({
          "--control-select-color": climateStateColor(stateObj),
        })}
        .disabled=${stateObj.state === UNAVAILABLE}
      ></cts-ha-control-select>
    `;
  }

  static styles = css`
    :host {
      display: block;
      --control-select-color: var(--feature-color, var(--state-icon-color));
      --control-select-padding: 0;
      --control-select-thickness: 40px;
      --control-select-border-radius: 12px;
      --control-select-button-border-radius: 10px;
      --mdc-icon-size: 20px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "cts-hui-climate-fan-modes-card-feature": HuiClimateFanModesCardFeature;
  }
}
