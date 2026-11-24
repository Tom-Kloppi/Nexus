window.Nexus = window.Nexus || {};

(function (Nexus) {
  function svgWrap(body) {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      body +
      "</g></svg>"
    );
  }

  Nexus.RESOURCE_MARKUP = {
    energy: '<path d="M13 2L4 14h7l-1 8 10-13h-7z"/>',
    money:
      '<circle cx="12" cy="12" r="8"/><path d="M12 7v10"/><path d="M9.5 9.2c.6-1 1.7-1.5 2.5-1.5 1.4 0 2.5.8 2.5 2s-1.1 2-2.5 2h-1c-1.4 0-2.5.8-2.5 2s1.1 2 2.5 2c.9 0 1.9-.5 2.5-1.4"/>',
    bandwidth:
      '<path d="M8 7l4-4 4 4"/><path d="M12 3v8"/><path d="M8 17l4 4 4-4"/><path d="M12 13v8"/>',
    data: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    compute: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    hardware: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    connectivity: '<path d="M5 12a7 7 0 0 1 14 0"/><path d="M8.5 12a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"/>',
    image: '<circle cx="12" cy="9" r="3"/><path d="M6 19c1.2-3 3.2-4.2 6-4.2S16.8 16 18 19"/>',
    comfort: '<path d="M12 20s-6.5-4-6.5-8.2a3.4 3.4 0 0 1 6.5-1.6 3.4 3.4 0 0 1 6.5 1.6C18.5 16 12 20 12 20z"/>',
    environment: '<path d="M12 20V9"/><path d="M12 13c-3-.6-5-3-4-6 3 .2 4.5 2 4 6z"/><path d="M12 11c3-.6 5-2.6 4-5.5-3 .2-4.6 2-4 5.5z"/>',
    security: '<path d="M12 3l7 3v6c0 4-3 6.2-7 8-4-1.8-7-4-7-8V6z"/>',
    risk: '<path d="M12 4l8 14H4z"/><path d="M12 10v4"/>'
  };

  Nexus.iconGroup = function (key, stroke) {
    return (
      '<g fill="none" stroke="' +
      (stroke || "#1b140c") +
      '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      Nexus.RESOURCE_MARKUP[key] +
      "</g>"
    );
  };

  Nexus.RESOURCE_ICONS = {
    energy: svgWrap(Nexus.RESOURCE_MARKUP.energy),
    money: svgWrap(Nexus.RESOURCE_MARKUP.money),
    bandwidth: svgWrap(Nexus.RESOURCE_MARKUP.bandwidth),
    data: svgWrap(Nexus.RESOURCE_MARKUP.data),
    compute: svgWrap(Nexus.RESOURCE_MARKUP.compute),
    hardware: svgWrap(Nexus.RESOURCE_MARKUP.hardware),
    connectivity: svgWrap(Nexus.RESOURCE_MARKUP.connectivity)
  };

  Nexus.DEVICE_ICONS = {
    thermo: svgWrap(
      '<path d="M10 14.5V6a2 2 0 1 1 4 0v8.5"/><path d="M8.5 15.2a3.5 3.5 0 1 0 7 0"/><path d="M12 8v5"/>'
    ),
    camera: svgWrap(
      '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'
    ),
    lock: svgWrap(
      '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
    ),
    hems: svgWrap(
      '<path d="M3 11l9-7 9 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>'
    ),
    ledger: svgWrap(
      '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'
    ),
    lab: svgWrap(
      '<path d="M9 3v7l-4 8h14l-4-8V3"/><path d="M8 3h8"/>'
    ),
    charger: svgWrap(
      '<path d="M8 7h8v7a4 4 0 0 1-8 0V7z"/><path d="M10 3v4M14 3v4M12 14v5M10 19h4"/>'
    ),
    edge: svgWrap(
      '<rect x="6" y="9" width="12" height="9" rx="3"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/><circle cx="9.5" cy="13.5" r="0.8" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13.5" r="0.8" fill="currentColor" stroke="none"/>'
    ),
    facade: svgWrap(
      '<rect x="5" y="4" width="14" height="16" rx="1"/><path d="M5 8h14M5 12h14M5 16h14M12 4v16"/>'
    )
  };

  Nexus.HOME_MARKUP =
    '<path d="M3 12l9-8 9 8"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-6h4v6"/>';

  Nexus.homeIconGroup = function (stroke) {
    return (
      '<g fill="none" stroke="' +
      (stroke || "#1b140c") +
      '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      Nexus.HOME_MARKUP +
      "</g>"
    );
  };

  Nexus.MODE_ICONS = {
    cloud: svgWrap('<path d="M7 17h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4-1.5A3.5 3.5 0 0 0 7 17z"/>'),
    local: svgWrap('<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>')
  };
})(window.Nexus);
