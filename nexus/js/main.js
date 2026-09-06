window.Nexus = window.Nexus || {};

(function () {
  var state = Nexus.createInitialState();
  var ui = {
    buildDeviceId: null,
    investorAwaitingResource: false
  };

  function commit(next) {
    state = next;
    if (state.phase !== "build") {
      ui.buildDeviceId = null;
    }
    if (state.phase !== "event") {
      ui.investorAwaitingResource = false;
    }
    Nexus.render(state, ui);
  }

  document.getElementById("btn-roll").addEventListener("click", function () {
    commit(Nexus.rollDice(state));
  });

  document.getElementById("btn-end-round").addEventListener("click", function () {
    commit(Nexus.endRound(state));
  });

  document.getElementById("device-list").addEventListener("click", function (event) {
    var button = event.target.closest("[data-device]");
    if (!button || button.disabled) {
      return;
    }
    ui.buildDeviceId = button.getAttribute("data-device");
    Nexus.render(state, ui);
  });

  document.getElementById("btn-build-cloud").addEventListener("click", function () {
    var deviceId = ui.buildDeviceId;
    if (!deviceId) {
      return;
    }
    ui.buildDeviceId = null;
    commit(Nexus.buildDevice(state, deviceId, "cloud"));
  });

  document.getElementById("btn-build-local").addEventListener("click", function () {
    var deviceId = ui.buildDeviceId;
    if (!deviceId) {
      return;
    }
    ui.buildDeviceId = null;
    commit(Nexus.buildDevice(state, deviceId, "local"));
  });

  document.getElementById("btn-build-cancel").addEventListener("click", function () {
    ui.buildDeviceId = null;
    Nexus.render(state, ui);
  });

  document.getElementById("event-choices").addEventListener("click", function (event) {
    var button = event.target.closest("[data-choice]");
    if (!button || button.disabled) {
      return;
    }
    var choiceId = button.getAttribute("data-choice");
    var eventCard = state.pendingEvent;
    var choice = eventCard && eventCard.choices.filter(function (item) {
      return item.id === choiceId;
    })[0];
    if (choice && choice.needsResourcePick) {
      ui.investorAwaitingResource = true;
      Nexus.render(state, ui);
      return;
    }
    commit(Nexus.applyEventChoice(state, choiceId));
  });

  document.getElementById("event-resource-pick").addEventListener("click", function (event) {
    var button = event.target.closest("[data-resource]");
    if (!button) {
      return;
    }
    commit(Nexus.applyEventChoice(state, "a", { resource: button.getAttribute("data-resource") }));
  });

  document.getElementById("btn-restart").addEventListener("click", function () {
    ui.buildDeviceId = null;
    ui.investorAwaitingResource = false;
    commit(Nexus.createInitialState());
  });

  Nexus.render(state, ui);
})();
