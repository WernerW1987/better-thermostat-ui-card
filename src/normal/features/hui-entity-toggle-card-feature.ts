import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { HomeAssistant } from "mushroom-cards/src/ha";
import type {
  EntityToggleCardFeatureConfig,
  LovelaceCardFeature,
  LovelaceCardFeatureContext,
} from "./types";

// Unlike the climate-* features, this one is not bound to the card's own
// climate entity — it controls whatever entity_id is set in its own config
// (e.g. a display or beep switch that lives alongside the AC's climate
// entity but is a separate HA entity).
@customElement("cts-hui-entity-toggle-card-feature")
export class HuiEntityToggleCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  private _config?: EntityToggleCardFeatureConfig;

  static getStubConfig(): EntityToggleCardFeatureConfig {
    return { type: "entity-toggle", entity: "" };
  }

  public setConfig(config: EntityToggleCardFeatureConfig): void {
    if (!config?.entity) {
      throw new Error("entity-toggle feature requires an `entity`");
    }
    this._config = config;
  }

  private get _stateObj() {
    if (!this.hass || !this._config?.entity) return undefined;
    return this.hass.states[this._config.entity];
  }

  private _toggle = () => {
    const stateObj = this._stateObj;
    if (!stateObj || !this.hass) return;
    this.hass.callService("homeassistant", "toggle", {
      entity_id: stateObj.entity_id,
    });
  };

  protected render() {
    const stateObj = this._stateObj;
    if (!this._config || !this.hass || !stateObj) {
      return nothing;
    }

    const isOn = stateObj.state === "on";
    const icon = isOn
      ? this._config.icon_on ?? this._config.icon ?? "mdi:toggle-switch"
      : this._config.icon_off ??
        this._config.icon ??
        "mdi:toggle-switch-off";

    return html`
      <button
        class=${classMap({ toggle: true, active: isOn })}
        @click=${this._toggle}
        .disabled=${stateObj.state === "unavailable"}
        title=${this._config.name ??
        stateObj.attributes.friendly_name ??
        stateObj.entity_id}
      >
        <ha-icon .icon=${icon}></ha-icon>
        ${this._config.name
          ? html`<span class="label">${this._config.name}</span>`
          : nothing}
      </button>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      height: 40px;
      border: none;
      border-radius: 12px;
      background: var(--disabled-color, rgba(127, 127, 127, 0.2));
      color: var(--secondary-text-color);
      font-size: 0.85rem;
      cursor: pointer;
      transition:
        background 180ms ease,
        color 180ms ease;
    }
    button.active {
      background: var(
        --feature-color,
        var(--state-icon-color, var(--primary-color))
      );
      color: var(--text-primary-color, white);
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    ha-icon {
      --mdc-icon-size: 20px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "cts-hui-entity-toggle-card-feature": HuiEntityToggleCardFeature;
  }
}
