import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { classMap } from "lit/directives/class-map.js";
import "../components/cts-ha-control-select";
import type { ControlSelectOption } from "../components/cts-ha-control-select";
import { BtClimateEntity, UNAVAILABLE } from "../../shared/climate";
import { HomeAssistant } from "mushroom-cards/src/ha";
import { climateStateColor } from "../../shared/climate-colors";
import { filterModes } from "./types";
import type {
  ClimateFanModesCardFeatureConfig,
  EntityToggleItem,
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

  private _toggleEntity = (entityId: string) => {
    if (!this.hass) return;
    this.hass.callService("homeassistant", "toggle", {
      entity_id: entityId,
    });
  };

  private _renderExtraToggle(item: EntityToggleItem) {
    const stateObj = this.hass?.states[item.entity];
    if (!stateObj) return nothing;

    const isOn = stateObj.state === "on";
    const icon = isOn
      ? item.icon_on ?? item.icon ?? "mdi:toggle-switch"
      : item.icon_off ?? item.icon ?? "mdi:toggle-switch-off";

    return html`
      <button
        class=${classMap({ "extra-toggle": true, active: isOn })}
        @click=${() => this._toggleEntity(item.entity)}
        .disabled=${stateObj.state === "unavailable"}
        title=${item.name ?? stateObj.attributes.friendly_name ?? item.entity}
      >
        <ha-icon .icon=${icon}></ha-icon>
      </button>
    `;
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

    const extraToggles = this._config.extra_toggles ?? [];

    return html`
      <div class="row">
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
        ${extraToggles.length > 0
          ? html`<div class="extra-toggles">
              ${extraToggles.map((item) => this._renderExtraToggle(item))}
            </div>`
          : nothing}
      </div>
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
    .row {
      display: flex;
      gap: 4px;
      align-items: stretch;
    }
    .row > cts-ha-control-select {
      flex: 1;
      min-width: 0;
    }
    .extra-toggles {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
    button.extra-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 10px;
      background: var(--disabled-color, rgba(127, 127, 127, 0.2));
      color: var(--secondary-text-color);
      cursor: pointer;
      transition:
        background 180ms ease,
        color 180ms ease;
    }
    button.extra-toggle.active {
      background: var(
        --feature-color,
        var(--state-icon-color, var(--primary-color))
      );
      color: var(--text-primary-color, white);
    }
    button.extra-toggle:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "cts-hui-climate-fan-modes-card-feature": HuiClimateFanModesCardFeature;
  }
}
